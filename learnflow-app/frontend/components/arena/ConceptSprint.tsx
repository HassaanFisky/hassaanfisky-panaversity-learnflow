"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
// Assumes you have react-hot-toast installed from H3
// import toast from "react-hot-toast";

const CONCEPT_POOL = [
  { term: "Kafka", def: "Distributed Event Store" },
  { term: "Next.js", def: "React Framework for the Web" },
  { term: "FastAPI", def: "High-performance Python API Framework" },
  { term: "Vercel", def: "Frontend Cloud Edge Network" },
  { term: "Dapr", def: "Distributed Application Runtime" }
];

export default function ConceptSprint({ onExit }: { onExit: () => void }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentPool, setCurrentPool] = useState(CONCEPT_POOL);
  const [activeDef, setActiveDef] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);

  // Initialize game
  useEffect(() => {
    generateRound();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0; // Game over
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const generateRound = () => {
    // Pick random target
    const target = CONCEPT_POOL[Math.floor(Math.random() * CONCEPT_POOL.length)];
    setActiveDef(target.def);

    // Generate 3 random terms + target
    let ops = [target.term];
    while(ops.length < 4) {
      const rand = CONCEPT_POOL[Math.floor(Math.random() * CONCEPT_POOL.length)].term;
      if (!ops.includes(rand)) ops.push(rand);
    }
    setOptions(ops.sort(() => Math.random() - 0.5));
  };

  const attemptMatch = (selected: string) => {
    const isCorrect = CONCEPT_POOL.find(c => c.term === selected)?.def === activeDef;
    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      const points = 10 * (newCombo > 2 ? 2 : 1);
      setScore(s => s + points);
      // toast.success(`Correct! Combo x${newCombo}`, { style: { background: "#1C1A17", color: "#96D1C7" }});
      generateRound();
    } else {
      setCombo(0);
      // navigator.vibrate?.(200);
      // toast.error("Miss!", { style: { background: "#1C1A17", color: "#EF4444" }});
    }
  };

  if (timeLeft === 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h2 className="text-4xl font-bold mb-2">Sprint Over</h2>
        <p className="text-2xl text-[#E58A6D] mb-8">Score: {score}</p>
        <button onClick={onExit} className="px-6 py-2 bg-[#1C1A17] text-[#96D1C7] rounded-full border border-[#96D1C7]/30 hover:bg-[#96D1C7]/10 transition-colors">
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4">
      {/* HUD */}
      <div className="w-full flex justify-between items-end mb-12">
        <div className="flex flex-col">
          <span className="text-[#9C948A] text-sm uppercase tracking-widest">Time Remaining</span>
          <span className={`text-5xl font-black tabular-nums ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#F2EDE7]"}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[#9C948A] text-sm uppercase tracking-widest">Score</span>
          <span className="text-3xl font-bold text-[#E58A6D] tabular-nums">{score}</span>
        </div>
      </div>

      {combo > 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-1/4 flex items-center gap-2 text-[#96D1C7] font-black text-2xl tracking-widest drop-shadow-[0_0_10px_rgba(150,209,199,0.5)]"
        >
          <Zap className="fill-[#96D1C7]" /> COMBO x{combo}
        </motion.div>
      )}

      {/* Target Definition */}
      <div className="w-full bg-[#1C1A17] border border-[#2E2B27] min-h-[140px] rounded-3xl mb-8 flex flex-col items-center justify-center p-8 text-center shadow-[0_12px_48px_-8px_rgba(0,0,0,0.5)]">
        <span className="text-[#9C948A] text-xs uppercase tracking-widest mb-4 font-semibold">Match Definition</span>
        <h3 className="text-2xl font-bold leading-relaxed text-[#F2EDE7]">{activeDef}</h3>
      </div>

      {/* Answer Grid */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <AnimatePresence mode="popLayout">
          {options.map((opt) => (
            <motion.button
              key={opt}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => attemptMatch(opt)}
              className="py-6 px-4 bg-[#0B0F14] border border-[#2E2B27] rounded-2xl font-semibold text-lg text-[#F2EDE7] hover:border-[#96D1C7]/50 hover:bg-[#1C1A17] transition-colors"
            >
              {opt}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      
      <button onClick={onExit} className="mt-12 text-[#5F5854] hover:text-red-500 transition-colors uppercase tracking-widest text-xs">
        Abort Sprint
      </button>
    </div>
  );
}
