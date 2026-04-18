"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Code2, Zap, Database, Scale, Brain } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#6EE7B7";
const GAME_ID = "codestrategist" as const;

type Constraint = "Optimize: Speed" | "Optimize: Memory" | "Optimize: Simplicity" | "Optimize: Scalability";

interface Approach {
  name: string;
  time: string;
  space: string;
  complexity: "Low" | "Medium" | "High";
  description: string;
  optimal: boolean;
}

interface Round {
  problem: string;
  context: string;
  constraint: Constraint;
  approaches: Approach[];
}

const COMPLEXITY_COLOR = { Low: "#6EE7B7", Medium: "#FBBF24", High: "#EF4444" };

const ROUNDS: Round[] = [
  {
    problem: "Find all duplicate values in an array of 1M integers",
    context: "Called once per user request on a high-traffic endpoint.",
    constraint: "Optimize: Speed",
    approaches: [
      { name: "Nested Loop", time: "O(n²)", space: "O(1)", complexity: "Low", description: "Compare each element against all others", optimal: false },
      { name: "Hash Set", time: "O(n)", space: "O(n)", complexity: "Low", description: "Store seen values, flag on second encounter", optimal: true },
      { name: "Sort + Scan", time: "O(n log n)", space: "O(1)", complexity: "Low", description: "Sort first, then scan for adjacent duplicates", optimal: false },
      { name: "Bit Array", time: "O(n)", space: "O(n/8)", complexity: "Medium", description: "Use bit flags for integer range tracking", optimal: false },
    ],
  },
  {
    problem: "Count unique visitors from a 50GB server log file",
    context: "Running in a containerized task with 512MB memory limit.",
    constraint: "Optimize: Memory",
    approaches: [
      { name: "Hash Set", time: "O(n)", space: "O(n)", complexity: "Low", description: "Store all unique IPs in memory", optimal: false },
      { name: "HyperLogLog", time: "O(n)", space: "O(log log n)", complexity: "High", description: "Probabilistic cardinality estimation (~2% error)", optimal: true },
      { name: "External Sort", time: "O(n log n)", space: "O(chunk)", complexity: "Medium", description: "Sort chunks to disk, then merge unique", optimal: false },
      { name: "Counting Bloom Filter", time: "O(n)", space: "O(m)", complexity: "High", description: "Probabilistic set with configurable false-positive rate", optimal: false },
    ],
  },
  {
    problem: "Search for a product name in a catalog of 500 items",
    context: "Small app used by internal team of 10 people. Deployed on a weekend project.",
    constraint: "Optimize: Simplicity",
    approaches: [
      { name: "Binary Search", time: "O(log n)", space: "O(1)", complexity: "Medium", description: "Requires sorted array, halves search space each step", optimal: false },
      { name: "Linear Scan", time: "O(n)", space: "O(1)", complexity: "Low", description: "Check each item one by one", optimal: true },
      { name: "Inverted Index", time: "O(1)", space: "O(n×m)", complexity: "High", description: "Pre-built word → item lookup", optimal: false },
      { name: "Trie Structure", time: "O(k)", space: "O(n×k)", complexity: "High", description: "Prefix tree for substring matching", optimal: false },
    ],
  },
  {
    problem: "Build a recommendation engine for 10M users",
    context: "Personalized feed updated every 24 hours in a batch job.",
    constraint: "Optimize: Scalability",
    approaches: [
      { name: "Collaborative Filtering", time: "O(n²)", space: "O(n²)", complexity: "High", description: "Find similar users, recommend their items", optimal: false },
      { name: "Matrix Factorization", time: "O(n·k·i)", space: "O((n+m)·k)", complexity: "High", description: "Decompose rating matrix into latent factors", optimal: true },
      { name: "Rule-Based", time: "O(n)", space: "O(r)", complexity: "Low", description: "Hand-crafted if-then recommendation rules", optimal: false },
      { name: "Item-Item CF", time: "O(m²)", space: "O(m²)", complexity: "Medium", description: "Pre-compute item similarity, static across users", optimal: false },
    ],
  },
  {
    problem: "Sort a stream of 1B integers as they arrive",
    context: "Real-time data pipeline, must produce sorted output continuously.",
    constraint: "Optimize: Speed",
    approaches: [
      { name: "QuickSort", time: "O(n log n)", space: "O(log n)", complexity: "Medium", description: "In-place sort, not applicable to streams", optimal: false },
      { name: "Min-Heap", time: "O(n log k)", space: "O(k)", complexity: "Medium", description: "Maintain k-size heap for top-k streaming", optimal: true },
      { name: "Bucket Sort", time: "O(n+k)", space: "O(k)", complexity: "Low", description: "Requires bounded range, distributes to buckets", optimal: false },
      { name: "External Merge Sort", time: "O(n log n)", space: "O(chunk)", complexity: "High", description: "Sort chunks externally, k-way merge", optimal: false },
    ],
  },
  {
    problem: "Cache API responses for a read-heavy service",
    context: "10,000 unique keys, accessed 10M times/day. Cache has 1GB limit.",
    constraint: "Optimize: Memory",
    approaches: [
      { name: "Cache All", time: "O(1)", space: "O(n)", complexity: "Low", description: "Store all responses in memory indefinitely", optimal: false },
      { name: "LRU Cache", time: "O(1)", space: "O(capacity)", complexity: "Medium", description: "Evict least recently used entries when full", optimal: true },
      { name: "TTL Cache", time: "O(1)", space: "O(n)", complexity: "Low", description: "Expire entries after fixed time, no eviction logic", optimal: false },
      { name: "No Cache", time: "O(cost)", space: "O(1)", complexity: "Low", description: "Fetch fresh on every request", optimal: false },
    ],
  },
  {
    problem: "Parse and validate user email addresses at signup",
    context: "Startup MVP. One developer. Ship in 2 days.",
    constraint: "Optimize: Simplicity",
    approaches: [
      { name: "Full RFC 5322 Regex", time: "O(n)", space: "O(1)", complexity: "High", description: "100% spec-compliant regex (254 chars long)", optimal: false },
      { name: "Simple Contains @", time: "O(n)", space: "O(1)", complexity: "Low", description: "Check for @ and a dot after it", optimal: true },
      { name: "SMTP Verification", time: "O(network)", space: "O(1)", complexity: "High", description: "Actually send verification email", optimal: false },
      { name: "DNS MX Lookup", time: "O(network)", space: "O(1)", complexity: "Medium", description: "Verify domain has mail server", optimal: false },
    ],
  },
  {
    problem: "Index 100M documents for full-text search",
    context: "B2B SaaS product. Users search across millions of records in real-time.",
    constraint: "Optimize: Scalability",
    approaches: [
      { name: "SQL LIKE Query", time: "O(n)", space: "O(1)", complexity: "Low", description: "Full table scan with pattern matching", optimal: false },
      { name: "Inverted Index", time: "O(1) lookup", space: "O(n×m)", complexity: "Medium", description: "Map words → document list. Used by Elasticsearch.", optimal: true },
      { name: "Trigram Index", time: "O(k)", space: "O(n×3)", complexity: "Medium", description: "Break text into 3-char sequences, index those", optimal: false },
      { name: "Suffix Array", time: "O(n log n)", space: "O(n)", complexity: "High", description: "Sort all suffixes for substring lookup", optimal: false },
    ],
  },
];

const ONBOARDING_STEPS = [
  {
    title: "The Problem",
    body: "Each round shows a real engineering problem and a specific optimization constraint: Speed, Memory, Simplicity, or Scalability.",
    icon: Code2,
  },
  {
    title: "Four Approaches",
    body: "Four algorithmic approaches are shown with their time/space complexity and implementation difficulty. Each has tradeoffs.",
    icon: Scale,
  },
  {
    title: "Pick the Best Fit",
    body: "Choose the approach that best satisfies the given constraint. 100 points for optimal choice. Context changes what 'best' means.",
    icon: Brain,
  },
  {
    title: "8 Rounds",
    body: "Constraints vary across rounds. Speed may favor O(1) lookup. Simplicity may favor linear scan. Think in tradeoffs.",
    icon: Zap,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "RESULT" | "COMPLETE";

export default function CodeStrategist({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const round = ROUNDS[roundIdx];

  const choose = useCallback((idx: number) => {
    if (phase !== "PLAYING") return;
    const correct = round.approaches[idx].optimal;
    const pts = correct ? 100 : 20;
    setChosen(idx);
    setScore(s => s + pts);
    setResults(prev => [...prev, correct]);
    setPhase("RESULT");
  }, [phase, round]);

  const next = () => {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= ROUNDS.length) {
      setPhase("COMPLETE");
    } else {
      setRoundIdx(nextIdx);
      setChosen(null);
      setPhase("PLAYING");
    }
  };

  const reset = () => {
    setRoundIdx(0);
    setScore(0);
    setChosen(null);
    setResults([]);
    setPhase("PLAYING");
  };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  const CONSTRAINT_COLOR: Record<Constraint, string> = {
    "Optimize: Speed":       "#EF4444",
    "Optimize: Memory":      "#7CB9E8",
    "Optimize: Simplicity":  "#FBBF24",
    "Optimize: Scalability": ACCENT,
  };

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Code Strategist" />
    </div>
  );

  if (phase === "COMPLETE") {
    const correct = results.filter(Boolean).length;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
            <Code2 className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Code Strategist</h2>
          <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-6">Complete</p>
          <div className="flex justify-center gap-1.5 mb-6">
            {results.map((r, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: r ? ACCENT : "#EF4444" }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Score", value: score.toLocaleString(), color: ACCENT },
              { label: "Optimal", value: `${correct}/${ROUNDS.length}`, color: "#96D1C7" },
              { label: "Accuracy", value: `${Math.round((correct / ROUNDS.length) * 100)}%`, color: "#9B8FFF" },
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
  }

  if (phase === "RESULT") {
    const optimal = round.approaches.find(a => a.optimal)!;
    const picked = chosen !== null ? round.approaches[chosen] : null;
    const isCorrect = picked?.optimal ?? false;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A]" aria-label="Exit">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()} pts</span>
          </div>

          <p className="text-2xl font-black text-center mb-6" style={{ color: isCorrect ? ACCENT : "#EF4444" }}>
            {isCorrect ? "Optimal Choice!" : "Not the Best Fit"}
          </p>

          {picked && !isCorrect && (
            <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-4 mb-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#5F5854] mb-2">Your pick</p>
              <p className="text-sm font-bold text-[#F2EDE7] mb-1">{picked.name}</p>
              <p className="text-xs text-[#5F5854]">{picked.description}</p>
            </div>
          )}

          <div className="bg-[#1C1A17] border rounded-2xl p-4 mb-6" style={{ borderColor: `${ACCENT}50` }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Optimal for "{round.constraint}"</p>
            <p className="text-sm font-bold text-[#F2EDE7] mb-1">{optimal.name}</p>
            <p className="text-xs text-[#5F5854] mb-3">{optimal.description}</p>
            <div className="flex gap-3 text-[10px]">
              <span className="text-[#5F5854]">Time: <span className="text-[#F2EDE7] font-bold">{optimal.time}</span></span>
              <span className="text-[#5F5854]">Space: <span className="text-[#F2EDE7] font-bold">{optimal.space}</span></span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => onExit(score)} className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">Exit</button>
            <button onClick={next} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
              {roundIdx + 1 >= ROUNDS.length ? "Finish" : "Next Round →"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] overflow-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17]">
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Round</p>
            <p className="text-sm font-bold">{roundIdx + 1}/{ROUNDS.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-4" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Problem */}
        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-bold text-[#F2EDE7] leading-relaxed flex-1">{round.problem}</p>
            <span className="shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap"
              style={{ color: CONSTRAINT_COLOR[round.constraint], background: `${CONSTRAINT_COLOR[round.constraint]}15` }}>
              {round.constraint}
            </span>
          </div>
          <p className="text-xs text-[#5F5854] italic">{round.context}</p>
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854]">Choose the best approach</p>

        {/* Approach cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {round.approaches.map((approach, i) => (
            <motion.button key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => choose(i)}
              className="text-left p-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] hover:border-[#6EE7B7]/30 transition-all min-h-[44px]"
            >
              <p className="text-sm font-bold text-[#F2EDE7] mb-2">{approach.name}</p>
              <p className="text-xs text-[#5F5854] mb-3 leading-relaxed">{approach.description}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#5F5854]" />
                  <span className="text-[9px] font-bold text-[#9C948A]">{approach.time}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3 text-[#5F5854]" />
                  <span className="text-[9px] font-bold text-[#9C948A]">{approach.space}</span>
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{ color: COMPLEXITY_COLOR[approach.complexity], background: `${COMPLEXITY_COLOR[approach.complexity]}15` }}>
                  {approach.complexity} complexity
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="flex justify-center gap-1.5">
          {Array.from({ length: ROUNDS.length }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{
                background: i < results.length
                  ? results[i] ? ACCENT : "#EF4444"
                  : i === roundIdx ? "#5F5854" : "#2E2B27",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}
