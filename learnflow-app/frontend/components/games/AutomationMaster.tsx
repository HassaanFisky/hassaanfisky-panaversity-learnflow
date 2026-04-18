"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Workflow, Play, X, ChevronRight, Sparkles } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#FB923C";
const GAME_ID = "automationmaster" as const;

type OpId = "FILTER" | "MAP" | "SORT" | "REDUCE" | "UPPERCASE" | "LOWERCASE" | "LIMIT" | "REVERSE";

interface Op {
  id: OpId;
  label: string;
  description: string;
  color: string;
}

const OPS: Record<OpId, Op> = {
  FILTER:    { id: "FILTER",    label: "FILTER",    description: "Keep items matching a condition", color: "#7CB9E8" },
  MAP:       { id: "MAP",       label: "MAP",        description: "Transform each item",              color: "#A78BFA" },
  SORT:      { id: "SORT",      label: "SORT",       description: "Order items",                      color: "#FBBF24" },
  REDUCE:    { id: "REDUCE",    label: "REDUCE",     description: "Aggregate to single value",         color: "#F97316" },
  UPPERCASE: { id: "UPPERCASE", label: "UPPERCASE",  description: "Make strings upper case",           color: "#F472B6" },
  LOWERCASE: { id: "LOWERCASE", label: "LOWERCASE",  description: "Make strings lower case",           color: "#22D3EE" },
  LIMIT:     { id: "LIMIT",     label: "LIMIT",      description: "Take first N items",               color: "#A3E635" },
  REVERSE:   { id: "REVERSE",   label: "REVERSE",    description: "Reverse item order",               color: "#818CF8" },
};

interface Challenge {
  title: string;
  inputLabel: string;
  outputLabel: string;
  solution: OpId[];
  description: string;
}

const CHALLENGES: Challenge[] = [
  {
    title: "Extract Names",
    inputLabel: `[{name:"Alice",age:17},{name:"Bob",age:22},{name:"Carol",age:19}]`,
    outputLabel: `["BOB","CAROL"]`,
    solution: ["FILTER", "MAP", "UPPERCASE"],
    description: "Keep adults (age ≥ 18), extract names, then uppercase them.",
  },
  {
    title: "Top Scores",
    inputLabel: `[85, 42, 91, 67, 55, 78, 93]`,
    outputLabel: `[93, 91, 85]`,
    solution: ["SORT", "LIMIT"],
    description: "Sort scores descending, then take the top 3.",
  },
  {
    title: "Sum Filtered Values",
    inputLabel: `[10, 25, 3, 48, 12, 7, 30]`,
    outputLabel: `148`,
    solution: ["FILTER", "REDUCE"],
    description: "Keep values above 10, then sum them all.",
  },
  {
    title: "Normalize & Sort",
    inputLabel: `["ALPHA","beta","GAMMA","delta"]`,
    outputLabel: `["alpha","beta","delta","gamma"]`,
    solution: ["LOWERCASE", "SORT"],
    description: "Lowercase all strings, then sort alphabetically.",
  },
  {
    title: "Recent Items Reversed",
    inputLabel: `["Jan","Feb","Mar","Apr","May","Jun"]`,
    outputLabel: `["Mar","Feb","Jan"]`,
    solution: ["LIMIT", "REVERSE"],
    description: "Take the first 3 months, then reverse the order.",
  },
];

const ONBOARDING_STEPS = [
  {
    title: "Input to Output",
    body: "Each challenge shows input data and the desired output. Your job: chain the right operations to transform one into the other.",
    icon: Workflow,
  },
  {
    title: "Build the Pipeline",
    body: "Click operation chips from the palette to add them to your pipeline in order. Click a placed op to remove it.",
    icon: ChevronRight,
  },
  {
    title: "Run It",
    body: "Press Run to simulate your pipeline. If the output matches, you earn points. Fewer operations = efficiency bonus.",
    icon: Play,
  },
  {
    title: "Think Functionally",
    body: "Operations are applied left to right. FILTER before MAP. SORT before LIMIT. Order matters as much as selection.",
    icon: Sparkles,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "RESULT" | "COMPLETE";

export default function AutomationMaster({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [challengeIndex, setChallengeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [pipeline, setPipeline] = useState<OpId[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastPoints, setLastPoints] = useState(0);

  const challenge = CHALLENGES[challengeIndex];

  const addOp = useCallback((op: OpId) => {
    if (pipeline.length >= 6) return;
    setPipeline(p => [...p, op]);
  }, [pipeline]);

  const removeOp = useCallback((idx: number) => {
    setPipeline(p => p.filter((_, i) => i !== idx));
  }, []);

  const run = useCallback(() => {
    const sol = challenge.solution;
    const correct = pipeline.length === sol.length && pipeline.every((op, i) => op === sol[i]);
    const efficiencyBonus = correct ? Math.max(0, (6 - pipeline.length) * 30) : 0;
    const pts = correct ? 200 + efficiencyBonus : 0;

    setLastCorrect(correct);
    setLastPoints(pts);
    setScore(s => s + pts);
    setPhase("RESULT");
  }, [pipeline, challenge]);

  const next = () => {
    const nextIdx = challengeIndex + 1;
    if (nextIdx >= CHALLENGES.length) {
      setPhase("COMPLETE");
    } else {
      setChallengeIndex(nextIdx);
      setPipeline([]);
      setLastCorrect(null);
      setPhase("PLAYING");
    }
  };

  const reset = () => {
    setChallengeIndex(0);
    setScore(0);
    setPipeline([]);
    setLastCorrect(null);
    setPhase("PLAYING");
  };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Automation Master" />
    </div>
  );

  if (phase === "COMPLETE") return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
          <Workflow className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Automation Master</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">All challenges solved</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Challenges", value: `${CHALLENGES.length}/${CHALLENGES.length}`, color: "#96D1C7" },
            { label: "Last Result", value: lastCorrect ? "Correct" : "Miss", color: lastCorrect ? "#6EE7B7" : "#EF4444" },
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
          <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (phase === "RESULT") return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8">
        <div className="text-center mb-6">
          <p className="text-3xl font-black mb-2" style={{ color: lastCorrect ? "#6EE7B7" : "#EF4444" }}>
            {lastCorrect ? "Pipeline Works!" : "Wrong Output"}
          </p>
          {lastPoints > 0 && (
            <p className="text-xl font-black tabular-nums" style={{ color: ACCENT }}>+{lastPoints} pts</p>
          )}
        </div>

        <div className="bg-[#0B0F14] rounded-2xl p-4 mb-4 font-mono text-xs">
          <p className="text-[#5F5854] mb-2 not-italic text-[9px] uppercase tracking-widest">Correct pipeline:</p>
          <div className="flex flex-wrap gap-1.5">
            {challenge.solution.map((op, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: `${OPS[op].color}20`, color: OPS[op].color }}>
                  {op}
                </span>
                {i < challenge.solution.length - 1 && <span className="text-[#3A3530]">→</span>}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#5F5854] mb-6 leading-relaxed">{challenge.description}</p>

        <div className="flex gap-3">
          <button onClick={() => onExit(score)} className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">Exit</button>
          {!lastCorrect && (
            <button onClick={() => { setPipeline([]); setPhase("PLAYING"); }}
              className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">
              Retry
            </button>
          )}
          <button onClick={next} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
            {challengeIndex + 1 >= CHALLENGES.length ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17]">
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Challenge</p>
            <p className="text-sm font-bold">{challengeIndex + 1}/{CHALLENGES.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-4" />
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-5">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854]">{challenge.title}</p>

        {/* I/O display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-[#5F5854] mb-2">Input</p>
            <p className="font-mono text-[10px] text-[#9C948A] leading-relaxed break-all">{challenge.inputLabel}</p>
          </div>
          <div className="bg-[#1C1A17] border rounded-2xl p-3" style={{ borderColor: `${ACCENT}40` }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Desired Output</p>
            <p className="font-mono text-[10px] leading-relaxed break-all" style={{ color: ACCENT }}>{challenge.outputLabel}</p>
          </div>
        </div>

        {/* Pipeline builder */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">Your Pipeline</p>
          <div className="flex flex-wrap items-center gap-2 min-h-[52px] p-3 bg-[#1C1A17] border border-[#2E2B27] rounded-2xl">
            <AnimatePresence>
              {pipeline.map((op, i) => (
                <motion.div key={`${op}-${i}`}
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1">
                  <button
                    onClick={() => removeOp(i)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-70"
                    style={{ background: `${OPS[op].color}20`, color: OPS[op].color, border: `1px solid ${OPS[op].color}40` }}
                  >
                    {op}
                    <X className="w-2.5 h-2.5" />
                  </button>
                  {i < pipeline.length - 1 && <span className="text-[#3A3530] text-xs">→</span>}
                </motion.div>
              ))}
            </AnimatePresence>
            {pipeline.length === 0 && (
              <p className="text-[#3A3530] text-xs">Click operations below to build your pipeline</p>
            )}
          </div>
        </div>

        {/* Op palette */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">Operations</p>
          <div className="flex flex-wrap gap-2">
            {Object.values(OPS).map(op => (
              <motion.button
                key={op.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => addOp(op.id)}
                disabled={pipeline.length >= 6}
                className="px-3 py-2 rounded-xl border text-[10px] font-bold transition-all min-h-[44px] disabled:opacity-40"
                style={{ background: `${op.color}12`, borderColor: `${op.color}40`, color: op.color }}
              >
                {op.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Run */}
        <button
          onClick={run}
          disabled={pipeline.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: ACCENT, color: "#0B0F14" }}
        >
          <Play className="w-4 h-4" /> Run Pipeline
        </button>
      </div>
    </div>
  );
}
