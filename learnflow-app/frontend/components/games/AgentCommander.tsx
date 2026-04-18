"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Users, Target, Briefcase, Clock } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#A78BFA";
const GAME_ID = "agentcommander" as const;

type TaskType = "research" | "code" | "review" | "deploy" | "analyze";
type Urgency = "low" | "medium" | "high";
type AgentSpecialty = TaskType;

interface Task {
  id: string;
  label: string;
  type: TaskType;
  urgency: Urgency;
  description: string;
}

interface Agent {
  id: string;
  name: string;
  specialty: AgentSpecialty;
  assignedCount: number;
  maxTasks: number;
}

interface Round {
  tasks: Task[];
  agents: Agent[];
  timeLimit: number;
}

const ROUNDS: Round[] = [
  {
    timeLimit: 35,
    tasks: [
      { id: "t1", label: "Market Analysis", type: "research", urgency: "medium", description: "Analyze competitor landscape" },
      { id: "t2", label: "Fix Auth Bug", type: "code", urgency: "high", description: "Users can't reset password" },
      { id: "t3", label: "PR #47 Review", type: "review", urgency: "low", description: "Review incoming pull request" },
      { id: "t4", label: "Deploy v2.1", type: "deploy", urgency: "high", description: "Push new release to prod" },
      { id: "t5", label: "User Metrics", type: "analyze", urgency: "medium", description: "Q3 engagement data analysis" },
    ],
    agents: [
      { id: "a1", name: "Aria", specialty: "research", assignedCount: 0, maxTasks: 3 },
      { id: "a2", name: "Blaze", specialty: "code", assignedCount: 0, maxTasks: 3 },
      { id: "a3", name: "Cael", specialty: "review", assignedCount: 0, maxTasks: 3 },
      { id: "a4", name: "Dex", specialty: "deploy", assignedCount: 0, maxTasks: 2 },
    ],
  },
  {
    timeLimit: 30,
    tasks: [
      { id: "t6", label: "Perf Profiling", type: "analyze", urgency: "high", description: "API response times degraded" },
      { id: "t7", label: "DB Migration", type: "code", urgency: "high", description: "Schema update required" },
      { id: "t8", label: "Sec Audit Prep", type: "research", urgency: "medium", description: "Gather audit materials" },
      { id: "t9", label: "Hotfix Deploy", type: "deploy", urgency: "high", description: "Critical patch to staging" },
      { id: "t10", label: "Code Style PR", type: "review", urgency: "low", description: "Formatting refactor review" },
    ],
    agents: [
      { id: "a1", name: "Aria", specialty: "research", assignedCount: 0, maxTasks: 2 },
      { id: "a2", name: "Blaze", specialty: "code", assignedCount: 0, maxTasks: 2 },
      { id: "a3", name: "Cael", specialty: "review", assignedCount: 0, maxTasks: 2 },
      { id: "a4", name: "Dex", specialty: "deploy", assignedCount: 0, maxTasks: 2 },
    ],
  },
  {
    timeLimit: 25,
    tasks: [
      { id: "t11", label: "Incident RCA", type: "analyze", urgency: "high", description: "Outage post-mortem needed" },
      { id: "t12", label: "Feature Code", type: "code", urgency: "medium", description: "Implement search filter" },
      { id: "t13", label: "API Docs", type: "research", urgency: "low", description: "Update endpoint docs" },
      { id: "t14", label: "Release Deploy", type: "deploy", urgency: "high", description: "Ship to 10% of users" },
      { id: "t15", label: "Security PR", type: "review", urgency: "high", description: "Auth changes need review" },
    ],
    agents: [
      { id: "a1", name: "Aria", specialty: "research", assignedCount: 0, maxTasks: 2 },
      { id: "a2", name: "Blaze", specialty: "code", assignedCount: 0, maxTasks: 2 },
      { id: "a3", name: "Cael", specialty: "review", assignedCount: 0, maxTasks: 2 },
      { id: "a4", name: "Dex", specialty: "deploy", assignedCount: 0, maxTasks: 1 },
    ],
  },
];

const URGENCY_COLOR: Record<Urgency, string> = {
  high: "#EF4444",
  medium: "#FBBF24",
  low: "#6EE7B7",
};

const TYPE_ICON: Record<TaskType, string> = {
  research: "🔍",
  code: "💻",
  review: "👁",
  deploy: "🚀",
  analyze: "📊",
};

const ONBOARDING_STEPS = [
  {
    title: "You Are the Commander",
    body: "Tasks appear on the left. Four specialized agents wait on the right. Your job: assign each task to the right agent.",
    icon: Users,
  },
  {
    title: "Match Task to Agent",
    body: "Each agent has a specialty (Research, Code, Review, Deploy). Assign tasks matching their specialty for full points.",
    icon: Target,
  },
  {
    title: "Mind the Load",
    body: "Each agent has a maximum task capacity. Assigning to an overloaded agent costs you 50 points.",
    icon: Briefcase,
  },
  {
    title: "Work Fast",
    body: "You have limited time per round. Unassigned tasks at timeout count as misses. Correct combos multiply your score.",
    icon: Clock,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "ROUND_RESULT" | "COMPLETE";

export default function AgentCommander({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);

  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [agents, setAgents] = useState<Agent[]>(ROUNDS[0].agents.map(a => ({ ...a })));
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUNDS[0].timeLimit);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const round = ROUNDS[Math.min(roundIndex, ROUNDS.length - 1)];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("ROUND_RESULT");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (phase === "PLAYING") {
      const r = ROUNDS[Math.min(roundIndex, ROUNDS.length - 1)];
      setAgents(r.agents.map(a => ({ ...a })));
      setAssignments({});
      setSelectedTask(null);
      setTimeLeft(r.timeLimit);
      setCombo(0);
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, roundIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignTask = useCallback((agentId: string) => {
    if (!selectedTask || phase !== "PLAYING") return;
    const task = round.tasks.find(t => t.id === selectedTask);
    if (!task) return;

    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    if (agent.assignedCount >= agent.maxTasks) {
      setFeedback(`${agent.name} is at capacity!`);
      setTimeout(() => setFeedback(null), 900);
      setScore(s => Math.max(0, s - 50));
      setCombo(0);
      setSelectedTask(null);
      return;
    }

    const isCorrect = agent.specialty === task.type ||
      (task.type === "analyze" && agent.specialty === "research");
    const urgencyBonus = task.urgency === "high" ? 100 : task.urgency === "medium" ? 50 : 20;
    const comboBonus = combo >= 3 ? Math.floor(combo * 30) : 0;
    const points = isCorrect ? 200 + urgencyBonus + comboBonus : 40;

    setAssignments(prev => ({ ...prev, [selectedTask]: agentId }));
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, assignedCount: a.assignedCount + 1 } : a));
    setScore(s => s + points);
    setCombo(c => isCorrect ? c + 1 : 0);
    setFeedback(isCorrect ? (comboBonus > 0 ? `+${points} Combo!` : "Good match!") : "Suboptimal — partial credit");
    setTimeout(() => setFeedback(null), 700);
    setSelectedTask(null);

    // Check if all tasks assigned
    const newAssignments = { ...assignments, [selectedTask]: agentId };
    if (Object.keys(newAssignments).length >= round.tasks.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("ROUND_RESULT");
    }
  }, [selectedTask, phase, round, agents, combo, assignments]);

  const nextRound = () => {
    const next = roundIndex + 1;
    if (next >= ROUNDS.length) setPhase("COMPLETE");
    else { setRoundIndex(next); setPhase("PLAYING"); }
  };

  const reset = () => { setRoundIndex(0); setScore(0); setPhase("PLAYING"); };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  const timerPct = (timeLeft / round.timeLimit) * 100;
  const timerColor = timerPct > 50 ? ACCENT : timerPct > 25 ? "#FBBF24" : "#EF4444";
  const unassignedTasks = round.tasks.filter(t => !assignments[t.id]);

  if (phase === "ONBOARDING") {
    return (
      <div className="min-h-screen bg-[#0B0F14]">
        <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Agent Commander" />
      </div>
    );
  }

  if (phase === "COMPLETE") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
            <Users className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Agent Commander</h2>
          <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">All rounds complete</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Final Score", value: score.toLocaleString(), color: ACCENT },
              { label: "Rounds", value: `${ROUNDS.length}/${ROUNDS.length}`, color: "#96D1C7" },
              { label: "Best Combo", value: `×${combo}`, color: "#FBBF24" },
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

  if (phase === "ROUND_RESULT") {
    const assigned = Object.keys(assignments).length;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-2" style={{ color: ACCENT }}>
            Round {roundIndex + 1} Done
          </p>
          <h3 className="text-3xl font-black text-[#F2EDE7] mb-1 tabular-nums">{score.toLocaleString()}</h3>
          <p className="text-[#5F5854] text-xs mb-2">{assigned}/{round.tasks.length} tasks assigned</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => onExit(score)} className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">Exit</button>
            <button onClick={nextRound} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
              {roundIndex + 1 >= ROUNDS.length ? "Finish" : "Next Round →"}
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
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Round</p>
            <p className="text-sm font-bold">{roundIndex + 1}/{ROUNDS.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
          {combo >= 2 && (
            <div className="text-center">
              <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Combo</p>
              <p className="text-sm font-bold text-[#FBBF24]">×{combo}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Time</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</p>
          </div>
        </div>
        <div className="w-4" />
      </div>
      <div className="h-0.5 bg-[#1C1A17]">
        <div className="h-full transition-all duration-500" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center text-sm font-bold mb-4" style={{ color: ACCENT }}>
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Tasks */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">
              Tasks — click to select
            </p>
            <div className="flex flex-col gap-2">
              {unassignedTasks.map(task => (
                <motion.button
                  key={task.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                  className="text-left p-3 rounded-2xl border transition-all min-h-[44px]"
                  style={{
                    background: selectedTask === task.id ? `${ACCENT}15` : "#1C1A17",
                    borderColor: selectedTask === task.id ? ACCENT : "#2E2B27",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#F2EDE7]">
                      {TYPE_ICON[task.type]} {task.label}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                      style={{ color: URGENCY_COLOR[task.urgency], background: `${URGENCY_COLOR[task.urgency]}15` }}>
                      {task.urgency}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5F5854]">{task.description}</p>
                </motion.button>
              ))}
              {unassignedTasks.length === 0 && (
                <p className="text-[#5F5854] text-xs text-center py-4">All tasks assigned</p>
              )}
            </div>
          </div>

          {/* Agents */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">
              Agents — {selectedTask ? "assign selected task" : "select a task first"}
            </p>
            <div className="flex flex-col gap-2">
              {agents.map(agent => {
                const isFull = agent.assignedCount >= agent.maxTasks;
                return (
                  <motion.button
                    key={agent.id}
                    whileHover={!isFull ? { scale: 1.02 } : {}}
                    whileTap={!isFull ? { scale: 0.98 } : {}}
                    onClick={() => !isFull && assignTask(agent.id)}
                    disabled={!selectedTask || isFull}
                    className="text-left p-3 rounded-2xl border transition-all min-h-[44px]"
                    style={{
                      background: isFull ? "#1C1A17" : selectedTask ? `${ACCENT}10` : "#1C1A17",
                      borderColor: isFull ? "#1A1917" : selectedTask ? `${ACCENT}50` : "#2E2B27",
                      opacity: isFull ? 0.4 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#F2EDE7]">{agent.name}</p>
                        <p className="text-[10px] text-[#5F5854] capitalize">{agent.specialty} specialist</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#5F5854]">{agent.assignedCount}/{agent.maxTasks}</p>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: agent.maxTasks }).map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full"
                              style={{ background: i < agent.assignedCount ? ACCENT : "#2E2B27" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
