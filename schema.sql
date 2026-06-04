-- Setup Schema for Placement Accountability Dashboard (Rishit & Rohit)
-- Execute this SQL code in your Supabase SQL Editor.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (Rishit & Rohit)
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null, -- 'rohit' or 'rishit'
  display_name text not null,    -- 'Rohit' or 'Rishit'
  avatar_url text,
  color_accent text not null,    -- 'yellow' or 'blue'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tasks (Daily Planner)
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  start_time text,               -- e.g. "10:30 AM"
  end_time text,                 -- e.g. "12:00 PM"
  category text not null,        -- 'DSA', 'Aptitude', 'CS Fundamentals', 'Projects', 'Gym', 'Personal'
  date date default current_date not null,
  assign_to text default 'both' not null, -- 'both' | 'rohit' | 'rishit'
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Task Completions (Tracks completion status per user for each task)
create table if not exists public.task_completions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed boolean default false not null,
  completed_at timestamp with time zone,
  unique(task_id, user_id)
);

-- 4. DSA Sessions (DSA Journal)
create table if not exists public.dsa_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  topic text not null,
  questions_count integer default 0 not null,
  leetcode_questions text[] not null, -- Array of LeetCode titles
  difficulty_easy integer default 0 not null,
  difficulty_medium integer default 0 not null,
  difficulty_hard integer default 0 not null,
  time_spent integer not null, -- in minutes
  notes text,
  date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Placement Progress (Overall stats)
create table if not exists public.placement_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_topic text,
  topics_completed text[] default '{}'::text[] not null,
  upcoming_topics text[] default '{}'::text[] not null,
  interview_prep_progress integer default 0 not null, -- 0-100
  leetcode_easy_offset integer default 0 not null,
  leetcode_medium_offset integer default 0 not null,
  leetcode_hard_offset integer default 0 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Streaks (Tracks daily consistency)
create table if not exists public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  last_active_date date,
  weekly_consistency numeric default 0.0 not null, -- consistency percentage
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Penalties (Penalty tracker)
create table if not exists public.penalties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  penalty_type text not null, -- 'dsa_miss' | 'cs_miss' | 'gym_miss' | 'custom'
  description text not null,
  penalty_value text not null, -- e.g. "2 extra questions"
  status text default 'pending' not null, -- 'pending' | 'resolved'
  date_incurred date default current_date not null,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Activity Feed (Audit log)
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null, -- 'task_completed' | 'dsa_session_added' | 'topic_completed' | 'streak_milestone' | 'penalty_incurred' | 'penalty_resolved'
  description text not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Weekly Reports
create table if not exists public.weekly_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start_date date not null,
  study_hours numeric default 0.0 not null,
  questions_solved integer default 0 not null,
  topics_covered text[] default '{}'::text[] not null,
  consistency_score integer default 0 not null,
  improvement_suggestions text[] default '{}'::text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, week_start_date)
);

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.dsa_sessions;
alter publication supabase_realtime add table public.placement_progress;
alter publication supabase_realtime add table public.streaks;
alter publication supabase_realtime add table public.penalties;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.weekly_reports;

-- Seed Initial Profiles
insert into public.profiles (id, username, display_name, color_accent) 
values 
  ('11111111-1111-1111-1111-111111111111', 'rohit', 'Rohit', 'yellow'),
  ('22222222-2222-2222-2222-222222222222', 'rishit', 'Rishit', 'blue')
on conflict (username) do update 
set display_name = excluded.display_name, color_accent = excluded.color_accent;

-- Seed Initial Streaks
insert into public.streaks (user_id, current_streak, longest_streak, weekly_consistency)
values
  ('11111111-1111-1111-1111-111111111111', 0, 0, 0.0),
  ('22222222-2222-2222-2222-222222222222', 0, 0, 0.0)
on conflict (user_id) do nothing;

-- Seed Initial Placement Tracker
insert into public.placement_progress (user_id, current_topic, topics_completed, upcoming_topics, interview_prep_progress)
values
  ('11111111-1111-1111-1111-111111111111', 'Arrays & Hashing', '{}'::text[], '{"Strings", "Linked Lists", "Trees", "Graphs", "DP"}'::text[], 0),
  ('22222222-2222-2222-2222-222222222222', 'Arrays & Hashing', '{}'::text[], '{"Strings", "Linked Lists", "Trees", "Graphs", "DP"}'::text[], 0)
on conflict (user_id) do nothing;

-- DISABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- This ensures that anonymous frontend client calls are not blocked by default RLS policies.
alter table public.profiles disable row level security;
alter table public.tasks disable row level security;
alter table public.task_completions disable row level security;
alter table public.dsa_sessions disable row level security;
alter table public.placement_progress disable row level security;
alter table public.streaks disable row level security;
alter table public.penalties disable row level security;
alter table public.activities disable row level security;
alter table public.weekly_reports disable row level security;
