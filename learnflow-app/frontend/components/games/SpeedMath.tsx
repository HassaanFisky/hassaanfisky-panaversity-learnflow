"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, RotateCcw, ArrowLeft } from "lucide-react";

const ACCENT = "#F6C90E";
const TOTAL_TIME = 30; // seconds

type Op = "+" | "−" | "×";

interface Problem {
  expression: string;
  answer: number;
  choices: number[];
}

function generateProblem(difficulty: number): Problem {
  const ops: Op[] = difficulty < 5 ? ["+", "−"] : ["+", "−", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
    b = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
    answer = a + b;
  } else if (op === "−") {
    a = Math.floor(Math.random() * (20 + difficulty * 5)) + 10;
    b = Math.floor(Math.random() * a) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * (5 + Math.min(difficulty, 5))) + 2;
    b = Math.floor(Math.random() * (5 + Math.min(difficulty, 3))) + 2;
    answer = a * b;
  }

  // Generate 3 unique wrong choices close to the answer
  const wrongs = new Set<number>();
  while (wrongs.size < 2) {
    const offset = Math.floor(Math.random() * 6) + 1;
    const wrong = answer + (Math.random() > 0.5 ? offset : -offset);
    if (wrong !== answer && wrong > 0) wrongs.add(wrong);
  }
  const choices = [answer, ...wrongs].sort(() => Math.random() - 0.5);

  return { expression: `${a} ${op} ${b}`, answer, choices };
}

export default function SpeedMath({ onExit }: { onExit: (score: number) => void }) {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"PLAYING" | "FEEDBACK" | "COMPLETE">("PLAYING");
  const [problem, setProblem] = useState<Problem>(() => generateProblem(1));
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef(0);

  const startGame = useCallback(() => {
    answeredRef.current = 0;
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(TOTAL_TIME);
    setSelected(null);
    setProblem(generateProblem(1));
    setPhase("PLAYING");
    setStarted(true);
  }, []);

  // Timer
  useEffect(() => {
    if (!started || phase !== "PLAYING") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("COMPLETE");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [started, phase]);

  const handleChoice = useCallback((choice: number) => {
    if (phase !== "PLAYING" || selected !== null) return;
    const ok = choice === problem.answer;
    setSelected(choice);
    setIsCorrect(ok);
    answeredRef.current += 1;

    if (ok) {
      const gained = Math.max(10, timeLeft * 2);
      setScore(s => s + gained);
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
    }

    setPhase("FEEDBACK");
    setTimeout(() => {
      setSelected(null);
      setProblem(generateProblem(Math.floor(answeredRef.current / 3) + 1));
      setPhase("PLAYING");
    }, 450);
  }, [phase, selected, problem.answer, timeLeft]);

  // ── Pre-start ─────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}>
            <Calculator className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-3xl font-black mb-2">Speed Math</h1>
          <p className="text-[#9C948A] text-sm mb-8 leading-relaxed">
            Solve arithmetic problems as fast as you can in 30 seconds. Faster answers = more points.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8 text-left">
            {[
              ["⏱ 30 Seconds", "Clock starts immediately"],
              ["📈 Adaptive", "Gets harder as you score"],
              ["⚡ Speed Bonus", "Faster = more points per answer"],
              ["➕ ➖ ✕", "Addition, subtraction, multiply"],
            ].map(([t, d]) => (
              <div key={t} className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-4">
                <p className="text-xs font-bold mb-1">{t}</p>
                <p className="text-[10px] text-[#9C948A]">{d}</p>
              </div>
            ))}
          </div>
          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-[#0B0F14]"
            style={{ background: ACCENT }}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  if (phase === "COMPLETE") {
    const accuracy = answeredRef.current > 0 ? Math.round((correct / answeredRef.current) * 100) : 0;
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}>
            <Calculator className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-black mb-1">Time&apos;s Up!</h2>
          <p className="text-[#9C948A] text-sm mb-8">
            {correct} correct out of {answeredRef.current} answered.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              [score.toLocaleString(), "Score"],
              [correct.toString(), "Correct"],
              [`${accuracy}%`, "Accuracy"],
            ].map(([v, l]) => (
              <div key={l} className="bg-[#0B0F14] rounded-2xl p-4">
                <p className="text-xl font-black tabular-nums" style={{ color: ACCENT }}>{v}</p>
                <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onExit(score)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#2E2B27] text-[#9C948A] text-xs font-bold uppercase tracking-widest hover:border-[#5F5854] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Hub
            </button>
            <button
              onClick={startGame}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[#0B0F14] text-xs font-black uppercase tracking-widest"
              style={{ background: ACCENT }}
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const timerColor = timerPct > 40 ? ACCENT : timerPct > 20 ? "#F97316" : "#EF4444";

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6 select-none">
      {/* Top bar */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4">
        <button onClick={() => onExit(score)} className="p-2 text-[#5F5854] hover:text-[#F2EDE7] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-5">
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            Score <span className="font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            ✓ <span className="font-black text-[#34D399]">{correct}</span>
            {"  "}✗ <span className="font-black text-[#F97316]">{wrong}</span>
          </span>
        </div>
      </div>

      {/* Timer ring + number */}
      <div className="relative w-24 h-24 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#2E2B27" strokeWidth="6" />
          <circle
            cx="48" cy="48" r="40" fill="none"
            stroke={timerColor} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - timerPct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black tabular-nums" style={{ color: timerColor }}>{timeLeft}</span>
        </div>
      </div>

      {/* Problem */}
      <AnimatePresence mode="wait">
        <motion.div
          key={problem.expression}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-sm"
        >
          <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 mb-6 text-center">
            <p className="text-5xl font-black tracking-tight">{problem.expression} = ?</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {problem.choices.map(c => {
              const isSel = selected === c;
              const ok = c === problem.answer;
              let bg = "#1C1A17", border = "#2E2B27", color = "#F2EDE7";
              if (isSel && isCorrect)  { bg = `${ACCENT}25`; border = ACCENT; color = ACCENT; }
              if (isSel && !isCorrect) { bg = "#F9731615"; border = "#F97316"; color = "#F97316"; }
              if (phase === "FEEDBACK" && ok && !isCorrect) { bg = `${ACCENT}15`; border = `${ACCENT}50`; color = ACCENT; }

              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleChoice(c)}
                  disabled={selected !== null}
                  className="py-5 rounded-2xl border font-black text-2xl tabular-nums transition-all"
                  style={{ background: bg, borderColor: border, color }}
                >
                  {c}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
