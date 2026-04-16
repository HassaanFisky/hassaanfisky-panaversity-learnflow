"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Trophy, ArrowRight } from "lucide-react";

const QUESTIONS = [
  { q: "What is a 'closure' in programming?", a: "A function that captures its surrounding scope", opts: ["A function that captures its surrounding scope", "A database lock", "A CSS selector", "A type of loop"] },
  { q: "What does 'idempotent' mean in HTTP?", a: "Repeated calls produce the same result", opts: ["Repeated calls produce the same result", "The request is encrypted", "The response is cached", "The server is stateless"] },
  { q: "What is 'memoization'?", a: "Caching function results based on inputs", opts: ["Caching function results based on inputs", "Storing user preferences", "A type of database index", "A React hook"] },
  { q: "What is a 'race condition'?", a: "Behavior dependent on uncontrolled event timing", opts: ["Behavior dependent on uncontrolled event timing", "A fast database query", "A parallel rendering issue", "A network timeout"] },
  { q: "What does 'idiomatic' code mean?", a: "Code that follows language-specific conventions", opts: ["Code that follows language-specific conventions", "Code without comments", "Minimal code", "Code that uses recursion"] },
  { q: "What is 'sharding' in databases?", a: "Splitting a database horizontally across machines", opts: ["Splitting a database horizontally across machines", "Encrypting data at rest", "Creating database backups", "Indexing all columns"] },
  { q: "What is 'eventual consistency'?", a: "All nodes converge to the same state over time", opts: ["All nodes converge to the same state over time", "Every write is immediately visible", "Data is never lost", "Writes are batched"] },
  { q: "What is a 'deadlock'?", a: "Two processes waiting on each other indefinitely", opts: ["Two processes waiting on each other indefinitely", "A crashed server", "A slow query", "A circular import"] },
];

const STORAGE_KEY = "flux_memory_ghost_run";
const TIME_PER_Q = 15; // seconds

interface GhostRun {
  answers: { qIndex: number; timeUsed: number; correct: boolean }[];
  totalScore: number;
  date: string;
}

export default function MemoryGhost({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [ghostRun, setGhostRun] = useState<GhostRun | null>(null);
  const [currentRun, setCurrentRun] = useState<GhostRun["answers"]>([]);
  const [ghostBeat, setGhostBeat] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = QUESTIONS[qIndex];

  // Load previous ghost run
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setGhostRun(JSON.parse(saved));
    } catch {}
  }, []);

  const startGame = () => {
    setQIndex(0);
    setScore(0);
    setTimeLeft(TIME_PER_Q);
    setSelected(null);
    setIsCorrect(null);
    setCurrentRun([]);
    setGhostBeat(false);
    startTimeRef.current = Date.now();
    setPhase("playing");
  };

  // Countdown
  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    setTimeLeft(TIME_PER_Q);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAnswer(null); // timed out
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIndex, phase]);

  const handleAnswer = (opt: string | null) => {
    if (selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = opt !== null && opt === q.a;
    const timeUsed = Math.min(TIME_PER_Q, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setSelected(opt ?? "");
    setIsCorrect(correct);

    const record = { qIndex, timeUsed, correct };
    const newRun = [...currentRun, record];
    setCurrentRun(newRun);

    if (correct) {
      const basePoints = 100;
      const speedBonus = Math.round(((TIME_PER_Q - timeUsed) / TIME_PER_Q) * 60);
      setScore((s) => s + basePoints + speedBonus);
    }

    setTimeout(() => {
      if (qIndex + 1 >= QUESTIONS.length) {
        // Save run
        const finalScore = score + (correct ? 100 + Math.round(((TIME_PER_Q - timeUsed) / TIME_PER_Q) * 60) : 0);
        const runData: GhostRun = { answers: newRun, totalScore: finalScore, date: new Date().toISOString() };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runData)); } catch {}
        if (ghostRun && finalScore > ghostRun.totalScore) setGhostBeat(true);
        setPhase("done");
      } else {
        setQIndex((i) => i + 1);
        setSelected(null);
        setIsCorrect(null);
      }
    }, 900);
  };

  const ghostAnswer = ghostRun?.answers[qIndex];
  const ghostAheadOnThis = ghostAnswer?.correct && !isCorrect;

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 text-center max-w-sm px-4"
      >
        <div className="relative w-20 h-20 rounded-2xl border border-[#9C948A]/30 bg-[#1C1A17] flex items-center justify-center">
          <Ghost size={36} className="text-[#9C948A]" />
          {ghostRun && (
            <div className="absolute -top-2 -right-2 bg-[#E58A6D] text-[#0B0F14] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Ghost Loaded
            </div>
          )}
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Memory Ghost</h2>
          <p className="text-[#9C948A] text-sm leading-relaxed max-w-xs">
            {ghostRun
              ? `Your ghost scored ${ghostRun.totalScore} pts. Can you beat it? The ghost replays your past decisions in real time.`
              : "No ghost on record yet. Play now to set your first ghost run. Your next attempt will compete against it."}
          </p>
        </div>
        {ghostRun && (
          <div className="w-full bg-[#1C1A17] border border-[#9C948A]/20 rounded-2xl p-5 flex items-center gap-4">
            <Ghost size={20} className="text-[#9C948A] opacity-50 shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-xs font-black uppercase tracking-widest text-[#9C948A]">Ghost Record</div>
              <div className="text-lg font-black text-[#F2EDE7]">{ghostRun.totalScore} pts</div>
            </div>
            <div className="text-[9px] text-[#5F5854] uppercase tracking-wider">
              {new Date(ghostRun.date).toLocaleDateString()}
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 text-center w-full">
          {[["8", "Questions"], ["15s", "Per question"], ["Speed bonus", "Scoring"]].map(([v, l]) => (
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
          {ghostRun ? "Challenge Ghost" : "Set First Ghost"}
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
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#9C948A] mb-2">Run Complete</div>
          <h2 className="text-4xl font-bold">{ghostBeat ? "Ghost Defeated!" : "Run Saved"}</h2>
        </div>

        <AnimatePresence>
          {ghostBeat && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#E58A6D]/10 border border-[#E58A6D]/30"
            >
              <Trophy size={16} className="text-[#E58A6D]" />
              <span className="text-sm font-black text-[#E58A6D] uppercase tracking-widest">New Personal Best!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4">
          <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl px-8 py-6 flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest text-[#9C948A]">Your Score</span>
            <span className="text-4xl font-black text-[#E58A6D]">{score}</span>
          </div>
          {ghostRun && (
            <div className="bg-[#1C1A17] border border-[#9C948A]/20 rounded-3xl px-8 py-6 flex flex-col items-center gap-1 opacity-60">
              <span className="text-[9px] uppercase tracking-widest text-[#9C948A] flex items-center gap-1"><Ghost size={10} /> Ghost</span>
              <span className="text-4xl font-black text-[#9C948A]">{ghostRun.totalScore}</span>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={startGame}
            className="px-6 py-3 bg-[#1C1A17] border border-[#E58A6D]/30 text-[#E58A6D] rounded-xl text-xs uppercase tracking-widest font-bold hover:border-[#E58A6D] transition-colors"
          >
            Challenge Again
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

  return (
    <div className="flex flex-col items-center w-full max-w-2xl gap-6 px-4">
      {/* HUD */}
      <div className="w-full flex justify-between items-center">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Question</span>
          <span className="text-xl font-black text-[#F2EDE7]">{qIndex + 1} / {QUESTIONS.length}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-0.5">Time</span>
          <span className={`text-3xl font-black tabular-nums ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-[#F2EDE7]"}`}>{timeLeft}s</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Score</span>
          <motion.span key={score} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.2 }} className="text-2xl font-black text-[#E58A6D]">
            {score}
          </motion.span>
        </div>
      </div>

      {/* Ghost status for this round */}
      {ghostRun && ghostAnswer && (
        <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-[#9C948A]/15 bg-[#1C1A17]/60">
          <div className="flex items-center gap-2 text-[#9C948A] opacity-50">
            <Ghost size={12} />
            <span className="text-[9px] uppercase tracking-widest font-bold">Ghost</span>
          </div>
          <span className="text-[10px] text-[#9C948A] opacity-50">
            {ghostAnswer.correct ? `answered in ${ghostAnswer.timeUsed}s` : "missed this one"}
          </span>
          {ghostAheadOnThis && selected && (
            <span className="text-[9px] text-[#9C948A] font-black uppercase tracking-wider">Ghost ahead</span>
          )}
        </div>
      )}

      {/* Timer bar */}
      <div className="w-full h-0.5 bg-[#1C1A17] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#E58A6D] rounded-full"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: TIME_PER_Q, ease: "linear" }}
          key={qIndex}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.18 }}
          className="w-full bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center min-h-[110px] flex flex-col items-center justify-center"
        >
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#9C948A] mb-3 block">Question</span>
          <h3 className="text-xl font-bold text-[#F2EDE7] leading-snug">{q.q}</h3>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {q.opts.map((opt) => {
          const picked = selected === opt;
          const isRight = opt === q.a;
          let cls = "border-[#2E2B27] bg-[#0B0F14] hover:border-[#E58A6D]/40 hover:bg-[#1C1A17]";
          if (selected) {
            if (picked && isCorrect) cls = "border-[#6EE7B7] bg-[#6EE7B7]/10";
            else if (picked && !isCorrect) cls = "border-red-500 bg-red-500/10";
            else if (!picked && isRight && !isCorrect) cls = "border-[#6EE7B7]/40 bg-[#6EE7B7]/5";
          }
          // Ghost indicator
          const isGhostAnswer = ghostAnswer && QUESTIONS[qIndex]?.opts[
            QUESTIONS[qIndex].opts.indexOf(opt)
          ] === opt && ghostAnswer.correct && isRight;

          return (
            <motion.button
              key={opt}
              whileHover={!selected ? { scale: 1.02 } : {}}
              whileTap={!selected ? { scale: 0.97 } : {}}
              onClick={() => handleAnswer(opt)}
              className={`py-5 px-5 border rounded-2xl text-sm font-semibold text-[#F2EDE7] transition-all duration-200 text-left relative ${cls}`}
            >
              {opt}
              {isGhostAnswer && !selected && (
                <span className="absolute top-2 right-3 flex items-center gap-1 text-[8px] uppercase tracking-wider text-[#9C948A] opacity-40">
                  <Ghost size={8} /> ghost
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest mt-2">
        Exit Ghost Mode
      </button>
    </div>
  );
}
