"use client";

import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingOverlay from "./engine/OnboardingOverlay";

const ACCENT = "#9B5DFF";
const OFF = "#1A0F2E";
const BG = "#0A0415";
const TOTAL_GOALS = 5;
const ROWS = 4;
const COLS = 3;
const CELLS = ROWS * COLS;

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

type Phase = "ONBOARD" | "PLAY" | "WIN_FLASH" | "DONE";

interface World {
  grid: boolean[];
  goal: boolean[];
  movesLeft: number;
  movesStart: number;
  goalsDone: number;
  score: number;
  layer: 1 | 2 | 3 | 4;
  lastTapIdx: number | null;
}

type Action =
  | { type: "TAP"; idx: number; ring: number }
  | { type: "RESET_GRID" }
  | { type: "WIN"; bonus: number }
  | { type: "NEW_GOAL"; goal: boolean[]; movesStart: number; layer: 1 | 2 | 3 | 4 };

function neighbors(idx: number): number[] {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * COLS + c);
  if (r < ROWS - 1) out.push((r + 1) * COLS + c);
  if (c > 0) out.push(r * COLS + (c - 1));
  if (c < COLS - 1) out.push(r * COLS + (c + 1));
  return out;
}

function reducer(s: World, a: Action): World {
  switch (a.type) {
    case "TAP": {
      if (s.movesLeft <= 0) return s;
      const toToggle = [a.idx, ...neighbors(a.idx)];
      const g = [...s.grid];
      for (const i of toToggle) g[i] = !g[i];
      return { ...s, grid: g, movesLeft: s.movesLeft - 1, lastTapIdx: a.idx };
    }
    case "RESET_GRID":
      return { ...s, grid: Array(CELLS).fill(false), movesLeft: s.movesStart, lastTapIdx: null };
    case "WIN":
      return { ...s, score: s.score + a.bonus, goalsDone: s.goalsDone + 1 };
    case "NEW_GOAL":
      return {
        ...s,
        grid: Array(CELLS).fill(false),
        goal: a.goal,
        movesStart: a.movesStart,
        movesLeft: a.movesStart,
        layer: a.layer,
        lastTapIdx: null,
      };
    default:
      return s;
  }
}

function randomGoal(density: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < CELLS; i++) out.push(Math.random() < density);
  return out;
}

function gridEqual(a: boolean[], b: boolean[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const MOVES_BY_LAYER = [10, 8, 7, 5];

const initial: World = {
  grid: Array(CELLS).fill(false),
  goal: randomGoal(0.4),
  movesLeft: 10,
  movesStart: 10,
  goalsDone: 0,
  score: 0,
  layer: 1,
  lastTapIdx: null,
};

export default function Cascade({ onExit }: { onExit: (score: number) => void }) {
  const [phase, setPhase] = useState<Phase>("ONBOARD");
  const [timeLeft, setTimeLeft] = useState(60);
  const [flashing, setFlashing] = useState(false);
  const [world, dispatch] = useReducer(reducer, initial);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "PLAY") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("DONE");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "PLAY") return;
    if (gridEqual(world.grid, world.goal)) {
      const bonus = world.movesLeft * 50 + timeLeft * 5;
      tone(660, 0.4, 0.1, "triangle");
      dispatch({ type: "WIN", bonus });
      setFlashing(true);
      setPhase("WIN_FLASH");
      setTimeout(() => {
        setFlashing(false);
        if (world.goalsDone + 1 >= TOTAL_GOALS) {
          setPhase("DONE");
        } else {
          const nextLayer: 1 | 2 | 3 | 4 =
            world.goalsDone + 1 <= 1 ? 1 : world.goalsDone + 1 <= 2 ? 2 : world.goalsDone + 1 <= 3 ? 3 : 4;
          dispatch({
            type: "NEW_GOAL",
            goal: randomGoal(0.35 + nextLayer * 0.05),
            movesStart: MOVES_BY_LAYER[nextLayer - 1],
            layer: nextLayer,
          });
          setPhase("PLAY");
        }
      }, 800);
      return;
    }
    if (world.movesLeft === 0 && !gridEqual(world.grid, world.goal)) {
      setTimeout(() => dispatch({ type: "RESET_GRID" }), 600);
    }
  }, [phase, world.grid, world.goal, world.movesLeft, world.goalsDone, timeLeft]);

  const handleTap = useCallback(
    (idx: number) => {
      if (phase !== "PLAY" || world.movesLeft <= 0) return;
      tone(400 + (idx % 6) * 30, 0.12, 0.05, "sine");
      const ring = 0;
      dispatch({ type: "TAP", idx, ring });
    },
    [phase, world.movesLeft]
  );

  const renderMini = (g: boolean[]) => (
    <div className="grid grid-cols-3 gap-1">
      {g.map((on, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm"
          style={{ background: on ? ACCENT : "rgba(155,93,255,0.15)" }}
        />
      ))}
    </div>
  );

  const cellSize = 60;
  const gap = 16;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: BG }}>
      {phase === "ONBOARD" && (
        <OnboardingOverlay
          storageKey="lf_cascade_on"
          accentColor={ACCENT}
          onDone={() => setPhase("PLAY")}
          steps={[
            { visual: <div className="grid grid-cols-3 gap-2">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="w-8 h-8 rounded-lg" style={{ background: i === 4 ? ACCENT : OFF }} />)}</div>, line: "Tap a tile. It and its neighbors flip." },
            { visual: renderMini([false, true, false, true, true, true, false, true, false, false, false, false]), line: "Match the small pattern up top. Exactly." },
            { visual: <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-3 h-3 rounded-full" style={{ background: ACCENT }} />)}</div>, line: "You have limited taps. Plan the ripples." },
            { visual: <div className="text-4xl font-black" style={{ color: ACCENT }}>5</div>, line: "Five patterns. Each one tougher. Go quiet." },
          ]}
        />
      )}

      {(phase === "PLAY" || phase === "WIN_FLASH") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="absolute top-6 left-6 text-white">
            <div className="text-3xl font-black tabular-nums">{world.score.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest mt-1" style={{ color: ACCENT }}>
              Pattern {world.goalsDone + 1} / {TOTAL_GOALS}
            </div>
          </div>
          <div className="absolute top-6 right-6 text-white font-bold text-2xl tabular-nums">{timeLeft}s</div>

          <div className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/60">Goal</div>
          <div className="mb-8">{renderMini(world.goal)}</div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {world.grid.map((on, i) => {
              const lastIdx = world.lastTapIdx;
              let delay = 0;
              if (lastIdx !== null) {
                const lr = Math.floor(lastIdx / COLS);
                const lc = lastIdx % COLS;
                const r = Math.floor(i / COLS);
                const c = i % COLS;
                const dist = Math.abs(lr - r) + Math.abs(lc - c);
                delay = dist * 0.08;
              }
              return (
                <motion.button
                  key={i}
                  onClick={() => handleTap(i)}
                  className="relative focus:outline-none"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 12,
                    background: on ? ACCENT : OFF,
                    minWidth: 48,
                    minHeight: 48,
                  }}
                  animate={
                    flashing
                      ? { scale: [1, 1.15, 1], boxShadow: [`0 0 0px ${ACCENT}`, `0 0 30px ${ACCENT}`, `0 0 0px ${ACCENT}`] }
                      : on
                      ? { scale: [1, 1.06, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    flashing
                      ? { duration: 0.6, delay }
                      : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                  }
                  aria-label={`Tile ${i}`}
                >
                  {on && (
                    <>
                      <div className="absolute inset-2 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
                      <div className="absolute inset-0 rounded-xl" style={{ boxShadow: `0 0 20px ${ACCENT}77` }} />
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-8 flex gap-2">
            {Array.from({ length: world.movesStart }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: i < world.movesLeft ? ACCENT : "rgba(155,93,255,0.15)" }}
              />
            ))}
          </div>
        </div>
      )}

      {phase === "DONE" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
          <div className="text-sm uppercase tracking-[0.4em] mb-4" style={{ color: ACCENT }}>
            You got it
          </div>
          <div className="text-7xl font-black tabular-nums mb-6" style={{ textShadow: `0 0 30px ${ACCENT}55` }}>
            {world.score.toLocaleString()}
          </div>
          <div className="text-sm text-white/70 mb-10">
            <span className="text-white font-bold">{world.goalsDone}</span> patterns shaped
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
