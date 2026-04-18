"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, GitBranch, Layers, Clock, Zap } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";
import type { DifficultyTier } from "./engine/gameTypes";

const ACCENT = "#7CB9E8";
const GAME_ID = "logicbuilder" as const;

interface PipelineLevel {
  goal: string[];
  pool: string[];
  timeLimit: number;
}

const LEVELS: Record<DifficultyTier, PipelineLevel[]> = {
  ENTRY: [
    { goal: ["Receive", "Validate", "Process", "Store"], pool: ["Receive", "Store", "Process", "Validate", "Transform", "Log", "Retry", "Cache"], timeLimit: 90 },
    { goal: ["Connect", "Authenticate", "Fetch", "Return"], pool: ["Connect", "Return", "Fetch", "Authenticate", "Encrypt", "Compress", "Retry", "Decode"], timeLimit: 90 },
    { goal: ["Parse", "Filter", "Map", "Output"], pool: ["Parse", "Output", "Map", "Filter", "Sort", "Reduce", "Flatten", "Group"], timeLimit: 90 },
  ],
  SKILLED: [
    { goal: ["Ingest", "Sanitize", "Enrich", "Deduplicate", "Persist", "Notify"], pool: ["Ingest", "Persist", "Notify", "Sanitize", "Enrich", "Deduplicate", "Compress", "Archive", "Index", "Shard"], timeLimit: 75 },
    { goal: ["Init", "Connect", "Authorize", "Subscribe", "Listen", "Acknowledge"], pool: ["Init", "Acknowledge", "Listen", "Connect", "Subscribe", "Authorize", "Retry", "Disconnect", "Heartbeat", "Flush"], timeLimit: 75 },
  ],
  MASTER: [
    { goal: ["Bootstrap", "Negotiate", "Authenticate", "Discover", "Register", "Handshake", "Stream", "Terminate"], pool: ["Bootstrap", "Terminate", "Stream", "Negotiate", "Authenticate", "Discover", "Register", "Handshake", "Reconnect", "Heartbeat", "Flush", "Compress"], timeLimit: 60 },
    { goal: ["Load", "Validate", "Transform", "Merge", "Deduplicate", "Aggregate", "Publish", "Audit"], pool: ["Load", "Audit", "Publish", "Validate", "Transform", "Merge", "Deduplicate", "Aggregate", "Archive", "Snapshot", "Rollback", "Version"], timeLimit: 60 },
  ],
};

const ONBOARDING_STEPS = [
  {
    title: "Build the Pipeline",
    body: "A target pipeline appears at the top showing the correct step order. Your job is to reconstruct it.",
    icon: GitBranch,
  },
  {
    title: "Click to Place",
    body: "Tap any block from the pool below to place it in the next open pipeline slot. The pool contains extra decoy steps.",
    icon: Layers,
  },
  {
    title: "Order Is Everything",
    body: "Each step must match the target sequence exactly. A wrong placement flashes red and costs 50 points.",
    icon: Zap,
  },
  {
    title: "Beat the Clock",
    body: "Each level has a time limit. Correct placements earn 100 points plus a speed bonus from time remaining.",
    icon: Clock,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "LEVEL_COMPLETE" | "COMPLETE";

export default function LogicBuilder({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const difficulty = GameEngine.getDifficultyForGame(gameState, GAME_ID);
  const levels = LEVELS[difficulty];

  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(levels[0].timeLimit);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [stateRef, setStateRef] = useState(gameState);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLevel = levels[Math.min(levelIndex, levels.length - 1)];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("LEVEL_COMPLETE");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (phase === "PLAYING") {
      setPlaced([]);
      setTimeLeft(currentLevel.timeLimit);
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, levelIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlace = useCallback((block: string) => {
    if (phase !== "PLAYING") return;
    const idx = placed.length;
    const expected = currentLevel.goal[idx];

    if (block === expected) {
      const newPlaced = [...placed, block];
      setPlaced(newPlaced);
      setFeedback({ text: "Correct!", ok: true });
      setTimeout(() => setFeedback(null), 600);

      if (newPlaced.length === currentLevel.goal.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        const timeBonus = timeLeft * 2;
        const levelScore = currentLevel.goal.length * 100 + timeBonus;
        setScore((s) => s + levelScore);
        setPhase("LEVEL_COMPLETE");
      }
    } else {
      setScore((s) => Math.max(0, s - 50));
      setWrongFlash(true);
      setFeedback({ text: "Wrong order", ok: false });
      setTimeout(() => { setWrongFlash(false); setFeedback(null); }, 700);
    }
  }, [phase, placed, currentLevel, timeLeft]);

  const nextLevel = () => {
    const next = levelIndex + 1;
    if (next >= levels.length) {
      setPhase("COMPLETE");
    } else {
      setLevelIndex(next);
      setPhase("PLAYING");
    }
  };

  const reset = () => {
    setLevelIndex(0);
    setScore(0);
    setPlaced([]);
    setPhase("PLAYING");
  };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  // Shuffle pool display (stable per level)
  const shuffledPool = useCallback(() => {
    const pool = [...currentLevel.pool];
    // deterministic shuffle based on level index
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (i * 7 + levelIndex * 3) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }, [currentLevel, levelIndex]);

  const availablePool = shuffledPool().filter((b) => !placed.includes(b) || currentLevel.pool.filter(x => x === b).length > currentLevel.goal.filter(x => x === b).length);

  const timerPct = (timeLeft / currentLevel.timeLimit) * 100;
  const timerColor = timerPct > 50 ? ACCENT : timerPct > 25 ? "#FBBF24" : "#EF4444";

  if (phase === "ONBOARDING") {
    return (
      <div className="min-h-screen bg-[#0B0F14]">
        <GameOnboarding
          steps={ONBOARDING_STEPS}
          onComplete={handleOnboardingComplete}
          accentColor={ACCENT}
          gameName="Logic Builder"
        />
      </div>
    );
  }

  if (phase === "COMPLETE") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4"
      >
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
            <GitBranch className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Logic Builder</h2>
          <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">All levels complete</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Final Score", value: score.toLocaleString(), color: ACCENT },
              { label: "Levels", value: `${levels.length}/${levels.length}`, color: "#96D1C7" },
              { label: "Difficulty", value: difficulty, color: "#9B8FFF" },
              { label: "XP Earned", value: `+${Math.floor(score * 0.4)}`, color: "#F2EDE7" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0B0F14] rounded-2xl p-4">
                <p className="text-[#5F5854] text-[9px] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => onExit(score)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] hover:border-[#7CB9E8]/40 hover:text-[#F2EDE7] transition-colors text-xs">
              <ArrowLeft className="w-3 h-3" /> Hub
            </button>
            <button onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
              style={{ background: ACCENT, color: "#0B0F14" }}>
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (phase === "LEVEL_COMPLETE") {
    const levelScore = placed.length === currentLevel.goal.length
      ? placed.length * 100 + timeLeft * 2
      : placed.length * 100;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-2" style={{ color: ACCENT }}>
            Level {levelIndex + 1} Complete
          </p>
          <h3 className="text-3xl font-black text-[#F2EDE7] mb-1 tabular-nums">{score.toLocaleString()}</h3>
          <p className="text-[#5F5854] text-xs mb-8">Total score so far</p>
          <div className="flex gap-3">
            <button onClick={() => onExit(score)}
              className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">
              Exit
            </button>
            <button onClick={nextLevel}
              className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
              style={{ background: ACCENT, color: "#0B0F14" }}>
              {levelIndex + 1 >= levels.length ? "Finish" : "Next Level →"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col">
      {/* HUD */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17]">
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit game">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Level</p>
            <p className="text-sm font-bold tabular-nums">{levelIndex + 1}/{levels.length}</p>
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

      {/* Timer bar */}
      <div className="h-0.5 bg-[#1C1A17]">
        <motion.div
          className="h-full transition-colors duration-300"
          style={{ width: `${timerPct}%`, background: timerColor }}
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-8 max-w-2xl mx-auto w-full">
        {/* Target pipeline */}
        <div className="w-full">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3 text-center">Target Pipeline</p>
          <div className="flex flex-wrap justify-center gap-2">
            {currentLevel.goal.map((step, i) => {
              const isPlaced = i < placed.length;
              const isCorrect = placed[i] === step;
              return (
                <div key={`${i}-${step}`} className="flex items-center gap-1">
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300"
                    style={{
                      background: isPlaced ? (isCorrect ? `${ACCENT}20` : "#EF444420") : "#1C1A17",
                      borderColor: isPlaced ? (isCorrect ? ACCENT : "#EF4444") : "#2E2B27",
                      color: isPlaced ? (isCorrect ? ACCENT : "#EF4444") : "#5F5854",
                    }}
                  >
                    {isPlaced ? placed[i] : step}
                  </div>
                  {i < currentLevel.goal.length - 1 && (
                    <span className="text-[#2E2B27] text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-bold"
              style={{ color: feedback.ok ? ACCENT : "#EF4444" }}
            >
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Block pool */}
        <div className="w-full">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3 text-center">
            Select the next step
          </p>
          <motion.div
            className="flex flex-wrap justify-center gap-2"
            animate={wrongFlash ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.35 }}
          >
            {availablePool.map((block, i) => (
              <motion.button
                key={`${block}-${i}`}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handlePlace(block)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[#2E2B27] bg-[#1C1A17] text-[#F2EDE7] hover:border-[#7CB9E8]/40 transition-all min-w-[44px] min-h-[44px]"
              >
                {block}
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Progress indicator */}
        <p className="text-[#5F5854] text-xs tabular-nums">
          {placed.length} / {currentLevel.goal.length} steps placed
        </p>
      </div>
    </div>
  );
}
