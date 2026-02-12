-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;

create policy "Users can view their own profile" 
  on profiles for select 
  using ( auth.uid() = id );

create policy "Users can update their own profile" 
  on profiles for update 
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TEST_ATTEMPTS TABLE
create table test_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  assessment_type text not null, -- 'saville-aptitude', 'technical', 'ai-generated'
  module_name text not null,
  score integer not null,
  total_questions integer not null,
  answers jsonb, -- Store the full answers object
  time_taken_seconds integer,
  mode text, -- 'practice' or 'exam'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Test Attempts
alter table test_attempts enable row level security;

create policy "Users can view their own attempts" 
  on test_attempts for select 
  using ( auth.uid() = user_id );

create policy "Users can insert their own attempts" 
  on test_attempts for insert 
  with check ( auth.uid() = user_id );


-- 3. AI_EXPLANATIONS CACHE TABLE
create table ai_explanations (
  id uuid default uuid_generate_v4() primary key,
  question_hash text unique not null, -- Hash of the question text to identify duplicates
  explanation text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for AI Explanations (Read-only for authenticated users)
alter table ai_explanations enable row level security;

create policy "Authenticated users can view explanations" 
  on ai_explanations for select 
  to authenticated
  using ( true );

-- Only service role can insert (via Edge Function)
-- No insert policy for public/authenticated users
