import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AnimatePresence, motion } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import {
  Activity, ArrowDownRight, ArrowRight, Award, Bell, Check, CheckCheck,
  ChevronRight, Clock3, Dumbbell, Flame, Footprints, Gauge,
  Home, Leaf, MoreHorizontal, Pause, Play, Plus, RotateCcw, Settings2,
  ShieldCheck, Sparkles, Target, Timer, Trophy, TrendingUp, Waves, X, Zap
} from 'lucide-react';

type Tab = 'home' | 'train' | 'progress' | 'discover' | 'profile' | 'auth';
type Exercise = { id: string; name: string; detail: string; target: number; unit: string; rest: number; done: number };
type Session = { id: string; title: string; date: string; duration: number; xp: number; sets: number };
type Notice = { id: number; title: string; subtitle: string; kind: 'success' | 'achievement' | 'info'; priority: number; persistent?: boolean };

const starterExercises: Exercise[] = [
  { id: 'push', name: 'Push-ups', detail: 'Chest · Triceps', target: 4, unit: 'sets', rest: 60, done: 0 },
  { id: 'squat', name: 'Bodyweight squats', detail: 'Quads · Glutes', target: 4, unit: 'sets', rest: 60, done: 0 },
  { id: 'plank', name: 'Plank hold', detail: 'Core · Stability', target: 3, unit: 'sets', rest: 45, done: 0 },
  { id: 'lunge', name: 'Reverse lunges', detail: 'Legs · Balance', target: 3, unit: 'sets', rest: 60, done: 0 },
];
const plans = [
  { id: 'foundation', name: 'Full body foundation', sub: 'A balanced, no-equipment session', time: '25 MIN', level: 'STARTER', exercises: starterExercises },
  { id: 'upper', name: 'Upper-body focus', sub: 'Push strength and shoulder control', time: '20 MIN', level: 'FOUNDATION', exercises: [starterExercises[0], { id: 'pike', name: 'Pike push-ups', detail: 'Shoulders · Triceps', target: 3, unit: 'sets', rest: 75, done: 0 }, { id: 'diamond', name: 'Close-grip push-ups', detail: 'Triceps · Chest', target: 3, unit: 'sets', rest: 60, done: 0 }] },
  { id: 'legs', name: 'Leg day, no excuses', sub: 'Control, range and steady strength', time: '22 MIN', level: 'FOUNDATION', exercises: [starterExercises[1], starterExercises[3], { id: 'bridge', name: 'Glute bridges', detail: 'Glutes · Hamstrings', target: 3, unit: 'sets', rest: 45, done: 0 }] },
];

const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function readStore<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
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
  const [selectedPlan, setSelectedPlan] = useState('foundation');
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
  const totalSets = exercises.reduce((sum, item) => sum + item.target, 0);
  const level = Math.floor(xp / 250) + 1;
  const levelProgress = (xp % 250) / 250 * 100;
  const recent = sessions.slice(0, 4);
  const weeklyCount = useMemo(() => sessions.filter(s => Date.now() - new Date(s.date).getTime() < 7 * 86400000).length, [sessions]);
  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);
  const normalizedUsername = username.trim().toLowerCase();
  const usernameValid = /^[a-z0-9][a-z0-9_]{2,19}$/.test(normalizedUsername);
  const passwordCriteria = [
    { label: 'At least 12 characters', valid: authPassword.length >= 12 },
    { label: 'Lowercase letter', valid: /[a-z]/.test(authPassword) },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(authPassword) },
    { label: 'Number', valid: /[0-9]/.test(authPassword) },
    { label: 'Symbol', valid: /[^A-Za-z0-9]/.test(authPassword) },
  ];
  const passwordScore = passwordCriteria.filter(item => item.valid).length;
  const passwordStrong = passwordCriteria.every(item => item.valid);
  const passwordStrengthLabel = passwordScore <= 2 ? 'Weak' : passwordScore === 3 ? 'Fair' : passwordScore === 4 ? 'Good' : 'Strong';

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

  function pushNotice(title: string, subtitle: string, kind: Notice['kind'] = 'success', priority = 1) {
    const item: Notice = { id: ++noticeId.current, title, subtitle, kind, priority };
    setNotices(current => [...current, item].sort((a, b) => b.priority - a.priority).slice(0, 4));
    setExpandedNotice(false);
  }
  function startWorkout(planId = selectedPlan) {
    const plan = plans.find(p => p.id === planId) ?? plans[0];
    setWorkoutName(plan.name);
    setExercises(plan.exercises.map(e => ({ ...e, done: 0 })));
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
        const setRows = exercises.flatMap(exercise => Array.from({ length: exercise.done }, (_, i) => ({
          user_id: account.id,
          session_id: cloudRecord.id,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          set_number: i + 1,
          completed_at: record.date,
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
    pushNotice('Workout complete', `+${earned} XP · ${completedSets} sets logged`, 'achievement', 5);
    if (sessions.length === 0) window.setTimeout(() => pushNotice('Achievement unlocked', 'First session. The journey starts here.', 'achievement', 6), 700);
    setTab('progress');
  }
  function markSet(index: number) {
    const current = exercises[index];
    if (!current || current.done >= current.target) return;
    const nextDone = current.done + 1;
    setExercises(list => list.map((item, i) => i === index ? { ...item, done: nextDone } : item));
    pushNotice('Set logged', `${current.name} · set ${nextDone} of ${current.target}`, 'success', 1);
    if (nextDone < current.target) {
      setRestLeft(current.rest);
      setRestPaused(false);
    }
  }
  function addExercise() {
    const choices: Exercise[] = [
      { id: 'mountain', name: 'Mountain climbers', detail: 'Core · Conditioning', target: 3, unit: 'sets', rest: 45, done: 0 },
      { id: 'bridge', name: 'Glute bridges', detail: 'Glutes · Hamstrings', target: 3, unit: 'sets', rest: 45, done: 0 },
      { id: 'pike', name: 'Pike push-ups', detail: 'Shoulders · Triceps', target: 3, unit: 'sets', rest: 60, done: 0 },
    ];
    const next = choices.find(item => !exercises.some(e => e.id === item.id));
    if (!next) { pushNotice('All extras added', 'You already have the available bonus moves.', 'info'); return; }
    setExercises(current => [...current, next]);
    pushNotice('Exercise added', next.name, 'success');
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setTab('home')} aria-label="Ryu home">
          <span className="brand-mark"><Waves size={21} strokeWidth={2.5} /></span>
          <span className="brand-word">RYU<span className="brand-period">.</span><small>TRAIN WITH INTENT</small></span>
        </button>
        <div className="topbar-right">
          <div className="streak-chip"><Flame size={15} fill="currentColor" /><span>{streak} DAY STREAK</span></div>
          <button className="icon-button" aria-label="Show notification" onClick={() => pushNotice('You’re on track', 'Small sessions build strong habits.', 'info')}><Bell size={18} /></button>
          {account ? <button className="avatar" onClick={() => setTab('profile')} aria-label="Open profile">{(displayName || account.email || 'R').slice(0, 1).toUpperCase()}<span /></button> : <button className="topbar-auth" onClick={() => { setAuthMode('signin'); setTab('auth'); }}>Sign in <ArrowRight size={15} /></button>}
        </div>
      </header>

      <main className="main-layout">
        <aside className="side-nav">
          <span className="nav-caption">YOUR SPACE</span>
          <NavButton icon={<Home size={18} />} label="Overview" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavButton icon={<Dumbbell size={18} />} label="Training" active={tab === 'train'} onClick={() => setTab('train')} />
          <NavButton icon={<TrendingUp size={18} />} label="Progress" active={tab === 'progress'} onClick={() => setTab('progress')} />
          <NavButton icon={<Sparkles size={18} />} label="Discover" active={tab === 'discover'} onClick={() => setTab('discover')} />
          <div className="nav-spacer" />
          <div className="side-quote"><span className="quote-line" /><p>Earn your<br /><em>next version.</em></p><span className="quote-meta">RYU PRINCIPLE / 001</span></div>
          <NavButton icon={<Settings2 size={18} />} label="Profile & settings" active={tab === 'profile'} onClick={() => setTab('profile')} />
        </aside>

        <section className="content-area">
          <AnimatePresence mode="wait">
            {tab === 'home' && <motion.div key="home" className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
              <div className="eyebrow"><span className="live-dot" /> YOUR TRAINING SPACE <span className="eyebrow-line" /> <span>VOL. 01</span></div>
              <div className="hero-heading">
                <div><p className="kicker">THE WORK IS THE REWARD.</p><h1>Build a body.<br /><span>Build a habit.</span></h1></div>
                <div className="hero-aside"><span className="aside-number">{String(sessions.length + 1).padStart(2, '0')}</span><span className="aside-caption">NEXT CHAPTER<br />STARTS HERE</span></div>
              </div>
              <div className="hero-grid">
                <div className="hero-panel">
                  <div className="hero-panel-top"><span className="micro-label">TODAY'S FOCUS</span><span className="pill-outline"><span className="pill-dot" /> READY WHEN YOU ARE</span></div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="orbit orbit-c" />
                    <div className="hero-sigil"><span>力</span></div>
                    <div className="hero-art-label">STRENGTH<br /><span>IS BUILT QUIETLY.</span></div>
                  </div>
                  <div className="hero-panel-bottom"><div><h2>Full body foundation</h2><p>Simple movements. Serious consistency.</p></div><button className="round-arrow" onClick={() => startWorkout('foundation')} aria-label="Start today's workout"><ArrowRight size={22} /></button></div>
                </div>
                <div className="level-panel glass">
                  <div className="panel-topline"><span className="micro-label">YOUR JOURNEY</span><MoreHorizontal size={18} /></div>
                  <div className="level-ring-wrap"><svg className="level-ring" viewBox="0 0 160 160" role="img" aria-label={`Level ${level}, ${Math.round(levelProgress)} percent to next level`}><circle cx="80" cy="80" r="68" className="ring-track" /><circle cx="80" cy="80" r="68" className="ring-progress" style={{ strokeDasharray: `${2 * Math.PI * 68 * levelProgress / 100} ${2 * Math.PI * 68}` }} /></svg><div className="ring-center"><span>LVL</span><strong>{String(level).padStart(2, '0')}</strong><small>RYU</small></div></div>
                  <div className="xp-row"><span>EXPERIENCE</span><strong>{xp.toLocaleString()} <small>XP</small></strong></div>
                  <div className="xp-track"><span style={{ width: `${levelProgress}%` }} /></div>
                  <p className="level-foot">{250 - (xp % 250)} XP to level {level + 1}</p>
                  <div className="level-divider" />
                  <div className="mini-stat-row"><div><span>SESSIONS</span><strong>{sessions.length}</strong></div><div><span>THIS WEEK</span><strong>{weeklyCount}<small> / 4</small></strong></div></div>
                </div>
              </div>
              <div className="section-heading"><div><span className="micro-label">THE NEXT REP</span><h2>Make today count.</h2></div><button className="text-action" onClick={() => setTab('discover')}>Explore plans <ArrowRight size={15} /></button></div>
              <div className="stats-strip">
                <Stat icon={<Target size={17} />} label="WEEKLY TARGET" value={`${Math.min(weeklyCount, 4)} / 4`} note="sessions completed" />
                <Stat icon={<Clock3 size={17} />} label="TIME INVESTED" value={`${totalMinutes}m`} note="across all sessions" />
                <Stat icon={<Trophy size={17} />} label="TOTAL SETS" value={String(sessions.reduce((s, x) => s + x.sets, 0))} note="logged with intent" />
              </div>
              <div className="bottom-grid">
                <div className="panel recent-panel"><div className="section-head-small"><div><span className="micro-label">YOUR HISTORY</span><h3>Recent sessions</h3></div><button className="subtle-link" onClick={() => setTab('progress')}>View all <ArrowRight size={14} /></button></div>
                  {recent.length ? recent.map(s => <div className="session-row" key={s.id}><div className="session-icon"><Check size={17} /></div><div className="session-info"><strong>{s.title}</strong><span>{dateLabel(s.date)} · {s.sets} sets</span></div><div className="session-xp">+{s.xp} XP</div></div>) : <div className="empty-history"><span className="empty-icon"><Activity size={19} /></span><p>Your first chapter is unwritten.</p><span>Finish a session and it will live here.</span></div>}
                </div>
                <div className="principle-panel"><span className="principle-index">RYU / FIELD NOTE 01</span><div className="principle-mark"><Zap size={21} /></div><h3>Consistency<br />beats intensity.</h3><p>You don't need a perfect day. You need a repeatable one. Start where you are, then build.</p><button className="principle-link" onClick={() => setTab('train')}>Get moving <ArrowDownRight size={16} /></button><span className="principle-watermark">01</span></div>
              </div>
            </motion.div>}

            {tab === 'train' && <motion.div key="train" className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
              <div className="eyebrow"><span className="live-dot" /> TRAINING FLOOR <span className="eyebrow-line" /> <span>{active ? 'SESSION IN PROGRESS' : 'READY TO MOVE'}</span></div>
              <div className="page-title-row"><div><p className="kicker">SHOW UP FOR YOURSELF.</p><h1>{active ? 'Stay in the work.' : 'Time to train.'}</h1><p className="page-subtitle">{active ? 'Every completed set is one more promise kept.' : 'No equipment required. Just a little room and a decision.'}</p></div>{active && <div className="elapsed-chip"><Timer size={16} /><strong>{formatTime(elapsed)}</strong><span>ELAPSED</span></div>}</div>
              {active ? <div className="workout-layout"><div className="workout-main panel"><div className="workout-head"><div><span className="micro-label">CURRENT SESSION</span><h2>{workoutName}</h2><p>{completedSets} of {totalSets} sets logged</p></div><button className="outline-button" onClick={() => setShowFinish(true)}>Finish session</button></div><div className="workout-progress"><span style={{ width: `${totalSets ? completedSets / totalSets * 100 : 0}%` }} /></div>
                <div className="exercise-list">{exercises.map((e, i) => <div className={`exercise-row ${e.done === e.target ? 'exercise-complete' : ''}`} key={e.id}><div className="exercise-index">{String(i + 1).padStart(2, '0')}</div><div className="exercise-details"><strong>{e.name}</strong><span>{e.detail}</span><div className="set-track">{Array.from({ length: e.target }, (_, n) => <span key={n} className={n < e.done ? 'set-done' : ''} />)}</div></div><div className="exercise-count"><strong>{e.done}<span>/{e.target}</span></strong><small>SETS</small></div><button className={`set-button ${e.done === e.target ? 'is-done' : ''}`} onClick={() => markSet(i)} disabled={e.done >= e.target} aria-label={e.done >= e.target ? `${e.name} complete` : `Log next set of ${e.name}`}>{e.done >= e.target ? <Check size={19} /> : <Plus size={19} />}</button></div>)}</div>
                <div className="workout-actions"><button className="outline-button" onClick={addExercise}><Plus size={16} /> Add movement</button><span className="autosave"><ShieldCheck size={14} /> Progress saves automatically</span></div></div>
                <div className="rest-panel glass"><span className="micro-label">RECOVERY WINDOW</span><div className="rest-clock"><svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="69" className="ring-track" /><circle cx="80" cy="80" r="69" className="rest-progress" style={{ strokeDasharray: `${2 * Math.PI * 69 * (restLeft / 90)} ${2 * Math.PI * 69}` }} /></svg><div className="rest-clock-center"><Timer size={17} /><strong>{formatTime(restLeft)}</strong><span>{restLeft > 0 ? 'RESTING' : 'READY'}</span></div></div><p>{restLeft > 0 ? 'Breathe. Recover. Come back strong.' : 'Take your time. Quality over hurry.'}</p><div className="rest-controls"><button className="outline-button" onClick={() => { setRestLeft(0); setRestPaused(true); }}><X size={15} /> Skip</button><button className="lime-button" onClick={() => setRestPaused(v => !v)}>{restPaused ? <Play size={15} /> : <Pause size={15} />}{restPaused ? 'Resume' : 'Pause'}</button></div><div className="rest-presets"><button onClick={() => { setRestLeft(v => v + 15); setRestPaused(false); }}>+15s</button><button onClick={() => { setRestLeft(45); setRestPaused(false); }}>45s</button><button onClick={() => { setRestLeft(60); setRestPaused(false); }}>60s</button><button onClick={() => { setRestLeft(90); setRestPaused(false); }}>90s</button></div><div className="rest-note"><Leaf size={15} /><span>Rest is part of the work.</span></div></div></div>
              : <div className="training-empty"><div className="training-empty-art"><div className="training-orbit" /><Dumbbell size={48} strokeWidth={1.2} /><span>RYU / TRAINING LOG</span></div><div className="training-empty-copy"><span className="micro-label">BUILT AROUND YOU</span><h2>Your next session<br />starts with one rep.</h2><p>Choose a focused session, log each set as you go, and let Ryu keep the record. Your history and XP update when you finish.</p><button className="lime-button large" onClick={() => startWorkout(selectedPlan)}><Play size={17} fill="currentColor" /> Start full body <ArrowRight size={17} /></button></div></div>}
              <div className="section-heading"><div><span className="micro-label">CHOOSE YOUR FOCUS</span><h2>Training plans</h2></div></div><div className="plan-grid">{plans.map((plan, i) => <button className={`plan-card ${selectedPlan === plan.id ? 'plan-selected' : ''}`} key={plan.id} onClick={() => { setSelectedPlan(plan.id); if (!active) { setWorkoutName(plan.name); setExercises(plan.exercises.map(e => ({ ...e, done: 0 }))); } }}><div className={`plan-art plan-art-${i + 1}`}><span>{['01', '02', '03'][i]}</span>{i === 0 ? <Activity size={24} /> : i === 1 ? <Zap size={24} /> : <Footprints size={24} />}</div><div className="plan-card-copy"><span className="micro-label">{plan.level} · {plan.time}</span><strong>{plan.name}</strong><span>{plan.sub}</span><div className="plan-card-foot"><span>{plan.exercises.length} movements</span><ChevronRight size={17} /></div></div></button>)}</div>
            </motion.div>}

            {tab === 'progress' && <motion.div key="progress" className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
              <div className="eyebrow"><span className="live-dot" /> THE LONG GAME <span className="eyebrow-line" /> <span>YOUR RECORD</span></div><div className="page-title-row"><div><p className="kicker">PROOF OF YOUR WORK.</p><h1>Look how far.</h1><p className="page-subtitle">Every session counts. This is your progress, not somebody else's.</p></div><div className="progress-stamp"><Trophy size={22} /><span>RYU<br />RECORD</span></div></div>
              <div className="stats-strip progress-stats"><Stat icon={<Dumbbell size={17} />} label="SESSIONS" value={String(sessions.length)} note="completed" /><Stat icon={<Clock3 size={17} />} label="TRAINING TIME" value={`${totalMinutes}m`} note="total logged" /><Stat icon={<Zap size={17} />} label="EXPERIENCE" value={xp.toLocaleString()} note="lifetime XP" /></div>
              <div className="progress-layout"><div className="panel progress-chart-panel"><div className="section-head-small"><div><span className="micro-label">WEEKLY CONSISTENCY</span><h3>Show up, again.</h3></div><span className="chart-range">LAST 7 DAYS</span></div><div className="week-bars">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => { const now = new Date(); const monday = (now.getDay() + 6) % 7; const d = new Date(now); d.setDate(now.getDate() - monday + i); const count = sessions.filter(s => new Date(s.date).toDateString() === d.toDateString()).length; return <div className="week-day" key={day + i}><div className="bar-track"><motion.span initial={{ height: 0 }} animate={{ height: count ? '100%' : '8%' }} transition={{ duration: .6, delay: i * .04 }} className={count ? 'bar-filled' : ''} /></div><span className={d.toDateString() === now.toDateString() ? 'today-label' : ''}>{day}</span></div>; })}</div><div className="chart-legend"><span className="legend-dot" /> Completed sessions <span className="legend-muted">· one bar per day</span></div></div>
                <div className="panel achievement-panel"><div className="section-head-small"><div><span className="micro-label">MILESTONES</span><h3>Earned, not given.</h3></div><Award size={19} /></div>{[{title:'First steps', desc:'Complete your first workout', earned:sessions.length >= 1, icon:<Footprints size={18} />},{title:'In the rhythm', desc:'Complete 5 workouts', earned:sessions.length >= 5, icon:<Flame size={18} />},{title:'Century club', desc:'Log 100 sets', earned:sessions.reduce((s,x)=>s+x.sets,0) >= 100, icon:<Trophy size={18} />}].map(a => <div className={`achievement-row ${a.earned ? 'achievement-earned' : ''}`} key={a.title}><span className="achievement-icon">{a.earned ? <Check size={17} /> : a.icon}</span><div><strong>{a.title}</strong><span>{a.desc}</span></div><span className="achievement-status">{a.earned ? 'EARNED' : 'LOCKED'}</span></div>)}</div></div>
              <div className="panel history-panel"><div className="section-head-small"><div><span className="micro-label">THE ARCHIVE</span><h3>Session history</h3></div><span className="chart-range">{sessions.length} RECORDS</span></div>{sessions.length ? sessions.map(s => <div className="history-row" key={s.id}><div className="history-date"><strong>{new Date(s.date).getDate()}</strong><span>{new Date(s.date).toLocaleDateString(undefined,{month:'short'})}</span></div><div className="history-details"><strong>{s.title}</strong><span>{dateLabel(s.date)} · {formatTime(s.duration)} · {s.sets} sets</span></div><div className="history-reward">+{s.xp} XP</div></div>) : <div className="empty-history wide"><span className="empty-icon"><TrendingUp size={19} /></span><p>Your progress begins with one session.</p><span>Finish a workout and your real history will appear here.</span><button className="text-action" onClick={() => setTab('train')}>Start training <ArrowRight size={15} /></button></div>}</div>
            </motion.div>}

            {tab === 'discover' && <motion.div key="discover" className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
              <div className="eyebrow"><span className="live-dot" /> THE TRAINING LIBRARY <span className="eyebrow-line" /> <span>FIND YOUR FLOW</span></div><div className="page-title-row"><div><p className="kicker">THERE'S ALWAYS A NEXT STEP.</p><h1>Find your focus.</h1><p className="page-subtitle">Start with what you have. Build from where you are.</p></div><div className="discover-mark"><Sparkles size={24} /></div></div>
              <div className="discover-feature"><div className="discover-feature-copy"><span className="micro-label">EDITOR'S STARTER · NO EQUIPMENT</span><h2>Strong starts<br />right here.</h2><p>A balanced session built around fundamental movements. No gear, no complicated setup.</p><button className="lime-button" onClick={() => startWorkout('foundation')}>Start the foundation <ArrowRight size={16} /></button></div><div className="discover-feature-art"><div className="feature-orbit" /><div className="feature-figure">力</div><span>RYU / 001</span></div></div>
              <div className="section-heading"><div><span className="micro-label">PICK YOUR PATH</span><h2>Built for real life.</h2></div></div><div className="discover-list">{plans.map((plan, i) => <div className="discover-row" key={plan.id}><div className={`discover-number discover-number-${i}`}>0{i + 1}</div><div className="discover-row-copy"><strong>{plan.name}</strong><span>{plan.sub}</span><small>{plan.exercises.length} movements · {plan.time.toLowerCase()} · {plan.level.toLowerCase()}</small></div><button className="round-arrow small-arrow" onClick={() => startWorkout(plan.id)} aria-label={`Start ${plan.name}`}><ArrowRight size={18} /></button></div>)}</div>
              <div className="principle-panel discover-principle"><span className="principle-index">A NOTE ON PROGRESS</span><h3>Start easy.<br /><em>Stay consistent.</em></h3><p>Training should challenge you, not punish you. Choose a pace you can recover from and increase difficulty gradually.</p></div>
            </motion.div>}

            {tab === 'auth' && <motion.div key="auth" className="page auth-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
              <div className="eyebrow"><span className="live-dot" /> RYU MEMBER ACCESS <span className="eyebrow-line" /> <span>YOUR PROGRESS, YOURS</span></div>
              <div className="auth-page-grid">
                <div className="auth-intro">
                  <p className="kicker">YOUR NEXT CHAPTER STARTS HERE.</p>
                  <h1>Make every<br /><span>rep count.</span></h1>
                  <p>Sign in to carry your training history across devices, keep your sessions together and build a profile with a name that is yours.</p>
                  <div className="auth-points"><span><ShieldCheck size={16} /> Private account</span><span><Activity size={16} /> Cloud workout sync</span><span><Target size={16} /> Your own @username</span></div>
                </div>
                <div className="panel auth-card">
                  <div className="section-head-small"><div><span className="micro-label">RYU ACCOUNT</span><h3>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h3></div><ShieldCheck size={18} /></div>
                  <button type="button" className="google-button" onClick={() => void signInWithGoogle()} disabled={authBusy}><span className="google-mark" aria-hidden="true">G</span><span>Continue with Google</span><ArrowRight size={16} /></button>
                  <div className="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div>
                  <form className="account-form" onSubmit={submitAuth}>
                    {authMode === 'signup' && <>
                      <label className="account-field">Username
                        <div className="username-input-wrap"><span>@</span><input autoComplete="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))} placeholder="your_handle" minLength={3} maxLength={20} required /></div>
                        <small className={usernameAvailability === 'taken' || (username.length > 0 && !usernameValid) ? 'field-hint invalid' : 'field-hint'}>{username.length === 0 ? 'Unique handle · 3–20 characters · letters, numbers, underscores' : !usernameValid ? 'Use 3–20 lowercase letters, numbers or underscores' : usernameAvailability === 'checking' ? 'Checking username…' : usernameAvailability === 'available' ? '@' + normalizedUsername + ' is available' : usernameAvailability === 'taken' ? 'That username is already taken' : 'Availability could not be checked; Ryu will still enforce uniqueness'}</small>
                      </label>
                      <label className="account-field">Display name<input autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="What should Ryu call you?" maxLength={40} /></label>
                    </>}
                    <label className="account-field">Email<input type="email" autoComplete="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" required /></label>
                    <label className="account-field">Password
                      <div className="password-input-wrap"><input type={passwordVisible ? 'text' : 'password'} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={authPassword} onChange={e => setAuthPassword(e.target.value)} minLength={authMode === 'signup' ? 12 : undefined} placeholder={authMode === 'signup' ? 'Create a strong password' : 'Your password'} required /><button type="button" onClick={() => setPasswordVisible(value => !value)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>{passwordVisible ? 'Hide' : 'Show'}</button></div>
                    </label>
                    {authMode === 'signup' && <div className="password-strength">
                      <div className="strength-heading"><span>Password strength</span><strong className={'strength-' + passwordScore}>{authPassword ? passwordStrengthLabel : 'Not checked'}</strong></div>
                      <div className="strength-track"><span className={'strength-fill strength-fill-' + passwordScore} /></div>
                      <div className="password-checks">{passwordCriteria.map(item => <span key={item.label} className={item.valid ? 'passed' : ''}>{item.valid ? '✓' : '○'} {item.label}</span>)}</div>
                    </div>}
                    {authError && <p className="account-error" role="alert">{authError}</p>}
                    {authMessage && <p className="account-status" role="status">{authMessage}</p>}
                    <button className="lime-button account-submit" type="submit" disabled={authBusy || (authMode === 'signup' && (!usernameValid || !passwordStrong || usernameAvailability === 'taken' || usernameAvailability === 'checking'))}>{authBusy ? 'One sec…' : authMode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
                    <button className="text-action account-mode" type="button" onClick={() => { setAuthMode(value => value === 'signin' ? 'signup' : 'signin'); setAuthError(''); setAuthMessage(''); }}>{authMode === 'signin' ? 'New to Ryu? Create an account' : 'Already have an account? Sign in'}</button>
                  </form>
                </div>
              </div>
            </motion.div>}
            {tab === 'profile' && <motion.div key="profile" className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
              <div className="eyebrow"><span className="live-dot" /> YOUR SETTINGS <span className="eyebrow-line" /> <span>MADE PERSONAL</span></div><div className="page-title-row"><div><p className="kicker">YOUR PACE. YOUR RULES.</p><h1>Make it yours.</h1><p className="page-subtitle">A training space should work for you, not the other way around.</p></div></div>
              <div className="profile-hero panel"><div className="profile-avatar">{(account?.user_metadata?.display_name || account?.email || 'R').slice(0, 1).toUpperCase()}<span /></div><div className="profile-hero-copy"><span className="micro-label">{account ? 'RYU CLOUD MEMBER' : 'RYU MEMBER'}</span><h2>{displayName || account?.user_metadata?.full_name || 'The journey is yours.'}</h2><p>Level {level} · {xp.toLocaleString()} XP earned</p>{account && <p>{profileUsername ? '@' + profileUsername + ' · ' : ''}{account.email}</p>}</div><div className="profile-badge"><ShieldCheck size={19} /><span>{account ? 'ACCOUNT<br />ACTIVE' : 'DEVICE<br />PROFILE'}</span></div></div>
              <div className="panel settings-panel account-panel"><div className="section-head-small"><div><span className="micro-label">RYU ACCOUNT</span><h3>{account ? 'Your member profile' : 'Your training, across devices'}</h3></div><ShieldCheck size={18} /></div>
                {authLoading ? <p className="account-status">Checking your secure session…</p> : account ? <>
                  <p className="account-status">Signed in as <strong>{account.email}</strong>. New workouts sync to your Ryu account.</p>
                  <p className="profile-handle-line">{profileUsername ? <>Your username <strong>@{profileUsername}</strong></> : 'Choose your unique username to finish setting up your Ryu profile.'}</p>
                  {!profileUsername && <form className="account-form" onSubmit={event => { event.preventDefault(); void saveUsername(); }}>
                    <label className="account-field">Unique username
                      <div className="username-input-wrap"><span>@</span><input autoComplete="username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))} placeholder="your_handle" minLength={3} maxLength={20} required /></div>
                      <small className={username.length === 0 || usernameValid ? 'field-hint' : 'field-hint invalid'}>3–20 characters · letters, numbers, underscores</small>
                    </label>
                    <button className="lime-button account-submit" type="submit" disabled={profileBusy || !usernameValid}>{profileBusy ? 'Saving…' : 'Save username'} <ArrowRight size={16} /></button>
                  </form>}
                  {authError && <p className="account-error" role="alert">{authError}</p>}
                  {authMessage && <p className="account-status" role="status">{authMessage}</p>}
                  <button className="outline-button full-width" onClick={() => void signOut()}>Sign out</button>
                </> : <>
                  <p className="account-status">Your workouts stay on this device until you sign in. Create a free account to sync new training sessions across devices.</p>
                  <button className="lime-button account-submit" onClick={() => { setAuthMode('signin'); setTab('auth'); }}>Sign in or create account <ArrowRight size={16} /></button>
                </>}
              </div>
              <div className="settings-layout"><div className="panel settings-panel"><div className="section-head-small"><div><span className="micro-label">PREFERENCES</span><h3>Your experience</h3></div><Settings2 size={18} /></div><SettingRow icon={<Bell size={18} />} title="Workout reminders" desc="Permission-free preference for future reminder support"><Toggle checked={remindersOn} onClick={() => { setRemindersOn(v => !v); pushNotice(remindersOn ? 'Reminders paused' : 'Reminder preference saved', remindersOn ? 'You can turn them back on anytime.' : 'System notifications need Android integration.', 'info'); }} /></SettingRow><SettingRow icon={<Activity size={18} />} title="Sound feedback" desc="Optional sound feedback during interactions"><Toggle checked={soundOn} onClick={() => { setSoundOn(v => !v); pushNotice(soundOn ? 'Sound feedback off' : 'Sound feedback on', 'Preference saved on this device.', 'info'); }} /></SettingRow><SettingRow icon={<Gauge size={18} />} title="Default training focus" desc="Choose the plan selected when you open training"><select className="setting-select" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>{plans.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></SettingRow></div>
                <div className="panel settings-panel"><div className="section-head-small"><div><span className="micro-label">YOUR DATA</span><h3>On your device</h3></div><ShieldCheck size={18} /></div><div className="data-note"><div className="data-note-icon"><ShieldCheck size={19} /></div><div><strong>{account ? 'Account connected · sync in progress' : 'Your data, your control'}</strong><p>{account ? 'Your account is authenticated securely. New completed workouts sync to the cloud; older local-only history stays on this device and is not uploaded automatically.' : 'Your current session history, XP and streak stay on this device. Create an account to prepare for secure cloud sync.'}</p></div></div><button className="outline-button full-width" onClick={() => { const blob = new Blob([JSON.stringify({ sessions, xp, streak, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ryu-progress.json'; a.click(); URL.revokeObjectURL(url); pushNotice('Export prepared', 'Your progress file was downloaded.', 'success'); }}><ArrowDownRight size={16} /> Export my progress</button><button className="danger-button full-width" onClick={() => { if (window.confirm('Reset all local Ryu progress? This cannot be undone.')) { setSessions([]); setXp(0); setStreak(0); setActive(false); setStartedAt(null); setElapsed(0); setExercises(starterExercises); pushNotice('Progress reset', 'Your local training history has been cleared.', 'info'); } }}><RotateCcw size={16} /> Reset local progress</button></div></div>
              <div className="privacy-foot"><ShieldCheck size={15} /><span>Your local history stays on this device; signed-in workouts are also stored securely in your Ryu account.</span></div>
            </motion.div>}
          </AnimatePresence>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">{([{id:'home',icon:<Home size={19}/>,label:'Home'},{id:'train',icon:<Dumbbell size={19}/>,label:'Train'},{id:'progress',icon:<TrendingUp size={19}/>,label:'Progress'},{id:'discover',icon:<Sparkles size={19}/>,label:'Explore'},{id:'profile',icon:<Settings2 size={19}/>,label:'You'}] as {id:Tab;icon:ReactNode;label:string}[]).map(item => <button key={item.id} className={tab === item.id ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>

      <AnimatePresence>
        {notices.length > 0 && <motion.div className={`dynamic-island ${expandedNotice ? 'is-expanded' : ''} ${notices[0].kind}`} initial={{ opacity: 0, y: -22, scale: .92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: .96 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} onClick={() => setExpandedNotice(v => !v)} role="status" aria-live="polite">
          <div className="island-main"><span className="island-symbol">{notices[0].kind === 'achievement' ? <Trophy size={17} /> : notices[0].kind === 'info' ? <Waves size={17} /> : <Check size={17} />}</span><div className="island-copy"><strong>{notices[0].title}</strong>{expandedNotice && <span>{notices[0].subtitle}</span>}</div><span className="island-count">{notices.length > 1 ? `+${notices.length - 1}` : <span className="island-live-dot" />}</span><button className="island-dismiss" aria-label="Dismiss notification" onClick={e => { e.stopPropagation(); setNotices(current => current.slice(1)); setExpandedNotice(false); }}><X size={14} /></button></div>
          {expandedNotice && <div className="island-expanded-content"><p>{notices[0].subtitle}</p>{notices.length > 1 && <div className="island-queue">{notices.slice(1).map(n => <div key={n.id}><span>{n.kind === 'achievement' ? <Trophy size={14}/> : <Check size={14}/>}</span><div><strong>{n.title}</strong><small>{n.subtitle}</small></div></div>)}</div>}<button className="island-done" onClick={e => { e.stopPropagation(); setNotices([]); setExpandedNotice(false); }}>Clear notifications <X size={13} /></button></div>}
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>{showFinish && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFinish(false)}><motion.div className="finish-modal glass" initial={{ opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowFinish(false)} aria-label="Close"><X size={18} /></button><div className="modal-emblem"><Trophy size={26} /></div><span className="micro-label">CLOSE THE CHAPTER</span><h2>Finish this session?</h2><p>Your completed sets will be saved to your history and XP will be awarded based on the work logged.</p><div className="modal-summary"><div><strong>{completedSets}</strong><span>SETS</span></div><div><strong>{formatTime(elapsed)}</strong><span>DURATION</span></div><div><strong>{Math.max(20, completedSets * 8 + Math.round(elapsed / 60))}</strong><span>XP EARNED</span></div></div><button className="lime-button full-width" onClick={finishWorkout}><CheckCheck size={17} /> Finish & save workout</button><button className="cancel-link" onClick={() => setShowFinish(false)}>Keep training</button></motion.div></motion.div>}</AnimatePresence>
      <footer className="app-footer"><span>RYU / TRAIN WITH INTENT</span><span>BUILT ONE REP AT A TIME <span className="footer-dot">●</span></span></footer>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`side-nav-item ${active ? 'nav-active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-active-mark" />}</button>;
}
function Stat({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="stat-item"><span className="stat-icon">{icon}</span><div className="stat-copy"><span className="micro-label">{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}
function SettingRow({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return <div className="setting-row"><span className="setting-icon">{icon}</span><div className="setting-copy"><strong>{title}</strong><span>{desc}</span></div>{children}</div>;
}
function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return <button className={`toggle ${checked ? 'toggle-on' : ''}`} onClick={onClick} role="switch" aria-checked={checked} aria-label={checked ? 'Turn off' : 'Turn on'}><span /></button>;
}