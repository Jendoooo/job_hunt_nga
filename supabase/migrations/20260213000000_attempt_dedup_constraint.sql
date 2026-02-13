-- Phase 19: Prevent server-side duplicate attempt inserts
-- Step 1: Remove existing semantic duplicates, keeping the earliest insert per fingerprint.
--         Two rows are considered duplicates if they share the same
--         (user_id, assessment_type, score, total_questions, time_taken_seconds).
DELETE FROM public.test_attempts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, assessment_type, score, total_questions, time_taken_seconds
             ORDER BY created_at ASC
           ) AS rn
    FROM public.test_attempts
    WHERE time_taken_seconds IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Now that duplicates are removed, add the unique index to prevent future ones.
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_attempts_semantic_dedup
  ON public.test_attempts (user_id, assessment_type, score, total_questions, time_taken_seconds)
  WHERE time_taken_seconds IS NOT NULL;
