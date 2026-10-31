-- Ryu feature expansion: personal workout templates, quest reward ledger, and cloud preferences.
alter table public.user_settings
  add column if not exists sound_enabled boolean not null default false,
  add column if not exists default_plan text not null default 'foundation';

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 48),
  description text not null default '' check (char_length(description) <= 140),
  exercises jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_templates_exercises_shape
    check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) between 1 and 12)
);
create index if not exists workout_templates_user_updated_idx
  on public.workout_templates(user_id, updated_at desc);

alter table public.workout_templates enable row level security;
drop policy if exists "Users can read own workout templates" on public.workout_templates;
create policy "Users can read own workout templates"
  on public.workout_templates for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own workout templates" on public.workout_templates;
create policy "Users can create own workout templates"
  on public.workout_templates for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own workout templates" on public.workout_templates;
create policy "Users can update own workout templates"
  on public.workout_templates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own workout templates" on public.workout_templates;
create policy "Users can delete own workout templates"
  on public.workout_templates for delete to authenticated
  using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.workout_templates to authenticated;

create table if not exists public.daily_quest_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_date date not null,
  quest_key text not null check (quest_key in ('first-session','set-builder','time-invested')),
  xp_awarded integer not null check (xp_awarded between 1 and 100),
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_date, quest_key)
);
create index if not exists daily_quest_claims_user_date_idx
  on public.daily_quest_claims(user_id, quest_date desc);

alter table public.daily_quest_claims enable row level security;
drop policy if exists "Users can read own daily quest claims" on public.daily_quest_claims;
create policy "Users can read own daily quest claims"
  on public.daily_quest_claims for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own daily quest claims" on public.daily_quest_claims;
create policy "Users can create own daily quest claims"
  on public.daily_quest_claims for insert to authenticated
  with check ((select auth.uid()) = user_id);
grant select, insert on public.daily_quest_claims to authenticated;

create index if not exists workout_sets_user_exercise_pr_idx
  on public.workout_sets(user_id, exercise_id, load_kg desc, reps desc);
