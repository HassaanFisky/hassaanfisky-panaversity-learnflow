"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Lightbulb, BarChart3, Scale, AlertTriangle } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#FBBF24";
const GAME_ID = "decisionlab" as const;

interface Option {
  label: string;
  summary: string;
  quality: number; // 0-100
  consequences: {
    systemHealth: number; // -3 to +3
    userImpact: number;
    timeCost: number; // 0 = fast, 3 = slow
  };
}

interface Scenario {
  title: string;
  situation: string;
  constraint?: string;
  options: Option[];
}

const SCENARIOS: Scenario[] = [
  {
    title: "Production Incident",
    situation: "Your API latency spiked to 8s. Error rate is 15%. 50,000 users are affected. You have 3 minutes before SLA breach.",
    constraint: "Optimize: Restore service speed",
    options: [
      { label: "Rollback immediately", summary: "Revert the last deployment", quality: 90, consequences: { systemHealth: 3, userImpact: 3, timeCost: 1 } },
      { label: "Scale up servers", summary: "Add more capacity now", quality: 60, consequences: { systemHealth: 1, userImpact: 1, timeCost: 2 } },
      { label: "Investigate root cause first", summary: "Run diagnostics before acting", quality: 30, consequences: { systemHealth: -1, userImpact: -2, timeCost: 3 } },
      { label: "Send status page update only", summary: "Communicate, don't act yet", quality: 10, consequences: { systemHealth: -2, userImpact: -3, timeCost: 0 } },
    ],
  },
  {
    title: "Database Under Load",
    situation: "Your PostgreSQL database is at 95% CPU. Queries are timing out. You have a DB migration scheduled in 2 hours.",
    constraint: "Optimize: System Stability",
    options: [
      { label: "Add read replicas", summary: "Distribute read queries", quality: 85, consequences: { systemHealth: 2, userImpact: 2, timeCost: 2 } },
      { label: "Kill slow queries", summary: "Terminate long-running queries", quality: 70, consequences: { systemHealth: 2, userImpact: 1, timeCost: 0 } },
      { label: "Postpone migration", summary: "Delay the schema update", quality: 75, consequences: { systemHealth: 1, userImpact: 0, timeCost: 1 } },
      { label: "Cache query results", summary: "Add Redis layer in front", quality: 80, consequences: { systemHealth: 2, userImpact: 2, timeCost: 3 } },
    ],
  },
  {
    title: "Security Vulnerability",
    situation: "A critical SQL injection vulnerability was found in your user search endpoint. It's been live for 3 months.",
    constraint: "Optimize: Security",
    options: [
      { label: "Patch and deploy immediately", summary: "Fix code and push hotfix", quality: 95, consequences: { systemHealth: 3, userImpact: 0, timeCost: 1 } },
      { label: "Disable the endpoint", summary: "Turn off the feature until fixed", quality: 80, consequences: { systemHealth: 3, userImpact: -2, timeCost: 0 } },
      { label: "Add WAF rules", summary: "Block malicious patterns at edge", quality: 60, consequences: { systemHealth: 1, userImpact: 0, timeCost: 1 } },
      { label: "Notify users proactively", summary: "Email affected users first", quality: 20, consequences: { systemHealth: -2, userImpact: 1, timeCost: 2 } },
    ],
  },
  {
    title: "Deployment Decision",
    situation: "Your team wants to release a major feature. Tests pass but 3 known low-severity bugs exist. The PM is pushing for release today.",
    constraint: "Optimize: User Trust",
    options: [
      { label: "Release with known bugs noted", summary: "Ship with a public known-issues list", quality: 65, consequences: { systemHealth: 1, userImpact: -1, timeCost: 0 } },
      { label: "Fix the bugs first", summary: "Delay 1-2 days to resolve issues", quality: 90, consequences: { systemHealth: 2, userImpact: 2, timeCost: 2 } },
      { label: "Feature flag for 5% rollout", summary: "Gradual rollout to limit blast radius", quality: 85, consequences: { systemHealth: 2, userImpact: 1, timeCost: 1 } },
      { label: "Release only to internal users", summary: "Dog-food first before full release", quality: 80, consequences: { systemHealth: 2, userImpact: 0, timeCost: 1 } },
    ],
  },
  {
    title: "Queue Backlog",
    situation: "Your email notification queue has 500,000 unprocessed messages. Workers are slow. Users expect emails within 5 minutes.",
    constraint: "Optimize: Throughput",
    options: [
      { label: "Add more workers", summary: "Scale worker pool horizontally", quality: 88, consequences: { systemHealth: 2, userImpact: 2, timeCost: 1 } },
      { label: "Prioritize recent messages", summary: "Process new messages first", quality: 70, consequences: { systemHealth: 1, userImpact: 1, timeCost: 0 } },
      { label: "Purge old messages", summary: "Drop messages older than 1 hour", quality: 40, consequences: { systemHealth: 2, userImpact: -3, timeCost: 0 } },
      { label: "Batch processing", summary: "Group emails and send in bulk", quality: 75, consequences: { systemHealth: 2, userImpact: 1, timeCost: 2 } },
    ],
  },
  {
    title: "Tech Debt vs. Feature",
    situation: "You have 2 weeks of sprint capacity. Business wants a new analytics dashboard. Engineering flagged a critical refactor needed in the auth layer.",
    constraint: "Optimize: Long-term Health",
    options: [
      { label: "Do the refactor first", summary: "Pay down debt before new features", quality: 85, consequences: { systemHealth: 3, userImpact: -1, timeCost: 2 } },
      { label: "Ship the dashboard", summary: "Deliver business value this sprint", quality: 55, consequences: { systemHealth: -1, userImpact: 2, timeCost: 0 } },
      { label: "Split the sprint 50/50", summary: "Half refactor, half feature", quality: 75, consequences: { systemHealth: 1, userImpact: 1, timeCost: 1 } },
      { label: "Defer both, do firefighting", summary: "Focus on current incidents only", quality: 15, consequences: { systemHealth: -2, userImpact: -1, timeCost: 0 } },
    ],
  },
];

const ONBOARDING_STEPS = [
  {
    title: "Real Scenarios",
    body: "Each round presents a genuine technical or operational dilemma. Read it carefully — context matters.",
    icon: Lightbulb,
  },
  {
    title: "Choose Your Move",
    body: "Select the option you believe is the best response given the constraint shown. No time pressure — think it through.",
    icon: Scale,
  },
  {
    title: "See the Consequences",
    body: "After choosing, you'll see how each option affects System Health, User Impact, and Time Cost. Learn from the outcomes.",
    icon: BarChart3,
  },
  {
    title: "Quality Score",
    body: "Each option has a hidden quality score. Your total is the sum across 6 scenarios. Some choices are clearly better — others require judgment.",
    icon: AlertTriangle,
  },
];

const IMPACT_LABEL: Record<number, string> = {
  [-3]: "Critical ↓↓", [-2]: "Major ↓", [-1]: "Minor ↓",
  0: "Neutral", 1: "Minor ↑", 2: "Major ↑", 3: "Excellent ↑↑",
};

type Phase = "ONBOARDING" | "CHOOSING" | "RESULT" | "COMPLETE";

export default function DecisionLab({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "CHOOSING" : "ONBOARDING"
  );

  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  const scenario = SCENARIOS[scenarioIndex];
  const chosen = chosenIndex !== null ? scenario.options[chosenIndex] : null;
  const best = scenario.options.reduce((a, b) => a.quality > b.quality ? a : b);

  const choose = useCallback((idx: number) => {
    if (phase !== "CHOOSING") return;
    setChosenIndex(idx);
    const quality = scenario.options[idx].quality;
    setScore(s => s + quality * 10);
    setPhase("RESULT");
  }, [phase, scenario]);

  const next = () => {
    const nextIdx = scenarioIndex + 1;
    if (nextIdx >= SCENARIOS.length) {
      setPhase("COMPLETE");
    } else {
      setScenarioIndex(nextIdx);
      setChosenIndex(null);
      setPhase("CHOOSING");
    }
  };

  const reset = () => {
    setScenarioIndex(0);
    setScore(0);
    setChosenIndex(null);
    setPhase("CHOOSING");
  };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("CHOOSING");
  }, [stateRef]);

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Decision Lab" />
    </div>
  );

  if (phase === "COMPLETE") return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
          <Scale className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Decision Lab</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">Session complete</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Final Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Scenarios", value: `${SCENARIOS.length}/${SCENARIOS.length}`, color: "#96D1C7" },
            { label: "Avg Quality", value: `${Math.round(score / SCENARIOS.length / 10)}%`, color: "#9B8FFF" },
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

  if (phase === "RESULT" && chosen) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A]" aria-label="Exit">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()} pts</span>
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-4">
          {scenario.title} — Outcome
        </p>

        {/* Your choice */}
        <div className="bg-[#1C1A17] border rounded-2xl p-4 mb-4"
          style={{ borderColor: chosen.quality >= 70 ? ACCENT : chosen.quality >= 50 ? "#FBBF24" : "#EF4444" }}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[#5F5854]">Your choice</p>
          <p className="text-sm font-bold text-[#F2EDE7] mb-1">{chosen.label}</p>
          <p className="text-xs text-[#5F5854] mb-3">{chosen.summary}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "System Health", value: chosen.consequences.systemHealth },
              { label: "User Impact", value: chosen.consequences.userImpact },
              { label: "Time Cost", value: -chosen.consequences.timeCost },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0B0F14] rounded-xl p-2 text-center">
                <p className="text-[8px] text-[#5F5854] uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xs font-bold" style={{ color: value > 0 ? "#6EE7B7" : value < 0 ? "#EF4444" : "#5F5854" }}>
                  {IMPACT_LABEL[value] ?? value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-right text-xs mt-3 font-bold" style={{ color: chosen.quality >= 70 ? ACCENT : "#EF4444" }}>
            Quality: {chosen.quality}%
          </p>
        </div>

        {/* Best option (if different) */}
        {chosen.label !== best.label && (
          <div className="bg-[#0B0F14] border border-[#2E2B27] rounded-2xl p-4 mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: ACCENT }}>Optimal choice</p>
            <p className="text-sm font-bold text-[#F2EDE7] mb-1">{best.label}</p>
            <p className="text-xs text-[#5F5854]">{best.summary} — Quality: {best.quality}%</p>
          </div>
        )}

        <button onClick={next} className="w-full py-3.5 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
          {scenarioIndex + 1 >= SCENARIOS.length ? "Finish" : "Next Scenario →"}
        </button>
      </div>
    </motion.div>
  );

  // CHOOSING
  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A]" aria-label="Exit">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#5F5854]">{scenarioIndex + 1}/{SCENARIOS.length}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-5 mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">{scenario.title}</p>
          <p className="text-sm text-[#F2EDE7] leading-relaxed mb-3">{scenario.situation}</p>
          {scenario.constraint && (
            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
              style={{ color: ACCENT, background: `${ACCENT}15` }}>
              {scenario.constraint}
            </span>
          )}
        </div>

        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">What do you do?</p>
        <div className="flex flex-col gap-3">
          {scenario.options.map((opt, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => choose(i)}
              className="text-left p-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] hover:border-[#FBBF24]/40 transition-all min-h-[44px]"
            >
              <p className="text-sm font-bold text-[#F2EDE7] mb-1">{opt.label}</p>
              <p className="text-xs text-[#5F5854]">{opt.summary}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
