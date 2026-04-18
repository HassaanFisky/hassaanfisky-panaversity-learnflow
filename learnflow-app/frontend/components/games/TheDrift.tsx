"use client";

import { useEffect, useReducer, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingOverlay from "./engine/OnboardingOverlay";

const ACCENT = "#00C9FF";
const BG = "#020B14";
const TOTAL_ANOMALIES = 8;

function tone(hz: number, secs: number, vol: number, shape: OscillatorType = "sine", delay = 0) {
  try {
    const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = shape;
    o.frequency.value = hz;
    const t = ac.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    o.start(t);
    o.stop(t + secs + 0.05);
  } catch {
    /* ignore */
  }
}

type Phase = "ONBOARD" | "PLAY" | "DONE";

interface NodeDef {
  idx: number;
  cx: number;
  cy: number;
  breatheDur: number;
  anomaly: boolean;
  altBreatheDur: number;
  altOpacity: number;
  altColor: string;
  distractor: boolean;
}

interface World {
  round: number;
  score: number;
  layer: 1 | 2 | 3 | 4;
  anomalyIdx: number;
  caught: number;
  missed: number;
  erupting: number | null;
}

type Action =
  | { type: "CATCH"; idx: number; bonus: number }
  | { type: "MISS" }
  | { type: "NEXT"; anomalyIdx: number; layer: 1 | 2 | 3 | 4 }
  | { type: "CLEAR_ERUPT" };

function reducer(s: World, a: Action): World {
  switch (a.type) {
    case "CATCH":
      return { ...s, score: s.score + a.bonus, caught: s.caught + 1, erupting: a.idx };
    case "MISS":
      return { ...s, missed: s.missed + 1 };
    case "NEXT":
      return { ...s, round: s.round + 1, anomalyIdx: a.anomalyIdx, layer: a.layer, erupting: null };
    case "CLEAR_ERUPT":
      return { ...s, erupting: null };
    default:
      return s;
  }
}

const initial: World = { round: 1, score: 0, layer: 1, anomalyIdx: 0, caught: 0, missed: 0, erupting: null };

function seededNodes(seed: number): NodeDef[] {
  const out: NodeDef[] = [];
  let r = seed;
  const rand = () => {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    return (r / 0x7fffffff);
  };
  for (let i = 0; i < 25; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const baseX = 120 + col * 90 + (rand() - 0.5) * 40;
    const baseY = 120 + row * 90 + (rand() - 0.5) * 40;
    out.push({
      idx: i,
      cx: baseX,
      cy: baseY,
      breatheDur: 2.5 + rand() * 2,
      anomaly: false,
      altBreatheDur: 0.8 + rand() * 0.4,
      altOpacity: 0.45,
      altColor: "#7FFFE0",
      distractor: false,
    });
  }
  return out;
}

export default function TheDrift({ onExit }: { onExit: (score: number) => void }) {
  const [phase, setPhase] = useState<Phase>("ONBOARD");
  const [timeLeft, setTimeLeft] = useState(20);
  const [shakeId, setShakeId] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [world, dispatch] = useReducer(reducer, initial);

  const nodesBase = useMemo(() => seededNodes(42), []);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickAnomaly = useCallback(() => {
    const idx = Math.floor(Math.random() * 25);
    return idx;
  }, []);

  useEffect(() => {
    if (phase === "PLAY" && world.round === 1 && world.anomalyIdx === 0) {
      // initial
    }
  }, [phase, world.round, world.anomalyIdx]);

  useEffect(() => {
    if (phase !== "PLAY") return;
    const layer = world.layer;
    const cap = layer === 1 ? 20 : layer === 2 ? 16 : layer === 3 ? 12 : 9;
    setTimeLeft(cap);
    roundTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          dispatch({ type: "MISS" });
          setTimeout(() => advance(false), 900);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, world.round]);

  const advance = useCallback(
    (fromCatch: boolean) => {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      if (world.round >= TOTAL_ANOMALIES) {
        setPhase("DONE");
        return;
      }
      const nextR = world.round + 1;
      const layer: 1 | 2 | 3 | 4 = nextR <= 2 ? 1 : nextR <= 4 ? 2 : nextR <= 6 ? 3 : 4;
      dispatch({ type: "NEXT", anomalyIdx: pickAnomaly(), layer });
      void fromCatch;
    },
    [world.round, pickAnomaly]
  );

  const handleTap = useCallback(
    (idx: number) => {
      if (phase !== "PLAY") return;
      if (idx === world.anomalyIdx) {
        const layerBonus = world.layer * 50;
        const bonus = timeLeft * 12 + layerBonus;
        tone(720, 0.3, 0.1, "sine");
        dispatch({ type: "CATCH", idx, bonus });
        setTimeout(() => advance(true), 700);
      } else {
        tone(180, 0.15, 0.06, "square");
        setShakeId(idx);
        setWrongFlash(true);
        setTimeout(() => {
          setShakeId(null);
          setWrongFlash(false);
        }, 400);
      }
    },
    [phase, world.anomalyIdx, world.layer, timeLeft, advance]
  );

  return (
    <div className="fixed inset-0" style={{ background: BG }}>
      {phase === "ONBOARD" && (
        <OnboardingOverlay
          storageKey="lf_drift_on"
          accentColor={ACCENT}
          onDone={() => setPhase("PLAY")}
          steps={[
            { visual: <div className="grid grid-cols-3 gap-4">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="w-5 h-5 rounded-full" style={{ background: ACCENT, opacity: 0.4 }} />)}</div>, line: "A field of drifting dots, all breathing softly." },
            { visual: <div className="w-10 h-10 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 30px ${ACCENT}` }} />, line: "One moves a little differently. Find it." },
            { visual: <div className="text-4xl font-black" style={{ color: ACCENT }}>20s</div>, line: "You have a short window. Trust your eyes." },
            { visual: <div className="text-2xl text-white">Eight rounds.</div>, line: "Eight catches. Calm focus wins. Ready?" },
          ]}
        />
      )}

      {phase === "PLAY" && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute top-6 left-6 z-10 text-white">
            <div className="text-4xl font-black tabular-nums" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {world.score.toLocaleString()}
            </div>
            <div className="text-xs uppercase tracking-widest mt-1" style={{ color: ACCENT }}>
              Round {world.round} of {TOTAL_ANOMALIES}
            </div>
          </div>
          <div className="absolute top-6 right-6 z-10 text-white font-bold text-2xl tabular-nums">
            {timeLeft}s
          </div>

          <AnimatePresence>
            {wrongFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
                style={{ boxShadow: `inset 0 0 100px ${ACCENT}` }}
              />
            )}
          </AnimatePresence>

          <motion.svg
            viewBox="0 0 600 600"
            className="w-full max-w-2xl h-auto"
            animate={{ x: [0, 8, -8, 0], y: [0, 6, -6, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            {nodesBase.map((n) => {
              const isAnomaly = n.idx === world.anomalyIdx;
              const layer = world.layer;
              let dur = n.breatheDur;
              let opacity = 0.55;
              let fill = ACCENT;
              if (isAnomaly) {
                if (layer === 1) dur = n.altBreatheDur;
                else if (layer === 2) opacity = n.altOpacity;
                else if (layer === 3) fill = n.altColor;
                else {
                  dur = n.altBreatheDur;
                  fill = n.altColor;
                }
              }
              if (n.idx !== world.anomalyIdx && layer === 4 && n.idx === (world.anomalyIdx + 7) % 25) {
                opacity = 0.75;
              }
              const erupting = world.erupting === n.idx;
              const shaking = shakeId === n.idx;
              return (
                <motion.g key={n.idx}>
                  {erupting && (
                    <motion.circle
                      cx={n.cx}
                      cy={n.cy}
                      r={10}
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth={2}
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 8, opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
                    />
                  )}
                  <motion.circle
                    cx={n.cx}
                    cy={n.cy}
                    r={10}
                    fill={fill}
                    opacity={opacity}
                    onClick={() => handleTap(n.idx)}
                    style={{ cursor: "pointer", transformOrigin: `${n.cx}px ${n.cy}px` }}
                    animate={
                      erupting
                        ? { scale: [1, 2.5], opacity: [opacity, 0] }
                        : shaking
                        ? { x: [0, -4, 4, -4, 4, 0] }
                        : { scale: [1, 1.08, 1] }
                    }
                    transition={
                      erupting
                        ? { duration: 0.6 }
                        : shaking
                        ? { duration: 0.4 }
                        : { duration: dur, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                </motion.g>
              );
            })}
          </motion.svg>
        </div>
      )}

      {phase === "DONE" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
          <div className="text-sm uppercase tracking-[0.4em] mb-4" style={{ color: ACCENT }}>
            Nice work
          </div>
          <div className="text-7xl font-black tabular-nums mb-6" style={{ textShadow: `0 0 30px ${ACCENT}55` }}>
            {world.score.toLocaleString()}
          </div>
          <div className="flex gap-8 mb-10 text-sm text-white/70">
            <div><span className="text-white font-bold">{world.caught}</span> caught</div>
            <div><span className="text-white font-bold">{world.missed}</span> slipped</div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => onExit(world.score)}
              className="px-6 py-3 rounded-full font-bold min-h-[48px]"
              style={{ background: ACCENT, color: "#000" }}
            >
              Again
            </button>
            <button
              onClick={() => onExit(world.score)}
              className="px-6 py-3 rounded-full font-bold min-h-[48px] border border-white/20 text-white"
            >
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
