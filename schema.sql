-- Safe Setup Script for JobHunt Nigeria
-- Wraps creation in IF NOT EXISTS checks to prevent errors if tables already exist.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles (Enable if not already enabled)
alter table profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own profile') then
    create policy "Users can view their own profile" on profiles for select using ( auth.uid() = id );
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile" on profiles for update using ( auth.uid() = id );
  end if;
end $$;

-- Trigger for new user handling
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing; -- Prevent error if profile exists
  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger to ensure it's up to date
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TEST_ATTEMPTS TABLE
create table if not exists test_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  assessment_type text not null,
  module_name text not null,
  score integer not null,
  total_questions integer not null,
  answers jsonb,
  time_taken_seconds integer,
  mode text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Test Attempts
alter table test_attempts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own attempts') then
    create policy "Users can view their own attempts" on test_attempts for select using ( auth.uid() = user_id );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own attempts') then
    create policy "Users can insert their own attempts" on test_attempts for insert with check ( auth.uid() = user_id );
  end if;
end $$;


-- 3. AI_EXPLANATIONS CACHE TABLE
create table if not exists ai_explanations (
  id uuid default uuid_generate_v4() primary key,
  question_hash text unique not null,
  explanation text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for AI Explanations
alter table ai_explanations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can view explanations') then
    create policy "Authenticated users can view explanations" on ai_explanations for select to authenticated using ( true );
  end if;
end $$;
