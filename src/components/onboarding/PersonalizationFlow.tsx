import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2,
  ChevronDown, Clock3, Dumbbell, Flame, Footprints, HeartPulse, Leaf, Lock,
  Plus, ShieldCheck, Sparkles, Target, Timer, Trophy, Utensils, WandSparkles, Waves,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { ShinyText, SpotlightCard } from '../effects/ReactBits';
import './personalization-flow.css';

type Goal = 'build_muscle' | 'strength' | 'lose_fat' | 'recomposition' | 'athletic_fitness' | 'general_health';
type Equipment = 'bodyweight' | 'dumbbells' | 'resistance_bands' | 'pullup_bar' | 'gym_access';
type DayType = 'workout' | 'recovery' | 'rest';

type FitnessProfile = {
  age_years: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex_for_energy_estimate: 'female' | 'male' | 'prefer_not_to_say' | null;
  primary_goal: Goal;
  focus_areas: string[];
  experience_level: 'beginner' | 'some_experience' | 'experienced';
  equipment: Equipment[];
  available_days: number[];
  session_minutes: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active';
  diet_pattern: string;
  dietary_restrictions: string[];
  allergies: string[];
  cuisine_preferences: string[];
  food_budget: string;
  limitations: string;
  timezone: string;
  onboarding_status: 'draft' | 'completed';
  onboarding_step: number;
  profile_version: number;
};

type PlanExercise = {
  id?: string;
  exercise_slug: string;
  exercise_name: string;
  instructions: string;
  equipment: string[];
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  duration_seconds: number | null;
  rest_seconds: number;
  alternatives: string[];
  sort_order?: number;
};

type PlanDay = {
  id: string;
  weekday: number;
  day_type: DayType;
  title: string;
  focus: string;
  session_minutes: number | null;
  description: string;
  user_customized: boolean;
  exercises: PlanExercise[];
};

type Meal = {
  id?: string;
  weekday: number;
  meal_slot: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  name: string;
  description: string;
  ingredients: string[];
  portion_guidance: string;
  estimated_calories: number | null;
  preparation_minutes: number | null;
};

type PlanReview = {
  id: string;
  title: string;
  summary: string;
  status: string;
  overview: {
    title?: string;
    coach_message?: string;
    weekly_focus?: string;
    milestones?: { week: number; title: string; description: string }[];
  };
  body_assessment: {
    mode: string;
    category?: string;
    label: string;
    bmi: number | null;
    explanation: string;
  };
  nutrition: {
    energy_mode: 'estimated_range' | 'guidance_only' | 'professional_review';
    calorie_min: number | null;
    calorie_max: number | null;
    energy_rationale: string;
    fueling_summary: string;
    protein_guidance: string;
    hydration_guidance: string;
    safety_note: string;
    meals: Meal[];
  };
  days: PlanDay[];
};

const WEEKDAYS = [
  { value: 0, label: 'Sun', full: 'Sunday' },
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
];

const FOCUS_OPTIONS = ['Full body', 'Arms', 'Chest', 'Back', 'Shoulders', 'Abs & core', 'Legs', 'Glutes', 'Mobility', 'Conditioning'];
const EXERCISES: { slug: string; name: string; equipment: Equipment[]; focus: string }[] = [
  { slug: 'wall_push_up', name: 'Wall push-up', equipment: ['bodyweight'], focus: 'Chest · Arms' },
  { slug: 'incline_push_up', name: 'Incline push-up', equipment: ['bodyweight'], focus: 'Chest · Arms' },
  { slug: 'knee_push_up', name: 'Knee push-up', equipment: ['bodyweight'], focus: 'Chest · Arms' },
  { slug: 'push_up', name: 'Push-up', equipment: ['bodyweight'], focus: 'Chest · Arms' },
  { slug: 'pike_push_up', name: 'Pike push-up', equipment: ['bodyweight'], focus: 'Shoulders' },
  { slug: 'bodyweight_squat', name: 'Bodyweight squat', equipment: ['bodyweight'], focus: 'Legs · Glutes' },
  { slug: 'reverse_lunge', name: 'Reverse lunge', equipment: ['bodyweight'], focus: 'Legs · Glutes' },
  { slug: 'glute_bridge', name: 'Glute bridge', equipment: ['bodyweight'], focus: 'Glutes' },
  { slug: 'calf_raise', name: 'Standing calf raise', equipment: ['bodyweight'], focus: 'Legs' },
  { slug: 'dead_bug', name: 'Dead bug', equipment: ['bodyweight'], focus: 'Core' },
  { slug: 'bird_dog', name: 'Bird dog', equipment: ['bodyweight'], focus: 'Core · Back' },
  { slug: 'plank', name: 'Plank', equipment: ['bodyweight'], focus: 'Core' },
  { slug: 'side_plank', name: 'Side plank', equipment: ['bodyweight'], focus: 'Core' },
  { slug: 'mountain_climber', name: 'Mountain climber', equipment: ['bodyweight'], focus: 'Core · Conditioning' },
  { slug: 'superman', name: 'Superman hold', equipment: ['bodyweight'], focus: 'Back' },
  { slug: 'band_row', name: 'Resistance-band row', equipment: ['resistance_bands'], focus: 'Back · Arms' },
  { slug: 'band_pull_apart', name: 'Band pull-apart', equipment: ['resistance_bands'], focus: 'Back · Shoulders' },
  { slug: 'dumbbell_row', name: 'Dumbbell row', equipment: ['dumbbells'], focus: 'Back · Arms' },
  { slug: 'dumbbell_press', name: 'Dumbbell floor press', equipment: ['dumbbells'], focus: 'Chest · Arms' },
  { slug: 'dumbbell_rdl', name: 'Dumbbell Romanian deadlift', equipment: ['dumbbells'], focus: 'Legs · Glutes' },
  { slug: 'dumbbell_curl', name: 'Dumbbell curl', equipment: ['dumbbells'], focus: 'Arms' },
  { slug: 'gym_lat_pulldown', name: 'Lat pulldown', equipment: ['gym_access'], focus: 'Back' },
  { slug: 'gym_leg_press', name: 'Leg press', equipment: ['gym_access'], focus: 'Legs' },
  { slug: 'gym_chest_press', name: 'Machine chest press', equipment: ['gym_access'], focus: 'Chest' },
  { slug: 'gym_seated_row', name: 'Seated cable row', equipment: ['gym_access'], focus: 'Back' },
  { slug: 'assisted_pull_up', name: 'Foot-assisted pull-up', equipment: ['pullup_bar'], focus: 'Back · Arms' },
];

const SEX_CHOICES: { value: NonNullable<FitnessProfile['sex_for_energy_estimate']>; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const EXPERIENCE_CHOICES: { value: FitnessProfile['experience_level']; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: "I'm new or returning after a break." },
  { value: 'some_experience', label: 'Some experience', description: 'I know the basics and have trained before.' },
  { value: 'experienced', label: 'Experienced', description: 'I train consistently and know my movements.' },
];

const INITIAL_PROFILE: FitnessProfile = {
  age_years: null,
  height_cm: null,
  weight_kg: null,
  sex_for_energy_estimate: null,
  primary_goal: 'build_muscle',
  focus_areas: ['Full body'],
  experience_level: 'beginner',
  equipment: ['bodyweight'],
  available_days: [1, 3, 5],
  session_minutes: 45,
  activity_level: 'light',
  diet_pattern: 'no_restrictions',
  dietary_restrictions: [],
  allergies: [],
  cuisine_preferences: ['Indian'],
  food_budget: 'budget_friendly',
  limitations: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  onboarding_status: 'draft',
  onboarding_step: 0,
  profile_version: 1,
};

const GOALS: { value: Goal; title: string; description: string; icon: ReactNode }[] = [
  { value: 'build_muscle', title: 'Build muscle', description: 'Develop strength and muscle gradually', icon: <Dumbbell size={18} /> },
  { value: 'strength', title: 'Get stronger', description: 'Build foundational strength', icon: <Trophy size={18} /> },
  { value: 'recomposition', title: 'Build a balanced physique', description: 'Improve strength and overall fitness', icon: <Target size={18} /> },
  { value: 'lose_fat', title: 'Improve body composition', description: 'Build sustainable health habits', icon: <Activity size={18} /> },
  { value: 'athletic_fitness', title: 'Athletic performance', description: 'Improve movement and conditioning', icon: <Flame size={18} /> },
  { value: 'general_health', title: 'Feel healthier', description: 'Move more and build consistency', icon: <HeartPulse size={18} /> },
];

function parseList(value: string) {
  return value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 12);
}

async function fetchPlanReview(userId: string, planRow: Record<string, any>): Promise<PlanReview> {
  const [daysResult, nutritionResult] = await Promise.all([
    supabase.from('training_plan_days').select('*').eq('plan_id', planRow.id).eq('user_id', userId).order('weekday'),
    supabase.from('nutrition_plans').select('*').eq('plan_id', planRow.id).eq('user_id', userId).maybeSingle(),
  ]);
  if (daysResult.error) throw daysResult.error;
  const dayIds = (daysResult.data ?? []).map(row => row.id);
  const [exerciseResult, mealResult] = await Promise.all([
    dayIds.length
      ? supabase.from('planned_exercises').select('*').eq('user_id', userId).in('plan_day_id', dayIds).order('sort_order')
      : Promise.resolve({ data: [], error: null }),
    nutritionResult.data
      ? supabase.from('planned_meals').select('*').eq('nutrition_plan_id', nutritionResult.data.id).eq('user_id', userId).order('weekday')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (exerciseResult.error) throw exerciseResult.error;
  if (mealResult.error) throw mealResult.error;
  const exercises = exerciseResult.data ?? [];
  return {
    id: planRow.id,
    title: planRow.title,
    summary: planRow.summary,
    status: planRow.status,
    overview: planRow.overview ?? {},
    body_assessment: planRow.body_assessment ?? {},
    nutrition: {
      ...(nutritionResult.data ?? {}),
      meals: mealResult.data ?? [],
    } as PlanReview['nutrition'],
    days: (daysResult.data ?? []).map(day => ({
      ...day,
      exercises: exercises.filter(exercise => exercise.plan_day_id === day.id) as PlanExercise[],
    })) as PlanDay[],
  };
}

export function PersonalizationFlow({
  userId, displayName, onApproved,
}: { userId: string; displayName: string; onApproved: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'wizard' | 'generating' | 'overview'>('loading');
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<FitnessProfile>(INITIAL_PROFILE);
  const [plan, setPlan] = useState<PlanReview | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [profileResult, planResult] = await Promise.all([
        supabase.from('fitness_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('training_plans').select('*').eq('user_id', userId).in('status', ['awaiting_approval', 'draft']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      if (profileResult.error) {
        setError('Your training profile could not be loaded. Check your connection and retry.');
        setPhase('wizard');
        return;
      }
      const savedProfile = profileResult.data
        ? { ...INITIAL_PROFILE, ...profileResult.data, age_years: profileResult.data.age_years == null ? null : Number(profileResult.data.age_years) } as FitnessProfile
        : INITIAL_PROFILE;
      setProfile(savedProfile);
      setStep(Math.min(4, Number(savedProfile.onboarding_step ?? 0)));
      if (planResult.error) {
        setError('Your saved plan proposal could not be loaded. You can still continue your personalisation.');
        setPhase('wizard');
        return;
      }
      if (planResult.data) {
        try {
          const loadedPlan = await fetchPlanReview(userId, planResult.data);
          if (!cancelled) {
            setPlan(loadedPlan);
            setPhase('overview');
          }
        } catch {
          if (!cancelled) {
            setError('The saved plan is incomplete. Regenerate it from your saved answers.');
            setPhase('wizard');
          }
        }
      } else {
        setPhase('wizard');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  function updateProfile<K extends keyof FitnessProfile>(key: K, value: FitnessProfile[K]) {
    setProfile(current => ({ ...current, [key]: value }));
    setError('');
  }

  async function saveDraft(nextStep: number, completed = false) {
    const payload = {
      ...profile,
      age_years: Number(profile.age_years),
      user_id: userId,
      onboarding_step: nextStep,
      onboarding_status: completed ? 'completed' : 'draft',
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await withTimeout(
      supabase.from('fitness_profiles').upsert(payload, { onConflict: 'user_id' }),
      15000,
      'Saving your profile is taking too long. Check your connection and try again.',
    );
    if (saveError) throw saveError;
    setProfile(current => ({ ...current, onboarding_step: nextStep, onboarding_status: completed ? 'completed' : 'draft' }));
  }

  async function moveStep(direction: -1 | 1) {
    if (saving) return;
    setError('');
    if (direction === 1 && step === 0 && (profile.age_years === null || !Number.isInteger(profile.age_years) || profile.age_years < 13 || profile.age_years > 110)) {
      setError('Enter your age so Ryu can use age-appropriate training and nutrition guidance.');
      return;
    }
    if (direction === 1 && step === 2 && profile.available_days.length === 0) {
      setError('Choose at least one day you can train.');
      return;
    }
    if (direction === 1 && step === 2 && profile.equipment.length === 0) {
      setError('Choose the equipment you have access to. Bodyweight-only is a valid option.');
      return;
    }
    setSaving(true);
    try {
      const nextStep = Math.max(0, Math.min(4, step + direction));
      await saveDraft(nextStep);
      setStep(nextStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your answers could not be saved. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  async function persistGeneratedPlan(generated: Record<string, any>) {
    const { data: latest, error: latestError } = await supabase.from('training_plans')
      .select('version').eq('user_id', userId).order('version', { ascending: false }).limit(1).maybeSingle();
    if (latestError) throw latestError;
    const version = Number(latest?.version ?? 0) + 1;
    const planOverview = generated.overview ?? {};
    const { data: planRow, error: planError } = await supabase.from('training_plans').insert({
      user_id: userId,
      profile_version: profile.profile_version,
      version,
      status: 'awaiting_approval',
      title: planOverview.title || 'Your Ryu plan',
      summary: planOverview.summary || 'A plan built around your goals and available days.',
      overview: planOverview,
      body_assessment: generated.body_assessment ?? {},
      profile_snapshot: profile,
      generation_model: generated.model || 'gemini-3.8-flash',
    }).select('*').single();
    if (planError || !planRow) throw planError ?? new Error('The plan could not be saved.');

    try {
      const schedule = Array.isArray(generated.schedule) ? generated.schedule : [];
      const dayPayload = schedule.map((day: Record<string, any>) => ({
        plan_id: planRow.id,
        user_id: userId,
        weekday: day.weekday,
        day_type: day.day_type,
        title: day.title,
        focus: day.focus,
        session_minutes: day.session_minutes,
        description: day.description,
        sort_order: day.weekday,
      }));
      const { data: savedDays, error: daysError } = await supabase.from('training_plan_days').insert(dayPayload).select('*');
      if (daysError) throw daysError;
      const exerciseCatalog = new Map(EXERCISES.map(item => [item.slug, item]));
      const exercisePayload = (savedDays ?? []).flatMap(day => {
        const sourceDay = schedule.find((item: Record<string, any>) => item.weekday === day.weekday);
        return (sourceDay?.exercises ?? []).map((exercise: Record<string, any>, index: number) => {
          const catalog = exerciseCatalog.get(exercise.exercise_slug);
          return {
            plan_day_id: day.id,
            user_id: userId,
            sort_order: index,
            exercise_slug: exercise.exercise_slug,
            exercise_name: catalog?.name ?? exercise.exercise_slug,
            instructions: exercise.instructions ?? '',
            equipment: catalog?.equipment ?? [],
            sets: exercise.sets,
            reps_min: exercise.reps_min,
            reps_max: exercise.reps_max,
            duration_seconds: exercise.duration_seconds,
            rest_seconds: exercise.rest_seconds,
            alternatives: exercise.alternatives ?? [],
          };
        });
      });
      if (exercisePayload.length) {
        const { error: exercisesError } = await supabase.from('planned_exercises').insert(exercisePayload);
        if (exercisesError) throw exercisesError;
      }

      const nutrition = generated.nutrition ?? {};
      const { data: nutritionRow, error: nutritionError } = await supabase.from('nutrition_plans').insert({
        plan_id: planRow.id,
        user_id: userId,
        energy_mode: nutrition.energy_mode ?? 'guidance_only',
        calorie_min: nutrition.calorie_min ?? null,
        calorie_max: nutrition.calorie_max ?? null,
        energy_rationale: nutrition.energy_rationale ?? '',
        fueling_summary: nutrition.fueling_summary ?? '',
        protein_guidance: nutrition.protein_guidance ?? '',
        hydration_guidance: nutrition.hydration_guidance ?? '',
        safety_note: nutrition.safety_note ?? '',
      }).select('id').single();
      if (nutritionError || !nutritionRow) throw nutritionError ?? new Error('Nutrition plan could not be saved.');

      const mealPayload = (nutrition.meals ?? []).map((meal: Record<string, any>) => ({
        nutrition_plan_id: nutritionRow.id,
        user_id: userId,
        weekday: meal.weekday,
        meal_slot: meal.meal_slot,
        name: meal.name,
        description: meal.description,
        ingredients: meal.ingredients ?? [],
        portion_guidance: meal.portion_guidance ?? '',
        preparation_minutes: meal.preparation_minutes ?? null,
      }));
      if (mealPayload.length) {
        const { error: mealsError } = await supabase.from('planned_meals').insert(mealPayload);
        if (mealsError) throw mealsError;
      }
      return await fetchPlanReview(userId, planRow);
    } catch (err) {
      await supabase.from('training_plans').delete().eq('id', planRow.id).eq('user_id', userId);
      throw err;
    }
  }

  async function generatePlan() {
    if (saving) return;
    setError('');
    setNotice('');
    setSaving(true);
    setPhase('generating');
    try {
      await saveDraft(4, true);
      const { data, error: invokeError } = await withTimeout(
        supabase.functions.invoke('generate-ryu-plan', { body: {} }),
        60000,
        'Ryu is taking too long to build your blueprint. Your answers are saved — retry in a moment, and check the AI key if it keeps happening.',
      );
      if (invokeError) {
        const context = (invokeError as unknown as { context?: Response }).context;
        if (context) {
          try {
            const payload = await context.clone().json();
            throw new Error(payload.error || invokeError.message);
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError;
          }
        }
        throw invokeError;
      }
      if (data?.error) throw new Error(data.error);
      const savedPlan = await persistGeneratedPlan(data);
      setPlan(savedPlan);
      setPhase('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ryu could not build your plan. Your answers are saved; you can retry.');
      setPhase('wizard');
      setStep(4);
    } finally {
      setSaving(false);
    }
  }

  async function saveSchedule(nextDays: PlanDay[]) {
    if (!plan) return;
    setSaving(true);
    setError('');
    try {
      const selectedDays = nextDays.filter(day => day.day_type === 'workout' || day.day_type === 'recovery').map(day => day.weekday);
      if (!selectedDays.length) throw new Error('Keep at least one training or recovery day in your weekly plan.');
      const { error: profileError } = await supabase.from('fitness_profiles')
        .update({ available_days: selectedDays, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (profileError) throw profileError;
      for (const day of nextDays) {
        const { error: dayError } = await supabase.from('training_plan_days').update({
          day_type: day.day_type,
          title: day.title,
          focus: day.focus,
          session_minutes: day.day_type === 'rest' ? null : day.session_minutes,
          description: day.description,
          user_customized: true,
        }).eq('id', day.id).eq('user_id', userId);
        if (dayError) throw dayError;
        const { error: deleteError } = await supabase.from('planned_exercises').delete()
          .eq('plan_day_id', day.id).eq('user_id', userId);
        if (deleteError) throw deleteError;
        if (day.day_type !== 'rest' && day.exercises.length) {
          const rows = day.exercises.map((exercise, index) => ({
            plan_day_id: day.id,
            user_id: userId,
            sort_order: index,
            exercise_slug: exercise.exercise_slug,
            exercise_name: exercise.exercise_name,
            instructions: exercise.instructions,
            equipment: exercise.equipment,
            sets: exercise.sets,
            reps_min: exercise.reps_min,
            reps_max: exercise.reps_max,
            duration_seconds: exercise.duration_seconds,
            rest_seconds: exercise.rest_seconds,
            alternatives: exercise.alternatives,
          }));
          const { error: exerciseError } = await supabase.from('planned_exercises').insert(rows);
          if (exerciseError) throw exerciseError;
        }
      }
      setPlan(current => current ? { ...current, days: nextDays } : current);
      setNotice('Your weekly schedule has been saved to your Ryu account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The schedule could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function approvePlan() {
    if (!plan || saving) return;
    setSaving(true);
    setError('');
    try {
      const { error: supersedeError } = await supabase.from('training_plans')
        .update({ status: 'superseded', updated_at: new Date().toISOString() })
        .eq('user_id', userId).eq('status', 'active');
      if (supersedeError) throw supersedeError;
      const { error: approveError } = await supabase.from('training_plans').update({
        status: 'active',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', plan.id).eq('user_id', userId);
      if (approveError) throw approveError;
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your plan could not be activated. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  const availableExercises = useMemo(() => EXERCISES.filter(exercise =>
    exercise.equipment.every(item => profile.equipment.includes(item))
  ), [profile.equipment]);

  if (phase === 'loading') {
    return <div className="ryu-personalization-loading"><span className="ryu-ai-orb"><WandSparkles size={25} /></span><p>Preparing your personal training space…</p></div>;
  }

  if (phase === 'generating') {
    return <div className="ryu-personalization-loading ryu-personalization-generating">
      <motion.span className="ryu-ai-orb" animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 22px rgba(185,255,36,.12)', '0 0 70px rgba(185,255,36,.35)', '0 0 22px rgba(185,255,36,.12)'] }} transition={{ duration: 2.1, repeat: Infinity }}><WandSparkles size={29} /></motion.span>
      <span className="ryu-overline"><ShinyText>RYU / PERSONAL INTELLIGENCE</ShinyText></span>
      <h2>Building your blueprint.</h2><p>Matching your goals, schedule, equipment and food preferences.</p>
      <div className="ryu-generating-steps"><span><Check size={13} /> Reading your profile</span><span><Sparkles size={13} /> Designing your week</span><span><Utensils size={13} /> Planning your meals</span></div>
    </div>;
  }

  if (phase === 'wizard') {
    const steps = ['Your goal', 'Your starting point', 'Your time & tools', 'Your food & recovery', 'Your blueprint'];
    const canGoNext = step < 4;
    const toggleString = (list: string[], value: string) => list.includes(value) ? list.filter(item => item !== value) : [...list, value];
    const toggleDay = (day: number) => updateProfile('available_days', profile.available_days.includes(day) ? profile.available_days.filter(item => item !== day) : [...profile.available_days, day].sort());

    return <div className="ryu-personalization ryu-onboarding">
      <div className="ryu-personal-top"><button className="ryu-brand-mini" type="button" aria-label="Ryu"><span className="ryu-brand-mark"><Activity size={18} /></span><span>RYU<span>.</span></span></button><span className="ryu-overline">YOUR PERSONAL COACH</span></div>
      <div className="ryu-onboarding-hero">
        <span className="ryu-overline"><ShinyText>LET'S MAKE THIS YOURS</ShinyText></span>
        <h1>Fitness that<br/><span>fits your life.</span></h1>
        <p>Answer a few things. Ryu will shape a plan around your real schedule, equipment and goals.</p>
      </div>
      <div className="ryu-onboarding-progress">
        <div className="ryu-onboarding-progress__meta"><span>PERSONALISATION / 0{step + 1}</span><strong>{steps[step]}</strong></div>
        <div className="ryu-onboarding-progress__track">{steps.map((item, index) => <i key={item} className={index <= step ? 'is-complete' : ''}/>)}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section key={step} className="ryu-onboarding-panel" initial={{ opacity: 0, y: 15, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24 }}>
          {step === 0 && <>
            <span className="ryu-overline">01 / INTENTION</span><h2>What are you working toward?</h2><p>Choose the direction that feels right. Your plan can evolve as you do.</p>
            <div className="ryu-goal-grid">{GOALS.map(goal => <button key={goal.value} type="button" className={'ryu-goal-option' + (profile.primary_goal === goal.value ? ' is-selected' : '')} onClick={() => updateProfile('primary_goal', goal.value)}><span>{goal.icon}</span><strong>{goal.title}</strong><small>{goal.description}</small>{profile.primary_goal === goal.value && <i><Check size={12}/></i>}</button>)}</div>
            <div className="ryu-onboard-field"><label htmlFor="ryu-age">How old are you?</label><input id="ryu-age" type="number" min="13" max="110" value={profile.age_years || ''} onChange={event => updateProfile('age_years', Number(event.target.value))} placeholder="Your age" /><small>Ryu uses age to keep exercise and nutrition guidance appropriate.</small></div>
            <div className="ryu-onboard-field"><label>Which areas would you like to focus on?</label><div className="ryu-chip-grid">{FOCUS_OPTIONS.map(item => <button type="button" key={item} className={profile.focus_areas.includes(item) ? 'is-selected' : ''} onClick={() => updateProfile('focus_areas', toggleString(profile.focus_areas, item))}>{item}</button>)}</div></div>
          </>}

          {step === 1 && (
            <>
              <span className="ryu-overline">02 / YOUR STARTING POINT</span>
              <h2>Let's understand your baseline.</h2>
              <p>Measurements are optional, but they help Ryu make the overview more useful. You can skip either one.</p>
              <div className="ryu-measurement-grid">
                <label>
                  <span>HEIGHT</span>
                  <div>
                    <input type="number" min="80" max="250" step="0.1" value={profile.height_cm ?? ''} onChange={event => updateProfile('height_cm', event.target.value ? Number(event.target.value) : null)} placeholder="165" />
                    <b>cm</b>
                  </div>
                </label>
                <label>
                  <span>WEIGHT</span>
                  <div>
                    <input type="number" min="20" max="400" step="0.1" value={profile.weight_kg ?? ''} onChange={event => updateProfile('weight_kg', event.target.value ? Number(event.target.value) : null)} placeholder="55" />
                    <b>kg</b>
                  </div>
                </label>
              </div>
              {profile.age_years !== null && profile.age_years >= 18 && (
                <div className="ryu-onboard-field">
                  <label>Optional: which equation category should Ryu use for an adult energy estimate?</label>
                  <p>This is used only for a broad energy estimate, not for identity or access decisions.</p>
                  <div className="ryu-choice-row">
                    {SEX_CHOICES.map(choice => (
                      <button
                        type="button"
                        key={choice.value}
                        className={profile.sex_for_energy_estimate === choice.value ? 'is-selected' : ''}
                        onClick={() => updateProfile('sex_for_energy_estimate', choice.value)}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="ryu-onboard-field">
                <label>How experienced are you with training?</label>
                <div className="ryu-choice-stack">
                  {EXPERIENCE_CHOICES.map(choice => (
                    <button
                      type="button"
                      key={choice.value}
                      className={profile.experience_level === choice.value ? 'is-selected' : ''}
                      onClick={() => updateProfile('experience_level', choice.value)}
                    >
                      <strong>{choice.label}</strong>
                      <small>{choice.description}</small>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && <>
            <span className="ryu-overline">03 / YOUR REAL LIFE</span><h2>When and where do you train?</h2><p>Ryu will never schedule a workout on a day you haven't made available.</p>
            <div className="ryu-onboard-field"><label>Days you can work out</label><div className="ryu-day-picker">{WEEKDAYS.map(day=><button type="button" key={day.value} className={profile.available_days.includes(day.value)?'is-selected':''} onClick={()=>toggleDay(day.value)}><small>{day.label}</small><strong>{profile.available_days.includes(day.value)?<Check size={16}/>:day.label.slice(0,1)}</strong></button>)}</div></div>
            <div className="ryu-onboard-field"><label>Time available per session</label><div className="ryu-choice-row">{[15,20,30,45,60,90].map(value=><button type="button" key={value} className={profile.session_minutes===value?'is-selected':''} onClick={()=>updateProfile('session_minutes',value)}>{value} min</button>)}</div></div>
            <div className="ryu-onboard-field"><label>Equipment you can access</label><div className="ryu-equipment-grid">{[
              {value:'bodyweight',label:'Bodyweight only',desc:'No equipment needed',icon:<Activity size={17}/>},
              {value:'dumbbells',label:'Dumbbells',desc:'A pair or adjustable set',icon:<Dumbbell size={17}/>},
              {value:'resistance_bands',label:'Resistance bands',desc:'Bands and loops',icon:<Waves size={17}/>},
              {value:'pullup_bar',label:'Pull-up bar',desc:'Doorway or mounted bar',icon:<ArrowRight size={17}/>},
              {value:'gym_access',label:'Full gym',desc:'Machines and free weights',icon:<Footprints size={17}/>}
            ].map(item=><button type="button" key={item.value} className={profile.equipment.includes(item.value as Equipment)?'is-selected':''} onClick={()=>updateProfile('equipment',item.value==='bodyweight' ? (profile.equipment.includes('bodyweight') ? profile.equipment : ['bodyweight',...profile.equipment]) : toggleString(profile.equipment,item.value) as Equipment[])}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.desc}</small></button>)}</div><small>Bodyweight is always available. Choose all additional equipment you can reliably access.</small></div>
            <div className="ryu-onboard-field"><label>How active are you outside workouts?</label><select value={profile.activity_level} onChange={event=>updateProfile('activity_level',event.target.value as FitnessProfile['activity_level'])}><option value="sedentary">Mostly sitting</option><option value="light">Light daily movement</option><option value="moderate">Moderately active</option><option value="very_active">Very active most days</option></select></div>
          </>}

          {step === 3 && <>
            <span className="ryu-overline">04 / FUEL & RECOVERY</span><h2>Food should fit your world.</h2><p>Ryu will suggest meals you can realistically prepare and enjoy.</p>
            <div className="ryu-onboard-field"><label>How do you eat?</label><div className="ryu-choice-stack">{[{value:'no_restrictions',label:'No restrictions'},{value:'vegetarian',label:'Vegetarian'},{value:'vegan',label:'Vegan'},{value:'eggetarian',label:'Vegetarian + eggs'},{value:'pescatarian',label:'Pescatarian'}].map(item=><button type="button" key={item.value} className={profile.diet_pattern===item.value?'is-selected':''} onClick={()=>updateProfile('diet_pattern',item.value)}><strong>{item.label}</strong></button>)}</div></div>
            <div className="ryu-onboard-field"><label htmlFor="ryu-allergies">Allergies (comma separated)</label><input id="ryu-allergies" value={profile.allergies.join(', ')} onChange={event=>updateProfile('allergies',parseList(event.target.value))} placeholder="e.g. peanuts, shellfish"/></div>
            <div className="ryu-onboard-field"><label htmlFor="ryu-restrictions">Other food restrictions</label><input id="ryu-restrictions" value={profile.dietary_restrictions.join(', ')} onChange={event=>updateProfile('dietary_restrictions',parseList(event.target.value))} placeholder="e.g. lactose-free, no beef"/></div>
            <div className="ryu-onboard-field"><label htmlFor="ryu-cuisine">Food you enjoy or cuisine preferences</label><input id="ryu-cuisine" value={profile.cuisine_preferences.join(', ')} onChange={event=>updateProfile('cuisine_preferences',parseList(event.target.value))} placeholder="e.g. South Indian, simple home food"/></div>
            <div className="ryu-onboard-field"><label>Food budget</label><select value={profile.food_budget} onChange={event=>updateProfile('food_budget',event.target.value)}><option value="budget_friendly">Budget friendly</option><option value="moderate">Moderate</option><option value="flexible">Flexible</option></select></div>
            <div className="ryu-onboard-field"><label htmlFor="ryu-limitations">Anything Ryu should be careful about?</label><textarea id="ryu-limitations" rows={3} value={profile.limitations} onChange={event=>updateProfile('limitations',event.target.value)} placeholder="Optional: pain, movements to avoid, medical guidance already given, or recovery concerns."/></div>
          </>}

          {step === 4 && <>
            <span className="ryu-overline">05 / YOUR BLUEPRINT</span><h2>Here's what Ryu knows.</h2><p>Check these details. Your plan will be built around this information, not a generic template.</p>
            <div className="ryu-review-grid">
              <div><small>AGE</small><strong>{profile.age_years === null ? 'Not supplied' : profile.age_years + ' years'}</strong></div>
              <div><small>GOAL</small><strong>{GOALS.find(item=>item.value===profile.primary_goal)?.title}</strong></div>
              <div><small>TIME</small><strong>{profile.session_minutes} min / session</strong></div>
              <div><small>EXPERIENCE</small><strong>{profile.experience_level.replace('_',' ')}</strong></div>
              <div><small>HEIGHT</small><strong>{profile.height_cm ? profile.height_cm+' cm' : 'Not supplied'}</strong></div>
              <div><small>WEIGHT</small><strong>{profile.weight_kg ? profile.weight_kg+' kg' : 'Not supplied'}</strong></div>
            </div>
            <div className="ryu-review-strip"><span><CalendarDays size={16}/>{profile.available_days.length} available days</span><span><Dumbbell size={16}/>{profile.equipment.length} equipment options</span><span><Utensils size={16}/>{profile.diet_pattern.replace('_',' ')}</span></div>
            <div className="ryu-onboard-safety"><ShieldCheck size={17}/><p>Ryu will explain measurement context carefully. For people under 18, it will not use adult BMI labels or fixed calorie targets. AI suggestions are a starting point, not medical advice.</p></div>
          </>}
        </motion.section>
      </AnimatePresence>

      {error && <div className="ryu-flow-error" role="alert">{error}</div>}
      <div className="ryu-onboarding-actions">
        {step > 0 && <button className="ryu-flow-back" type="button" onClick={()=>void moveStep(-1)} disabled={saving}><ArrowLeft size={15}/> Back</button>}
        {canGoNext
          ? <button className="ryu-flow-next" type="button" onClick={()=>void moveStep(1)} disabled={saving}>{saving?'Saving…':'Continue'} <ArrowRight size={16}/></button>
          : <button className="ryu-flow-next" type="button" onClick={()=>void generatePlan()} disabled={saving}>{saving?'Building your plan…':'Build my personal plan'} <WandSparkles size={16}/></button>}
      </div>
      <p className="ryu-onboarding-foot"><Lock size={12}/> Your personal profile is private to your Ryu account.</p>
    </div>;
  }

  if (!plan) return <div className="ryu-personalization-loading"><p>No plan proposal was found. Return to the final step and generate it again.</p><button className="ryu-flow-next" onClick={()=>{setStep(4);setPhase('wizard');}}>Back to plan generation</button></div>;

  return <PlanOverview
    plan={plan}
    profile={profile}
    displayName={displayName}
    saving={saving}
    error={error}
    notice={notice}
    availableExercises={availableExercises}
    onSaveSchedule={saveSchedule}
    onApprove={approvePlan}
    onEditAnswers={()=>{setStep(0);setPhase('wizard');setError('');}}
  />;
}

function PlanOverview({
  plan, profile, displayName, saving, error, notice, availableExercises, onSaveSchedule, onApprove, onEditAnswers,
}: {
  plan: PlanReview;
  profile: FitnessProfile;
  displayName: string;
  saving: boolean;
  error: string;
  notice: string;
  availableExercises: typeof EXERCISES;
  onSaveSchedule: (days: PlanDay[]) => Promise<void>;
  onApprove: () => Promise<void>;
  onEditAnswers: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<PlanDay[]>(plan.days);
  const [selectedMealDay, setSelectedMealDay] = useState(0);
  const [localError, setLocalError] = useState('');
  const displayDays = plan.days;
  const weeklyTrainingDays = days.filter(day=>day.day_type!=='rest').length;
  const isMinor = profile.age_years !== null && profile.age_years < 18;
  const coachName = displayName.trim().split(/\s+/)[0] || 'Athlete';

  function updateDay(weekday: number, patch: Partial<PlanDay>) {
    setDays(current=>current.map(day=>day.weekday===weekday?{...day,...patch}:day));
  }
  function toggleTrainingDay(day: PlanDay) {
    if (day.day_type==='rest') {
      const first = availableExercises.slice(0, 3).map((item,index)=>({
        exercise_slug:item.slug, exercise_name:item.name, instructions:'Move with control and use a comfortable range.', equipment:item.equipment,
        sets:2, reps_min:8, reps_max:12, duration_seconds:null, rest_seconds:60, alternatives:[], sort_order:index,
      }));
      updateDay(day.weekday,{day_type:'workout',title:FOCUS_OPTIONS[0]+' session',focus:FOCUS_OPTIONS[0],session_minutes:profile.session_minutes,exercises:first,user_customized:true});
    } else {
      updateDay(day.weekday,{day_type:'rest',session_minutes:null,exercises:[],title:'Rest and recover',focus:'Recovery',user_customized:true});
    }
  }
  function toggleExercise(day: PlanDay, exercise: typeof EXERCISES[number]) {
    const current = day.exercises ?? [];
    const exists = current.some(item=>item.exercise_slug===exercise.slug);
    const next = exists ? current.filter(item=>item.exercise_slug!==exercise.slug) : [...current,{
      exercise_slug:exercise.slug,exercise_name:exercise.name,instructions:'Use controlled movement and stop if it causes pain.',
      equipment:exercise.equipment,sets:2,reps_min:8,reps_max:12,duration_seconds:null,rest_seconds:60,alternatives:[],
    }];
    updateDay(day.weekday,{exercises:next.slice(0,6),user_customized:true});
  }
  async function saveEdits() {
    setLocalError('');
    if (days.filter(day=>day.day_type!=='rest').length<1) {
      setLocalError('Keep at least one training or recovery day in your week.');
      return;
    }
    if (days.some(day=>day.day_type!=='rest' && day.exercises.length===0)) {
      setLocalError('Add at least one movement to each training day, or mark it as a rest day.');
      return;
    }
    await onSaveSchedule(days);
    setEditing(false);
  }

  const selectedMeals = plan.nutrition.meals.filter(meal=>meal.weekday===selectedMealDay);
  const dayTabs = WEEKDAYS;
  const energyEstimated = plan.nutrition.energy_mode==='estimated_range' && plan.nutrition.calorie_min && plan.nutrition.calorie_max;

  return <div className="ryu-personalization ryu-plan-overview">
    <div className="ryu-personal-top"><span className="ryu-overline">RYU / YOUR PERSONAL BLUEPRINT</span><span className="ryu-plan-proposal"><Sparkles size={12}/> PLAN PROPOSAL</span></div>
    <SpotlightCard className="ryu-plan-hero" radius={22} intensity={0.16}>
      <div className="ryu-plan-hero__orbit"/>
      <span className="ryu-overline"><ShinyText>BUILT FOR {coachName.toUpperCase()}</ShinyText></span>
      <h1>{plan.overview.title || plan.title}</h1>
      <p>{plan.summary}</p>
      <div className="ryu-plan-hero__coach"><span><WandSparkles size={16}/></span><div><small>YOUR COACH SAYS</small><strong>{plan.overview.coach_message || 'Your plan is ready. Let’s make it yours.'}</strong></div></div>
      <div className="ryu-plan-hero__meta"><span><CalendarDays size={13}/>{weeklyTrainingDays} training days / week</span><span><Clock3 size={13}/>{profile.session_minutes} min sessions</span></div>
    </SpotlightCard>

    <section className="ryu-assessment-section">
      <div className="ryu-flow-section-head"><div><span className="ryu-overline">YOUR STARTING POINT</span><h2>The numbers behind your plan.</h2><p>A clear read on the information you shared.</p></div><button type="button" onClick={onEditAnswers}>Edit profile</button></div>
      <div className="ryu-assessment-metrics">
        <div><span>AGE</span><strong>{profile.age_years}<small> yrs</small></strong><i>Training context</i></div>
        <div><span>HEIGHT</span><strong>{profile.height_cm ? <>{profile.height_cm}<small> cm</small></> : '—'}</strong><i>{profile.height_cm?'Profile measurement':'Not supplied'}</i></div>
        <div><span>WEIGHT</span><strong>{profile.weight_kg ? <>{profile.weight_kg}<small> kg</small></> : '—'}</strong><i>{profile.weight_kg?'Profile measurement':'Not supplied'}</i></div>
      </div>
      <SpotlightCard className={'ryu-body-assessment '+(plan.body_assessment.mode==='growth_context'?'is-growth':'')} radius={17} intensity={0.09}>
        <span className="ryu-body-assessment__icon"><HeartPulse size={20}/></span>
        <div><span className="ryu-overline">BODY CONTEXT / NOT A DIAGNOSIS</span><h3>{plan.body_assessment.label}</h3><p>{plan.body_assessment.explanation}</p></div>
        {plan.body_assessment.bmi!==null&&<strong className="ryu-body-assessment__value">{plan.body_assessment.bmi}<small> BMI</small></strong>}
      </SpotlightCard>
    </section>

    <section className="ryu-energy-section">
      <div className="ryu-flow-section-head"><div><span className="ryu-overline">DAILY NUTRITION GUIDANCE</span><h2>Fuel your progress.</h2><p>Food guidance tailored to your age and available information.</p></div><span className="ryu-energy-emblem"><Utensils size={18}/></span></div>
      <SpotlightCard className="ryu-energy-card" radius={18} intensity={0.11}>
        {energyEstimated ? <>
          <span className="ryu-overline">ESTIMATED ADULT ENERGY RANGE</span>
          <strong className="ryu-energy-value">{plan.nutrition.calorie_min?.toLocaleString()}–{plan.nutrition.calorie_max?.toLocaleString()}<small> kcal / day</small></strong>
          <p>{plan.nutrition.energy_rationale}</p>
        </> : <>
          <span className="ryu-overline">{isMinor?'GROWTH-FIRST NUTRITION':'PERSONALISED GUIDANCE'}</span>
          <strong className="ryu-energy-guidance">{plan.nutrition.energy_mode==='professional_review'?'Let’s review this with a professional.':isMinor?'No fixed calorie target.':'Balanced guidance, not a guessed number.'}</strong>
          <p>{plan.nutrition.energy_rationale}</p>
        </>}
        <div className="ryu-energy-points"><span><CheckCircle2 size={13}/> {plan.nutrition.fueling_summary}</span><span><CheckCircle2 size={13}/> {plan.nutrition.protein_guidance}</span><span><CheckCircle2 size={13}/> {plan.nutrition.hydration_guidance}</span></div>
        <small className="ryu-energy-safety">{plan.nutrition.safety_note}</small>
      </SpotlightCard>
    </section>

    <section className="ryu-week-plan-section">
      <div className="ryu-flow-section-head"><div><span className="ryu-overline">YOUR WEEK, DESIGNED</span><h2>A rhythm you can follow.</h2><p>{plan.overview.weekly_focus || 'Training days placed around the availability you selected.'}</p></div><button type="button" onClick={()=>setEditing(value=>!value)}>{editing?'Close editor':'Make it yours'} <ChevronDown size={14}/></button></div>
      {editing && <div className="ryu-schedule-editor">
        <div className="ryu-schedule-editor__intro"><span><WandSparkles size={16}/></span><div><strong>Build your own week.</strong><small>Choose your training days, focus and exact exercises. Your original AI proposal stays saved until you save these edits.</small></div></div>
        {WEEKDAYS.map(day=>{
          const entry=days.find(item=>item.weekday===day.value);
          if(!entry)return null;
          return <div className="ryu-editor-day" key={day.value}>
            <div className="ryu-editor-day__head"><div><small>{day.full.toUpperCase()}</small><strong>{entry.day_type==='rest'?'Rest day':entry.title}</strong></div><button type="button" className={entry.day_type==='rest'?'':'is-on'} onClick={()=>toggleTrainingDay(entry)}>{entry.day_type==='rest'?<Plus size={14}/>:<Check size={14}/>} {entry.day_type==='rest'?'Add workout':'Training day'}</button></div>
            {entry.day_type!=='rest'&&<>
              <div className="ryu-editor-fields"><label>FOCUS<select value={entry.focus} onChange={event=>updateDay(day.value,{focus:event.target.value,title:event.target.value+' session',user_customized:true})}>{FOCUS_OPTIONS.map(option=><option key={option}>{option}</option>)}</select></label><label>MINUTES<input type="number" min="5" max={profile.session_minutes} value={entry.session_minutes??profile.session_minutes} onChange={event=>updateDay(day.value,{session_minutes:Math.min(profile.session_minutes,Math.max(5,Number(event.target.value)||5)),user_customized:true})}/></label></div>
              <div className="ryu-editor-exercises"><small>CHOOSE MOVEMENTS · {entry.exercises.length}/6</small><div>{availableExercises.map(exercise=><button type="button" key={exercise.slug} className={entry.exercises.some(item=>item.exercise_slug===exercise.slug)?'is-selected':''} onClick={()=>toggleExercise(entry,exercise)} disabled={!entry.exercises.some(item=>item.exercise_slug===exercise.slug)&&entry.exercises.length>=6}>{entry.exercises.some(item=>item.exercise_slug===exercise.slug)?<Check size={11}/>:<Plus size={11}/>} {exercise.name}</button>)}</div></div>
            </>}
          </div>;
        })}
        {localError&&<p className="ryu-flow-error">{localError}</p>}
        <div className="ryu-editor-actions"><button type="button" className="ryu-flow-back" onClick={()=>setDays(plan.days)}>Discard edits</button><button type="button" className="ryu-flow-next" onClick={()=>void saveEdits()} disabled={saving}>{saving?'Saving…':'Save my weekly plan'} <Check size={15}/></button></div>
      </div>}
      <div className="ryu-week-plan-grid">{displayDays.map(day=><motion.article layout key={day.weekday} className={'ryu-plan-day '+(day.day_type==='rest'?'is-rest':'is-workout')}>
        <div className="ryu-plan-day__top"><span>{WEEKDAYS[day.weekday].label}</span><small>{day.day_type==='rest'?'REST':day.day_type==='recovery'?'RECOVERY':'TRAIN'}</small></div>
        <h3>{day.title}</h3><p>{day.focus || day.description}</p>
        {day.day_type!=='rest'?<><div className="ryu-plan-day__meta"><span><Timer size={12}/>{day.session_minutes} min</span><span><Dumbbell size={12}/>{day.exercises.length} moves</span></div><div className="ryu-plan-day__moves">{day.exercises.slice(0,3).map(exercise=><span key={exercise.id||exercise.exercise_slug}>{exercise.exercise_name}</span>)}{day.exercises.length>3&&<span>+{day.exercises.length-3} more</span>}</div></>:<span className="ryu-rest-label"><Leaf size={13}/> Recovery is part of the plan</span>}
      </motion.article>)}</div>
    </section>

    <section className="ryu-meal-plan-section">
      <div className="ryu-flow-section-head"><div><span className="ryu-overline">YOUR FOOD BLUEPRINT</span><h2>Meals that fit your life.</h2><p>Ideas, ingredients and portions. You will log what you actually eat separately.</p></div><span className="ryu-meal-count">{plan.nutrition.meals.length} IDEAS</span></div>
      <div className="ryu-meal-day-tabs">{dayTabs.map(day=><button type="button" key={day.value} className={selectedMealDay===day.value?'is-active':''} onClick={()=>setSelectedMealDay(day.value)}>{day.label}</button>)}</div>
      <div className="ryu-plan-meals-grid">{selectedMeals.map((meal,index)=><article className="ryu-plan-meal" key={meal.id||meal.name+index}>
        <span className="ryu-plan-meal__slot">{meal.meal_slot.toUpperCase()}</span><h3>{meal.name}</h3><p>{meal.description}</p><div className="ryu-plan-meal__ingredients">{meal.ingredients.slice(0,5).map(item=><span key={item}>{item}</span>)}</div><small>{meal.portion_guidance}</small>{meal.preparation_minutes&&<em><Clock3 size={11}/> {meal.preparation_minutes} min prep</em>}
      </article>)}
      {!selectedMeals.length&&<div className="ryu-plan-meal-empty">No meal suggestions are scheduled for this day.</div>}</div>
    </section>

    {(plan.overview.milestones?.length??0)>0&&<section className="ryu-milestones-section">
      <div className="ryu-flow-section-head"><div><span className="ryu-overline">WHAT WE'RE BUILDING TOWARD</span><h2>Milestones, not promises.</h2><p>Progress markers focus on skills, consistency and habits—not guaranteed body changes.</p></div><Trophy size={19}/></div>
      <div className="ryu-milestone-grid">{plan.overview.milestones?.map((item,index)=><div key={item.week+'-'+index}><span>WEEK {item.week}</span><strong>{item.title}</strong><p>{item.description}</p></div>)}</div>
    </section>}

    {notice&&<p className="ryu-flow-success"><CheckCircle2 size={14}/>{notice}</p>}
    {error&&<p className="ryu-flow-error">{error}</p>}
    <div className="ryu-plan-approve-bar"><div><span className="ryu-overline">READY WHEN YOU ARE</span><strong>Your plan. Your call.</strong><small>You can keep refining it as your life changes.</small></div><button className="ryu-flow-next" type="button" onClick={()=>void onApprove()} disabled={saving}>{saving?'Saving…':'Approve my plan'} <ArrowRight size={16}/></button></div>
  </div>;
}
