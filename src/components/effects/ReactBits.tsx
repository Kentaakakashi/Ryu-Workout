import './react-bits.css';
import {
  useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode,
} from 'react';
import {
  motion, useInView, useMotionTemplate, useMotionValue, useSpring,
} from 'motion/react';

/** React Bits SpotlightCard pattern, adapted for Ryu's charcoal/lime surface. */
export function SpotlightCard({
  children, className = '', radius = 18, intensity = 0.13,
}: { children: ReactNode; className?: string; radius?: number; intensity?: number }) {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const glow = useSpring(0, { stiffness: 220, damping: 30 });
  const surface = useMotionTemplate`linear-gradient(rgba(23,25,20,.96),rgba(19,21,17,.98)) padding-box, radial-gradient(260px circle at ${x}px ${y}px, rgba(210,243,107,.58), rgba(210,243,107,.15) 36%, rgba(255,255,255,.09) 72%, rgba(255,255,255,.06)) border-box`;
  const light = useMotionTemplate`radial-gradient(340px circle at ${x}px ${y}px, rgba(210,243,107,${intensity}), transparent 68%)`;

  return (
    <motion.div
      className={`rb-spotlight ${className}`}
      style={{ borderRadius: radius, background: surface }}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
        glow.set(1);
      }}
      onPointerLeave={() => { x.set(-500); y.set(-500); glow.set(0); }}
    >
      <motion.span className="rb-spotlight__light" style={{ background: light, opacity: glow }} aria-hidden="true" />
      <div className="rb-spotlight__content">{children}</div>
    </motion.div>
  );
}

/** React Bits TiltedCard interaction, without the image-only layout constraint. */
export function TiltedCard({
  children, className = '', maxTilt = 5,
}: { children: ReactNode; className?: string; maxTilt?: number }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 190, damping: 24, mass: 0.65 });
  const springY = useSpring(rotateY, { stiffness: 190, damping: 24, mass: 0.65 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(0, { stiffness: 220, damping: 25 });
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,.16), transparent 54%)`;

  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * maxTilt * 2);
    rotateX.set((0.5 - py) * maxTilt * 2);
    glareX.set(px * 100);
    glareY.set(py * 100);
    glareOpacity.set(1);
  }

  function reset() {
    rotateX.set(0); rotateY.set(0); glareOpacity.set(0);
    glareX.set(50); glareY.set(50);
  }

  return (
    <motion.div
      className={`rb-tilt ${className}`}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 950 }}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <motion.span className="rb-tilt__glare" style={{ background: glare, opacity: glareOpacity }} aria-hidden="true" />
      {children}
    </motion.div>
  );
}

/** React Bits ClickSpark micro-interaction, rendered as lightweight CSS sparks. */
export function ClickSpark({
  children, className = '', color = '#d2f36b', count = 8,
}: { children: ReactNode; className?: string; color?: string; count?: number }) {
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const id = useRef(0);
  function spark(event: PointerEvent<HTMLSpanElement>) {
    if (event.pointerType === 'touch' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setBurst({ id: ++id.current, x: event.clientX - rect.left, y: event.clientY - rect.top });
  }
  return (
    <span className={`rb-click-spark ${className}`} onPointerDown={spark}>
      {children}
      {burst && (
        <span key={burst.id} className="rb-click-spark__burst" style={{ left: burst.x, top: burst.y, '--spark-color': color } as CSSProperties} aria-hidden="true">
          {Array.from({ length: count }, (_, index) => <i key={index} style={{ '--spark-angle': `${index * (360 / count)}deg` } as CSSProperties} />)}
        </span>
      )}
    </span>
  );
}

/** React Bits CountUp pattern driven by Motion spring values. */
export function CountUp({ value, suffix = '', className = '' }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 24, mass: 0.7 });
  useEffect(() => { if (inView) motionValue.set(value); }, [inView, motionValue, value]);
  useEffect(() => spring.on('change', latest => {
    if (ref.current) ref.current.textContent = `${Math.round(latest).toLocaleString()}${suffix}`;
  }), [spring, suffix]);
  return <span ref={ref} className={`rb-count-up ${className}`} aria-label={`${value.toLocaleString()}${suffix}`}>0{suffix}</span>;
}

/** React Bits ShinyText treatment for short labels and section headings. */
export function ShinyText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`rb-shiny-text ${className}`}>{children}</span>;
}

/** Motion reveal with a reduced-motion fallback. */
export function FadeIn({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, filter: 'blur(5px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
