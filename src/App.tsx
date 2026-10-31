import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { RpgProgression } from './components/rpg/RpgProgression';
import { PersonalizationFlow } from './components/onboarding/PersonalizationFlow';
import { ClickSpark, SpotlightCard } from './components/effects/ReactBits';
import { DailyQuestBoard, PersonalRecordBoard, type DailyQuest, type PersonalRecord } from './components/features/TrainingExtras';
import {
  Activity, ArrowDownRight, ArrowRight, Award, Bell, Check, CheckCheck,
  Clock3, Dumbbell, Flame, Footprints, Gauge, ArrowUpRight, UserRound,
  Home, Pause, Play, Plus, RotateCcw, Search, Settings2, Utensils, Leaf,
  ShieldCheck, Timer, Trophy, TrendingUp, Waves, X, Zap
} from 'lucide-react';

type Tab = 'home' | 'train' | 'progress' | 'discover' | 'meals' | 'profile' | 'auth';
type AppAccess = 'signed_out' | 'checking' | 'profile_required' | 'onboarding' | 'active';
type ExerciseLog = { value: number; unit: 'REPS' | 'SEC'; loadKg: number | null; completedAt: string };
type Exercise = { id: string; name: string; detail: string; target: number; unit: string; rest: number; done: number; repTarget?: number; loadKg?: number; measure?: 'reps' | 'seconds'; setLogs?: ExerciseLog[] };
type WorkoutPlan = { id: string; name: string; sub: string; time: string; level: string; exercises: Exercise[]; description?: string };
type Session = { id: string; title: string; date: string; duration: number; xp: number; sets: number };
type UserSettingsRow = { units: 'metric' | 'imperial'; reminders_enabled: boolean; rest_timer_seconds: number; sound_enabled: boolean; default_plan: string };
type Notice = { id: number; title: string; subtitle: string; kind: 'success' | 'achievement' | 'info'; priority: number; persistent?: boolean };

const starterExercises: Exercise[] = [
  { id: 'push', name: 'Push-ups', detail: 'Chest · Triceps', target: 4, unit: 'sets', rest: 60, done: 0, repTarget: 12, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'squat', name: 'Bodyweight squats', detail: 'Quads · Glutes', target: 4, unit: 'sets', rest: 60, done: 0, repTarget: 15, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'plank', name: 'Plank hold', detail: 'Core · Stability', target: 3, unit: 'sets', rest: 45, done: 0, repTarget: 30, loadKg: 0, measure: 'seconds', setLogs: [] },
  { id: 'lunge', name: 'Reverse lunges', detail: 'Legs · Balance', target: 3, unit: 'sets', rest: 60, done: 0, repTarget: 10, loadKg: 0, measure: 'reps', setLogs: [] },
];
const routineExerciseLibrary: Exercise[] = [
  ...starterExercises,
  { id: 'pike', name: 'Pike push-ups', detail: 'Shoulders · Triceps', target: 3, unit: 'sets', rest: 75, done: 0, repTarget: 8, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'diamond', name: 'Close-grip push-ups', detail: 'Triceps · Chest', target: 3, unit: 'sets', rest: 60, done: 0, repTarget: 8, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'bridge', name: 'Glute bridges', detail: 'Glutes · Hamstrings', target: 3, unit: 'sets', rest: 45, done: 0, repTarget: 15, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'mountain', name: 'Mountain climbers', detail: 'Core · Conditioning', target: 3, unit: 'sets', rest: 45, done: 0, repTarget: 30, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'deadbug', name: 'Dead bugs', detail: 'Core · Control', target: 3, unit: 'sets', rest: 45, done: 0, repTarget: 10, loadKg: 0, measure: 'reps', setLogs: [] },
  { id: 'calf', name: 'Standing calf raises', detail: 'Calves · Ankles', target: 3, unit: 'sets', rest: 45, done: 0, repTarget: 20, loadKg: 0, measure: 'reps', setLogs: [] },
];

const plans = [
  { id: 'foundation', name: 'Full body foundation', sub: 'A balanced, no-equipment session', time: '25 MIN', level: 'STARTER', exercises: starterExercises },
  { id: 'upper', name: 'Upper-body focus', sub: 'Push strength and shoulder control', time: '20 MIN', level: 'FOUNDATION', exercises: [starterExercises[0], { id: 'pike', name: 'Pike push-ups', detail: 'Shoulders · Triceps', target: 3, unit: 'sets', rest: 75, done: 0 }, { id: 'diamond', name: 'Close-grip push-ups', detail: 'Triceps · Chest', target: 3, unit: 'sets', rest: 60, done: 0 }] },
  { id: 'legs', name: 'Leg day, no excuses', sub: 'Control, range and steady strength', time: '22 MIN', level: 'FOUNDATION', exercises: [starterExercises[1], starterExercises[3], { id: 'bridge', name: 'Glute bridges', detail: 'Glutes · Hamstrings', target: 3, unit: 'sets', rest: 45, done: 0 }] },
];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mergePersonalRecords(current: PersonalRecord[], incoming: PersonalRecord[]) {
  const records = new Map(current.map(record => [record.exerciseId, record]));
  incoming.forEach(candidate => {
    const previous = records.get(candidate.exerciseId);
    if (!previous || previous.unit !== candidate.unit) {
      records.set(candidate.exerciseId, candidate);
      return;
    }
    const candidateLoad = candidate.loadKg ?? 0;
    const previousLoad = previous.loadKg ?? 0;
    if (candidateLoad > previousLoad || (candidateLoad === previousLoad && candidate.value > previous.value)) {
      records.set(candidate.exerciseId, candidate);
    }
  });
  return [...records.values()].sort((a, b) => {
    const byLoad = (b.loadKg ?? 0) - (a.loadKg ?? 0);
    return byLoad || b.value - a.value;
  });
}

function nextLevelTitle(level: number) {
  return level >= 40 ? 'Legend' : level >= 20 ? 'Ascendant' : level >= 10 ? 'Vanguard' : level >= 5 ? 'Disciple' : level >= 3 ? 'Initiate' : 'Novice';
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function readStore<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('auth');
  const [appAccess, setAppAccess] = useState<AppAccess>('checking');
  const [account, setAccount] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailability, setUsernameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'unknown'>('idle');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [sessions, setSessions] = useState<Session[]>(() => readStore('ryu.sessions', []));
  const [customPlans, setCustomPlans] = useState<WorkoutPlan[]>(() => readStore('ryu.customPlans', []));
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('');
  const [customPlanDescription, setCustomPlanDescription] = useState('');
  const [customExerciseIds, setCustomExerciseIds] = useState<string[]>(['push', 'squat', 'plank']);
  const [planSaving, setPlanSaving] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(() => readStore('ryu.personalRecords', []));
  const [bonusXp, setBonusXp] = useState(0);
  const todayQuestKey = localDateKey(new Date());
  const [claimedQuestKeys, setClaimedQuestKeys] = useState<string[]>(() => readStore('ryu.questClaims.' + new Date().toLocaleDateString('en-CA'), []));
  const [units, setUnits] = useState<'metric' | 'imperial'>(() => readStore('ryu.units', 'metric'));
  const [restTimerSeconds, setRestTimerSeconds] = useState(() => readStore('ryu.restTimerSeconds', 60));
  const [xp, setXp] = useState(() => readStore('ryu.xp', 0));
  const [streak, setStreak] = useState(() => readStore('ryu.streak', 0));
  const [active, setActive] = useState(false);
  const [workoutName, setWorkoutName] = useState('Full body foundation');
  const [exercises, setExercises] = useState<Exercise[]>(starterExercises);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [restPaused, setRestPaused] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [expandedNotice, setExpandedNotice] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [mealQuery, setMealQuery] = useState('');
  const [mealCategory, setMealCategory] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState(() => readStore('ryu.defaultPlan', 'foundation'));
  const allPlans: WorkoutPlan[] = [...plans, ...customPlans];
  const [soundOn, setSoundOn] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);
  const noticeId = useRef(0);
  const previousRest = useRef(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError('Could not restore your account session.');
      setAccount(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setAccount(session?.user ?? null);
        setAuthLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => void) | undefined;
    void CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith('com.kentaakakashi.ryu://auth/callback')) return;
      await Browser.close();
      const callbackUrl = new URL(url);
      const code = callbackUrl.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setAuthError('Google sign-in returned to Ryu, but the session could not be completed.');
        return;
      }
      const tokens = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
      const accessToken = tokens.get('access_token');
      const refreshToken = tokens.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) setAuthError('Google sign-in returned to Ryu, but the session could not be saved.');
      }
    }).then(handle => { removeListener = () => { void handle.remove(); }; });
    return () => removeListener?.();
  }, []);
  useEffect(() => {
    if (!account) {
      setAppAccess('signed_out');
      setTab('auth');
      return;
    }
    if (!profileUsername) {
      setAppAccess('profile_required');
      setTab('profile');
      return;
    }
    let cancelled = false;
    setAppAccess('checking');
    (async () => {
      const { data, error } = await supabase
        .from('training_plans')
        .select('id')
        .eq('user_id', account.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setAuthError('Your account is connected, but your active training plan could not be checked. Please retry.');
        setAppAccess('checking');
        return;
      }
      if (data) {
        setAppAccess('active');
        if (tab === 'auth') setTab('home');
      } else {
        setAppAccess('onboarding');
      }
    })();
    return () => { cancelled = true; };
  }, [account?.id, profileUsername]);

  useEffect(() => {
    if (!account) { setProfileUsername(''); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('username,display_name').eq('id', account.id).maybeSingle();
      if (cancelled) return;
      if (error) { setAuthError('Your account is connected, but your Ryu profile could not be loaded.'); return; }
      if (data) {
        const savedUsername = data.username ?? '';
        setProfileUsername(savedUsername);
        if (savedUsername) setUsername(savedUsername);
        if (data.display_name) setDisplayName(data.display_name);
        if (!savedUsername) setTab('profile');
        return;
      }
      const metadata = account.user_metadata ?? {};
      const metadataUsername = typeof metadata.username === 'string' ? metadata.username.toLowerCase() : '';
      const metadataName = typeof metadata.display_name === 'string' ? metadata.display_name : typeof metadata.full_name === 'string' ? metadata.full_name : typeof metadata.name === 'string' ? metadata.name : '';
      const { error: createError } = await supabase.from('profiles').upsert({ id: account.id, username: /^[a-z0-9][a-z0-9_]{2,19}$/.test(metadataUsername) ? metadataUsername : null, display_name: metadataName || account.email?.split('@')[0] || 'Ryu member', updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (cancelled) return;
      if (createError) { setAuthError(createError.code === '23505' ? 'That username is already taken. Choose another one in your profile.' : 'Your Ryu profile could not be created yet.'); setTab('profile'); }
      else if (!metadataUsername) setTab('profile');
      else { setProfileUsername(metadataUsername); setUsername(metadataUsername); }
    })();
    return () => { cancelled = true; };
  }, [account?.id]);
  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('units,reminders_enabled,rest_timer_seconds,sound_enabled,default_plan')
        .eq('user_id', account.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        pushNotice('Settings could not sync', 'Your existing on-device preferences are still available.', 'info');
        return;
      }
      if (data) {
        const settings = data as UserSettingsRow;
        setUnits(settings.units);
        setRemindersOn(settings.reminders_enabled);
        setRestTimerSeconds(settings.rest_timer_seconds);
        setSoundOn(settings.sound_enabled);
        setSelectedPlan(settings.default_plan || 'foundation');
      }
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id,name,description,exercises')
        .eq('user_id', account.id)
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        pushNotice('Routines could not sync', 'Your saved routines remain available on this device.', 'info');
        return;
      }
      const remotePlans: WorkoutPlan[] = (data ?? []).map(row => {
        const savedExercises = Array.isArray(row.exercises) ? row.exercises as Exercise[] : [];
        return {
          id: row.id,
          name: row.name,
          sub: row.description || 'Your custom training sequence',
          description: row.description,
          time: `${Math.max(10, savedExercises.length * 5)} MIN`,
          level: 'CUSTOM',
          exercises: savedExercises.map(exercise => ({ ...exercise, done: 0, setLogs: [] })),
        };
      });
      const localPlans = readStore<WorkoutPlan[]>('ryu.customPlans', []).filter(plan => plan.id.startsWith('local-'));
      let syncedPlans: WorkoutPlan[] = [];
      if (localPlans.length) {
        const payload = localPlans.map(plan => ({
          user_id: account.id,
          name: plan.name,
          description: plan.description || plan.sub,
          exercises: plan.exercises.map(({ id, name, detail, target, unit, rest, repTarget, loadKg, measure }) => ({ id, name, detail, target, unit, rest, repTarget, loadKg, measure })),
        }));
        const { data: inserted, error: insertError } = await supabase
          .from('workout_templates')
          .insert(payload)
          .select('id,name,description,exercises');
        if (!cancelled && !insertError) {
          syncedPlans = (inserted ?? []).map(row => ({
            id: row.id,
            name: row.name,
            sub: row.description || 'Your custom training sequence',
            description: row.description,
            time: `${Math.max(10, (Array.isArray(row.exercises) ? row.exercises.length : 1) * 5)} MIN`,
            level: 'CUSTOM',
            exercises: (Array.isArray(row.exercises) ? row.exercises as Exercise[] : []).map(exercise => ({ ...exercise, done: 0, setLogs: [] })),
          }));
        } else if (!cancelled && insertError) {
          pushNotice('Local routines kept', 'Ryu could not sync every offline routine yet. They remain on this device.', 'info', 3);
          syncedPlans = localPlans;
        }
      }
      if (!cancelled) setCustomPlans([...syncedPlans, ...remotePlans]);
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      const [{ data: claims, error: claimsError }, { data: sessionsForXp, error: xpError }] = await Promise.all([
        supabase.from('daily_quest_claims').select('quest_date,quest_key,xp_awarded').eq('user_id', account.id),
        supabase.from('workout_sessions').select('xp_earned').eq('user_id', account.id).not('completed_at', 'is', null),
      ]);
      if (cancelled) return;
      if (claimsError || xpError) {
        pushNotice('Bonus XP could not sync', 'Your workout history remains available; try again after reconnecting.', 'info');
        return;
      }
      const totalBonus = (claims ?? []).reduce((sum, claim) => sum + claim.xp_awarded, 0);
      setBonusXp(totalBonus);
      const todayClaims = (claims ?? []).filter(claim => claim.quest_date === todayQuestKey).map(claim => claim.quest_key);
      setClaimedQuestKeys(current => [...new Set([...current, ...todayClaims])]);
      const baseXp = (sessionsForXp ?? []).reduce((sum, session) => sum + session.xp_earned, 0);
      setXp(current => Math.max(current, baseXp + totalBonus));
    })();
    return () => { cancelled = true; };
  }, [account?.id, todayQuestKey]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('exercise_id,exercise_name,reps,load_kg,duration_seconds,completed_at')
        .eq('user_id', account.id)
        .order('completed_at', { ascending: false })
        .limit(2000);
      if (cancelled) return;
      if (error) {
        pushNotice('Personal records could not sync', 'Your local records remain available on this device.', 'info');
        return;
      }
      const cloudRecords: PersonalRecord[] = (data ?? []).flatMap(row => {
        const isTimed = row.duration_seconds !== null;
        const value = isTimed ? row.duration_seconds : row.reps;
        if (value === null || value === undefined) return [];
        return [{
          exerciseId: row.exercise_id,
          exerciseName: row.exercise_name,
          value,
          unit: isTimed ? 'SEC' as const : 'REPS' as const,
          loadKg: row.load_kg === null ? null : Number(row.load_kg),
          completedAt: row.completed_at,
        }];
      });
      setPersonalRecords(current => mergePersonalRecords(current, cloudRecords));
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id,title,completed_at,duration_seconds,xp_earned')
        .eq('user_id', account.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setAuthError('Your account is connected, but cloud history could not be loaded yet.');
        return;
      }
      const { data: setData, error: setLoadError } = await supabase
        .from('workout_sets')
        .select('session_id')
        .eq('user_id', account.id);
      if (cancelled) return;
      if (setLoadError) {
        setAuthError('Your workouts loaded, but detailed set counts could not be fetched.');
      }
      const setCounts = new Map<string, number>();
      (setData ?? []).forEach(item => setCounts.set(item.session_id, (setCounts.get(item.session_id) ?? 0) + 1));
      const cloudSessions: Session[] = (data ?? []).map(row => ({
        id: row.id,
        title: row.title,
        date: row.completed_at ?? new Date().toISOString(),
        duration: row.duration_seconds,
        xp: row.xp_earned,
        sets: setCounts.get(row.id) ?? 0,
      }));
      setSessions(current => {
        const byId = new Map<string, Session>();
        [...current, ...cloudSessions].forEach(item => byId.set(item.id, item));
        return [...byId.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      setXp(currentXp => Math.max(currentXp, cloudSessions.reduce((sum, item) => sum + item.xp, 0)));
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  useEffect(() => { localStorage.setItem('ryu.sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('ryu.xp', JSON.stringify(xp)); }, [xp]);
  useEffect(() => { localStorage.setItem('ryu.streak', JSON.stringify(streak)); }, [streak]);
  useEffect(() => { localStorage.setItem('ryu.customPlans', JSON.stringify(customPlans)); }, [customPlans]);
  useEffect(() => { localStorage.setItem('ryu.personalRecords', JSON.stringify(personalRecords)); }, [personalRecords]);
  useEffect(() => { localStorage.setItem('ryu.questClaims.' + todayQuestKey, JSON.stringify(claimedQuestKeys)); }, [claimedQuestKeys, todayQuestKey]);
  useEffect(() => { localStorage.setItem('ryu.units', JSON.stringify(units)); }, [units]);
  useEffect(() => { localStorage.setItem('ryu.restTimerSeconds', JSON.stringify(restTimerSeconds)); }, [restTimerSeconds]);
  useEffect(() => { localStorage.setItem('ryu.defaultPlan', JSON.stringify(selectedPlan)); }, [selectedPlan]);
  useEffect(() => {
    if (!active || !startedAt) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);
  useEffect(() => {
    if (!active || restLeft <= 0 || restPaused) return;
    const timer = window.setInterval(() => setRestLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [active, restLeft > 0, restPaused]);
  useEffect(() => {
    if (previousRest.current > 0 && restLeft === 0 && active) {
      setRestPaused(true);
      pushNotice('Rest complete', 'You’re good to go when you are.', 'info', 2);
    }
    previousRest.current = restLeft;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft, active]);
  useEffect(() => {
    if (!notices.length || expandedNotice) return;
    const timer = window.setTimeout(() => setNotices(current => current.slice(1)), notices[0]?.persistent ? 12000 : 4200);
    return () => window.clearTimeout(timer);
  }, [notices, expandedNotice]);

  const completedSets = exercises.reduce((sum, item) => sum + item.done, 0);
  const level = Math.floor(xp / 250) + 1;
  const totalSets = exercises.reduce((sum, item) => sum + item.target, 0);
  const totalLoggedSets = sessions.reduce((sum, session) => sum + session.sets, 0);
  const recent = sessions.slice(0, 4);
  const weeklyCount = useMemo(() => sessions.filter(s => Date.now() - new Date(s.date).getTime() < 7 * 86400000).length, [sessions]);
  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);
  const todaySessions = sessions.filter(session => new Date(session.date).toDateString() === new Date().toDateString());
  const todaySetCount = todaySessions.reduce((sum, session) => sum + session.sets, 0);
  const todayTrainingMinutes = Math.floor(todaySessions.reduce((sum, session) => sum + session.duration, 0) / 60);
  const dailyQuests: DailyQuest[] = [
    { key: 'first-session', title: 'First spark', description: 'Complete one training session today.', value: todaySessions.length, target: 1, reward: 35, unit: 'sessions', icon: 'session' },
    { key: 'set-builder', title: 'Set builder', description: 'Log 12 honest sets across your movements.', value: todaySetCount, target: 12, reward: 25, unit: 'sets', icon: 'sets' },
    { key: 'time-invested', title: 'Time invested', description: 'Spend at least 20 minutes training today.', value: todayTrainingMinutes, target: 20, reward: 30, unit: 'minutes', icon: 'time' },
  ];
  const normalizedUsername = username.trim().toLowerCase();
  const usernameValid = /^[a-z0-9][a-z0-9_]{2,19}$/.test(normalizedUsername);
  const allowedPasswordSymbols = "!@#$%^&*()_+-=[]{};':\\\"|<>?,./`~";
  const passwordCriteria = [
    { label: 'At least 12 characters', valid: authPassword.length >= 12 },
    { label: 'Lowercase letter', valid: /[a-z]/.test(authPassword) },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(authPassword) },
    { label: 'Number', valid: /[0-9]/.test(authPassword) },
    { label: 'Symbol', valid: [...authPassword].some(character => allowedPasswordSymbols.includes(character)) },
  ];
  const passwordScore = passwordCriteria.filter(item => item.valid).length;
  const passwordStrong = passwordCriteria.every(item => item.valid);
  const passwordStrengthLabel = passwordScore <= 2 ? 'Weak' : passwordScore === 3 ? 'Fair' : passwordScore === 4 ? 'Good' : 'Strong';

  useEffect(() => {
    if (tab !== 'auth' || authMode !== 'signup' || !usernameValid) {
      setUsernameAvailability('idle');
      return;
    }
    let cancelled = false;
    setUsernameAvailability('checking');
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc('is_ryu_username_available', { candidate: normalizedUsername });
      if (cancelled) return;
      setUsernameAvailability(error ? 'unknown' : data ? 'available' : 'taken');
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [tab, authMode, normalizedUsername, usernameValid]);


  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true); setAuthError(''); setAuthMessage('');
    try {
      if (authMode === 'signup') {
        if (!usernameValid) throw new Error('Choose a username with 3–20 characters: lowercase letters, numbers or underscores. Start with a letter or number.');
        if (!passwordStrong) throw new Error('Your password must meet all five strength checks before you can create an account.');
        const cleanDisplayName = displayName.trim() || normalizedUsername;
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(), password: authPassword,
          options: { data: { username: normalizedUsername, display_name: cleanDisplayName }, emailRedirectTo: window.location.origin + window.location.pathname },
        });
        if (error) {
          if (error.code === '23505' || error.message.toLowerCase().includes('profiles_username_lower_uidx')) throw new Error('That username is already taken. Try another handle.');
          throw error;
        }
        if (data.session) {
          setAccount(data.session.user); setProfileUsername(normalizedUsername);
          const { error: profileError } = await supabase.from('profiles').upsert({ id: data.session.user.id, username: normalizedUsername, display_name: cleanDisplayName, updated_at: new Date().toISOString() }, { onConflict: 'id' });
          if (profileError) throw profileError;
          setAuthMessage('Account created. Your unique Ryu username is ready.');
        } else setAuthMessage('Account created. Check your email to confirm it; your username is reserved.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setAccount(data.user); setAuthMessage('Signed in. Welcome back.');
      }
      setAuthPassword(''); setPasswordVisible(false);
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Could not complete sign-in. Please try again.'); }
    finally { setAuthBusy(false); }
  }

  async function signInWithGoogle() {
    setAuthBusy(true); setAuthError(''); setAuthMessage('');
    try {
      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'com.kentaakakashi.ryu://auth/callback', skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
        });
        if (error) throw error;
        if (!data.url) throw new Error('Google did not return an authorization URL.');
        await Browser.open({ url: data.url });
        setAuthBusy(false);
      } else {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: 'select_account' } } });
        if (error) throw error;
      }
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Google sign-in could not be started.'); setAuthBusy(false); }
  }

  async function saveUsername() {
    if (!account) return;
    if (!usernameValid) { setAuthError('Choose a username with 3–20 characters: lowercase letters, numbers or underscores.'); return; }
    setProfileBusy(true); setAuthError(''); setAuthMessage('');
    try {
      const cleanDisplayName = displayName.trim() || account.user_metadata?.display_name || normalizedUsername;
      const { error } = await supabase.from('profiles').upsert({ id: account.id, username: normalizedUsername, display_name: cleanDisplayName, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error?.code === '23505') throw new Error('That username is already taken. Choose another one.');
      if (error) throw error;
      setProfileUsername(normalizedUsername); setAuthMessage('Your Ryu username has been saved.');
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Could not save your username.'); }
    finally { setProfileBusy(false); }
  }
  async function signOut() {
    setAuthError('');
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
    else setAuthMessage('Signed out. This device’s local progress remains available here.');
  }

  async function persistUserSettings(patch: Partial<UserSettingsRow>) {
    const next: UserSettingsRow = {
      units,
      reminders_enabled: remindersOn,
      rest_timer_seconds: restTimerSeconds,
      sound_enabled: soundOn,
      default_plan: selectedPlan,
      ...patch,
    };
    if (patch.units !== undefined) setUnits(patch.units);
    if (patch.reminders_enabled !== undefined) setRemindersOn(patch.reminders_enabled);
    if (patch.rest_timer_seconds !== undefined) setRestTimerSeconds(patch.rest_timer_seconds);
    if (patch.sound_enabled !== undefined) setSoundOn(patch.sound_enabled);
    if (patch.default_plan !== undefined) setSelectedPlan(patch.default_plan);
    if (!account) {
      pushNotice('Preference saved', 'This setting is stored on this device until you sign in.', 'info');
      return;
    }
    const { error } = await supabase.from('user_settings').upsert({
      user_id: account.id,
      ...next,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) pushNotice('Preference not synced', 'Your on-device setting changed, but the cloud update failed.', 'info', 3);
    else pushNotice('Preference synced', 'Your settings are saved to your Ryu account.', 'success');
  }

  async function claimDailyQuest(quest: DailyQuest) {
    if (quest.value < quest.target || claimedQuestKeys.includes(quest.key)) return;
    if (account) {
      const { error } = await supabase.from('daily_quest_claims').insert({
        user_id: account.id,
        quest_date: todayQuestKey,
        quest_key: quest.key,
        xp_awarded: quest.reward,
      });
      if (error) {
        if (error.code === '23505') {
          setClaimedQuestKeys(current => [...new Set([...current, quest.key])]);
          pushNotice('Already claimed', 'This daily contract has already paid out on another device.', 'info');
        } else {
          pushNotice('Reward could not be claimed', 'Ryu could not save this reward to your account. Try again.', 'info', 3);
        }
        return;
      }
    }
    setClaimedQuestKeys(current => [...new Set([...current, quest.key])]);
    setBonusXp(current => current + quest.reward);
    setXp(current => current + quest.reward);
    pushNotice('CONTRACT COMPLETE', `+${quest.reward} bonus XP · ${quest.title}`, 'achievement', 6);
  }

  async function saveCustomPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (planSaving) return;
    const name = customPlanName.trim();
    const selectedExercises = routineExerciseLibrary
      .filter(exercise => customExerciseIds.includes(exercise.id))
      .slice(0, 12)
      .map(exercise => ({ ...exercise, done: 0, setLogs: [] }));
    if (name.length < 2 || selectedExercises.length === 0) {
      pushNotice('Routine needs a name and movements', 'Choose at least one exercise to build your routine.', 'info');
      return;
    }
    setPlanSaving(true);
    const description = customPlanDescription.trim().slice(0, 140);
    try {
      let newPlan: WorkoutPlan;
      if (account) {
        const { data, error } = await supabase.from('workout_templates').insert({
          user_id: account.id,
          name,
          description,
          exercises: selectedExercises.map(({ id, name: exerciseName, detail, target, unit, rest, repTarget, loadKg, measure }) => ({
            id, name: exerciseName, detail, target, unit, rest, repTarget, loadKg, measure,
          })),
        }).select('id,name,description,exercises').single();
        if (error) throw error;
        newPlan = {
          id: data.id,
          name: data.name,
          sub: data.description || 'Your custom training sequence',
          description: data.description,
          time: `${Math.max(10, selectedExercises.length * 5)} MIN`,
          level: 'CUSTOM',
          exercises: selectedExercises,
        };
      } else {
        newPlan = {
          id: `local-${Date.now()}`,
          name,
          sub: description || 'Your custom training sequence',
          description,
          time: `${Math.max(10, selectedExercises.length * 5)} MIN`,
          level: 'CUSTOM',
          exercises: selectedExercises,
        };
      }
      setCustomPlans(current => [...current, newPlan]);
      setCustomPlanName('');
      setCustomPlanDescription('');
      setCustomExerciseIds(['push', 'squat', 'plank']);
      setShowPlanBuilder(false);
      pushNotice('Routine created', account ? 'Saved to your Ryu account. Ready when you are.' : 'Saved on this device. Sign in to sync it across devices.', 'success', 4);
    } catch (error) {
      pushNotice('Routine could not be saved', error instanceof Error ? error.message : 'Please try again.', 'info', 4);
    } finally {
      setPlanSaving(false);
    }
  }

  async function deleteCustomPlan(plan: WorkoutPlan) {
    if (account && !plan.id.startsWith('local-')) {
      const { error } = await supabase.from('workout_templates').delete().eq('id', plan.id).eq('user_id', account.id);
      if (error) { pushNotice('Routine not deleted', 'The cloud copy could not be removed.', 'info', 3); return; }
    }
    setCustomPlans(current => current.filter(item => item.id !== plan.id));
    pushNotice('Routine removed', plan.name + ' was removed from your library.', 'info');
  }

  function updateExerciseMetric(index: number, field: 'repTarget' | 'loadKg', rawValue: string) {
    const parsed = rawValue === '' ? 0 : Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setExercises(current => current.map((exercise, i) => i === index
      ? { ...exercise, [field]: field === 'repTarget' ? Math.max(1, Math.min(999, Math.round(parsed))) : Math.min(999, parsed) }
      : exercise));
  }

  function pushNotice(title: string, subtitle: string, kind: Notice['kind'] = 'success', priority = 1) {
    const item: Notice = { id: ++noticeId.current, title, subtitle, kind, priority };
    setNotices(current => [...current, item].sort((a, b) => b.priority - a.priority).slice(0, 4));
    setExpandedNotice(false);
  }
  function startWorkout(planId = selectedPlan) {
    const plan = allPlans.find(p => p.id === planId) ?? plans[0];
    setWorkoutName(plan.name);
    setExercises(plan.exercises.map(e => ({ ...e, done: 0, setLogs: [] })));
    setSelectedPlan(plan.id);
    setElapsed(0);
    setRestLeft(0);
    setRestPaused(false);
    setStartedAt(Date.now());
    setActive(true);
    setTab('train');
    setShowFinish(false);
    pushNotice('Session started', plan.name, 'info');
  }
  async function finishWorkout() {
    if (completedSets === 0) {
      pushNotice('Log your first set', 'Finish at least one set to save a training session.', 'info', 3);
      return;
    }
    const earned = 20 + completedSets * 8 + Math.round(elapsed / 60);
    const previousLevel = Math.floor(xp / 250) + 1;
    const nextLevel = Math.floor((xp + earned) / 250) + 1;
    const record: Session = { id: String(Date.now()), title: workoutName, date: new Date().toISOString(), duration: elapsed, xp: earned, sets: completedSets };
    setSessions(current => [record, ...current]);
    setXp(current => current + earned);
    if (account) {
      const started = new Date(Date.now() - elapsed * 1000).toISOString();
      const { data: cloudRecord, error: cloudError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: account.id,
          title: workoutName,
          started_at: started,
          completed_at: record.date,
          duration_seconds: elapsed,
          xp_earned: earned,
        })
        .select('id')
        .single();
      if (!cloudError && cloudRecord) {
        const setRows = exercises.flatMap(exercise => (exercise.setLogs ?? []).map((log, i) => ({
          user_id: account.id,
          session_id: cloudRecord.id,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          set_number: i + 1,
          reps: log.unit === 'REPS' ? log.value : null,
          load_kg: log.loadKg,
          duration_seconds: log.unit === 'SEC' ? log.value : null,
          completed_at: log.completedAt,
        })));
        if (setRows.length) {
          const { error: setError } = await supabase.from('workout_sets').insert(setRows);
          if (setError) pushNotice('Workout saved, sets pending', 'The session synced; detailed set records need another try.', 'info', 3);
        }
        setSessions(current => current.map(item => item.id === record.id ? { ...item, id: cloudRecord.id } : item));
        pushNotice('Cloud save complete', 'This workout is saved to your Ryu account.', 'success', 4);
      } else {
        pushNotice('Saved on this device', 'Cloud save failed, but your workout remains on this device.', 'info', 4);
      }
    }
    const today = new Date().toDateString();
    const lastSessionDay = sessions[0] ? new Date(sessions[0].date).toDateString() : '';
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (!lastSessionDay) setStreak(1);
    else if (lastSessionDay === today) { /* Multiple sessions on one day do not inflate the streak. */ }
    else if (lastSessionDay === yesterday) setStreak(current => current + 1);
    else setStreak(1);
    setActive(false);
    setShowFinish(false);
    setRestLeft(0);
    if (nextLevel > previousLevel) {
      const previousTitle = nextLevelTitle(previousLevel);
      const unlockedTitle = nextLevelTitle(nextLevel);
      const titleChanged = previousTitle !== unlockedTitle;
      pushNotice(
        titleChanged ? 'NEW TITLE · ' + unlockedTitle : 'LEVEL UP · ' + nextLevel,
        titleChanged
          ? `New title unlocked at level ${nextLevel}. Keep earning your next form.`
          : `Level ${nextLevel} reached. Your current rank is still ${unlockedTitle}.`,
        'achievement',
        7,
      );
    }
    pushNotice('Workout complete', `+${earned} XP · ${completedSets} sets logged`, 'achievement', 5);
    if (sessions.length === 0) window.setTimeout(() => pushNotice('Achievement unlocked', 'First session. The journey starts here.', 'achievement', 6), 700);
    setTab('progress');
  }
  function markSet(index: number) {
    const current = exercises[index];
    if (!current || current.done >= current.target) return;
    const nextDone = current.done + 1;
    const log: ExerciseLog = {
      value: current.repTarget ?? (current.measure === 'seconds' ? 30 : 10),
      unit: current.measure === 'seconds' ? 'SEC' : 'REPS',
      loadKg: (current.loadKg ?? 0) > 0 ? current.loadKg ?? null : null,
      completedAt: new Date().toISOString(),
    };
    setExercises(list => list.map((item, i) => i === index
      ? { ...item, done: nextDone, setLogs: [...(item.setLogs ?? []), log] }
      : item));
    const candidate: PersonalRecord = {
      exerciseId: current.id,
      exerciseName: current.name,
      value: log.value,
      unit: log.unit,
      loadKg: log.loadKg,
      completedAt: log.completedAt,
    };
    const previousRecord = personalRecords.find(record => record.exerciseId === candidate.exerciseId);
    const isNewRecord = !previousRecord
      || previousRecord.unit !== candidate.unit
      || (candidate.loadKg ?? 0) > (previousRecord.loadKg ?? 0)
      || ((candidate.loadKg ?? 0) === (previousRecord.loadKg ?? 0) && candidate.value > previousRecord.value);
    setPersonalRecords(currentRecords => mergePersonalRecords(currentRecords, [candidate]));
    pushNotice('Set logged', `${current.name} · set ${nextDone} of ${current.target}`, 'success', 1);
    if (isNewRecord) pushNotice('PERSONAL RECORD', `${current.name} · ${candidate.value} ${candidate.unit}${candidate.loadKg ? ` · ${candidate.loadKg} kg` : ''}`, 'achievement', 5);
    if (nextDone < current.target) {
      setRestLeft(restTimerSeconds || current.rest);
      setRestPaused(false);
    }
  }
  function addExercise() {
    const choices: Exercise[] = routineExerciseLibrary.filter(item => ['mountain', 'bridge', 'pike', 'diamond', 'deadbug', 'calf'].includes(item.id));
    const next = choices.find(item => !exercises.some(e => e.id === item.id));
    if (!next) { pushNotice('All extras added', 'You already have the available bonus moves.', 'info'); return; }
    setExercises(current => [...current, { ...next, done: 0, setLogs: [] }]);
    pushNotice('Exercise added', next.name, 'success');
  }

  const greetingName = (displayName.trim().split(/\s+/)[0] || account?.email?.split('@')[0] || 'Athlete');
  const weeklyCalendar = Array.from({ length: 7 }, (_, index) => {
    const now = new Date();
    const todayIndex = now.getDay();
    const day = new Date(now);
    day.setDate(now.getDate() - todayIndex + index);
    const count = sessions.filter(session => new Date(session.date).toDateString() === day.toDateString()).length;
    return { key: day.toDateString(), label: day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase(), date: day.getDate(), count, today: day.toDateString() === now.toDateString(), future: day > now };
  });
  const workoutHeroImage = 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000';
  const fuelHeroImage = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000';

  return (
    <div className="ryu-shell">
      <div className="ryu-atmosphere ryu-atmosphere--one" />
      <div className="ryu-atmosphere ryu-atmosphere--two" />
      <header className="ryu-header">
        <button className="ryu-brand" onClick={() => setTab(appAccess === 'active' ? 'home' : account ? 'profile' : 'auth')} aria-label="Ryu home">
          <span className="ryu-brand-mark"><Waves size={20} strokeWidth={2.5} /></span>
          <span><strong>RYU<span>.</span></strong><small>TRAIN WITH INTENT</small></span>
        </button>
        {appAccess === 'active' && <div className="ryu-header-actions">
          <div className="ryu-streak"><Flame size={15} fill="currentColor" /><strong>{streak}</strong><span>DAY STREAK</span></div>
          <button className="ryu-icon-btn" aria-label="Notifications" onClick={() => pushNotice('You’re on track', 'Small sessions build strong habits.', 'info')}><Bell size={18} /></button>
          <button className="ryu-avatar" onClick={() => setTab('profile')} aria-label="Open profile">{greetingName.slice(0, 1).toUpperCase()}<i /></button>
        </div>}
      </header>

      <main className="ryu-main">
        {account && appAccess === 'onboarding' ? (
          <PersonalizationFlow
            userId={account.id}
            displayName={displayName || greetingName}
            onApproved={() => { setAppAccess('active'); setTab('home'); pushNotice('Your Ryu plan is active', 'Your personalised training and nutrition blueprint is ready.', 'achievement', 6); }}
          />
        ) : account && appAccess === 'checking' ? (
          <div className="ryu-personalization-loading"><span className="ryu-ai-orb"><ShieldCheck size={25} /></span><p>Checking your Ryu training plan…</p></div>
        ) : (
        <AnimatePresence mode="wait">
          {tab === 'home' && <motion.div key="home" className="ryu-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24 }}>
            <div className="ryu-greeting">
              <div className="ryu-greeting-avatar">{greetingName.slice(0, 1).toUpperCase()}<i /></div>
              <div><span className="ryu-overline">YOUR TRAINING SPACE</span><h1>Hello {greetingName} <span>✋</span></h1><p>Get ready. Your next rep is waiting.</p></div>
              <button className="ryu-greeting-bell" onClick={() => setTab('profile')} aria-label="Open settings"><Settings2 size={18} /></button>
            </div>

            <SpotlightCard className="ryu-challenge-card" radius={22} intensity={0.14}>
              <div className="ryu-challenge-card__content">
                <div className="ryu-challenge-emblem"><Trophy size={25} /></div>
                <div className="ryu-challenge-copy"><span>14 DAY CHALLENGE</span><h2>New Challenge</h2><p>Two weeks of energy.</p></div>
                <button className="ryu-challenge-start" onClick={() => startWorkout(selectedPlan)}>START <ArrowRight size={14} /></button>
                <div className="ryu-challenge-progress"><span style={{ width: Math.min(100, weeklyCount / 4 * 100) + '%' }} /></div>
                <div className="ryu-challenge-foot"><span>{Math.min(weeklyCount, 4)} / 4 weekly sessions</span><strong>{Math.round(Math.min(100, weeklyCount / 4 * 100))}%</strong></div>
              </div>
              <div className="ryu-challenge-orbit" />
            </SpotlightCard>

            <section className="ryu-section ryu-week-section">
              <div className="ryu-section-heading"><div><span className="ryu-overline">STAY IN RHYTHM</span><h2>This week</h2></div><span className="ryu-date-chip">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
              <div className="ryu-week-strip">
                {weeklyCalendar.map(day => <div className={'ryu-week-day' + (day.today ? ' is-today' : '') + (day.count ? ' has-workout' : '')} key={day.key}>
                  <span>{day.label}</span><strong>{day.date}</strong><i>{day.count ? <Check size={11} /> : day.future ? '' : <span />}</i>
                </div>)}
              </div>
            </section>

            <section className="ryu-section">
              <div className="ryu-section-heading"><div><span className="ryu-overline">MOVE WITH PURPOSE</span><h2>Find your flow</h2></div><button className="ryu-text-link" onClick={() => setTab('discover')}>See all <ArrowRight size={14} /></button></div>
              <div className="ryu-category-row">
                <button className="ryu-category is-active" onClick={() => { setSelectedPlan('foundation'); setTab('train'); }}><Activity size={15} /> Warm up</button>
                <button className="ryu-category" onClick={() => { setSelectedPlan('legs'); setTab('train'); }}><Waves size={15} /> Cardio</button>
                <button className="ryu-category" onClick={() => { setSelectedPlan('upper'); setTab('train'); }}><Dumbbell size={15} /> Strength</button>
              </div>
              <div className="ryu-workout-tiles">
                <button className="ryu-workout-tile ryu-workout-tile--photo" onClick={() => startWorkout('foundation')} style={{ backgroundImage: 'linear-gradient(0deg,rgba(5,8,6,.94) 0%,rgba(5,8,6,.04) 72%),url(' + workoutHeroImage + ')' }}>
                  <span className="ryu-tile-tag">RECOMMENDED</span><span className="ryu-tile-copy"><small>25 MIN · FULL BODY</small><strong>Foundation</strong><em>Build the base, one rep at a time.</em></span><span className="ryu-tile-arrow"><ArrowUpRight size={17} /></span>
                </button>
                <button className="ryu-workout-tile ryu-workout-tile--green" onClick={() => startWorkout('upper')}>
                  <span className="ryu-tile-tag">STRENGTH / 02</span><span className="ryu-tile-abstract"><Dumbbell size={48} strokeWidth={1.1} /></span><span className="ryu-tile-copy"><small>20 MIN · UPPER BODY</small><strong>Upper focus</strong><em>Push strength and control.</em></span><span className="ryu-tile-arrow"><ArrowUpRight size={17} /></span>
                </button>
                <button className="ryu-workout-tile ryu-workout-tile--dark" onClick={() => startWorkout('legs')}>
                  <span className="ryu-tile-tag">LOWER BODY / 03</span><span className="ryu-tile-abstract"><Footprints size={46} strokeWidth={1.1} /></span><span className="ryu-tile-copy"><small>22 MIN · LOWER BODY</small><strong>Leg day</strong><em>Control, range, repeat.</em></span><span className="ryu-tile-arrow"><ArrowUpRight size={17} /></span>
                </button>
              </div>
            </section>

            <section className="ryu-quick-stats">
              <div><span className="ryu-stat-icon"><Flame size={16} /></span><span><small>STREAK</small><strong>{streak} <em>days</em></strong></span></div>
              <div><span className="ryu-stat-icon"><Clock3 size={16} /></span><span><small>TRAINED</small><strong>{totalMinutes} <em>min</em></strong></span></div>
              <div><span className="ryu-stat-icon"><Zap size={16} /></span><span><small>EXPERIENCE</small><strong>{xp.toLocaleString()} <em>XP</em></strong></span></div>
            </section>

            <section className="ryu-section ryu-home-progress">
              <div className="ryu-section-heading"><div><span className="ryu-overline">YOUR CHARACTER</span><h2>Built, not borrowed.</h2></div><button className="ryu-text-link" onClick={() => setTab('progress')}>Open record <ArrowRight size={14} /></button></div>
              <RpgProgression variant="home" xp={xp} sessionsCount={sessions.length} totalSets={totalLoggedSets} totalMinutes={totalMinutes} streak={streak} />
            </section>

            <DailyQuestBoard quests={dailyQuests} claimedKeys={claimedQuestKeys} onClaim={quest => void claimDailyQuest(quest)} />

            <section className="ryu-section ryu-recent-section">
              <div className="ryu-section-heading"><div><span className="ryu-overline">THE WORK ADDS UP</span><h2>Recent activity</h2></div><button className="ryu-text-link" onClick={() => setTab('progress')}>History <ArrowRight size={14} /></button></div>
              {recent.length ? <div className="ryu-activity-list">{recent.slice(0, 3).map((session, index) => <div className="ryu-activity-row" key={session.id}><span className={'ryu-activity-icon activity-' + index}><Dumbbell size={17} /></span><div><strong>{session.title}</strong><small>{dateLabel(session.date)} · {session.sets} sets · {formatTime(session.duration)}</small></div><b>+{session.xp} XP</b></div>)}</div> : <div className="ryu-empty-card"><span><Activity size={20} /></span><strong>Your first chapter is unwritten.</strong><p>Complete a session and your activity will appear here.</p><button onClick={() => setTab('train')}>Go to training <ArrowRight size={14} /></button></div>}
            </section>
          </motion.div>}

          {tab === 'train' && <motion.div key="train" className="ryu-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24 }}>
            <div className="ryu-page-intro"><span className="ryu-overline">TRAINING FLOOR</span><h1>{active ? 'Stay in the work.' : 'Time to train.'}</h1><p>{active ? 'One good set at a time. Keep your form controlled.' : 'Choose your focus. Log the work. Let progress compound.'}</p></div>
            {active ? <>
              <div className="ryu-active-hero" style={{ backgroundImage: 'linear-gradient(0deg,rgba(5,8,6,.97),rgba(5,8,6,.05) 85%),url(' + workoutHeroImage + ')' }}>
                <div className="ryu-active-hero__top"><span className="ryu-live-pill"><i /> SESSION LIVE</span><span className="ryu-elapsed"><Timer size={14} /> {formatTime(elapsed)}</span></div>
                <div className="ryu-active-hero__bottom"><span className="ryu-overline">CURRENT SESSION</span><h2>{workoutName}</h2><p>{completedSets} of {totalSets} sets completed</p><div className="ryu-progress-track"><span style={{ width: (totalSets ? completedSets / totalSets * 100 : 0) + '%' }} /></div><button className="ryu-light-button" onClick={() => setShowFinish(true)}>Finish session <CheckCheck size={16} /></button></div>
              </div>
              <div className="ryu-session-layout">
                <section className="ryu-session-exercises">
                  <div className="ryu-section-heading"><div><span className="ryu-overline">YOUR MOVEMENTS</span><h2>Exercise queue</h2></div><span className="ryu-count-pill">{completedSets}/{totalSets} SETS</span></div>
                  <div className="ryu-exercise-list">{exercises.map((exercise, index) => <div className={'ryu-exercise-card' + (exercise.done === exercise.target ? ' is-complete' : '')} key={exercise.id}>
                    <div className="ryu-exercise-num">{String(index + 1).padStart(2, '0')}</div>
                    <div className="ryu-exercise-info"><strong>{exercise.name}</strong><small>{exercise.detail}</small><div className="ryu-set-dots">{Array.from({ length: exercise.target }, (_, n) => <i key={n} className={n < exercise.done ? 'done' : ''} />)}</div><div className="ryu-exercise-inputs"><label><span>{exercise.measure === 'seconds' ? 'HOLD SEC' : 'REPS / SET'}</span><input type="number" min="1" max="999" inputMode="numeric" value={exercise.repTarget ?? 10} disabled={exercise.done >= exercise.target} onChange={event => updateExerciseMetric(index, 'repTarget', event.target.value)} /></label><label><span>LOAD {units === 'imperial' ? 'LB' : 'KG'}</span><input type="number" min="0" max="999" step="0.5" inputMode="decimal" value={units === 'imperial' ? ((exercise.loadKg ?? 0) * 2.20462).toFixed(1) : (exercise.loadKg ?? 0)} disabled={exercise.done >= exercise.target} onChange={event => { const value = event.target.value; updateExerciseMetric(index, 'loadKg', String(units === 'imperial' ? Number(value || 0) / 2.20462 : Number(value || 0))); }} /></label></div></div>
                    <div className="ryu-exercise-side"><strong>{exercise.done}<small>/{exercise.target}</small></strong><button onClick={() => markSet(index)} disabled={exercise.done >= exercise.target} aria-label={'Log set for ' + exercise.name}><ClickSpark color="#b9ff24">{exercise.done >= exercise.target ? <Check size={18} /> : <Plus size={18} />}</ClickSpark></button></div>
                  </div>)}</div>
                  <button className="ryu-add-movement" onClick={addExercise}><Plus size={16} /> Add movement</button>
                </section>
                <aside className="ryu-rest-card">
                  <div className="ryu-section-heading"><div><span className="ryu-overline">RECOVERY WINDOW</span><h3>Rest timer</h3></div><span className="ryu-rest-status">{restLeft > 0 ? 'RESTING' : 'READY'}</span></div>
                  <div className="ryu-rest-ring"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="76" /><circle cx="90" cy="90" r="76" className="ryu-rest-ring__value" style={{ strokeDasharray: (2 * Math.PI * 76 * (restLeft / Math.max(1, restTimerSeconds))) + ' ' + (2 * Math.PI * 76) }} /></svg><div><small>{restLeft > 0 ? 'RECOVER' : 'TAKE YOUR TIME'}</small><strong>{formatTime(restLeft)}</strong></div></div>
                  <p>Breathe. Recover. Come back strong.</p>
                  <div className="ryu-rest-controls"><button onClick={() => { setRestLeft(0); setRestPaused(true); }}>Skip</button><button className="is-primary" onClick={() => setRestPaused(value => !value)}>{restPaused ? <Play size={14} /> : <Pause size={14} />}{restPaused ? 'Resume' : 'Pause'}</button></div>
                  <div className="ryu-rest-presets"><button onClick={() => { setRestLeft(value => value + 15); setRestPaused(false); }}>+15</button><button onClick={() => { setRestLeft(45); setRestPaused(false); }}>45s</button><button onClick={() => { setRestLeft(60); setRestPaused(false); }}>60s</button><button onClick={() => { setRestLeft(90); setRestPaused(false); }}>90s</button></div>
                </aside>
              </div>
            </> : <>
              <SpotlightCard className="ryu-training-feature" radius={22} intensity={0.12}>
                <div className="ryu-training-feature__image" style={{ backgroundImage: 'linear-gradient(90deg,rgba(4,7,5,.96),rgba(4,7,5,.6) 54%,rgba(4,7,5,.05)),url(' + workoutHeroImage + ')' }}>
                  <span className="ryu-overline">EDITOR'S PICK · NO EQUIPMENT</span><h2>Build your<br /><span>foundation.</span></h2><p>Four movements. One focused session. Start where you are.</p><button className="ryu-primary-button" onClick={() => startWorkout('foundation')}><Play size={15} fill="currentColor" /> Start session <ArrowRight size={15} /></button>
                  <span className="ryu-feature-time"><Clock3 size={13} /> 25 MIN</span>
                </div>
              </SpotlightCard>
              <section className="ryu-section">
                <div className="ryu-section-heading"><div><span className="ryu-overline">CHOOSE YOUR FOCUS</span><h2>Your plans</h2></div><span className="ryu-count-pill">{allPlans.length} ROUTINES</span></div>
                <div className="ryu-plan-list">{allPlans.map((plan, index) => <div className="ryu-plan-row" key={plan.id}>
                  <div className={'ryu-plan-art plan-art-' + (index % 3)}>{index % 3 === 0 ? <Activity size={22} /> : index % 3 === 1 ? <Dumbbell size={22} /> : <Footprints size={22} />}</div>
                  <div className="ryu-plan-copy"><span>{plan.level} · {plan.time}</span><strong>{plan.name}</strong><small>{plan.sub}</small><em>{plan.exercises.length} movements</em></div>
                  {plan.level === 'CUSTOM' && <button className="ryu-delete-plan" onClick={() => void deleteCustomPlan(plan)} aria-label={'Delete ' + plan.name}><X size={14} /></button>}
                  <button className="ryu-plan-play" onClick={() => { setSelectedPlan(plan.id); if (plan.id !== selectedPlan) { setWorkoutName(plan.name); setExercises(plan.exercises.map(e => ({ ...e, done: 0, setLogs: [] }))); } startWorkout(plan.id); }} aria-label={'Start ' + plan.name}><Play size={15} fill="currentColor" /></button>
                </div>)}</div>
              </section>
              <section className="ryu-routine-builder">
                <div className="ryu-section-heading"><div><span className="ryu-overline">MAKE IT YOURS</span><h2>Build a routine</h2></div><button className="ryu-outline-button" onClick={() => setShowPlanBuilder(value => !value)}>{showPlanBuilder ? 'Close' : 'Create'} <Plus size={14} /></button></div>
                {showPlanBuilder && <form className="ryu-builder-form" onSubmit={saveCustomPlan}>
                  <label>ROUTINE NAME<input value={customPlanName} onChange={event => setCustomPlanName(event.target.value)} placeholder="e.g. Push + core" maxLength={48} minLength={2} required /></label>
                  <label>SHORT NOTE<input value={customPlanDescription} onChange={event => setCustomPlanDescription(event.target.value)} placeholder="What is this session for?" maxLength={140} /></label>
                  <div className="ryu-builder-grid">{routineExerciseLibrary.map(exercise => <label key={exercise.id} className={customExerciseIds.includes(exercise.id) ? 'is-selected' : ''}><input type="checkbox" checked={customExerciseIds.includes(exercise.id)} onChange={event => setCustomExerciseIds(current => event.target.checked ? (current.length >= 12 ? current : [...current, exercise.id]) : current.filter(id => id !== exercise.id))} /><span>{exercise.name}<small>{exercise.detail}</small></span><i>{customExerciseIds.includes(exercise.id) ? <Check size={13} /> : <Plus size={13} />}</i></label>)}</div>
                  <button className="ryu-primary-button ryu-full-button" type="submit" disabled={planSaving || !customExerciseIds.length}>{planSaving ? 'Saving…' : 'Save routine'} <ArrowRight size={15} /></button>
                </form>}
              </section>
            </>}
          </motion.div>}

          {tab === 'progress' && <motion.div key="progress" className="ryu-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24 }}>
            <div className="ryu-page-intro"><span className="ryu-overline">THE LONG GAME</span><h1>Your progress.</h1><p>Your work, your numbers, your next milestone.</p></div>
            <div className="ryu-progress-summary"><div><span><Trophy size={15} /> TOTAL EXPERIENCE</span><strong>{xp.toLocaleString()} <small>XP</small></strong><i><span style={{ width: (xp % 250) / 250 * 100 + '%' }} /></i><small>{250 - (xp % 250)} XP to level {level + 1}</small></div><div className="ryu-progress-level"><small>PLAYER LEVEL</small><strong>{String(level).padStart(2, '0')}</strong><span>{nextLevelTitle(level)}</span></div></div>
            <RpgProgression variant="progress" xp={xp} sessionsCount={sessions.length} totalSets={totalLoggedSets} totalMinutes={totalMinutes} streak={streak} />
            <PersonalRecordBoard records={personalRecords} units={units} />
            <div className="ryu-progress-grid">
              <section className="ryu-surface">
                <div className="ryu-section-heading"><div><span className="ryu-overline">WEEKLY CONSISTENCY</span><h2>Keep the rhythm.</h2></div><span className="ryu-count-pill">7 DAYS</span></div>
                <div className="ryu-week-chart">{weeklyCalendar.map(day => <div key={day.key}><span>{day.label.slice(0,1)}</span><i className={day.count ? 'has-value' : ''} style={{ height: day.count ? Math.min(100, 34 + day.count * 28) + '%' : '8%' }} /><small>{day.count || '·'}</small></div>)}</div>
              </section>
              <section className="ryu-surface">
                <div className="ryu-section-heading"><div><span className="ryu-overline">MILESTONES</span><h2>Earned, not given.</h2></div><Award size={19} /></div>
                {[{title:'First steps',desc:'Complete your first workout',earned:sessions.length>=1,icon:<Footprints size={17}/>},{title:'In the rhythm',desc:'Complete 5 workouts',earned:sessions.length>=5,icon:<Flame size={17}/>},{title:'Century club',desc:'Log 100 sets',earned:totalLoggedSets>=100,icon:<Trophy size={17}/>}].map(item => <div className="ryu-achievement" key={item.title}><span>{item.earned?<Check size={16}/>:item.icon}</span><div><strong>{item.title}</strong><small>{item.desc}</small></div><em>{item.earned?'EARNED':'LOCKED'}</em></div>)}
              </section>
            </div>
            <section className="ryu-section">
              <div className="ryu-section-heading"><div><span className="ryu-overline">YOUR ARCHIVE</span><h2>Session history</h2></div><span className="ryu-count-pill">{sessions.length} RECORDS</span></div>
              {sessions.length ? <div className="ryu-activity-list">{sessions.map(session => <div className="ryu-activity-row" key={session.id}><span className="ryu-activity-icon"><Dumbbell size={17}/></span><div><strong>{session.title}</strong><small>{dateLabel(session.date)} · {formatTime(session.duration)} · {session.sets} sets</small></div><b>+{session.xp} XP</b></div>)}</div> : <div className="ryu-empty-card"><span><TrendingUp size={20}/></span><strong>Your progress begins with one session.</strong><p>Log a workout to start building your record.</p><button onClick={() => setTab('train')}>Start training <ArrowRight size={14}/></button></div>}
            </section>
          </motion.div>}

          {tab === 'discover' && <motion.div key="discover" className="ryu-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24 }}>
            <div className="ryu-page-intro"><span className="ryu-overline">THE TRAINING LIBRARY</span><h1>Find your focus.</h1><p>Explore your plans and create a routine that fits your day.</p></div>
            <div className="ryu-library-feature" style={{ backgroundImage: 'linear-gradient(90deg,rgba(3,7,4,.92),rgba(3,7,4,.56) 57%,rgba(3,7,4,.06)),url(' + fuelHeroImage + ')' }}>
              <span className="ryu-overline">FUEL YOUR RECOVERY</span><h2>Strong starts<br/>with good habits.</h2><p>Rest, hydration and balanced meals are part of training too.</p>
            </div>
            <section className="ryu-section">
              <div className="ryu-section-heading"><div><span className="ryu-overline">PICK YOUR PATH</span><h2>Workout library</h2></div><span className="ryu-count-pill">{allPlans.length} PLANS</span></div>
              <div className="ryu-plan-list">{allPlans.map((plan,index) => <div className="ryu-plan-row" key={plan.id}><div className={'ryu-plan-art plan-art-' + (index%3)}>{index%3===0?<Activity size={22}/>:index%3===1?<Dumbbell size={22}/>:<Footprints size={22}/>}</div><div className="ryu-plan-copy"><span>{plan.level} · {plan.time}</span><strong>{plan.name}</strong><small>{plan.sub}</small><em>{plan.exercises.length} movements</em></div>{plan.level==='CUSTOM'&&<button className="ryu-delete-plan" onClick={()=>void deleteCustomPlan(plan)} aria-label={'Delete '+plan.name}><X size={14}/></button>}<button className="ryu-plan-play" onClick={()=>startWorkout(plan.id)} aria-label={'Start '+plan.name}><Play size={15} fill="currentColor"/></button></div>)}</div>
            </section>
            <section className="ryu-routine-builder">
              <div className="ryu-section-heading"><div><span className="ryu-overline">YOUR TRAINING / YOUR RULES</span><h2>Make a routine.</h2></div><button className="ryu-outline-button" onClick={() => setShowPlanBuilder(value => !value)}>{showPlanBuilder ? 'Close' : 'Create'} <Plus size={14}/></button></div>
              {showPlanBuilder && <form className="ryu-builder-form" onSubmit={saveCustomPlan}>
                <label>ROUTINE NAME<input value={customPlanName} onChange={event => setCustomPlanName(event.target.value)} placeholder="e.g. Push + core" maxLength={48} minLength={2} required /></label>
                <label>SHORT NOTE<input value={customPlanDescription} onChange={event => setCustomPlanDescription(event.target.value)} placeholder="What is this session for?" maxLength={140}/></label>
                <div className="ryu-builder-grid">{routineExerciseLibrary.map(exercise => <label key={exercise.id} className={customExerciseIds.includes(exercise.id) ? 'is-selected' : ''}><input type="checkbox" checked={customExerciseIds.includes(exercise.id)} onChange={event => setCustomExerciseIds(current => event.target.checked ? (current.length >= 12 ? current : [...current, exercise.id]) : current.filter(id => id !== exercise.id))}/><span>{exercise.name}<small>{exercise.detail}</small></span><i>{customExerciseIds.includes(exercise.id)?<Check size={13}/>:<Plus size={13}/>}</i></label>)}</div>
                <button className="ryu-primary-button ryu-full-button" type="submit" disabled={planSaving || !customExerciseIds.length}>{planSaving?'Saving routine…':'Save routine'} <ArrowRight size={15}/></button>
              </form>}
            </section>
          </motion.div>}

          {tab === 'meals' && <motion.div key="meals" className="ryu-screen ryu-meals-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .24 }}>
            <div className="ryu-page-intro"><span className="ryu-overline">FUEL YOUR TRAINING</span><h1>Eat for your <span>next level.</span></h1><p>Simple meal ideas to support your training. Nutrition values are estimates per serving.</p></div>
            <div className="ryu-nutrition-hero" style={{ backgroundImage: 'linear-gradient(90deg,rgba(4,10,5,.96),rgba(4,10,5,.64) 58%,rgba(4,10,5,.12)),url(' + fuelHeroImage + ')' }}>
              <span className="ryu-nutrition-kicker"><Leaf size={13}/> THE DAILY FUEL</span><h2>Train hard.<br/>Recover smarter.</h2><p>Build balanced plates with protein, carbs and colorful plants.</p>
              <button onClick={() => setTab('discover')}>Explore workout plans <ArrowRight size={14}/></button>
            </div>
            <section className="ryu-nutrition-summary">
              <div><span className="ryu-nutrition-summary__icon"><Flame size={16}/></span><small>ENERGY</small><strong>Balanced</strong><em>Fuel your session</em></div>
              <div><span className="ryu-nutrition-summary__icon"><Dumbbell size={16}/></span><small>PROTEIN</small><strong>Include a source</strong><em>Support recovery</em></div>
              <div><span className="ryu-nutrition-summary__icon"><Leaf size={16}/></span><small>VARIETY</small><strong>More color</strong><em>Mix up your plate</em></div>
            </section>
            <div className="ryu-meal-search"><Search size={17}/><input aria-label="Search meal ideas" value={mealQuery} onChange={event=>setMealQuery(event.target.value)} placeholder="Search meals or ingredients…"/>{mealQuery&&<button onClick={()=>setMealQuery('')} aria-label="Clear search"><X size={15}/></button>}</div>
            <div className="ryu-meal-categories">{['All','Vegetarian','High-protein','Seafood','Quick'].map(category=><button key={category} className={mealCategory===category?'is-active':''} onClick={()=>setMealCategory(category)}>{category}</button>)}</div>
            <section className="ryu-section">
              <div className="ryu-section-heading"><div><span className="ryu-overline">THE MEAL BOARD</span><h2>Good fuel, no fuss.</h2></div><span className="ryu-count-pill">{[
                {name:'Lemon herb chicken bowl',category:'High-protein Quick',ingredients:'chicken rice lemon herbs avocado',kcal:520,protein:42,carbs:54,fat:14,image:'photo-1547592180-85f173990554'},
                {name:'Chickpea power bowl',category:'Vegetarian Quick',ingredients:'chickpea quinoa cucumber tomato greens',kcal:430,protein:19,carbs:62,fat:12,image:'photo-1512621776951-a57141f2eefd'},
                {name:'Salmon and greens',category:'Seafood High-protein',ingredients:'salmon rice broccoli lemon',kcal:490,protein:38,carbs:42,fat:17,image:'photo-1467003909585-2f8a72700288'},
                {name:'Peanut banana oats',category:'Vegetarian Quick High-protein',ingredients:'oats banana peanut butter milk',kcal:410,protein:18,carbs:55,fat:14,image:'photo-1517673132405-a56a62b18caf'},
                {name:'Paneer grain plate',category:'Vegetarian High-protein',ingredients:'paneer brown rice peppers spinach',kcal:470,protein:27,carbs:48,fat:18,image:'photo-1547592180-85f173990554'}
              ].filter(meal=>(mealCategory==='All'||meal.category.toLowerCase().includes(mealCategory.toLowerCase()))&&((meal.name+' '+meal.ingredients).toLowerCase().includes(mealQuery.toLowerCase()))).length} IDEAS</span></div>
              <div className="ryu-meal-grid">{[
                {name:'Lemon herb chicken bowl',category:'High-protein Quick',ingredients:'Chicken · rice · greens',kcal:520,protein:42,carbs:54,fat:14,image:'photo-1547592180-85f173990554',color:'meal-green'},
                {name:'Chickpea power bowl',category:'Vegetarian Quick',ingredients:'Chickpeas · quinoa · vegetables',kcal:430,protein:19,carbs:62,fat:12,image:'photo-1512621776951-a57141f2eefd',color:'meal-citrus'},
                {name:'Salmon and greens',category:'Seafood High-protein',ingredients:'Salmon · rice · broccoli',kcal:490,protein:38,carbs:42,fat:17,image:'photo-1467003909585-2f8a72700288',color:'meal-dark'},
                {name:'Peanut banana oats',category:'Vegetarian Quick High-protein',ingredients:'Oats · banana · peanut butter',kcal:410,protein:18,carbs:55,fat:14,image:'photo-1517673132405-a56a62b18caf',color:'meal-oat'},
                {name:'Paneer grain plate',category:'Vegetarian High-protein',ingredients:'Paneer · rice · peppers',kcal:470,protein:27,carbs:48,fat:18,image:'photo-1547592180-85f173990554',color:'meal-green'}
              ].filter(meal=>(mealCategory==='All'||meal.category.toLowerCase().includes(mealCategory.toLowerCase()))&&((meal.name+' '+meal.ingredients).toLowerCase().includes(mealQuery.toLowerCase()))).map(meal=><article className="ryu-meal-card" key={meal.name}>
                <div className={'ryu-meal-photo '+meal.color} style={{backgroundImage:'linear-gradient(0deg,rgba(4,8,5,.56),transparent 65%),url(https://images.unsplash.com/'+meal.image+'?auto=format&fit=crop&w=900&q=80)'}}><span>{meal.category.split(' ')[0]}</span><strong>{meal.kcal}<small> kcal</small></strong></div>
                <div className="ryu-meal-card__body"><h3>{meal.name}</h3><p>{meal.ingredients}</p><div className="ryu-meal-macros"><span><b>{meal.protein}g</b><small>PROTEIN</small></span><span><b>{meal.carbs}g</b><small>CARBS</small></span><span><b>{meal.fat}g</b><small>FAT</small></span></div></div>
              </article>)}</div>
              {![{name:'Lemon herb chicken bowl',category:'High-protein Quick',ingredients:'Chicken rice greens'},{name:'Chickpea power bowl',category:'Vegetarian Quick',ingredients:'Chickpeas quinoa vegetables'},{name:'Salmon and greens',category:'Seafood High-protein',ingredients:'Salmon rice broccoli'},{name:'Peanut banana oats',category:'Vegetarian Quick High-protein',ingredients:'Oats banana peanut butter'},{name:'Paneer grain plate',category:'Vegetarian High-protein',ingredients:'Paneer rice peppers'}].some(meal=>(mealCategory==='All'||meal.category.toLowerCase().includes(mealCategory.toLowerCase()))&&(meal.name+' '+meal.ingredients).toLowerCase().includes(mealQuery.toLowerCase()))&&<div className="ryu-empty-card"><span><Search size={20}/></span><strong>No meal ideas found.</strong><p>Try another search or category.</p><button onClick={()=>{setMealQuery('');setMealCategory('All');}}>Clear filters <RotateCcw size={14}/></button></div>}
            </section>
            <p className="ryu-nutrition-note">Nutrition numbers are illustrative estimates, not personalized targets. Portion sizes and preparation change the actual values.</p>
          </motion.div>}

          {tab === 'auth' && <motion.div key="auth" className="ryu-screen ryu-auth-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="ryu-page-intro"><span className="ryu-overline">RYU MEMBER ACCESS</span><h1>Your progress.<br/><span>Your account.</span></h1><p>Sign in to keep every session and milestone with you.</p></div>
            <div className="ryu-auth-card">
              <div className="ryu-section-heading"><div><span className="ryu-overline">MEMBER ACCESS</span><h2>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2></div><ShieldCheck size={20}/></div>
              <button type="button" className="ryu-google-button" onClick={() => void signInWithGoogle()} disabled={authBusy}><span>G</span> Continue with Google <ArrowRight size={15}/></button>
              <div className="ryu-auth-divider"><span>OR CONTINUE WITH EMAIL</span></div>
              <form className="ryu-auth-form" onSubmit={submitAuth}>
                {authMode === 'signup' && <>
                  <label>USERNAME<div className="ryu-input-prefix"><span>@</span><input autoComplete="username" value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0,20))} placeholder="your_handle" minLength={3} maxLength={20} required/></div><small>{username.length===0?'3–20 characters · letters, numbers, underscores':!usernameValid?'Use 3–20 lowercase letters, numbers or underscores':usernameAvailability==='checking'?'Checking username…':usernameAvailability==='available'?'@'+normalizedUsername+' is available':usernameAvailability==='taken'?'That username is already taken':'Availability will be checked when saved'}</small></label>
                  <label>DISPLAY NAME<input autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="What should Ryu call you?" maxLength={40}/></label>
                </>}
                <label>EMAIL<input type="email" autoComplete="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="you@example.com" required/></label>
                <label>PASSWORD<div className="ryu-input-password"><input type={passwordVisible?'text':'password'} autoComplete={authMode==='signup'?'new-password':'current-password'} value={authPassword} onChange={event => setAuthPassword(event.target.value)} minLength={authMode==='signup'?12:undefined} placeholder={authMode==='signup'?'Create a strong password':'Your password'} required/><button type="button" onClick={() => setPasswordVisible(value=>!value)}>{passwordVisible?'Hide':'Show'}</button></div></label>
                {authMode==='signup'&&<div className="ryu-password-check"><div><span>Password strength</span><strong>{authPassword?passwordStrengthLabel:'Not checked'}</strong></div><i><span style={{width:(passwordScore*20)+'%'}}/></i>{passwordCriteria.map(item=><small key={item.label} className={item.valid?'is-valid':''}>{item.valid?'✓':'○'} {item.label}</small>)}</div>}
                {authError&&<p className="ryu-error" role="alert">{authError}</p>}
                {authMessage&&<p className="ryu-success" role="status">{authMessage}</p>}
                <button className="ryu-primary-button ryu-full-button" type="submit" disabled={authBusy||(authMode==='signup'&&(!usernameValid||!passwordStrong||usernameAvailability==='taken'||usernameAvailability==='checking'))}>{authBusy?'One sec…':authMode==='signup'?'Create account':'Sign in'} <ArrowRight size={15}/></button>
                <button type="button" className="ryu-auth-switch" onClick={() => {setAuthMode(value=>value==='signin'?'signup':'signin');setAuthError('');setAuthMessage('');}}>{authMode==='signin'?'New to Ryu? Create an account':'Already have an account? Sign in'}</button>
              </form>
            </div>
          </motion.div>}

          {tab === 'profile' && <motion.div key="profile" className="ryu-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="ryu-page-intro"><span className="ryu-overline">YOUR SPACE</span><h1>Make it yours.</h1><p>Your pace. Your preferences. Your progress.</p></div>
            <SpotlightCard className="ryu-profile-hero" radius={20} intensity={0.1}>
              <div className="ryu-profile-identity"><span className="ryu-profile-avatar">{greetingName.slice(0,1).toUpperCase()}<i/></span><div><span className="ryu-overline">{account?'RYU CLOUD MEMBER':'RYU MEMBER'}</span><h2>{displayName || 'The journey is yours.'}</h2><p>{profileUsername?'@'+profileUsername:'Set your username'} · Level {level}</p></div></div>
              <div className="ryu-profile-metrics"><div><strong>{xp.toLocaleString()}</strong><span>EXPERIENCE</span></div><div><strong>{sessions.length}</strong><span>SESSIONS</span></div><div><strong>{streak}</strong><span>DAY STREAK</span></div></div>
            </SpotlightCard>
            <section className="ryu-settings-section ryu-surface">
              <div className="ryu-section-heading"><div><span className="ryu-overline">ACCOUNT</span><h2>{account?'You’re signed in':'Sync your progress'}</h2></div><ShieldCheck size={18}/></div>
              {authLoading ? <p className="ryu-settings-note">Checking your secure session…</p> : account ? <>
                <p className="ryu-settings-note">{account.email}</p><p className="ryu-settings-note">{profileUsername?'Your handle is @'+profileUsername:'Choose a username to finish your profile.'}</p>
                {!profileUsername&&<form className="ryu-auth-form" onSubmit={event=>{event.preventDefault();void saveUsername();}}><label>USERNAME<div className="ryu-input-prefix"><span>@</span><input value={username} onChange={event=>setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,20))} minLength={3} maxLength={20} required/></div></label><button className="ryu-primary-button ryu-full-button" type="submit" disabled={profileBusy||!usernameValid}>{profileBusy?'Saving…':'Save username'} <ArrowRight size={15}/></button></form>}
                {authError&&<p className="ryu-error">{authError}</p>}{authMessage&&<p className="ryu-success">{authMessage}</p>}
                <button className="ryu-outline-button ryu-full-button" onClick={() => void signOut()}>Sign out <ArrowRight size={14}/></button>
              </> : <><p className="ryu-settings-note">Your workouts stay on this device until you sign in. Create an account to sync new training sessions across devices.</p><button className="ryu-primary-button ryu-full-button" onClick={() => {setAuthMode('signin');setTab('auth');}}>Sign in or create account <ArrowRight size={15}/></button></>}
            </section>
            <section className="ryu-settings-section ryu-surface">
              <div className="ryu-section-heading"><div><span className="ryu-overline">PREFERENCES</span><h2>Your experience</h2></div><Settings2 size={18}/></div>
              <SettingRow icon={<Bell size={18}/>} title="Workout reminders" desc="Save this preference to your account"><Toggle checked={remindersOn} onClick={() => void persistUserSettings({reminders_enabled:!remindersOn})}/></SettingRow>
              <SettingRow icon={<Activity size={18}/>} title="Sound feedback" desc="Keep feedback preference synced"><Toggle checked={soundOn} onClick={() => void persistUserSettings({sound_enabled:!soundOn})}/></SettingRow>
              <SettingRow icon={<Gauge size={18}/>} title="Default routine" desc="Choose your starting plan"><select className="ryu-setting-select" value={selectedPlan} onChange={event=>void persistUserSettings({default_plan:event.target.value})}>{allPlans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></SettingRow>
              <SettingRow icon={<Gauge size={18}/>} title="Measurement units" desc="How loads are shown"><select className="ryu-setting-select" value={units} onChange={event=>void persistUserSettings({units:event.target.value as 'metric'|'imperial'})}><option value="metric">Metric · kg</option><option value="imperial">Imperial · lb</option></select></SettingRow>
              <SettingRow icon={<Timer size={18}/>} title="Rest timer" desc="Default recovery between sets"><select className="ryu-setting-select" value={restTimerSeconds} onChange={event=>void persistUserSettings({rest_timer_seconds:Number(event.target.value)})}><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={75}>75 seconds</option><option value={90}>90 seconds</option><option value={120}>120 seconds</option></select></SettingRow>
            </section>
            <section className="ryu-settings-section ryu-surface">
              <div className="ryu-section-heading"><div><span className="ryu-overline">YOUR DATA</span><h2>Keep your record.</h2></div><ShieldCheck size={18}/></div>
              <p className="ryu-settings-note">{account?'Your signed-in workouts, set records, routines and preferences are synced to your account.':'Your local workouts, XP and streak are stored on this device.'}</p>
              <button className="ryu-outline-button ryu-full-button" onClick={() => {const blob=new Blob([JSON.stringify({sessions,xp,bonusXp,streak,personalRecords,customPlans,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ryu-progress.json';a.click();URL.revokeObjectURL(url);pushNotice('Export prepared','Your progress file was downloaded.','success');}}><ArrowDownRight size={15}/> Export my progress</button>
              <button className="ryu-danger-button ryu-full-button" onClick={() => {if(window.confirm('Reset all local Ryu progress? This cannot be undone.')){setSessions([]);setXp(0);setStreak(0);setActive(false);setStartedAt(null);setElapsed(0);setExercises(starterExercises);pushNotice('Progress reset','Your local training history has been cleared.','info');}}}><RotateCcw size={15}/> Reset local progress</button>
            </section>
          </motion.div>}
        </AnimatePresence>
        )}
      </main>

      {appAccess === 'active' && <nav className="ryu-bottom-nav" aria-label="Main navigation">
        <button className={tab==='home'?'is-active':''} onClick={() => setTab('home')}><Home size={19}/><span>Home</span></button>
        <button className={tab==='train'?'is-active':''} onClick={() => setTab('train')}><Dumbbell size={19}/><span>Workout</span></button>
        <button className={'ryu-bottom-center'+(tab==='progress'?' is-active':'')} onClick={() => setTab('progress')} aria-label="Progress"><TrendingUp size={21}/></button>
        <button className={tab==='meals'?'is-active':''} onClick={() => setTab('meals')}><Utensils size={19}/><span>Meals</span></button>
        <button className={tab==='profile'?'is-active':''} onClick={() => setTab('profile')}><UserRound size={19}/><span>Profile</span></button>
      </nav>}

      <AnimatePresence>
        {notices.length > 0 && <motion.div className={'ryu-toast ' + (expandedNotice?'is-expanded':'')} initial={{opacity:0,y:-20,scale:.94}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:.96}} transition={{type:'spring',stiffness:420,damping:30}} onClick={() => setExpandedNotice(value=>!value)} role="status" aria-live="polite">
          <span className="ryu-toast-icon">{notices[0].kind==='achievement'?<Trophy size={17}/>:notices[0].kind==='info'?<Waves size={17}/>:<Check size={17}/>}</span><div><strong>{notices[0].title}</strong>{expandedNotice&&<p>{notices[0].subtitle}</p>}</div><span className="ryu-toast-count">{notices.length>1?'+'+(notices.length-1):'•'}</span><button onClick={event=>{event.stopPropagation();setNotices(current=>current.slice(1));setExpandedNotice(false);}} aria-label="Dismiss notification"><X size={14}/></button>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {showFinish && <motion.div className="ryu-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowFinish(false)}><motion.div className="ryu-finish-modal" initial={{opacity:0,y:20,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12}} onClick={event=>event.stopPropagation()}><button className="ryu-modal-close" onClick={()=>setShowFinish(false)} aria-label="Close"><X size={18}/></button><span className="ryu-finish-icon"><Trophy size={24}/></span><span className="ryu-overline">CLOSE THE CHAPTER</span><h2>Finish this session?</h2><p>Your sets will be saved and your XP awarded from the work logged.</p><div className="ryu-finish-stats"><div><strong>{completedSets}</strong><small>SETS</small></div><div><strong>{formatTime(elapsed)}</strong><small>DURATION</small></div><div><strong>{Math.max(20,completedSets*8+Math.round(elapsed/60))}</strong><small>XP</small></div></div><button className="ryu-primary-button ryu-full-button" onClick={() => void finishWorkout()}><CheckCheck size={16}/> Finish & save workout</button><button className="ryu-modal-cancel" onClick={()=>setShowFinish(false)}>Keep training</button></motion.div></motion.div>}
      </AnimatePresence>
      <footer className="ryu-footer"><span>RYU / TRAIN WITH INTENT</span><span>ONE REP AT A TIME · EST. 2026</span></footer>
    </div>
  );
}


function SettingRow({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return <div className="setting-row"><span className="setting-icon">{icon}</span><div className="setting-copy"><strong>{title}</strong><span>{desc}</span></div>{children}</div>;
}
function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return <button className={`toggle ${checked ? 'toggle-on' : ''}`} onClick={onClick} role="switch" aria-checked={checked} aria-label={checked ? 'Turn off' : 'Turn on'}><span /></button>;
}