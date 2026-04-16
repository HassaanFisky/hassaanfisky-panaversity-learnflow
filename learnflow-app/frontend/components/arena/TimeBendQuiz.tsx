"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap, TrendingUp, TrendingDown } from "lucide-react";

const QUESTIONS = [
  { q: "What does 'async' do in Python?", a: "Declares a coroutine function", opts: ["Declares a coroutine function", "Runs code in a thread", "Imports a module", "Creates a generator"] },
  { q: "What is a 'vector embedding'?", a: "A numeric representation of meaning", opts: ["A numeric representation of meaning", "A type of neural network", "A database index", "A compression algorithm"] },
  { q: "What does RAG stand for?", a: "Retrieval-Augmented Generation", opts: ["Retrieval-Augmented Generation", "Recursive Agent Graph", "Real-time API Gateway", "Random Access Generation"] },
  { q: "What is the role of an LLM 'temperature'?", a: "Controls randomness in output", opts: ["Controls randomness in output", "Sets model speed", "Limits token count", "Defines context window"] },
  { q: "What is 'fine-tuning' an AI model?", a: "Training further on domain-specific data", opts: ["Training further on domain-specific data", "Reducing model size", "Updating model weights to zero", "Caching inference results"] },
  { q: "What is a 'prompt' in AI context?", a: "Input text given to a language model", opts: ["Input text given to a language model", "A Python decorator", "A database query", "A server request"] },
  { q: "What does 'token' mean for LLMs?", a: "A chunk of text the model processes", opts: ["A chunk of text the model processes", "An API authentication key", "A memory address", "A JavaScript event"] },
  { q: "What is 'hallucination' in AI?", a: "When a model generates false information confidently", opts: ["When a model generates false information confidently", "When a model crashes", "When context is too long", "When the model refuses to answer"] },
  { q: "What is 'context window'?", a: "Maximum tokens a model can process at once", opts: ["Maximum tokens a model can process at once", "A browser viewport", "A React component", "A time limit for inference"] },
  { q: "What is 'Groq'?", a: "An AI inference chip and API platform", opts: ["An AI inference chip and API platform", "A database system", "A Python testing library", "A CSS framework"] },
  { q: "What does 'Next.js' provide over plain React?", a: "Server-side rendering and routing", opts: ["Server-side rendering and routing", "Better CSS support", "Database access", "Automatic testing"] },
  { q: "What is 'FastAPI' used for?", a: "Building Python APIs with automatic docs", opts: ["Building Python APIs with automatic docs", "Frontend development", "Database management", "Container orchestration"] },
  { q: "What is a 'webhook'?", a: "HTTP callback triggered by an event", opts: ["HTTP callback triggered by an event", "A browser API", "A caching strategy", "A type of database"] },
  { q: "What does 'Supabase' provide?", a: "Open-source Firebase alternative with PostgreSQL", opts: ["Open-source Firebase alternative with PostgreSQL", "A React UI library", "A Python runtime", "A CDN service"] },
];

const BASE_TICK = 1000; // ms per second
const SLOW_TICK = 1600; // slowed time
const FAST_TICK = 550;  // sped-up time
const TIME_TOTAL = 60;

type SpeedState = "normal" | "slow" | "fast";

export default function TimeBendQuiz({ onExit }: { onExit: () => void }) {
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_TOTAL);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [speed, setSpeed] = useState<SpeedState>("normal");
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [showBend, setShowBend] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const question = QUESTIONS[qIndex % QUESTIONS.length];

  const tick = speed === "slow" ? SLOW_TICK : speed === "fast" ? FAST_TICK : BASE_TICK;

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, tick);
  }, [tick]);

  useEffect(() => {
    startTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startTimer]);

  const handleAnswer = (opt: string) => {
    if (selectedOpt || isOver) return;
    setSelectedOpt(opt);
    const correct = opt === question.a;
    setIsCorrect(correct);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore((s) => s + 100 + (newStreak > 2 ? 50 * (newStreak - 2) : 0));
      setSpeed("slow");
      setShowBend(true);
      setTimeout(() => setShowBend(false), 1200);
    } else {
      setStreak(0);
      setSpeed("fast");
      setShowBend(true);
      setTimeout(() => setShowBend(false), 800);
    }

    setTimeout(() => {
      setSelectedOpt(null);
      setIsCorrect(null);
      setQIndex((i) => i + 1);
      setSpeed("normal");
    }, 900);
  };

  const speedLabel: Record<SpeedState, string> = {
    normal: "Nominal",
    slow: "Time Dilated",
    fast: "Time Compressed",
  };

  const speedColor: Record<SpeedState, string> = {
    normal: "#96D1C7",
    slow: "#6EE7B7",
    fast: "#EF4444",
  };

  if (isOver) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-8 text-center px-4"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#9C948A] mb-3">Time Collapsed</div>
          <h2 className="text-5xl font-bold mb-1">Quiz Over</h2>
        </div>
        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl px-12 py-8 flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-[#9C948A]">Final Score</span>
          <span className="text-6xl font-black text-[#E58A6D] tabular-nums">{score}</span>
        </div>
        <button
          onClick={onExit}
          className="px-8 py-4 bg-[#1C1A17] border border-[#2E2B27] text-[#F2EDE7] rounded-2xl hover:border-[#E58A6D]/50 transition-colors text-sm uppercase tracking-widest font-bold"
        >
          Exit Flux Mode
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4 relative">
      {/* Time Bend Visual Flash */}
      <AnimatePresence>
        {showBend && (
          <motion.div
            key="bend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none rounded-3xl z-50"
            style={{
              background: isCorrect
                ? "radial-gradient(ellipse at center, rgba(110,231,183,0.12) 0%, transparent 70%)"
                : "radial-gradient(ellipse at center, rgba(239,68,68,0.14) 0%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="w-full flex items-center justify-between mb-10">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#9C948A]">Time Fabric</span>
          <div className="flex items-center gap-2">
            {speed === "slow" ? (
              <TrendingDown size={14} style={{ color: speedColor.slow }} />
            ) : speed === "fast" ? (
              <TrendingUp size={14} style={{ color: speedColor.fast }} />
            ) : (
              <Clock size={14} style={{ color: speedColor.normal }} />
            )}
            <span
              className="text-sm font-bold uppercase tracking-widest transition-colors duration-300"
              style={{ color: speedColor[speed] }}
            >
              {speedLabel[speed]}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <motion.span
            key={timeLeft}
            animate={{ scale: timeLeft <= 10 ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.3 }}
            className="text-5xl font-black tabular-nums"
            style={{ color: timeLeft <= 10 ? "#EF4444" : "#F2EDE7" }}
          >
            {timeLeft}
          </motion.span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#9C948A]">seconds left</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#9C948A]">Score</span>
          <motion.span
            key={score}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.25 }}
            className="text-2xl font-black text-[#E58A6D] tabular-nums"
          >
            {score}
          </motion.span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1 bg-[#1C1A17] rounded-full mb-10 overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-colors duration-500"
          style={{
            width: `${(timeLeft / TIME_TOTAL) * 100}%`,
            background: speed === "fast" ? "#EF4444" : speed === "slow" ? "#6EE7B7" : "#96D1C7",
            transition: `width ${tick}ms linear`,
          }}
        />
      </div>

      {/* Streak */}
      {streak > 1 && (
        <motion.div
          key={streak}
          initial={{ opacity: 0, y: -8, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mb-6 flex items-center gap-2 text-sm font-black tracking-widest text-[#6EE7B7]"
        >
          <Zap size={14} className="fill-[#6EE7B7]" /> STREAK ×{streak}
        </motion.div>
      )}

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="w-full bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center mb-8 min-h-[120px] flex flex-col items-center justify-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
        >
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#9C948A] mb-4 block">Question</span>
          <h3 className="text-xl font-bold text-[#F2EDE7] leading-snug">{question.q}</h3>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {question.opts.map((opt) => {
          const picked = selectedOpt === opt;
          const correct = opt === question.a;
          let borderClass = "border-[#2E2B27] hover:border-[#E58A6D]/40";
          let bgClass = "bg-[#0B0F14] hover:bg-[#1C1A17]";
          if (selectedOpt) {
            if (picked && isCorrect) { borderClass = "border-[#6EE7B7]"; bgClass = "bg-[#6EE7B7]/10"; }
            else if (picked && !isCorrect) { borderClass = "border-red-500"; bgClass = "bg-red-500/10"; }
            else if (!picked && correct && !isCorrect) { borderClass = "border-[#6EE7B7]/50"; bgClass = "bg-[#6EE7B7]/5"; }
          }
          return (
            <motion.button
              key={opt}
              whileHover={!selectedOpt ? { scale: 1.02 } : {}}
              whileTap={!selectedOpt ? { scale: 0.97 } : {}}
              onClick={() => handleAnswer(opt)}
              className={`py-5 px-5 border rounded-2xl text-left text-sm font-semibold text-[#F2EDE7] transition-all duration-200 ${borderClass} ${bgClass}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>

      <button onClick={onExit} className="mt-12 text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest">
        Exit Flux
      </button>
    </div>
  );
}
