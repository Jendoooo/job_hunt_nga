-- ============================================================
-- JobHunt Nigeria Platform — Initial Schema
-- Created: 2026-02-12
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PROFILES
-- One row per auth.users entry, auto-created via trigger below.
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read and update only their own profile.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ----------------------------------------------------------------
-- 2. TEST ATTEMPTS
-- One row per completed assessment session.
-- ----------------------------------------------------------------
create table if not exists public.test_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  assessment_type     text not null,
  module_name         text,
  score               integer not null default 0,
  total_questions     integer not null default 0,
  time_taken_seconds  integer,
  mode                text,
  answers             jsonb,
  created_at          timestamptz not null default now()
);

alter table public.test_attempts enable row level security;

-- Users can insert and read only their own attempts.
create policy "test_attempts_insert_own"
  on public.test_attempts for insert
  with check (auth.uid() = user_id);

create policy "test_attempts_select_own"
  on public.test_attempts for select
  using (auth.uid() = user_id);

-- Index for fast per-user ordered queries (Dashboard recent activity).
create index if not exists idx_test_attempts_user_created
  on public.test_attempts (user_id, created_at desc);

-- ----------------------------------------------------------------
-- 3. AI EXPLANATIONS
-- Cache for AI-generated answer explanations to reduce API costs.
-- ----------------------------------------------------------------
create table if not exists public.ai_explanations (
  id           uuid primary key default gen_random_uuid(),
  question_id  text not null unique,
  explanation  text not null,
  created_at   timestamptz not null default now()
);

alter table public.ai_explanations enable row level security;

-- All authenticated users can read cached explanations.
create policy "ai_explanations_select_authenticated"
  on public.ai_explanations for select
  using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- 4. TRIGGER — auto-create profile on new user signup
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
