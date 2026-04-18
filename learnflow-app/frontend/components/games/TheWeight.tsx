"use client";

import { useEffect, useReducer, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingOverlay from "./engine/OnboardingOverlay";

const ACCENT = "#FFB830";
const BG = "#0C0800";
const TOTAL_ROUNDS = 6;
const FIB = [1, 2, 3, 5, 8, 13];

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

type Phase = "ONBOARD" | "PLAY" | "SUCCESS" | "DONE";
type Side = "center" | "left" | "right";

interface Token {
  id: number;
  value: number;
  side: Side;
}

type GoalType = "equality" | "offset" | "ratio" | "dual";

interface Goal {
  kind: GoalType;
  target?: number;
  offset?: number;
  ratio?: number;
}

interface World {
  tokens: Token[];
  round: number;
  score: number;
  retries: number;
  goal: Goal;
}

type Action =
  | { type: "MOVE_TOKEN"; id: number; side: Side }
  | { type: "NEXT_ROUND"; goal: Goal; tokens: Token[] }
  | { type: "WIN"; bonus: number }
  | { type: "FAIL" };

function reducer(s: World, a: Action): World {
  switch (a.type) {
    case "MOVE_TOKEN":
      return { ...s, tokens: s.tokens.map((t) => (t.id === a.id ? { ...t, side: a.side } : t)) };
    case "NEXT_ROUND":
      return { ...s, round: s.round + 1, goal: a.goal, tokens: a.tokens, retries: 0 };
    case "WIN":
      return { ...s, score: s.score + a.bonus };
    case "FAIL":
      return { ...s, retries: s.retries + 1 };
    default:
      return s;
  }
}

function makeRound(round: number): { goal: Goal; tokens: Token[] } {
  const layer: 1 | 2 | 3 | 4 = round <= 1 ? 1 : round <= 3 ? 2 : round <= 4 ? 3 : 4;
  const count = 3 + Math.min(3, round);
  const tokens: Token[] = [];
  for (let i = 0; i < count; i++) {
    tokens.push({ id: i, value: FIB[Math.floor(Math.random() * 6)], side: "center" });
  }
  let goal: Goal;
  if (layer === 1) goal = { kind: "equality" };
  else if (layer === 2) goal = { kind: "offset", offset: 2 + Math.floor(Math.random() * 3) };
  else if (layer === 3) goal = { kind: "ratio", ratio: 2 };
  else goal = { kind: "dual", target: 13 };
  return { goal, tokens };
}

function goalText(g: Goal): string {
  if (g.kind === "equality") return "Make both sides even.";
  if (g.kind === "offset") return `Left must weigh ${g.offset} more than right.`;
  if (g.kind === "ratio") return "Left must weigh twice the right.";
  return `Each side totals ${g.target ?? 13}.`;
}

function sumSide(tokens: Token[], side: "left" | "right"): number {
  return tokens.filter((t) => t.side === side).reduce((a, b) => a + b.value, 0);
}

function checkGoal(tokens: Token[], g: Goal): boolean {
  const placed = tokens.filter((t) => t.side !== "center");
  if (placed.length < tokens.length) return false;
  const L = sumSide(tokens, "left");
  const R = sumSide(tokens, "right");
  if (g.kind === "equality") return L === R && L > 0;
  if (g.kind === "offset") return L - R === (g.offset ?? 0);
  if (g.kind === "ratio") return R > 0 && L === 2 * R;
  if (g.kind === "dual") return L === (g.target ?? 0) && R === (g.target ?? 0);
  return false;
}

const firstRound = makeRound(1);
const initial: World = {
  tokens: firstRound.tokens,
  round: 1,
  score: 0,
  retries: 0,
  goal: firstRound.goal,
};

export default function TheWeight({ onExit }: { onExit: (score: number) => void }) {
  const [phase, setPhase] = useState<Phase>("ONBOARD");
  const [timeLeft, setTimeLeft] = useState(30);
  const [shake, setShake] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [world, dispatch] = useReducer(reducer, initial);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timeCap = useMemo(() => {
    return world.round <= 2 ? 30 : world.round <= 4 ? 22 : 13;
  }, [world.round]);

  useEffect(() => {
    if (phase !== "PLAY") return;
    setTimeLeft(timeCap);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t >= timeCap) return t;
        return t + 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeCap, world.round]);

  const L = sumSide(world.tokens, "left");
  const R = sumSide(world.tokens, "right");
  const imbalance = L - R;
  const tilt = Math.max(-30, Math.min(30, imbalance * 2));
  const allPlaced = world.tokens.every((t) => t.side !== "center");

  const handleMove = useCallback((id: number, side: Side) => {
    tone(300, 0.08, 0.04);
    dispatch({ type: "MOVE_TOKEN", id, side });
  }, []);

  const handleLock = useCallback(() => {
    if (!allPlaced) return;
    const pass = checkGoal(world.tokens, world.goal);
    if (pass) {
      const baseBonus = 200 + timeLeft * 10;
      const penalty = world.retries * 20;
      const bonus = Math.max(50, baseBonus - penalty);
      tone(680, 0.4, 0.12, "triangle");
      dispatch({ type: "WIN", bonus });
      setShowParticles(true);
      setPhase("SUCCESS");
      setTimeout(() => {
        setShowParticles(false);
        if (world.round >= TOTAL_ROUNDS) {
          setPhase("DONE");
        } else {
          const nr = makeRound(world.round + 1);
          dispatch({ type: "NEXT_ROUND", goal: nr.goal, tokens: nr.tokens });
          setPhase("PLAY");
        }
      }, 1600);
    } else {
      tone(180, 0.15, 0.08, "square");
      setShake(true);
      dispatch({ type: "FAIL" });
      setTimeout(() => setShake(false), 400);
    }
  }, [allPlaced, world.tokens, world.goal, world.retries, world.round, timeLeft]);

  const centerTokens = world.tokens.filter((t) => t.side === "center");
  const leftTokens = world.tokens.filter((t) => t.side === "left");
  const rightTokens = world.tokens.filter((t) => t.side === "right");

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: BG }}>
      {phase === "ONBOARD" && (
        <OnboardingOverlay
          storageKey="lf_weight_on"
          accentColor={ACCENT}
          onDone={() => setPhase("PLAY")}
          steps={[
            { visual: <div className="w-48 h-2 rounded-full" style={{ background: ACCENT }} />, line: "A beam. Two pans. Your call which goes where." },
            { visual: <div className="flex gap-3">{[1, 3, 5].map((v) => <div key={v} className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-black" style={{ background: ACCENT }}>{v}</div>)}</div>, line: "Drop tokens on the left or right pan." },
            { visual: <div className="text-white text-sm">Make both sides even.</div>, line: "Read the goal. Balance it with what you have." },
            { visual: <div className="text-4xl font-black" style={{ color: ACCENT }}>Lock</div>, line: "Once placed, lock it in. Six rounds. Breathe." },
          ]}
        />
      )}

      {(phase === "PLAY" || phase === "SUCCESS") && (
        <div className="absolute inset-0 flex flex-col items-center p-6">
          <div className="absolute top-6 left-6 text-white">
            <div className="text-3xl font-black tabular-nums">{world.score.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest mt-1" style={{ color: ACCENT }}>
              Round {world.round} / {TOTAL_ROUNDS}
            </div>
          </div>
          <div className="absolute top-6 right-6 w-40">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(timeLeft / timeCap) * 100}%`, background: ACCENT }}
              />
            </div>
          </div>

          <div className="mt-16 mb-4 text-sm uppercase tracking-[0.3em] text-white/70 text-center">
            {goalText(world.goal)}
          </div>
          <div className="text-white/40 text-xs mb-10">
            Left {L} · Right {R}
          </div>

          <motion.div
            className="relative w-full max-w-xl"
            style={{ height: 280 }}
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2"
              style={{ transformOrigin: "center", translateX: "-50%", translateY: "-50%" }}
              animate={{ rotate: phase === "SUCCESS" ? [tilt, 6, -4, 0] : tilt }}
              transition={{ type: "spring", stiffness: 60, damping: 8, mass: 1.2 }}
            >
              <svg width={400} height={240} viewBox="-200 -120 400 240">
                <circle cx={0} cy={0} r={8} fill={ACCENT} />
                <rect x={-180} y={-4} width={360} height={8} rx={4} fill={ACCENT} />
                <g transform="translate(-170, 4)">
                  <rect x={-60} y={0} width={120} height={6} fill={ACCENT} opacity={0.5} />
                  <rect x={-60} y={6} width={4} height={40} fill={ACCENT} opacity={0.3} />
                  <rect x={56} y={6} width={4} height={40} fill={ACCENT} opacity={0.3} />
                  <text x={0} y={30} textAnchor="middle" fill="white" fontSize={18} fontWeight={700}>
                    {L}
                  </text>
                </g>
                <g transform="translate(170, 4)">
                  <rect x={-60} y={0} width={120} height={6} fill={ACCENT} opacity={0.5} />
                  <rect x={-60} y={6} width={4} height={40} fill={ACCENT} opacity={0.3} />
                  <rect x={56} y={6} width={4} height={40} fill={ACCENT} opacity={0.3} />
                  <text x={0} y={30} textAnchor="middle" fill="white" fontSize={18} fontWeight={700}>
                    {R}
                  </text>
                </g>
                <rect x={-2} y={-120} width={4} height={120} fill={ACCENT} opacity={0.3} />
              </svg>
            </motion.div>

            <AnimatePresence>
              {showParticles &&
                Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos((i / 12) * Math.PI * 2) * 160,
                      y: Math.sin((i / 12) * Math.PI * 2) * 100,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    transition={{ duration: 1.2 }}
                    className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                    style={{ background: ACCENT }}
                  />
                ))}
            </AnimatePresence>
          </motion.div>

          <div className="mt-8 flex gap-6 items-center">
            <button
              onClick={() => {
                const next = centerTokens[0];
                if (next) handleMove(next.id, "left");
              }}
              className="px-6 py-4 rounded-2xl font-bold text-sm text-white border-2 min-h-[48px] min-w-[88px]"
              style={{ borderColor: ACCENT }}
              disabled={centerTokens.length === 0}
            >
              ← Left
            </button>
            <div className="flex gap-2 flex-wrap max-w-[260px] justify-center min-h-[56px]">
              {centerTokens.length === 0 && leftTokens.length + rightTokens.length === 0 ? null : null}
              {centerTokens.map((t) => (
                <motion.button
                  key={t.id}
                  onClick={() => handleMove(t.id, "left")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-14 h-14 rounded-full font-black text-black min-w-[48px] min-h-[48px]"
                  style={{ background: ACCENT, boxShadow: `0 0 20px ${ACCENT}66` }}
                >
                  {t.value}
                </motion.button>
              ))}
              {[...leftTokens, ...rightTokens].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleMove(t.id, "center")}
                  className="w-10 h-10 rounded-full font-bold text-xs text-black opacity-60 min-w-[40px] min-h-[40px]"
                  style={{ background: ACCENT }}
                  title="Return to center"
                >
                  {t.value}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const next = centerTokens[0];
                if (next) handleMove(next.id, "right");
              }}
              className="px-6 py-4 rounded-2xl font-bold text-sm text-white border-2 min-h-[48px] min-w-[88px]"
              style={{ borderColor: ACCENT }}
              disabled={centerTokens.length === 0}
            >
              Right →
            </button>
          </div>

          <button
            onClick={handleLock}
            disabled={!allPlaced}
            className="mt-6 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm min-h-[48px]"
            style={{
              background: allPlaced ? ACCENT : "rgba(255,184,48,0.15)",
              color: allPlaced ? "#000" : "rgba(255,255,255,0.3)",
            }}
          >
            Lock In
          </button>
        </div>
      )}

      {phase === "DONE" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
          <div className="text-sm uppercase tracking-[0.4em] mb-4" style={{ color: ACCENT }}>
            Nicely balanced
          </div>
          <div className="text-7xl font-black tabular-nums mb-10" style={{ textShadow: `0 0 30px ${ACCENT}55` }}>
            {world.score.toLocaleString()}
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
