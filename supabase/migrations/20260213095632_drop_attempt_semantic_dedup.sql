-- ============================================================
-- Drop semantic attempt de-dup index (was blocking legitimate repeats)
-- Created: 2026-02-13
-- ============================================================

-- This unique index prevented users from recording multiple legitimate attempts
-- that happened to share the same (score / total / time), which is common for
-- timed modules and practice retakes. Client-side guards already prevent strict
-- mode double-inserts for the same attempt.
DROP INDEX IF EXISTS public.idx_test_attempts_semantic_dedup;

