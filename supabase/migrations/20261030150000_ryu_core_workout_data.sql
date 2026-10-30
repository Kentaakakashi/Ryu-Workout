-- Ryu core data schema. All personal records are owned by an authenticated user.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 40)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index workout_sessions_user_completed_idx on public.workout_sessions(user_id, completed_at desc);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  reps integer check (reps is null or reps >= 0),
  load_kg numeric(7,2) check (load_kg is null or load_kg >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, set_number)
);
create index workout_sets_user_completed_idx on public.workout_sets(user_id, completed_at desc);
create index workout_sets_session_idx on public.workout_sets(session_id);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  units text not null default 'metric' check (units in ('metric','imperial')),
  reminders_enabled boolean not null default false,
  rest_timer_seconds integer not null default 60 check (rest_timer_seconds between 15 and 600),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can read own workout sessions" on public.workout_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own workout sessions" on public.workout_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own workout sessions" on public.workout_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own workout sessions" on public.workout_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own workout sets" on public.workout_sets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own workout sets" on public.workout_sets for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy "Users can update own workout sets" on public.workout_sets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
create policy "Users can delete own workout sets" on public.workout_sets for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own settings" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own settings" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own settings" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
