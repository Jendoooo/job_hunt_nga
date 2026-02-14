-- ============================================================
-- Fix test_attempts schema + add user_progress table
-- Created: 2026-02-14
-- ============================================================

-- ----------------------------------------------------------------
-- 1. FIX test_attempts: ensure defaults so INSERTs never fail
--    on missing optional fields
-- ----------------------------------------------------------------

-- module_name should be nullable (some test pages may omit it)
ALTER TABLE public.test_attempts
  ALTER COLUMN module_name DROP NOT NULL;

ALTER TABLE public.test_attempts
  ALTER COLUMN module_name SET DEFAULT '';

-- score should have a default so partial payloads don't crash
ALTER TABLE public.test_attempts
  ALTER COLUMN score SET DEFAULT 0;

-- total_questions should have a default
ALTER TABLE public.test_attempts
  ALTER COLUMN total_questions SET DEFAULT 0;

-- ----------------------------------------------------------------
-- 2. Add score_pct column for consistent percentage storage
--    across all module types (MCQ count-based vs SJQ points-based)
-- ----------------------------------------------------------------

ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS score_pct smallint;

-- Back-fill existing rows
UPDATE public.test_attempts
SET score_pct = CASE
  WHEN total_questions > 0 THEN ROUND((score::numeric / total_questions) * 100)
  ELSE 0
END
WHERE score_pct IS NULL;

-- ----------------------------------------------------------------
-- 3. Clean up duplicate RLS policies on test_attempts
--    Keep the dashboard-created ones, drop the migration-created dupes.
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "test_attempts_insert_own" ON public.test_attempts;
DROP POLICY IF EXISTS "test_attempts_select_own" ON public.test_attempts;

-- Ensure the remaining policies exist (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'test_attempts'
      AND policyname = 'Users can insert their own attempts'
  ) THEN
    CREATE POLICY "Users can insert their own attempts"
      ON public.test_attempts FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'test_attempts'
      AND policyname = 'Users can view their own attempts'
  ) THEN
    CREATE POLICY "Users can view their own attempts"
      ON public.test_attempts FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Add UPDATE policy so outbox retries / corrections work
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'test_attempts'
      AND policyname = 'Users can update their own attempts'
  ) THEN
    CREATE POLICY "Users can update their own attempts"
      ON public.test_attempts FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 5. Clean up duplicate RLS policies on profiles
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- ----------------------------------------------------------------
-- 6. USER_PROGRESS table
--    Aggregated per-user, per-module progress. Updated by trigger.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  module_name     text NOT NULL DEFAULT '',
  attempts_count  integer NOT NULL DEFAULT 0,
  best_score_pct  smallint NOT NULL DEFAULT 0,
  latest_score_pct smallint NOT NULL DEFAULT 0,
  total_time_seconds integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, assessment_type)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_progress_select_own"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert_own"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_user
  ON public.user_progress (user_id);

-- ----------------------------------------------------------------
-- 7. Trigger function: auto-update user_progress on attempt INSERT
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pct smallint;
BEGIN
  -- Compute percentage
  IF NEW.total_questions > 0 THEN
    pct := ROUND((NEW.score::numeric / NEW.total_questions) * 100);
  ELSE
    pct := 0;
  END IF;

  -- Also store score_pct on the attempt row itself
  NEW.score_pct := pct;

  -- Upsert into user_progress
  INSERT INTO public.user_progress (
    user_id, assessment_type, module_name,
    attempts_count, best_score_pct, latest_score_pct,
    total_time_seconds, last_attempt_at, updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.assessment_type,
    COALESCE(NEW.module_name, ''),
    1,
    pct,
    pct,
    COALESCE(NEW.time_taken_seconds, 0),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (user_id, assessment_type) DO UPDATE SET
    attempts_count     = user_progress.attempts_count + 1,
    best_score_pct     = GREATEST(user_progress.best_score_pct, EXCLUDED.best_score_pct),
    latest_score_pct   = EXCLUDED.latest_score_pct,
    total_time_seconds = user_progress.total_time_seconds + EXCLUDED.total_time_seconds,
    module_name        = EXCLUDED.module_name,
    last_attempt_at    = EXCLUDED.last_attempt_at,
    updated_at         = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_test_attempt_inserted ON public.test_attempts;
CREATE TRIGGER on_test_attempt_inserted
  BEFORE INSERT ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_attempt();

-- ----------------------------------------------------------------
-- 8. Back-fill user_progress from existing test_attempts
-- ----------------------------------------------------------------

INSERT INTO public.user_progress (
  user_id, assessment_type, module_name,
  attempts_count, best_score_pct, latest_score_pct,
  total_time_seconds, last_attempt_at, updated_at
)
SELECT
  ta.user_id,
  ta.assessment_type,
  COALESCE(
    (SELECT module_name FROM public.test_attempts
     WHERE user_id = ta.user_id AND assessment_type = ta.assessment_type
     ORDER BY created_at DESC LIMIT 1),
    ''
  ),
  COUNT(*)::integer,
  MAX(CASE WHEN ta.total_questions > 0
    THEN ROUND((ta.score::numeric / ta.total_questions) * 100)
    ELSE 0
  END)::smallint,
  (SELECT CASE WHEN sub.total_questions > 0
    THEN ROUND((sub.score::numeric / sub.total_questions) * 100)
    ELSE 0
  END FROM public.test_attempts sub
   WHERE sub.user_id = ta.user_id AND sub.assessment_type = ta.assessment_type
   ORDER BY sub.created_at DESC LIMIT 1)::smallint,
  COALESCE(SUM(ta.time_taken_seconds), 0)::integer,
  MAX(ta.created_at),
  now()
FROM public.test_attempts ta
GROUP BY ta.user_id, ta.assessment_type
ON CONFLICT (user_id, assessment_type) DO NOTHING;
