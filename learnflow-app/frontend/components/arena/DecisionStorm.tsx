"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bolt } from "lucide-react";

const STATEMENTS = [
  { stmt: "Python is interpreted, not compiled.", correct: true },
  { stmt: "FastAPI is built on Flask.", correct: false },
  { stmt: "LLMs predict the next token.", correct: true },
  { stmt: "RAG eliminates hallucinations completely.", correct: false },
  { stmt: "Kafka is a message queue system.", correct: true },
  { stmt: "Supabase uses MongoDB under the hood.", correct: false },
  { stmt: "Next.js supports server-side rendering.", correct: true },
  { stmt: "Docker containers share the host OS kernel.", correct: true },
  { stmt: "JWT tokens are encrypted by default.", correct: false },
  { stmt: "Groq provides GPU-based inference.", correct: false },
  { stmt: "Async/await in Python requires asyncio.", correct: true },
  { stmt: "Vercel is primarily a backend platform.", correct: false },
  { stmt: "TypeScript is a superset of JavaScript.", correct: true },
  { stmt: "Embeddings are stored as JSON strings.", correct: false },
  { stmt: "Kubernetes orchestrates containers.", correct: true },
  { stmt: "A REST API requires GraphQL.", correct: false },
  { stmt: "Webhooks push data to a listener URL.", correct: true },
  { stmt: "PostgreSQL is a NoSQL database.", correct: false },
  { stmt: "React renders UI via a virtual DOM.", correct: true },
  { stmt: "SSR stands for Static Site Rendering.", correct: false },
];

const ROUND_COUNT = 12;
const BASE_TIME = 2200; // ms per decision
const HEALTH_START = 5;

export default function DecisionStorm({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(HEALTH_START);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [shuffled, setShuffled] = useState<typeof STATEMENTS>([]);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStmt = shuffled[index];
  const roundTime = Math.max(900, BASE_TIME - index * 100);

  const startGame = () => {
    const s = [...STATEMENTS].sort(() => Math.random() - 0.5).slice(0, ROUND_COUNT);
    setShuffled(s);
    setIndex(0);
    setScore(0);
    setHealth(HEALTH_START);
    setStreak(0);
    setAnswered(null);
    setIsCorrect(null);
    setTimeLeft(Math.max(900, BASE_TIME));
    setPhase("playing");
  };

  // Countdown per round
  useEffect(() => {
    if (phase !== "playing" || answered !== null) return;
    setTimeLeft(roundTime);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 50) {
          clearInterval(timerRef.current!);
          handleDecision(null); // timed out
          return 0;
        }
        return t - 50;
      });
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, phase]);

  const handleDecision = (choice: boolean | null) => {
    if (answered !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = choice !== null && choice === currentStmt?.correct;
    setAnswered(choice);
    setIsCorrect(correct);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore((s) => s + 100 + (newStreak > 2 ? 50 : 0) + Math.round((timeLeft / roundTime) * 50));
    } else {
      setStreak(0);
      setHealth((h) => {
        const newH = h - 1;
        if (newH <= 0) {
          setTimeout(() => setPhase("done"), 800);
        }
        return Math.max(0, newH);
      });
    }

    setTimeout(() => {
      if (index + 1 >= ROUND_COUNT || (health <= 1 && !correct)) {
        setPhase("done");
      } else {
        setIndex((i) => i + 1);
        setAnswered(null);
        setIsCorrect(null);
      }
    }, 700);
  };

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 text-center max-w-sm px-4"
      >
        <div className="w-20 h-20 rounded-2xl border border-[#E58A6D]/40 bg-[#1C1A17] flex items-center justify-center">
          <Bolt size={36} className="text-[#E58A6D] fill-[#E58A6D]" />
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Decision Storm</h2>
          <p className="text-[#9C948A] text-sm leading-relaxed max-w-xs">
            A statement flashes. Decide instantly — True or False. Time shrinks each round. Wrong answers cost you a life. Five lives. Twelve rounds.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center w-full mt-2">
          {[["12", "Rounds"], ["5", "Lives"], ["Shrinks", "Time window"]].map(([v, l]) => (
            <div key={l} className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl py-4 px-2">
              <div className="text-sm font-bold text-[#E58A6D]">{v}</div>
              <div className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-1">{l}</div>
            </div>
          ))}
        </div>
        <button
          onClick={startGame}
          className="mt-2 px-10 py-4 bg-[#E58A6D] text-[#0B0F14] font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#d97a5f] transition-colors"
        >
          Storm In
        </button>
        <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest">
          Go Back
        </button>
      </motion.div>
    );
  }

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-8 text-center"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#9C948A] mb-2">Storm Passed</div>
          <h2 className="text-4xl font-bold">Decision Made</h2>
        </div>
        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl px-12 py-8 flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#9C948A]">Storm Score</span>
          <span className="text-6xl font-black text-[#E58A6D]">{score}</span>
          <div className="flex items-center gap-2 mt-2 text-[#9C948A] text-xs">
            <span>{index} / {ROUND_COUNT} rounds</span>
            <span>•</span>
            <span>{health} lives left</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={startGame}
            className="px-6 py-3 bg-[#1C1A17] border border-[#E58A6D]/30 text-[#E58A6D] rounded-xl text-xs uppercase tracking-widest font-bold hover:border-[#E58A6D] transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 bg-[#1C1A17] border border-[#2E2B27] text-[#9C948A] rounded-xl text-xs uppercase tracking-widest font-bold hover:text-[#F2EDE7] transition-colors"
          >
            Exit Flux
          </button>
        </div>
      </motion.div>
    );
  }

  const progressPct = timeLeft / roundTime;

  return (
    <div className="flex flex-col items-center w-full max-w-lg gap-6 px-4">
      {/* HUD row */}
      <div className="w-full flex justify-between items-center">
        {/* Lives */}
        <div className="flex gap-1.5">
          {Array.from({ length: HEALTH_START }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${i < health ? "bg-[#E58A6D]" : "bg-[#2E2B27]"}`}
            />
          ))}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-0.5">Round</span>
          <span className="text-sm font-black text-[#F2EDE7]">{index + 1}/{ROUND_COUNT}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-0.5 text-right">Score</span>
          <motion.span key={score} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.2 }} className="text-2xl font-black text-[#E58A6D]">
            {score}
          </motion.span>
        </div>
      </div>

      {/* Time bar */}
      <div className="w-full h-1 bg-[#1C1A17] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#E58A6D]"
          style={{ width: `${progressPct * 100}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>

      {/* Statement */}
      <AnimatePresence mode="wait">
        {currentStmt && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.18 }}
            className={`w-full min-h-[160px] rounded-3xl border p-8 flex flex-col items-center justify-center text-center transition-colors duration-200 ${
              isCorrect === true
                ? "border-[#6EE7B7]/60 bg-[#6EE7B7]/8"
                : isCorrect === false
                ? "border-red-500/60 bg-red-500/8"
                : "border-[#2E2B27] bg-[#1C1A17]"
            }`}
          >
            <span className="text-[9px] uppercase tracking-[0.4em] text-[#9C948A] mb-4 block">True or False?</span>
            <h3 className="text-xl font-bold text-[#F2EDE7] leading-snug">{currentStmt.stmt}</h3>
            {streak > 1 && (
              <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#E58A6D]">
                Streak ×{streak}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision buttons */}
      <div className="grid grid-cols-2 gap-6 w-full mt-2">
        <motion.button
          whileHover={answered === null ? { scale: 1.04 } : {}}
          whileTap={answered === null ? { scale: 0.95 } : {}}
          onClick={() => handleDecision(true)}
          disabled={answered !== null}
          className="py-7 rounded-2xl border border-[#6EE7B7]/20 bg-[#6EE7B7]/5 text-[#6EE7B7] font-black text-lg uppercase tracking-widest hover:border-[#6EE7B7]/60 hover:bg-[#6EE7B7]/10 transition-all disabled:opacity-30"
        >
          True
        </motion.button>
        <motion.button
          whileHover={answered === null ? { scale: 1.04 } : {}}
          whileTap={answered === null ? { scale: 0.95 } : {}}
          onClick={() => handleDecision(false)}
          disabled={answered !== null}
          className="py-7 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 font-black text-lg uppercase tracking-widest hover:border-red-500/60 hover:bg-red-500/10 transition-all disabled:opacity-30"
        >
          False
        </motion.button>
      </div>

      <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest mt-2">
        Abandon Storm
      </button>
    </div>
  );
}
