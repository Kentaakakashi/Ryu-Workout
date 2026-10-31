import './training-extras.css';
import {
  Award, Check, Clock3, Flame, LockKeyhole, Target, Trophy, Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ClickSpark, CountUp, FadeIn, ShinyText, SpotlightCard } from '../effects/ReactBits';

export type DailyQuest = {
  key: string;
  title: string;
  description: string;
  value: number;
  target: number;
  reward: number;
  unit: string;
  icon: 'session' | 'sets' | 'time';
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  value: number;
  unit: 'REPS' | 'SEC';
  loadKg: number | null;
  completedAt: string;
};

const questIcons = {
  session: <Target size={18} />,
  sets: <Zap size={18} />,
  time: <Clock3 size={18} />,
};

export function DailyQuestBoard({
  quests, claimedKeys, onClaim,
}: {
  quests: DailyQuest[];
  claimedKeys: string[];
  onClaim: (quest: DailyQuest) => void;
}) {
  const completeCount = quests.filter(quest => quest.value >= quest.target).length;
  const claimedCount = quests.filter(quest => claimedKeys.includes(quest.key)).length;
  return (
    <section className="quest-board">
      <div className="quest-board__header">
        <div>
          <span className="micro-label"><ShinyText>DAILY CONTRACTS / RESET AT MIDNIGHT</ShinyText></span>
          <h2>Make today count.</h2>
          <p>Small objectives. Real work. Bonus XP earned from your actual sessions.</p>
        </div>
        <div className="quest-board__score"><Trophy size={17} /><strong>{claimedCount}<small> / {quests.length}</small></strong><span>CLAIMED</span></div>
      </div>
      <div className="quest-board__grid">
        {quests.map((quest, index) => {
          const complete = quest.value >= quest.target;
          const claimed = claimedKeys.includes(quest.key);
          const progress = Math.min(100, quest.value / quest.target * 100);
          return (
            <FadeIn key={quest.key} delay={index * 0.06}>
              <SpotlightCard className={`quest-card ${complete ? 'quest-card--complete' : ''} ${claimed ? 'quest-card--claimed' : ''}`} radius={14} intensity={0.1}>
                <div className="quest-card__top">
                  <span className="quest-card__icon">{questIcons[quest.icon]}</span>
                  <span className="quest-card__reward"><Zap size={12} /> +{quest.reward} XP</span>
                </div>
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>
                <div className="quest-card__progress-meta">
                  <span>{Math.min(quest.value, quest.target).toLocaleString()} / {quest.target.toLocaleString()} {quest.unit}</span>
                  <strong>{Math.round(progress)}%</strong>
                </div>
                <div className="quest-card__track"><motion.span initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, delay: index * 0.08 }} /></div>
                <div className="quest-card__footer">
                  <span className={complete ? 'quest-card__status quest-card__status--done' : 'quest-card__status'}>
                    {claimed ? <><Check size={13} /> REWARD CLAIMED</> : complete ? <><Award size={13} /> OBJECTIVE COMPLETE</> : <><Target size={13} /> IN PROGRESS</>}
                  </span>
                  <ClickSpark color="#d2f36b">
                    <button className="quest-card__claim" onClick={() => onClaim(quest)} disabled={!complete || claimed}>
                      {claimed ? 'Claimed' : complete ? 'Claim XP' : 'Locked'}
                    </button>
                  </ClickSpark>
                </div>
              </SpotlightCard>
            </FadeIn>
          );
        })}
      </div>
      <div className="quest-board__foot"><span><Flame size={13} /> {completeCount === quests.length ? 'All contracts cleared. Excellent work.' : `${quests.length - completeCount} objectives remain today.`}</span><span>ACTIVITY IS VERIFIED FROM YOUR LOG</span></div>
    </section>
  );
}

export function PersonalRecordBoard({
  records, units = 'metric',
}: {
  records: PersonalRecord[];
  units?: 'metric' | 'imperial';
}) {
  const sorted = [...records].sort((a, b) => {
    if (a.loadKg !== null || b.loadKg !== null) return (b.loadKg ?? 0) - (a.loadKg ?? 0) || b.value - a.value;
    return b.value - a.value;
  }).slice(0, 6);
  return (
    <section className="pr-board">
      <div className="pr-board__header">
        <div><span className="micro-label">PERSONAL RECORDS / LIFETIME</span><h2>Proof of progress.</h2><p>Your strongest logged set for each movement, not estimated numbers.</p></div>
        <span className="pr-board__emblem"><Award size={20} /></span>
      </div>
      {sorted.length ? (
        <div className="pr-board__grid">
          <AnimatePresence initial={false}>
            {sorted.map((record, index) => (
              <motion.article key={record.exerciseId} className="pr-card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: .32, delay: index * .035 }}>
                <div className="pr-card__top"><span>0{index + 1}</span><Trophy size={14} /></div>
                <h3>{record.exerciseName}</h3>
                <div className="pr-card__value"><CountUp value={record.value} /><small>{record.unit}</small></div>
                {record.loadKg !== null && record.loadKg > 0 && (
                  <div className="pr-card__load">{units === 'imperial' ? (record.loadKg * 2.20462).toFixed(1) : record.loadKg.toFixed(1)} {units === 'imperial' ? 'LB' : 'KG'} LOAD</div>
                )}
                <span className="pr-card__date">LAST SET · {new Date(record.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="pr-board__empty"><span><LockKeyhole size={19} /></span><strong>Your record wall is empty.</strong><p>Log reps or time during a workout. Your best set for each movement will appear here.</p></div>
      )}
    </section>
  );
}
