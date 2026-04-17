"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Activity, AlertTriangle, CheckCircle, Monitor } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#E879F9";
const GAME_ID = "realworldsim" as const;

type Outcome = "RESOLVED" | "DEGRADED" | "ESCALATED";

interface DecisionPoint {
  prompt: string;
  options: {
    label: string;
    summary: string;
    followUp: string[];
    outcome?: Outcome;
    quality: number;
  }[];
}

interface Scenario {
  title: string;
  category: string;
  timeline: string[];
  decisions: DecisionPoint[];
}

const SCENARIOS: Scenario[] = [
  {
    title: "API Latency Incident",
    category: "Production Incident",
    timeline: [
      "14:03 — P95 API latency spiked to 4.2 seconds",
      "14:04 — Error rate climbed to 8%. Health checks failing.",
      "14:05 — On-call alert fired. Users reporting timeout errors.",
    ],
    decisions: [
      {
        prompt: "Your first action after receiving the alert?",
        options: [
          { label: "Check recent deployments", summary: "Review what changed in the last hour", followUp: ["14:06 — Deployment at 13:51 found. Memory leak in new service version."], outcome: undefined, quality: 90 },
          { label: "Scale up the service", summary: "Add more instances immediately", followUp: ["14:06 — Scaling takes 4 min. Latency worsening. Root cause still unknown."], outcome: undefined, quality: 50 },
          { label: "Page the dev team", summary: "Escalate to engineering immediately", followUp: ["14:06 — Team paged. Waiting 8 minutes for responses. Users still affected."], outcome: undefined, quality: 30 },
          { label: "Check the dashboards", summary: "Look at Grafana for clues", followUp: ["14:06 — Memory usage at 95% on 3 nodes. Deployment timestamp: 13:51."], outcome: undefined, quality: 85 },
        ],
      },
      {
        prompt: "Memory leak confirmed in v2.3.1. What next?",
        options: [
          { label: "Rollback to v2.3.0", summary: "Revert the deployment", followUp: ["14:09 — Rollback complete. Latency drops to 180ms. Incident resolved."], outcome: "RESOLVED", quality: 100 },
          { label: "Restart the service", summary: "Temporarily clears memory", followUp: ["14:09 — Restart clears memory but leak will return. Latency improves for 20 min."], outcome: "DEGRADED", quality: 60 },
          { label: "Hot-patch in production", summary: "Deploy a fix without rollback", followUp: ["14:12 — Patch deployment takes 12 min. Additional errors during deploy. Partial resolution."], outcome: "DEGRADED", quality: 45 },
          { label: "Enable maintenance mode", summary: "Take service offline", followUp: ["14:08 — All users blocked. Escalation triggered. SLA breach."], outcome: "ESCALATED", quality: 10 },
        ],
      },
    ],
  },
  {
    title: "Database Failure",
    category: "Infrastructure",
    timeline: [
      "09:14 — Primary database unresponsive. Connection pool exhausted.",
      "09:15 — 40% of API endpoints returning 500 errors.",
      "09:16 — Write operations queued. Reads timing out.",
    ],
    decisions: [
      {
        prompt: "What is your immediate triage step?",
        options: [
          { label: "Check DB connection pool", summary: "Verify pool size and active connections", followUp: ["09:17 — Pool at 100/100. Long-running query found: analytics report started at 09:10."], outcome: undefined, quality: 95 },
          { label: "Restart the database", summary: "Force restart the DB process", followUp: ["09:17 — Restart initiated. Data at risk. 4-minute downtime window begins."], outcome: undefined, quality: 25 },
          { label: "Failover to replica", summary: "Promote the read replica", followUp: ["09:17 — Replica promoted. Writes now available. Root cause unclear."], outcome: undefined, quality: 70 },
          { label: "Notify customers", summary: "Post status page update", followUp: ["09:17 — Update posted. Problem persists. Customer trust affected."], outcome: undefined, quality: 20 },
        ],
      },
      {
        prompt: "Long-running analytics query confirmed. Action?",
        options: [
          { label: "Kill the analytics query", summary: "Terminate the blocking query", followUp: ["09:18 — Query killed. Pool frees up immediately. Service recovers in 90 seconds."], outcome: "RESOLVED", quality: 100 },
          { label: "Wait for it to finish", summary: "Let the query complete naturally", followUp: ["09:23 — Query runs 8 more minutes. Downtime extends. SLA breach."], outcome: "ESCALATED", quality: 5 },
          { label: "Failover to replica", summary: "Move reads to replica DB", followUp: ["09:20 — Partial recovery. Primary still blocked. Writes delayed by 15 min."], outcome: "DEGRADED", quality: 55 },
          { label: "Scale connection pool", summary: "Temporarily increase pool size", followUp: ["09:19 — Pool expansion risky under load. 2 additional timeouts triggered."], outcome: "DEGRADED", quality: 35 },
        ],
      },
    ],
  },
  {
    title: "Failed Deployment",
    category: "Deployment",
    timeline: [
      "16:30 — Deployment of v3.0.0 initiated to production.",
      "16:32 — Health checks fail on 2 of 4 pods.",
      "16:33 — New pods stuck in CrashLoopBackOff.",
    ],
    decisions: [
      {
        prompt: "Pods are crashing. First action?",
        options: [
          { label: "Read crash logs immediately", summary: "Check pod logs for error message", followUp: ["16:34 — Logs show: 'Missing ENV var: DATABASE_URL'. Config map not updated for v3."], outcome: undefined, quality: 95 },
          { label: "Roll back the deployment", summary: "Revert to v2.9.5 immediately", followUp: ["16:34 — Rollback initiated. 3 minutes to complete. Root cause still unknown."], outcome: undefined, quality: 65 },
          { label: "Increase pod replicas", summary: "Scale up to compensate", followUp: ["16:34 — New pods also crash. Problem multiplied."], outcome: undefined, quality: 10 },
          { label: "Pause the deployment", summary: "Halt rollout at 50%", followUp: ["16:34 — Deployment paused. Half of traffic still on v2.9.5. Degraded but stable."], outcome: undefined, quality: 55 },
        ],
      },
      {
        prompt: "Missing ENV var confirmed: DATABASE_URL. What now?",
        options: [
          { label: "Add env var and redeploy", summary: "Update config map, retry rollout", followUp: ["16:37 — Config updated. Pods start cleanly. v3.0.0 fully deployed successfully."], outcome: "RESOLVED", quality: 100 },
          { label: "Rollback to v2.9.5", summary: "Abandon v3.0.0 for now", followUp: ["16:38 — Rollback complete. Stable. v3.0.0 blocked until config is fixed."], outcome: "DEGRADED", quality: 70 },
          { label: "Hardcode the DB URL", summary: "Embed it directly in the image", followUp: ["16:42 — New image build takes 12 min. Security risk of hardcoded secrets."], outcome: "DEGRADED", quality: 20 },
          { label: "Restart the crashing pods", summary: "Force restart without config fix", followUp: ["16:35 — Pods crash again immediately. Same error."], outcome: "ESCALATED", quality: 0 },
        ],
      },
    ],
  },
];

const OUTCOME_META: Record<Outcome, { label: string; color: string; pts: number }> = {
  RESOLVED:  { label: "Incident Resolved",  color: "#6EE7B7", pts: 300 },
  DEGRADED:  { label: "Partially Mitigated", color: "#FBBF24", pts: 150 },
  ESCALATED: { label: "Escalated",          color: "#EF4444", pts: 0 },
};

const ONBOARDING_STEPS = [
  {
    title: "Real Incident Timeline",
    body: "A production scenario unfolds as timestamped log entries. Read the timeline to understand what's happening.",
    icon: Monitor,
  },
  {
    title: "Make Decisions",
    body: "At critical points, you choose your next action. Each decision affects what happens next — and the final outcome.",
    icon: AlertTriangle,
  },
  {
    title: "Resolve or Escalate",
    body: "Good decisions lead to Resolved (300 pts). Partial fixes earn Degraded (150 pts). Wrong moves cause Escalation (0 pts).",
    icon: CheckCircle,
  },
];

type Phase = "ONBOARDING" | "TIMELINE" | "DECIDING" | "OUTCOME" | "COMPLETE";

export default function RealWorldSim({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "TIMELINE" : "ONBOARDING"
  );

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [decisionIdx, setDecisionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timelineEntries, setTimelineEntries] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [decisionQuality, setDecisionQuality] = useState(0);
  const [showingTimeline, setShowingTimeline] = useState(false);
  const [timelineQueue, setTimelineQueue] = useState<string[]>([]);

  const scenario = SCENARIOS[scenarioIdx];
  const decision = scenario.decisions[decisionIdx];

  // Animate timeline entries appearing one by one
  useEffect(() => {
    if (timelineQueue.length === 0) return;
    const t = setTimeout(() => {
      setTimelineEntries(prev => [...prev, timelineQueue[0]]);
      setTimelineQueue(prev => prev.slice(1));
    }, 800);
    return () => clearTimeout(t);
  }, [timelineQueue]);

  useEffect(() => {
    if (timelineQueue.length === 0 && showingTimeline) {
      const t = setTimeout(() => {
        setShowingTimeline(false);
        setPhase("DECIDING");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [timelineQueue, showingTimeline]);

  const startScenario = useCallback(() => {
    setTimelineEntries([]);
    setTimelineQueue(scenario.timeline);
    setShowingTimeline(true);
    setPhase("TIMELINE");
  }, [scenario]);

  useEffect(() => {
    if (phase === "TIMELINE" && !showingTimeline && timelineQueue.length > 0) {
      // already handled
    }
  }, [phase, showingTimeline, timelineQueue]);

  const choose = useCallback((optIdx: number) => {
    if (phase !== "DECIDING") return;
    const opt = decision.options[optIdx];
    setDecisionQuality(q => q + opt.quality);

    // Show follow-up timeline entries
    setTimelineEntries(prev => [...prev, ...opt.followUp]);
    setPhase("TIMELINE");
    setShowingTimeline(false); // No queue animation for follow-ups; show immediately then proceed

    setTimeout(() => {
      if (opt.outcome) {
        // Final decision
        const outcomePts = OUTCOME_META[opt.outcome].pts;
        const qualityBonus = Math.floor(decisionQuality / scenario.decisions.length);
        setScore(s => s + outcomePts + qualityBonus);
        setOutcome(opt.outcome);
        setPhase("OUTCOME");
      } else if (decisionIdx + 1 < scenario.decisions.length) {
        setDecisionIdx(d => d + 1);
        setPhase("DECIDING");
      } else {
        setOutcome("DEGRADED");
        setScore(s => s + 150);
        setPhase("OUTCOME");
      }
    }, 1800);
  }, [phase, decision, decisionIdx, scenario, decisionQuality]);

  const nextScenario = () => {
    const next = scenarioIdx + 1;
    if (next >= SCENARIOS.length) {
      setPhase("COMPLETE");
    } else {
      setScenarioIdx(next);
      setDecisionIdx(0);
      setOutcome(null);
      setDecisionQuality(0);
      setTimelineEntries([]);
      setTimelineQueue([]);
      setShowingTimeline(false);
      setPhase("TIMELINE");
      // Trigger timeline for next scenario
      setTimeout(() => {
        setTimelineQueue(SCENARIOS[next].timeline);
        setShowingTimeline(true);
      }, 100);
    }
  };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    startScenario();
  }, [stateRef, startScenario]);

  // Init first scenario
  useEffect(() => {
    if (phase === "TIMELINE" && timelineEntries.length === 0 && timelineQueue.length === 0 && !showingTimeline) {
      setTimelineQueue(scenario.timeline);
      setShowingTimeline(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding
        steps={ONBOARDING_STEPS}
        onComplete={handleOnboardingComplete}
        accentColor={ACCENT}
        gameName="Real World Simulator"
      />
    </div>
  );

  if (phase === "COMPLETE") return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
          <Activity className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Real World Simulator</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">All scenarios complete</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Scenarios", value: `${SCENARIOS.length}/${SCENARIOS.length}`, color: "#96D1C7" },
            { label: "Last Outcome", value: outcome ?? "—", color: outcome ? OUTCOME_META[outcome].color : "#F2EDE7" },
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
          <button onClick={() => { setScenarioIdx(0); setScore(0); setDecisionIdx(0); setOutcome(null); setTimelineEntries([]); setTimelineQueue([]); setDecisionQuality(0); setPhase("TIMELINE"); setTimeout(() => { setTimelineQueue(SCENARIOS[0].timeline); setShowingTimeline(true); }, 100); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (phase === "OUTCOME" && outcome) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A]" aria-label="Exit">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()} pts</span>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: `${OUTCOME_META[outcome].color}18`, border: `1px solid ${OUTCOME_META[outcome].color}40` }}>
            {outcome === "RESOLVED" ? <CheckCircle className="w-8 h-8" style={{ color: OUTCOME_META[outcome].color }} />
              : <AlertTriangle className="w-8 h-8" style={{ color: OUTCOME_META[outcome].color }} />}
          </div>
          <p className="text-2xl font-black" style={{ color: OUTCOME_META[outcome].color }}>
            {OUTCOME_META[outcome].label}
          </p>
          <p className="text-sm text-[#5F5854] mt-1">+{OUTCOME_META[outcome].pts} pts</p>
        </div>

        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-4 mb-4 font-mono text-xs space-y-1.5">
          {timelineEntries.map((entry, i) => (
            <p key={i} className="text-[#9C948A]">{entry}</p>
          ))}
        </div>

        <button onClick={nextScenario} className="w-full py-3.5 rounded-2xl font-bold text-sm mt-4"
          style={{ background: ACCENT, color: "#0B0F14" }}>
          {scenarioIdx + 1 >= SCENARIOS.length ? "See Results" : "Next Scenario →"}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] overflow-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17]">
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Scenario</p>
            <p className="text-sm font-bold">{scenarioIdx + 1}/{SCENARIOS.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-4" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-1">{scenario.category}</p>
          <h3 className="text-lg font-bold text-[#F2EDE7]">{scenario.title}</h3>
        </div>

        {/* Incident timeline */}
        <div className="bg-[#0D1117] border border-[#2E2B27] rounded-2xl p-4 font-mono text-xs space-y-2 min-h-[100px]">
          <AnimatePresence>
            {timelineEntries.map((entry, i) => (
              <motion.p key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="text-[#9C948A] leading-relaxed">
                {entry}
              </motion.p>
            ))}
          </AnimatePresence>
          {timelineEntries.length === 0 && (
            <motion.p animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-[#2E2B27]">
              Incident loading...
            </motion.p>
          )}
        </div>

        {/* Decision prompt */}
        <AnimatePresence>
          {phase === "DECIDING" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">
                Decision {decisionIdx + 1}/{scenario.decisions.length}
              </p>
              <p className="text-sm font-bold text-[#F2EDE7] mb-4">{decision.prompt}</p>
              <div className="flex flex-col gap-2">
                {decision.options.map((opt, i) => (
                  <motion.button key={i}
                    whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.99 }}
                    onClick={() => choose(i)}
                    className="text-left p-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] hover:border-[#E879F9]/40 transition-all min-h-[44px]"
                  >
                    <p className="text-sm font-bold text-[#F2EDE7] mb-0.5">{opt.label}</p>
                    <p className="text-xs text-[#5F5854]">{opt.summary}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "TIMELINE" && showingTimeline && (
          <motion.p animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-xs text-center text-[#5F5854]">
            Situation developing...
          </motion.p>
        )}
      </div>
    </div>
  );
}
