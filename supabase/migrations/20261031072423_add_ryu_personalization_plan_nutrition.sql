-- Ryu personalisation, approved plan proposals and core nutrition data.
create table if not exists public.fitness_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_years smallint check (age_years between 13 and 110),
  height_cm numeric(5,2) check (height_cm is null or height_cm between 80 and 250),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg between 20 and 400),
  sex_for_energy_estimate text check (sex_for_energy_estimate is null or sex_for_energy_estimate in ('female','male','prefer_not_to_say')),
  primary_goal text not null,
  focus_areas text[] not null default '{}',
  experience_level text not null check (experience_level in ('beginner','some_experience','experienced')),
  equipment text[] not null default '{}',
  available_days smallint[] not null default '{}',
  session_minutes smallint not null check (session_minutes between 5 and 180),
  activity_level text not null default 'light' check (activity_level in ('sedentary','light','moderate','very_active')),
  diet_pattern text not null default 'no_restrictions',
  dietary_restrictions text[] not null default '{}',
  allergies text[] not null default '{}',
  cuisine_preferences text[] not null default '{}',
  food_budget text not null default 'flexible',
  limitations text not null default '',
  timezone text not null default 'UTC',
  onboarding_status text not null default 'draft' check (onboarding_status in ('draft','completed')),
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 12),
  profile_version integer not null default 1 check (profile_version > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fitness_profiles_available_days_count check (cardinality(available_days) <= 7)
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_version integer not null,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft','awaiting_approval','active','rejected','superseded')),
  title text not null,
  summary text not null,
  overview jsonb not null default '{}'::jsonb,
  body_assessment jsonb not null default '{}'::jsonb,
  profile_snapshot jsonb not null default '{}'::jsonb,
  generation_model text,
  generation_id uuid not null default gen_random_uuid(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, version),
  unique (user_id, generation_id),
  unique (id, user_id)
);
create index if not exists training_plans_user_created_idx on public.training_plans(user_id, created_at desc);
create index if not exists training_plans_user_status_idx on public.training_plans(user_id, status);

create table if not exists public.training_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  day_type text not null check (day_type in ('workout','recovery','rest')),
  title text not null,
  focus text not null default '',
  session_minutes smallint check (session_minutes is null or session_minutes between 5 and 180),
  description text not null default '',
  user_customized boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (plan_id, weekday),
  unique (id, user_id),
  foreign key (plan_id, user_id) references public.training_plans(id, user_id) on delete cascade
);
create index if not exists training_plan_days_user_weekday_idx on public.training_plan_days(user_id, weekday);

create table if not exists public.planned_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sort_order smallint not null default 0,
  exercise_slug text not null,
  exercise_name text not null,
  instructions text not null default '',
  equipment text[] not null default '{}',
  sets smallint not null check (sets between 1 and 8),
  reps_min smallint check (reps_min is null or reps_min between 1 and 100),
  reps_max smallint check (reps_max is null or reps_max between 1 and 150),
  duration_seconds smallint check (duration_seconds is null or duration_seconds between 5 and 900),
  rest_seconds smallint not null default 60 check (rest_seconds between 0 and 600),
  alternatives jsonb not null default '[]'::jsonb,
  unique (plan_day_id, sort_order),
  foreign key (plan_day_id, user_id) references public.training_plan_days(id, user_id) on delete cascade,
  constraint planned_exercises_rep_range check (reps_min is null or reps_max is null or reps_min <= reps_max)
);
create index if not exists planned_exercises_user_day_idx on public.planned_exercises(user_id, plan_day_id);

create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  energy_mode text not null check (energy_mode in ('estimated_range','guidance_only','professional_review')),
  calorie_min integer,
  calorie_max integer,
  energy_rationale text not null default '',
  fueling_summary text not null default '',
  protein_guidance text not null default '',
  hydration_guidance text not null default '',
  safety_note text not null default '',
  created_at timestamptz not null default now(),
  unique (plan_id),
  unique (id, user_id),
  foreign key (plan_id, user_id) references public.training_plans(id, user_id) on delete cascade,
  constraint nutrition_energy_mode_values check (
    (energy_mode = 'estimated_range' and calorie_min is not null and calorie_max is not null and calorie_min > 0 and calorie_max >= calorie_min)
    or (energy_mode in ('guidance_only','professional_review') and calorie_min is null and calorie_max is null)
  )
);

create table if not exists public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  nutrition_plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  meal_slot text not null check (meal_slot in ('breakfast','lunch','snack','dinner')),
  name text not null,
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  portion_guidance text not null default '',
  estimated_calories integer check (estimated_calories is null or estimated_calories between 0 and 2000),
  estimated_protein_g numeric(6,2) check (estimated_protein_g is null or estimated_protein_g between 0 and 250),
  estimated_carbs_g numeric(6,2) check (estimated_carbs_g is null or estimated_carbs_g between 0 and 350),
  estimated_fat_g numeric(6,2) check (estimated_fat_g is null or estimated_fat_g between 0 and 200),
  preparation_minutes smallint check (preparation_minutes is null or preparation_minutes between 0 and 240),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (nutrition_plan_id, user_id) references public.nutrition_plans(id, user_id) on delete cascade
);
create index if not exists planned_meals_user_day_idx on public.planned_meals(user_id, weekday, meal_slot);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_meal_id uuid,
  eaten_at timestamptz not null default now(),
  meal_slot text not null check (meal_slot in ('breakfast','lunch','snack','dinner','other')),
  food_name text not null,
  portion_text text not null default '',
  calories_kcal integer check (calories_kcal is null or calories_kcal between 0 and 5000),
  protein_g numeric(7,2) check (protein_g is null or protein_g between 0 and 500),
  carbs_g numeric(7,2) check (carbs_g is null or carbs_g between 0 and 1000),
  fat_g numeric(7,2) check (fat_g is null or fat_g between 0 and 500),
  source text not null default 'manual' check (source in ('manual','planned_meal','nutrition_database')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_eaten_idx on public.food_logs(user_id, eaten_at desc);

alter table public.fitness_profiles enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_plan_days enable row level security;
alter table public.planned_exercises enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.planned_meals enable row level security;
alter table public.food_logs enable row level security;

drop policy if exists "Users manage own fitness profile" on public.fitness_profiles;
create policy "Users manage own fitness profile" on public.fitness_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own training plans" on public.training_plans;
create policy "Users manage own training plans" on public.training_plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own training plan days" on public.training_plan_days;
create policy "Users manage own training plan days" on public.training_plan_days for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own planned exercises" on public.planned_exercises;
create policy "Users manage own planned exercises" on public.planned_exercises for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own nutrition plans" on public.nutrition_plans;
create policy "Users manage own nutrition plans" on public.nutrition_plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own planned meals" on public.planned_meals;
create policy "Users manage own planned meals" on public.planned_meals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own food logs" on public.food_logs;
create policy "Users manage own food logs" on public.food_logs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.fitness_profiles to authenticated;
grant select, insert, update, delete on public.training_plans to authenticated;
grant select, insert, update, delete on public.training_plan_days to authenticated;
grant select, insert, update, delete on public.planned_exercises to authenticated;
grant select, insert, update, delete on public.nutrition_plans to authenticated;
grant select, insert, update, delete on public.planned_meals to authenticated;
grant select, insert, update, delete on public.food_logs to authenticated;
