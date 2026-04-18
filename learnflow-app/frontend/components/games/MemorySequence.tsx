"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, RotateCcw, ArrowLeft } from "lucide-react";

type Phase = "COUNTDOWN" | "SHOW" | "INPUT" | "FEEDBACK" | "COMPLETE";

const GRID_SIZE = 9; // 3×3 grid
const ACCENT = "#96D1C7";

function buildSequence(level: number): number[] {
  const length = level + 2; // level 1 = 3 tiles, level 2 = 4, etc.
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(Math.floor(Math.random() * GRID_SIZE));
  }
  return seq;
}

export default function MemorySequence({ onExit }: { onExit: (score: number) => void }) {
  const [phase, setPhase] = useState<Phase>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [showIndex, setShowIndex] = useState(-1); // index currently lit in SHOW phase
  const [userInput, setUserInput] = useState<number[]>([]);
  const [activeTile, setActiveTile] = useState<number | null>(null); // user tap flash
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(3);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown
  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    if (countdown <= 0) {
      const seq = buildSequence(level);
      setSequence(seq);
      setPhase("SHOW");
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, level]);

  // Show sequence
  useEffect(() => {
    if (phase !== "SHOW") return;
    let i = 0;
    const showNext = () => {
      if (i < sequence.length) {
        setShowIndex(sequence[i]);
        i++;
        showTimerRef.current = setTimeout(() => {
          setShowIndex(-1);
          showTimerRef.current = setTimeout(showNext, 300);
        }, 600);
      } else {
        setShowIndex(-1);
        setUserInput([]);
        setPhase("INPUT");
      }
    };
    const initial = setTimeout(showNext, 600);
    return () => {
      clearTimeout(initial);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [phase, sequence]);

  const handleTileClick = useCallback((tileIdx: number) => {
    if (phase !== "INPUT") return;
    setActiveTile(tileIdx);
    setTimeout(() => setActiveTile(null), 200);

    const next = [...userInput, tileIdx];
    setUserInput(next);
    const pos = next.length - 1;

    if (next[pos] !== sequence[pos]) {
      // Wrong tile
      const newLives = lives - 1;
      setLives(newLives);
      setFeedback("wrong");
      setPhase("FEEDBACK");
      setTimeout(() => {
        setFeedback(null);
        if (newLives <= 0) {
          setPhase("COMPLETE");
        } else {
          // Replay same level
          const seq = buildSequence(level);
          setSequence(seq);
          setUserInput([]);
          setPhase("SHOW");
        }
      }, 1000);
      return;
    }

    if (next.length === sequence.length) {
      // Correct!
      const gained = level * 100;
      setScore(s => s + gained);
      setFeedback("correct");
      setPhase("FEEDBACK");
      setTimeout(() => {
        setFeedback(null);
        setLevel(l => l + 1);
        setPhase("COUNTDOWN");
        setCountdown(1);
      }, 900);
    }
  }, [phase, userInput, sequence, level, lives]);

  // ── Complete screen ──────────────────────────────────────────────────────
  if (phase === "COMPLETE") {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}>
            <Brain className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-black mb-1">Game Over</h2>
          <p className="text-[#9C948A] text-sm mb-8">You reached level {level} and ran out of lives.</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">Final Score</p>
            </div>
            <div className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{level}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">Max Level</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onExit(score)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#2E2B27] text-[#9C948A] text-xs font-bold uppercase tracking-widest hover:border-[#5F5854] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Hub
            </button>
            <button
              onClick={() => {
                setScore(0);
                setLevel(1);
                setLives(3);
                setUserInput([]);
                setCountdown(3);
                setPhase("COUNTDOWN");
              }}
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

  // ── HUD ──────────────────────────────────────────────────────────────────
  const progress = userInput.length / (sequence.length || 1);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6 select-none">
      {/* Top bar */}
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <button onClick={() => onExit(score)} className="p-2 text-[#5F5854] hover:text-[#F2EDE7] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            Level <span className="text-[#F2EDE7] font-black">{level}</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            Score <span className="font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ color: i < lives ? ACCENT : "#3A3530" }}>♥</span>
            ))}
          </span>
        </div>
      </div>

      {/* Status label */}
      <div className="mb-6 text-center min-h-[40px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "COUNTDOWN" && (
            <motion.div key="cd" initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="text-5xl font-black" style={{ color: ACCENT }}>
              {countdown || "Go!"}
            </motion.div>
          )}
          {phase === "SHOW" && (
            <motion.p key="show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[10px] uppercase tracking-widest text-[#9C948A]">
              Watch the sequence…
            </motion.p>
          )}
          {phase === "INPUT" && (
            <motion.p key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
              Repeat it — {userInput.length}/{sequence.length}
            </motion.p>
          )}
          {phase === "FEEDBACK" && (
            <motion.p key="fb" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
              className="text-lg font-black" style={{ color: feedback === "correct" ? ACCENT : "#F97316" }}>
              {feedback === "correct" ? `+${level * 100} pts` : `Wrong! ${lives} ${lives === 1 ? "life" : "lives"} left`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      {phase === "INPUT" && (
        <div className="w-full max-w-sm h-1 bg-[#2E2B27] rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: ACCENT }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
      )}
      {phase !== "INPUT" && <div className="h-7 mb-6" />}

      {/* 3×3 Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {Array.from({ length: GRID_SIZE }).map((_, i) => {
          const isLit = showIndex === i;
          const isActive = activeTile === i;
          const isFeedbackWrong = phase === "FEEDBACK" && feedback === "wrong";

          return (
            <motion.button
              key={i}
              animate={
                isLit
                  ? { scale: 1.06, backgroundColor: ACCENT }
                  : isFeedbackWrong && userInput[userInput.length - 1] === i
                  ? { scale: 1, backgroundColor: "#F97316" }
                  : isActive
                  ? { scale: 0.93, backgroundColor: `${ACCENT}60` }
                  : { scale: 1, backgroundColor: "#1C1A17" }
              }
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={() => handleTileClick(i)}
              className="aspect-square rounded-2xl border border-[#2E2B27] cursor-pointer min-h-[80px]"
              style={{ borderColor: isLit ? ACCENT : "#2E2B27" }}
              aria-label={`Tile ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
