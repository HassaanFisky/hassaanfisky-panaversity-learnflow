"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Target, RotateCcw, ArrowLeft } from "lucide-react";

type Phase =
  | "COUNTDOWN"
  | "WAIT"
  | "ACTIVE"
  | "FEEDBACK"
  | "COMPLETE";

interface RoundResult {
  hit: boolean;
  reactionMs: number | null;
  points: number;
}

const TOTAL_ROUNDS = 10;
const BASE_WINDOW = 2400; // ms to click before auto-miss (round 1)
const MIN_WINDOW = 1100;  // minimum window (reached by round 10)

export default function ReactionBlitz({
  onExit,
}: {
  onExit: (score: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [targetSize, setTargetSize] = useState(72);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackColor, setFeedbackColor] = useState("#96D1C7");

  const showTimeRef = useRef<number>(0);
  const missTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundRef = useRef(0);

  // Keep roundRef in sync
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  // Countdown phase
  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    if (countdown <= 0) {
      setPhase("WAIT");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const triggerTarget = useCallback((currentRound: number) => {
    const x = 12 + Math.random() * 76;
    const y = 18 + Math.random() * 64;
    const size = Math.max(46, 72 - currentRound * 2.5);
    const window = Math.max(MIN_WINDOW, BASE_WINDOW - currentRound * 140);

    setTargetPos({ x, y });
    setTargetSize(size);
    showTimeRef.current = Date.now();
    setPhase("ACTIVE");

    missTimerRef.current = setTimeout(() => {
      // Only trigger miss if still in ACTIVE phase for this round
      setPhase((p) => {
        if (p === "ACTIVE") {
          // Record miss
          setResults((prev) => [
            ...prev,
            { hit: false, reactionMs: null, points: 0 },
          ]);
          setFeedbackText("MISS");
          setFeedbackColor("#EF4444");
          return "FEEDBACK";
        }
        return p;
      });
    }, window);
  }, []);

  const scheduleNextRound = useCallback((nextRound: number) => {
    if (nextRound > TOTAL_ROUNDS) {
      setPhase("COMPLETE");
      return;
    }
    setPhase("WAIT");
    const delay = 600 + Math.random() * 1400;
    waitTimerRef.current = setTimeout(() => {
      setRound(nextRound);
      triggerTarget(nextRound);
    }, delay);
  }, [triggerTarget]);

  // After feedback, move to next round
  useEffect(() => {
    if (phase !== "FEEDBACK") return;
    const t = setTimeout(() => {
      scheduleNextRound(roundRef.current + 1);
    }, 700);
    return () => clearTimeout(t);
  }, [phase, scheduleNextRound]);

  // Kick off round 1 when entering WAIT at round 0
  useEffect(() => {
    if (phase === "WAIT" && round === 0) {
      scheduleNextRound(1);
    }
  }, [phase, round, scheduleNextRound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (missTimerRef.current) clearTimeout(missTimerRef.current);
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    };
  }, []);

  const handleHit = useCallback(() => {
    if (phase !== "ACTIVE") return;
    if (missTimerRef.current) clearTimeout(missTimerRef.current);

    const reactionMs = Date.now() - showTimeRef.current;
    const points = Math.max(0, Math.round(2200 - reactionMs));

    setScore((s) => s + points);
    setResults((prev) => [...prev, { hit: true, reactionMs, points }]);

    if (reactionMs < 180) {
      setFeedbackText("INSTANT!");
      setFeedbackColor("#FFD700");
    } else if (reactionMs < 300) {
      setFeedbackText("LIGHTNING!");
      setFeedbackColor("#E58A6D");
    } else if (reactionMs < 500) {
      setFeedbackText("FAST!");
      setFeedbackColor("#96D1C7");
    } else {
      setFeedbackText("GOOD");
      setFeedbackColor("#9B8FFF");
    }
    setPhase("FEEDBACK");
  }, [phase]);

  const reset = () => {
    if (missTimerRef.current) clearTimeout(missTimerRef.current);
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    setPhase("COUNTDOWN");
    setCountdown(3);
    setRound(0);
    setScore(0);
    setResults([]);
  };

  // ── COMPLETE screen ──
  if (phase === "COMPLETE") {
    const hits = results.filter((r) => r.hit);
    const avgMs =
      hits.length > 0
        ? Math.round(hits.reduce((a, b) => a + (b.reactionMs ?? 0), 0) / hits.length)
        : 0;
    const accuracy = Math.round((hits.length / TOTAL_ROUNDS) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: "rgba(229,138,109,0.1)",
              border: "1px solid rgba(229,138,109,0.3)",
            }}
          >
            <Zap className="w-8 h-8 text-[#E58A6D]" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Reaction Blitz</h2>
          <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">
            Complete
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Score", value: score.toLocaleString(), color: "#E58A6D" },
              { label: "Avg React", value: `${avgMs}ms`, color: "#96D1C7" },
              { label: "Accuracy", value: `${accuracy}%`, color: "#F2EDE7" },
              {
                label: "Best Hit",
                value: hits.length > 0
                  ? `${Math.min(...hits.map((h) => h.reactionMs ?? 9999))}ms`
                  : "—",
                color: "#9B8FFF",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0B0F14] rounded-2xl p-4">
                <p className="text-[#5F5854] text-[9px] uppercase tracking-widest mb-1">
                  {label}
                </p>
                <p
                  className="text-2xl font-black tabular-nums"
                  style={{ color }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Round dots */}
          <div className="flex justify-center gap-1.5 mb-8">
            {results.map((r, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: r.hit ? "#96D1C7" : "#EF4444" }}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onExit(score)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] hover:border-[#E58A6D]/40 hover:text-[#F2EDE7] transition-colors text-xs"
            >
              <ArrowLeft className="w-3 h-3" />
              Hub
            </button>
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#E58A6D] text-[#0B0F14] font-bold hover:bg-[#FFB088] transition-colors text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── GAME screen ──
  return (
    <div
      className="min-h-screen relative overflow-hidden select-none"
      onClick={phase === "ACTIVE" ? handleHit : undefined}
      style={{ cursor: phase === "ACTIVE" ? "crosshair" : "default" }}
    >
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-5 z-20">
        <button
          onClick={() => onExit(score)}
          className="text-[#3A3530] hover:text-[#9C948A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Round</p>
            <p className="text-lg font-bold tabular-nums">
              {Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-lg font-bold tabular-nums text-[#E58A6D]">
              {score.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="w-4" />
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {phase === "COUNTDOWN" && (
          <motion.div
            key={`cd-${countdown}`}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-30"
          >
            <p className="text-[120px] font-black leading-none text-[#E58A6D]">
              {countdown > 0 ? countdown : "GO"}
            </p>
            {countdown > 0 && (
              <p className="text-[#9C948A] text-sm mt-2">
                Click the target as fast as possible
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wait state hint */}
      {phase === "WAIT" && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          >
            <Target className="w-8 h-8 text-[#2E2B27]" />
          </motion.div>
        </div>
      )}

      {/* Target */}
      <AnimatePresence>
        {phase === "ACTIVE" && (
          <motion.div
            key={`target-${round}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute rounded-full z-20 cursor-crosshair"
            onClick={handleHit}
            style={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              width: targetSize,
              height: targetSize,
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(circle at 35% 35%, #FFB088, #E58A6D 55%, #C86B45)",
              boxShadow: `0 0 ${targetSize / 2}px rgba(229,138,109,0.55), 0 0 ${targetSize}px rgba(229,138,109,0.2)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Feedback text */}
      <AnimatePresence>
        {phase === "FEEDBACK" && (
          <motion.div
            key={feedbackText}
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1.1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          >
            <p
              className="text-5xl font-black tracking-widest"
              style={{ color: feedbackColor }}
            >
              {feedbackText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round progress dots at bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              background:
                i < results.length
                  ? results[i].hit
                    ? "#96D1C7"
                    : "#EF4444"
                  : i === round - 1
                  ? "#E58A6D"
                  : "#2E2B27",
              transform: i === round - 1 ? "scale(1.3)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
