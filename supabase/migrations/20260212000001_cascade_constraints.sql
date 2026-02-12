-- ============================================================
-- JobHunt Nigeria Platform — Cascade Constraints
-- Created: 2026-02-12
-- Applied via: fix_delete.sql after initial schema was live.
-- Ensures orphaned profile/attempt rows are deleted automatically
-- when an auth.users row is deleted from the Supabase dashboard.
-- ============================================================

-- profiles.id → auth.users.id  (CASCADE)
alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id)
    references auth.users (id)
    on delete cascade;

-- test_attempts.user_id → auth.users.id  (CASCADE)
alter table public.test_attempts
  drop constraint if exists test_attempts_user_id_fkey,
  add constraint test_attempts_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete cascade;
