"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Eye, Layers, Brain, Clock } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#818CF8";
const GAME_ID = "patternhunter" as const;
const ROUNDS = 10;
const TIME_PER_ROUND = 20;

interface Pattern {
  sequence: (string | number)[];
  options: (string | number)[];
  answer: number; // index into options
  hint: string;
}

const PATTERNS: Pattern[] = [
  { sequence: [2, 4, 6, 8, 10, "?"], options: [11, 12, 14, 13], answer: 1, hint: "+2 each step" },
  { sequence: [1, 2, 4, 8, 16, "?"], options: [24, 32, 64, 20], answer: 1, hint: "×2 each step" },
  { sequence: ["🟥", "🟦", "🟥", "🟦", "🟥", "?"], options: ["🟩", "🟥", "🟦", "🟨"], answer: 2, hint: "alternating pattern" },
  { sequence: [100, 90, 81, 73, 66, "?"], options: [59, 60, 61, 58], answer: 1, hint: "decreasing steps: -10,-9,-8,-7,-7" },
  { sequence: ["A", "C", "E", "G", "I", "?"], options: ["J", "K", "L", "M"], answer: 1, hint: "skip one letter" },
  { sequence: [1, 1, 2, 3, 5, "?"], options: [6, 7, 8, 9], answer: 2, hint: "Fibonacci: each = sum of previous two" },
  { sequence: [3, 6, 12, 24, 48, "?"], options: [72, 96, 100, 86], answer: 1, hint: "×2 each step" },
  { sequence: ["S", "M", "T", "W", "T", "?"], options: ["S", "F", "M", "T"], answer: 1, hint: "days of the week" },
  { sequence: [200, 100, 50, 25, 12.5, "?"], options: [6, 6.25, 7, 5], answer: 1, hint: "÷2 each step" },
  { sequence: [1, 4, 9, 16, 25, "?"], options: [30, 34, 36, 32], answer: 2, hint: "perfect squares: 1²,2²,3²..." },
  { sequence: ["●", "●●", "●", "●●●", "●", "?"], options: ["●●", "●●●●", "●●●", "●"], answer: 2, hint: "odd positions: ●, even: increasing" },
  { sequence: [5, 10, 8, 16, 14, "?"], options: [24, 28, 30, 32], answer: 1, hint: "×2 then -2, alternating" },
  { sequence: ["🔴", "🔵", "🔵", "🔴", "🔵", "?"], options: ["🔴", "🔵", "🟢", "🟡"], answer: 1, hint: "1 red, 2 blue repeating" },
  { sequence: [0, 1, 3, 6, 10, "?"], options: [14, 15, 16, 13], answer: 1, hint: "triangular numbers" },
  { sequence: ["Z", "Y", "X", "W", "V", "?"], options: ["T", "U", "S", "R"], answer: 1, hint: "reverse alphabet" },
];

const ONBOARDING_STEPS = [
  {
    title: "Find the Pattern",
    body: "A sequence of 6 items appears, with the last one replaced by '?'. Your job: figure out the rule.",
    icon: Eye,
  },
  {
    title: "Choose the Answer",
    body: "Four options are shown. Select the one that correctly continues the sequence. 20 seconds per round.",
    icon: Layers,
  },
  {
    title: "Speed Bonus",
    body: "Faster correct answers earn more points. 100 base + up to 100 from remaining time. 10 rounds total.",
    icon: Brain,
  },
  {
    title: "Patterns Grow Harder",
    body: "Early rounds use simple arithmetic. Later rounds use composite and multi-dimensional patterns.",
    icon: Clock,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "FEEDBACK" | "COMPLETE";

export default function PatternHunter({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pattern = PATTERNS[round % PATTERNS.length];

  const nextRound = useCallback(() => {
    if (round + 1 >= ROUNDS) {
      setPhase("COMPLETE");
    } else {
      setRound(r => r + 1);
      setSelected(null);
      setCorrect(null);
      setTimeLeft(TIME_PER_ROUND);
      setPhase("PLAYING");
    }
  }, [round]);

  const handleSelect = useCallback((optIdx: number) => {
    if (phase !== "PLAYING" || selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = optIdx === pattern.answer;
    const timeBonus = Math.floor(timeLeft * 5);
    const pts = isCorrect ? 100 + timeBonus : 0;

    setSelected(optIdx);
    setCorrect(isCorrect);
    setScore(s => s + pts);
    setResults(prev => [...prev, isCorrect]);
    setPhase("FEEDBACK");

    setTimeout(nextRound, 1100);
  }, [phase, selected, pattern, timeLeft, nextRound]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    setTimeLeft(TIME_PER_ROUND);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Auto-miss on timeout
          setSelected(-1);
          setCorrect(false);
          setResults(prev => [...prev, false]);
          setPhase("FEEDBACK");
          setTimeout(nextRound, 1000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, round, nextRound]);

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  const timerPct = (timeLeft / TIME_PER_ROUND) * 100;
  const timerColor = timerPct > 50 ? ACCENT : timerPct > 25 ? "#FBBF24" : "#EF4444";

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Pattern Hunter" />
    </div>
  );

  if (phase === "COMPLETE") {
    const correctCount = results.filter(Boolean).length;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
            <Eye className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Pattern Hunter</h2>
          <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-6">Complete</p>
          <div className="flex justify-center gap-1.5 mb-6">
            {results.map((r, i) => (
              <div key={i} className="w-3 h-3 rounded-full"
                style={{ background: r ? ACCENT : "#EF4444" }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Score", value: score.toLocaleString(), color: ACCENT },
              { label: "Correct", value: `${correctCount}/${ROUNDS}`, color: "#96D1C7" },
              { label: "Accuracy", value: `${Math.round((correctCount / ROUNDS) * 100)}%`, color: "#9B8FFF" },
              { label: "XP Earned", value: `+${Math.floor(score * 0.4)}`, color: "#F2EDE7" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0B0F14] rounded-2xl p-4">
                <p className="text-[#5F5854] text-[9px] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => onExit(score)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] hover:text-[#F2EDE7] transition-colors text-xs">
              <ArrowLeft className="w-3 h-3" /> Hub
            </button>
            <button onClick={() => { setRound(0); setScore(0); setResults([]); setPhase("PLAYING"); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const optionColors = pattern.options.map((_, i) => {
    if (selected === null) return "#2E2B27";
    if (i === pattern.answer) return ACCENT;
    if (i === selected && selected !== pattern.answer) return "#EF4444";
    return "#2E2B27";
  });

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17]">
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Round</p>
            <p className="text-sm font-bold">{round + 1}/{ROUNDS}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Time</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</p>
          </div>
        </div>
        <div className="w-4" />
      </div>
      <div className="h-0.5 bg-[#1C1A17]">
        <div className="h-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8 max-w-lg mx-auto w-full">
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">
            Round {round + 1} — What comes next?
          </p>
        </div>

        {/* Sequence display */}
        <div className="w-full bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {pattern.sequence.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black border"
                  style={{
                    background: item === "?" ? `${ACCENT}15` : "#0B0F14",
                    borderColor: item === "?" ? ACCENT : "#2E2B27",
                    color: item === "?" ? ACCENT : "#F2EDE7",
                  }}
                >
                  {String(item)}
                </div>
                {i < pattern.sequence.length - 1 && (
                  <span className="text-[#3A3530] text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feedback on result */}
        <AnimatePresence>
          {phase === "FEEDBACK" && (
            <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-lg font-black"
              style={{ color: correct ? ACCENT : "#EF4444" }}>
              {correct ? `+${100 + Math.floor(timeLeft * 5)}` : `The answer: ${pattern.sequence[5] === "?" ? pattern.options[pattern.answer] : ""}`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {pattern.options.map((opt, i) => (
            <motion.button
              key={i}
              whileHover={selected === null ? { scale: 1.03 } : {}}
              whileTap={selected === null ? { scale: 0.97 } : {}}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className="h-14 rounded-2xl border text-sm font-black transition-all"
              style={{
                background: optionColors[i] !== "#2E2B27" ? `${optionColors[i]}18` : "#1C1A17",
                borderColor: optionColors[i],
                color: optionColors[i] !== "#2E2B27" ? optionColors[i] : "#9C948A",
              }}
            >
              {String(opt)}
            </motion.button>
          ))}
        </div>

        {/* Round dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: ROUNDS }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{
                background: i < results.length
                  ? results[i] ? ACCENT : "#EF4444"
                  : i === round ? "#5F5854" : "#2E2B27",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}
