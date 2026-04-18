"use client";

import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingOverlay from "./engine/OnboardingOverlay";

const ACCENT = "#FF4D00";
const BG = "#08030F";
const SESSION_SECS = 90;
const COLORS = ["#FF4D00", "#00B4FF", "#FFD700"] as const;
type BurstColor = typeof COLORS[number];

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

interface Burst {
  id: number;
  rail: 0 | 1 | 2;
  color: BurstColor;
  x: number;
  speed: number;
  hovering: boolean;
  decoy: boolean;
  handled: boolean;
}

interface World {
  bursts: Burst[];
  filters: [BurstColor, BurstColor, BurstColor];
  railCooldown: [number, number, number];
  score: number;
  streak: number;
  layer: 1 | 2 | 3 | 4;
  hits: number;
  misses: number;
}

type Action =
  | { type: "TICK"; dt: number }
  | { type: "SPAWN"; burst: Burst }
  | { type: "ROTATE_FILTER"; rail: 0 | 1 | 2; color: BurstColor }
  | { type: "PASS"; burstId: number }
  | { type: "REJECT"; rail: 0 | 1 | 2 }
  | { type: "SET_LAYER"; layer: 1 | 2 | 3 | 4 };

function reducer(s: World, a: Action): World {
  switch (a.type) {
    case "TICK": {
      const bursts = s.bursts
        .map((b) => {
          const gateX = 75;
          const near = b.x >= gateX - 8 && b.x < gateX;
          const atGate = b.x >= gateX;
          let nx = b.x;
          if (!atGate) nx = b.x + b.speed * a.dt * (near ? 0.35 : 1);
          return { ...b, x: nx, hovering: atGate };
        })
        .filter((b) => b.x < 115 && !b.handled);
      const railCooldown = s.railCooldown.map((c) => Math.max(0, c - a.dt)) as [number, number, number];
      return { ...s, bursts, railCooldown };
    }
    case "SPAWN":
      return { ...s, bursts: [...s.bursts, a.burst] };
    case "ROTATE_FILTER": {
      const f = [...s.filters] as [BurstColor, BurstColor, BurstColor];
      f[a.rail] = a.color;
      return { ...s, filters: f };
    }
    case "PASS": {
      const b = s.bursts.find((x) => x.id === a.burstId);
      if (!b) return s;
      const filter = s.filters[b.rail];
      const match = b.color === filter && !b.decoy;
      const streakMult = Math.min(10, s.streak + 1);
      let scoreDelta = 0;
      let nextStreak = s.streak;
      let hits = s.hits;
      let misses = s.misses;
      if (b.decoy) {
        scoreDelta = -150;
        nextStreak = 0;
        misses += 1;
      } else if (match) {
        scoreDelta = 100 * streakMult;
        nextStreak = Math.min(10, s.streak + 1);
        hits += 1;
      } else {
        scoreDelta = -75;
        nextStreak = 0;
        misses += 1;
      }
      return {
        ...s,
        bursts: s.bursts.map((x) => (x.id === a.burstId ? { ...x, handled: true } : x)),
        score: Math.max(0, s.score + scoreDelta),
        streak: nextStreak,
        hits,
        misses,
      };
    }
    case "REJECT": {
      if (s.railCooldown[a.rail] > 0) return s;
      const cd = [...s.railCooldown] as [number, number, number];
      cd[a.rail] = 3;
      const bursts = s.bursts.map((b) =>
        b.rail === a.rail && b.hovering && !b.handled ? { ...b, handled: true } : b
      );
      return { ...s, bursts, railCooldown: cd };
    }
    case "SET_LAYER":
      return { ...s, layer: a.layer };
    default:
      return s;
  }
}

const initial: World = {
  bursts: [],
  filters: ["#FF4D00", "#00B4FF", "#FFD700"],
  railCooldown: [0, 0, 0],
  score: 0,
  streak: 0,
  layer: 1,
  hits: 0,
  misses: 0,
};

export default function Afterburn({ onExit }: { onExit: (score: number) => void }) {
  const [phase, setPhase] = useState<Phase>("ONBOARD");
  const [timeLeft, setTimeLeft] = useState(SESSION_SECS);
  const [displayScore, setDisplayScore] = useState(0);
  const [world, dispatch] = useReducer(reducer, initial);
  const nextIdRef = useRef(1);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const layerFromTime = (t: number): 1 | 2 | 3 | 4 => {
    const elapsed = SESSION_SECS - t;
    if (elapsed < 20) return 1;
    if (elapsed < 45) return 2;
    if (elapsed < 70) return 3;
    return 4;
  };

  useEffect(() => {
    if (phase !== "PLAY") return;
    tickRef.current = setInterval(() => dispatch({ type: "TICK", dt: 0.05 }), 50);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const nt = t - 1;
        const nl = layerFromTime(nt);
        if (nl !== world.layer) dispatch({ type: "SET_LAYER", layer: nl });
        if (nt <= 0) {
          setPhase("DONE");
          return 0;
        }
        return nt;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, world.layer]);

  useEffect(() => {
    if (phase !== "PLAY") return;
    const layer = world.layer;
    const spawnGap = layer === 1 ? 1400 : layer === 2 ? 1100 : layer === 3 ? 850 : 700;
    spawnRef.current = setInterval(() => {
      const rail = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const color = COLORS[Math.floor(Math.random() * 3)];
      const decoy = layer === 4 && Math.random() < 0.25;
      dispatch({
        type: "SPAWN",
        burst: {
          id: nextIdRef.current++,
          rail,
          color,
          x: -5,
          speed: 18 + layer * 3,
          hovering: false,
          decoy,
          handled: false,
        },
      });
    }, spawnGap);
    const rotGap = layer === 1 ? 4000 : layer === 2 ? 3000 : layer === 3 ? 2000 : 1500;
    filterRef.current = setInterval(() => {
      const r = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const c = COLORS[Math.floor(Math.random() * 3)];
      dispatch({ type: "ROTATE_FILTER", rail: r, color: c });
    }, rotGap);
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (filterRef.current) clearInterval(filterRef.current);
    };
  }, [phase, world.layer]);

  useEffect(() => {
    if (phase !== "DONE") return;
    let n = 0;
    const step = Math.max(1, Math.floor(world.score / 40));
    const id = setInterval(() => {
      n = Math.min(world.score, n + step);
      setDisplayScore(n);
      if (n >= world.score) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [phase, world.score]);

  const handleBurstTap = useCallback((id: number, match: boolean) => {
    tone(match ? 720 : 200, 0.15, 0.08, "triangle");
    dispatch({ type: "PASS", burstId: id });
  }, []);

  const handleRailTap = useCallback((rail: 0 | 1 | 2) => {
    tone(140, 0.1, 0.05, "square");
    dispatch({ type: "REJECT", rail });
  }, []);

  const timerFrac = timeLeft / SESSION_SECS;
  const circ = 2 * Math.PI * 28;

  return (
    <div className="fixed inset-0" style={{ background: BG }}>
      {phase === "ONBOARD" && (
        <OnboardingOverlay
          storageKey="lf_afterburn_on"
          accentColor={ACCENT}
          onDone={() => setPhase("PLAY")}
          steps={[
            { visual: <div className="w-24 h-24 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 60px ${ACCENT}` }} />, line: "Bursts drift across three rails. They pause at the gate." },
            { visual: <div className="flex gap-3">{COLORS.map((c) => <div key={c} className="w-12 h-12 rounded-full" style={{ background: c }} />)}</div>, line: "Each rail has a color. Tap a burst if it matches." },
            { visual: <div className="w-24 h-6 rounded-full" style={{ background: "#2a1010", border: `2px solid ${ACCENT}` }} />, line: "Wrong color? Tap the rail to send it back." },
            { visual: <div className="text-4xl font-black" style={{ color: ACCENT }}>×10</div>, line: "Chain matches for a juicy streak. Ninety seconds. Go." },
          ]}
        />
      )}

      {phase === "PLAY" && (
        <div className="relative w-full h-full">
          <div className="absolute top-6 left-6 z-10">
            <div className="text-5xl font-black tabular-nums text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {world.score.toLocaleString()}
            </div>
            <div className="text-sm mt-1 font-bold" style={{ color: ACCENT }}>
              ×{world.streak}
            </div>
          </div>

          <div className="absolute top-6 right-6 z-10">
            <svg width={70} height={70}>
              <circle cx={35} cy={35} r={28} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
              <circle
                cx={35}
                cy={35}
                r={28}
                fill="none"
                stroke={ACCENT}
                strokeWidth={4}
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - timerFrac)}
                transform="rotate(-90 35 35)"
                strokeLinecap="round"
              />
              <text x={35} y={40} textAnchor="middle" fill="white" fontSize={14} fontWeight={700}>
                {timeLeft}
              </text>
            </svg>
          </div>

          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[40, 55, 70].map((y, i) => (
              <line key={i} x1={0} y1={y} x2={100} y2={y} stroke="rgba(255,77,0,0.15)" strokeWidth={0.15} />
            ))}
          </svg>

          {[0, 1, 2].map((rail) => {
            const y = [40, 55, 70][rail];
            const filter = world.filters[rail];
            const cd = world.railCooldown[rail];
            return (
              <button
                key={rail}
                onClick={() => handleRailTap(rail as 0 | 1 | 2)}
                className="absolute focus:outline-none"
                style={{
                  left: "76%",
                  top: `${y}%`,
                  transform: "translate(0, -50%)",
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: cd > 0 ? "rgba(80,80,80,0.3)" : `${filter}22`,
                  border: `2px solid ${cd > 0 ? "#444" : filter}`,
                  opacity: cd > 0 ? 0.4 : 1,
                }}
                aria-label="Reject rail"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: filter }} />
                </div>
              </button>
            );
          })}

          {world.bursts.map((b) => {
            const y = [40, 55, 70][b.rail];
            const filter = world.filters[b.rail];
            const match = b.color === filter && !b.decoy;
            return (
              <motion.button
                key={b.id}
                onClick={() => handleBurstTap(b.id, match)}
                className="absolute focus:outline-none"
                style={{
                  left: `${b.x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: b.color,
                  boxShadow: `0 0 30px ${b.color}`,
                  opacity: b.handled ? 0 : 1,
                }}
                animate={{ scale: b.hovering ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.6, repeat: b.hovering ? Infinity : 0 }}
                aria-label="Burst"
              >
                {b.decoy && (
                  <span className="text-white text-xs opacity-60">*</span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {phase === "DONE" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
          <div className="text-sm uppercase tracking-[0.4em] mb-4" style={{ color: ACCENT }}>
            Round over
          </div>
          <div className="text-7xl font-black tabular-nums mb-6" style={{ textShadow: `0 0 30px ${ACCENT}55` }}>
            {displayScore.toLocaleString()}
          </div>
          <div className="flex gap-8 mb-10 text-sm text-white/70">
            <div><span className="text-white font-bold">{world.hits}</span> nailed</div>
            <div><span className="text-white font-bold">{world.misses}</span> slipped</div>
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
