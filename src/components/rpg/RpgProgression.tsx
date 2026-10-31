import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  Award, CalendarCheck2, Clock3, Crown, Dumbbell, Flame,
  LockKeyhole, ShieldCheck, Sparkles, Target, Trophy, Zap,
} from 'lucide-react';
import {
  motion, useInView, useMotionTemplate, useMotionValue, useSpring,
} from 'motion/react';
import './rpg-progression.css';

type RpgProgressionProps = {
  variant: 'home' | 'progress';
  xp: number;
  sessionsCount: number;
  totalSets: number;
  totalMinutes: number;
  streak: number;
};

const LEVEL_XP = 250;
const RANKS = [
  { level: 1, title: 'Novice', subtitle: 'Begin the journey', icon: Sparkles },
  { level: 3, title: 'Initiate', subtitle: 'Prove your intent', icon: ShieldCheck },
  { level: 5, title: 'Disciple', subtitle: 'Build the ritual', icon: Dumbbell },
  { level: 10, title: 'Vanguard', subtitle: 'Set the pace', icon: Flame },
  { level: 20, title: 'Ascendant', subtitle: 'Rise beyond routine', icon: Award },
  { level: 40, title: 'Legend', subtitle: 'Make it undeniable', icon: Crown },
] as const;

function rankForLevel(level: number) {
  return [...RANKS].reverse().find(rank => level >= rank.level) ?? RANKS[0];
}

/**
 * Magic UI-inspired animated circular progress ring.
 * The gauge keeps its own SVG track and animates the progress stroke.
 * Reference: https://magicui.design/docs/components/animated-circular-progress-bar
 */
function RyuLevelRing({ level, progress }: { level: number; progress: number }) {
  const reactId = useId().replace(/:/g, '');
  const gradientId = `ryu-xp-gradient-${reactId}`;
  const circumference = 2 * Math.PI * 43;
  const offset = circumference * (1 - Math.max(0, Math.min(100, progress)) / 100);

  return (
    <div className="ryu-rpg__level-orb" role="img" aria-label={`Level ${level}, ${Math.round(progress)} percent progress to the next level`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#819e43" />
            <stop offset="58%" stopColor="#d2f36b" />
            <stop offset="100%" stopColor="#f0ffbb" />
          </linearGradient>
        </defs>
        <circle className="ryu-rpg__ring-track" cx="50" cy="50" r="43" />
        <motion.circle
          className="ryu-rpg__ring-progress"
          cx="50" cy="50" r="43"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="ryu-rpg__orb-copy">
        <small>LEVEL</small>
        <strong>{String(level).padStart(2, '0')}</strong>
        <span>RYU / PLAYER</span>
      </div>
    </div>
  );
}

/**
 * Adapted from Magic UI's Number Ticker pattern.
 * Reference: https://magicui.design/docs/components/number-ticker
 */
function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 34, stiffness: 92, mass: 0.7 });

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, motionValue, value]);

  useEffect(() => springValue.on('change', latest => {
    if (ref.current) {
      ref.current.textContent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(latest));
    }
  }), [springValue]);

  return <span ref={ref} className="ryu-rpg__ticker" aria-label={`${value.toLocaleString()} experience points`}>0</span>;
}

/**
 * Pointer-following border and light pool adapted from Magic UI's Magic Card.
 * It is mouse-only so touch users do not get a fake hover state.
 * Reference: https://magicui.design/docs/components/magic-card
 */
function RyuMagicCard({ children, variant }: { children: ReactNode; variant: 'home' | 'progress' }) {
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const glowOpacity = useSpring(0, { stiffness: 220, damping: 28 });
  const cardBackground = useMotionTemplate`linear-gradient(rgba(22,24,19,.985) 0 0) padding-box, radial-gradient(260px circle at ${mouseX}px ${mouseY}px, rgba(210,243,107,.58), rgba(158,190,83,.2) 34%, rgba(255,255,255,.08) 70%, rgba(255,255,255,.05) 100%) border-box`;
  const spotBackground = useMotionTemplate`radial-gradient(440px circle at ${mouseX}px ${mouseY}px, rgba(210,243,107,.095), transparent 68%)`;

  return (
    <motion.section
      className={`ryu-rpg__surface ryu-rpg__surface--${variant}`}
      style={{ background: cardBackground }}
      onPointerMove={event => {
        if (event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - rect.left);
        mouseY.set(event.clientY - rect.top);
        glowOpacity.set(1);
      }}
      onPointerLeave={() => {
        glowOpacity.set(0);
        mouseX.set(-500);
        mouseY.set(-500);
      }}
      aria-label="Ryu character progression"
    >
      <motion.div className="ryu-rpg__spotlight" style={{ background: spotBackground, opacity: glowOpacity }} aria-hidden="true" />
      <div className="ryu-rpg__atmosphere" aria-hidden="true" />
      <div className="ryu-rpg__content">{children}</div>
    </motion.section>
  );
}

export function RpgProgression({
  variant, xp, sessionsCount, totalSets, totalMinutes, streak,
}: RpgProgressionProps) {
  const safeXp = Math.max(0, xp);
  const level = Math.floor(safeXp / LEVEL_XP) + 1;
  const xpInLevel = safeXp % LEVEL_XP;
  const levelProgress = xpInLevel / LEVEL_XP * 100;
  const xpToNextLevel = LEVEL_XP - xpInLevel;
  const currentRank = rankForLevel(level);
  const currentRankIndex = RANKS.findIndex(rank => rank.title === currentRank.title);
  const nextRank = RANKS.find(rank => rank.level > level);
  const xpToNextRank = nextRank ? Math.max(0, (nextRank.level - 1) * LEVEL_XP - safeXp) : 0;

  // These are activity-derived game attributes, not claims about measured physiology.
  const stats = [
    {
      label: 'STRENGTH',
      icon: <Dumbbell size={15} />,
      value: totalSets,
      unit: 'sets logged',
      target: 200,
      caption: totalSets >= 200 ? '200-set milestone cleared' : `${Math.max(0, 200 - totalSets)} sets to milestone`,
    },
    {
      label: 'ENDURANCE',
      icon: <Clock3 size={15} />,
      value: totalMinutes,
      unit: 'training minutes',
      target: 300,
      caption: totalMinutes >= 300 ? '5-hour milestone cleared' : `${Math.max(0, 300 - totalMinutes)} minutes to milestone`,
    },
    {
      label: 'DISCIPLINE',
      icon: <CalendarCheck2 size={15} />,
      value: sessionsCount,
      unit: 'sessions cleared',
      target: 20,
      caption: sessionsCount >= 20 ? '20-session milestone cleared' : `${Math.max(0, 20 - sessionsCount)} sessions to milestone`,
    },
    {
      label: 'CONSISTENCY',
      icon: <Flame size={15} />,
      value: streak,
      unit: streak === 1 ? 'day in a row' : 'days in a row',
      target: 14,
      caption: streak >= 14 ? 'Two-week streak cleared' : `${Math.max(0, 14 - streak)} days to two-week streak`,
    },
  ];
  const headline = variant === 'home' ? 'Built by every rep.' : 'The long game.';
  const topline = variant === 'home' ? 'CHARACTER SYSTEM / PLAYER FILE 001' : 'CHARACTER ARCHIVE / EVOLUTION LOG';

  return (
    <div className={`ryu-rpg ryu-rpg--${variant}`}>
      <RyuMagicCard variant={variant}>
        <div className="ryu-rpg__topline">
          <span className="ryu-rpg__system-label">{topline}</span>
          <span className="ryu-rpg__live"><span className="ryu-rpg__live-dot" /> PROGRESSION ONLINE</span>
        </div>

        <div className="ryu-rpg__hero">
          <div className="ryu-rpg__seal" aria-label="Ryu strength crest">
            <svg viewBox="0 0 126 126" fill="none" aria-hidden="true">
              <circle cx="63" cy="63" r="52" stroke="rgba(210,243,107,.18)" strokeWidth=".8" />
              <circle cx="63" cy="63" r="43" stroke="rgba(210,243,107,.28)" strokeWidth=".8" strokeDasharray="2 7" />
              <path d="M63 14V25M63 101V112M14 63H25M101 63H112" stroke="#d2f36b" strokeOpacity=".54" strokeWidth="1.1" />
              <path d="M45 29L74 42L56 61L81 76L47 98" stroke="#d2f36b" strokeOpacity=".27" strokeWidth="1.2" />
              <path d="M82 25L72 49L61 62L72 76L48 100" stroke="#d2f36b" strokeOpacity=".18" strokeWidth=".8" />
            </svg>
            <span className="ryu-rpg__seal-glyph">力</span>
            <span className="ryu-rpg__seal-index">RYU / 01</span>
          </div>

          <div className="ryu-rpg__identity">
            <div className="ryu-rpg__eyebrow">
              <span className="ryu-rpg__rank-pill"><Crown size={12} /> {currentRank.title}</span>
              <span className="ryu-rpg__rank-number">RANK {String(currentRankIndex + 1).padStart(2, '0')} / 06</span>
            </div>
            <h2>{headline.split(' ').slice(0, -1).join(' ')} <span>{headline.split(' ').slice(-1)}</span></h2>
            <p>{variant === 'home'
              ? 'Your character grows through the work you actually log. Every session moves the record forward.'
              : 'A living record of your effort. Titles unlock through experience; training attributes rise with logged activity.'}</p>
            <div className="ryu-rpg__identity-meta">
              <span><Dumbbell size={13} /> {sessionsCount} {sessionsCount === 1 ? 'SESSION' : 'SESSIONS'}</span>
              <span><Zap size={13} /> {xpToNextLevel} XP TO LEVEL {level + 1}</span>
            </div>
          </div>

          <RyuLevelRing level={level} progress={levelProgress} />
        </div>

        <div className="ryu-rpg__xp-panel">
          <div className="ryu-rpg__xp-total">
            <small>LIFETIME EXPERIENCE</small>
            <strong><NumberTicker value={safeXp} /> <em>XP</em></strong>
          </div>
          <div>
            <div className="ryu-rpg__xp-detail">
              <span>LEVEL {level} PROGRESS</span>
              <strong>{xpInLevel} / {LEVEL_XP} XP</strong>
            </div>
            <div className="ryu-rpg__xp-track" role="progressbar" aria-label="Experience toward next level" aria-valuemin={0} aria-valuemax={LEVEL_XP} aria-valuenow={xpInLevel}>
              <motion.div className="ryu-rpg__xp-fill" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className="ryu-rpg__xp-foot"><span>LEVEL {level}</span><span><strong>{xpToNextLevel} XP remaining</strong></span><span>LEVEL {level + 1}</span></div>
          </div>
        </div>

        <div className="ryu-rpg__stats-head">
          <div><span className="ryu-rpg__system-label">ACTIVITY ATTRIBUTES</span><h3>Your training leaves a mark.</h3></div>
          <span>REAL LOGS · GAME MILESTONES</span>
        </div>
        <div className="ryu-rpg__stats">
          {stats.map((stat, index) => (
            <motion.div
              className="ryu-rpg__stat"
              key={stat.label}
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .35, delay: index * .055 }}
            >
              <div className="ryu-rpg__stat-top">
                <span className="ryu-rpg__stat-icon">{stat.icon}</span>
                <small>0{index + 1}</small>
              </div>
              <div className="ryu-rpg__stat-value">{stat.value.toLocaleString()} <span>{stat.unit}</span></div>
              <span className="ryu-rpg__stat-caption">{stat.caption}</span>
              <div className="ryu-rpg__stat-track" role="progressbar" aria-label={`${stat.label} milestone progress`} aria-valuemin={0} aria-valuemax={stat.target} aria-valuenow={Math.min(stat.value, stat.target)}>
                <motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(100, stat.value / stat.target * 100)}%` }} transition={{ duration: .8, delay: index * .07 }} />
              </div>
            </motion.div>
          ))}
        </div>

        {variant === 'progress' ? (
          <div className="ryu-rpg__milestones">
            <div className="ryu-rpg__milestone-heading">
              <div><span className="ryu-rpg__system-label">THE RANK LADDER</span><h3>Titles are earned.</h3><p>Every title has a level requirement. Your current rank is highlighted.</p></div>
              <Trophy size={20} color="#d2f36b" />
            </div>
            <div className="ryu-rpg__rank-list">
              {RANKS.map(rank => {
                const earned = level >= rank.level;
                const current = rank.title === currentRank.title;
                const Icon = rank.icon;
                return (
                  <div key={rank.title} className={`ryu-rpg__rank ${earned ? 'ryu-rpg__rank--earned' : 'ryu-rpg__rank--locked'} ${current ? 'ryu-rpg__rank--current' : ''}`}>
                    <span className="ryu-rpg__rank-marker">{earned ? <Icon size={14} /> : <LockKeyhole size={13} />}</span>
                    <strong>{rank.title}</strong>
                    <small>LEVEL {String(rank.level).padStart(2, '0')}</small>
                    <span className="ryu-rpg__rank-state">{current ? 'CURRENT RANK' : earned ? 'UNLOCKED' : 'LOCKED'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="ryu-rpg__next-title">
            <div className="ryu-rpg__next-title-copy">
              <small>NEXT RANK OBJECTIVE</small>
              <strong>{nextRank ? `${nextRank.title} · LEVEL ${nextRank.level}` : 'Legend · final title unlocked'}</strong>
              <span>{nextRank
                ? `${xpToNextRank.toLocaleString()} XP until your next title. Keep stacking completed sessions.`
                : 'You have reached the highest title in the current rank ladder.'}</span>
            </div>
            <span className="ryu-rpg__next-title-icon">{nextRank ? <Award size={19} /> : <Crown size={20} />}</span>
          </div>
        )}

        <div className="ryu-rpg__footnote">
          <span><ShieldCheck size={12} /> PROGRESSION BUILT FROM LOGGED ACTIVITY</span>
          <span><Target size={12} /> {nextRank ? `NEXT TITLE: ${nextRank.title.toUpperCase()}` : 'MAX TITLE REACHED'}</span>
        </div>
      </RyuMagicCard>
    </div>
  );
}
