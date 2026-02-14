-- ============================================================
-- RPC function to save test attempts — bypasses PostgREST UPSERT
-- Created: 2026-02-14
--
-- The Supabase JS client's .upsert() consistently timed out in
-- the browser (>15s) even though PostgREST responds in <1s via
-- curl. Switching to an RPC call eliminates the UPSERT/RLS
-- interaction that caused the hang.
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_test_attempt(
  p_id uuid,
  p_user_id uuid,
  p_assessment_type text,
  p_module_name text DEFAULT '',
  p_score integer DEFAULT 0,
  p_total_questions integer DEFAULT 0,
  p_score_pct smallint DEFAULT NULL,
  p_time_taken_seconds integer DEFAULT NULL,
  p_mode text DEFAULT 'practice',
  p_answers jsonb DEFAULT NULL,
  p_created_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Security: ensure the authenticated user owns this attempt
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized: caller does not own this attempt';
  END IF;

  -- Plain INSERT. The BEFORE INSERT trigger (handle_new_attempt)
  -- still fires to compute score_pct and upsert user_progress.
  -- ON CONFLICT DO NOTHING makes retries safe without errors.
  INSERT INTO test_attempts (
    id, user_id, assessment_type, module_name,
    score, total_questions, score_pct,
    time_taken_seconds, mode, answers, created_at
  )
  VALUES (
    p_id, p_user_id, p_assessment_type, p_module_name,
    p_score, p_total_questions, p_score_pct,
    p_time_taken_seconds, p_mode, p_answers, p_created_at
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;
