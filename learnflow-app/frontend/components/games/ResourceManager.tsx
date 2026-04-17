"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Server, Cpu, MemoryStick, AlertTriangle, BarChart3 } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#A3E635";
const GAME_ID = "resourcemanager" as const;

interface Job {
  id: string;
  label: string;
  cpu: number;
  mem: number;
  priority: "high" | "normal" | "low";
  color: string;
}

interface ServerState {
  id: string;
  name: string;
  cpu: number;    // 0-100 used
  mem: number;    // 0-100 used
  maxCpu: number;
  maxMem: number;
  overloaded: boolean;
}

const JOB_TEMPLATES = [
  { label: "ML Inference",    cpu: 35, mem: 40, priority: "high"   as const, color: "#7CB9E8" },
  { label: "Image Resize",    cpu: 20, mem: 25, priority: "normal" as const, color: "#A78BFA" },
  { label: "Report Gen",      cpu: 15, mem: 30, priority: "low"    as const, color: "#FBBF24" },
  { label: "Data Export",     cpu: 25, mem: 45, priority: "normal" as const, color: "#F97316" },
  { label: "Email Blast",     cpu: 10, mem: 20, priority: "low"    as const, color: "#F472B6" },
  { label: "Video Encode",    cpu: 55, mem: 50, priority: "high"   as const, color: "#EF4444" },
  { label: "Search Index",    cpu: 30, mem: 35, priority: "normal" as const, color: "#22D3EE" },
  { label: "Backup Task",     cpu: 20, mem: 30, priority: "low"    as const, color: "#6EE7B7" },
  { label: "Auth Tokens",     cpu: 10, mem: 15, priority: "high"   as const, color: "#818CF8" },
  { label: "Log Aggregation", cpu: 15, mem: 25, priority: "normal" as const, color: "#FB923C" },
];

const PRIORITY_COLOR = { high: "#EF4444", normal: "#FBBF24", low: "#6EE7B7" };
const SESSION_DURATION = 90;

const ONBOARDING_STEPS = [
  {
    title: "Three Servers",
    body: "You manage three servers, each with CPU and Memory capacity. Jobs arrive in the queue on the left.",
    icon: Server,
  },
  {
    title: "Assign Jobs",
    body: "Click a job to select it (highlighted). Then click a server to assign it. The server absorbs the job's CPU and memory load.",
    icon: Cpu,
  },
  {
    title: "Avoid Overload",
    body: "If a server exceeds 90% CPU or Memory, it flashes red and sheds the job — costing 150 penalty points.",
    icon: AlertTriangle,
  },
  {
    title: "Efficiency Score",
    body: "Servers running 40–80% utilization earn efficiency bonuses. Idle servers below 20% drain your efficiency score.",
    icon: BarChart3,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "COMPLETE";

export default function ResourceManager({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [score, setScore] = useState(0);
  const [jobsProcessed, setJobsProcessed] = useState(0);
  const [overloadCount, setOverloadCount] = useState(0);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [queue, setQueue] = useState<Job[]>([]);
  const [servers, setServers] = useState<ServerState[]>([
    { id: "s1", name: "Alpha",   cpu: 0, mem: 0, maxCpu: 100, maxMem: 100, overloaded: false },
    { id: "s2", name: "Beta",    cpu: 0, mem: 0, maxCpu: 100, maxMem: 100, overloaded: false },
    { id: "s3", name: "Gamma",   cpu: 0, mem: 0, maxCpu: 100, maxMem: 100, overloaded: false },
  ]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drainRef = useRef<ReturnType<typeof setInterval> | null>(null);
  let jobCounter = useRef(0);

  const spawnJob = useCallback(() => {
    const template = JOB_TEMPLATES[jobCounter.current % JOB_TEMPLATES.length];
    jobCounter.current++;
    const job: Job = { ...template, id: `j-${Date.now()}` };
    setQueue(q => [...q, job].slice(0, 6)); // max 6 in queue
  }, []);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    setTimeLeft(SESSION_DURATION);
    setScore(0);
    setJobsProcessed(0);
    setOverloadCount(0);
    setSelectedJob(null);
    setQueue([]);
    setServers([
      { id: "s1", name: "Alpha", cpu: 0, mem: 0, maxCpu: 100, maxMem: 100, overloaded: false },
      { id: "s2", name: "Beta",  cpu: 0, mem: 0, maxCpu: 100, maxMem: 100, overloaded: false },
      { id: "s3", name: "Gamma", cpu: 0, mem: 0, maxCpu: 100, maxMem: 100, overloaded: false },
    ]);
    jobCounter.current = 0;

    // Spawn initial jobs
    for (let i = 0; i < 3; i++) {
      const template = JOB_TEMPLATES[i];
      const job: Job = { ...template, id: `j-init-${i}` };
      setQueue(q => [...q, job]);
    }
    jobCounter.current = 3;

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setPhase("COMPLETE"); return 0; }
        return t - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(spawnJob, 4000);

    // Drain server load over time (jobs complete naturally)
    drainRef.current = setInterval(() => {
      setServers(prev => prev.map(s => ({
        ...s,
        cpu: Math.max(0, s.cpu - 8),
        mem: Math.max(0, s.mem - 6),
        overloaded: false,
      })));
    }, 5000);

    return () => {
      clearInterval(timerRef.current!);
      clearInterval(spawnRef.current!);
      clearInterval(drainRef.current!);
    };
  }, [phase, spawnJob]);

  const assignJob = useCallback((serverId: string) => {
    if (!selectedJob) return;
    const job = queue.find(j => j.id === selectedJob);
    if (!job) return;

    setServers(prev => prev.map(s => {
      if (s.id !== serverId) return s;
      const newCpu = s.cpu + job.cpu;
      const newMem = s.mem + job.mem;

      if (newCpu > 90 || newMem > 90) {
        setScore(sc => Math.max(0, sc - 150));
        setOverloadCount(c => c + 1);
        setFeedback(`${s.name} overloaded! -150`);
        setTimeout(() => setFeedback(null), 1000);
        return { ...s, overloaded: true };
      }

      const pts = job.priority === "high" ? 150 : job.priority === "normal" ? 100 : 60;
      setScore(sc => sc + pts);
      setJobsProcessed(c => c + 1);
      setFeedback(`+${pts} assigned`);
      setTimeout(() => setFeedback(null), 600);
      return { ...s, cpu: newCpu, mem: newMem, overloaded: false };
    }));

    setQueue(q => q.filter(j => j.id !== selectedJob));
    setSelectedJob(null);
  }, [selectedJob, queue]);

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  const timerPct = (timeLeft / SESSION_DURATION) * 100;
  const timerColor = timerPct > 50 ? ACCENT : timerPct > 25 ? "#FBBF24" : "#EF4444";

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Resource Manager" />
    </div>
  );

  if (phase === "COMPLETE") return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
          <Server className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Resource Manager</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">Session ended</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Jobs Done", value: jobsProcessed.toString(), color: "#96D1C7" },
            { label: "Overloads", value: overloadCount.toString(), color: overloadCount > 0 ? "#EF4444" : "#6EE7B7" },
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
          <button onClick={() => setPhase("PLAYING")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
            <RotateCcw className="w-3 h-3" /> Retry
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
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Jobs</p>
            <p className="text-sm font-bold">{jobsProcessed}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Time</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</p>
          </div>
        </div>
        <div className="w-4" />
      </div>
      <div className="h-0.5 bg-[#1C1A17]">
        <div className="h-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="flex-1 overflow-auto px-4 py-5 max-w-3xl mx-auto w-full">
        <AnimatePresence>
          {feedback && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center text-sm font-bold mb-3"
              style={{ color: feedback.includes("-") ? "#EF4444" : ACCENT }}>
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Job Queue */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">
              Job Queue — {selectedJob ? "now click a server" : "select a job"}
            </p>
            <div className="flex flex-col gap-2">
              {queue.map(job => (
                <motion.button key={job.id}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                  className="text-left p-3 rounded-2xl border transition-all min-h-[44px]"
                  style={{
                    background: selectedJob === job.id ? `${job.color}18` : "#1C1A17",
                    borderColor: selectedJob === job.id ? job.color : "#2E2B27",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: job.color }}>{job.label}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                      style={{ color: PRIORITY_COLOR[job.priority], background: `${PRIORITY_COLOR[job.priority]}15` }}>
                      {job.priority}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[10px] text-[#5F5854]">CPU: {job.cpu}%</span>
                    <span className="text-[10px] text-[#5F5854]">Mem: {job.mem}%</span>
                  </div>
                </motion.button>
              ))}
              {queue.length === 0 && (
                <p className="text-[#3A3530] text-xs text-center py-4">Queue empty</p>
              )}
            </div>
          </div>

          {/* Servers */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">
              Servers
            </p>
            <div className="flex flex-col gap-3">
              {servers.map(server => (
                <motion.button key={server.id}
                  whileHover={selectedJob ? { scale: 1.02 } : {}}
                  whileTap={selectedJob ? { scale: 0.98 } : {}}
                  onClick={() => selectedJob && assignJob(server.id)}
                  animate={server.overloaded ? { x: [0, -4, 4, -3, 3, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="p-4 rounded-2xl border transition-all min-h-[44px] text-left"
                  style={{
                    background: server.overloaded ? "rgba(239,68,68,0.1)" : selectedJob ? `${ACCENT}08` : "#1C1A17",
                    borderColor: server.overloaded ? "#EF4444" : selectedJob ? `${ACCENT}50` : "#2E2B27",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-3 h-3 text-[#5F5854]" />
                      <span className="text-xs font-bold text-[#F2EDE7]">{server.name}</span>
                    </div>
                    {server.overloaded && (
                      <span className="text-[9px] font-bold text-[#EF4444]">OVERLOADED</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] text-[#5F5854] flex items-center gap-1">
                          <Cpu className="w-2.5 h-2.5" /> CPU
                        </span>
                        <span className="text-[9px] text-[#5F5854]">{Math.round(server.cpu)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#0B0F14] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, server.cpu)}%`,
                            background: server.cpu > 80 ? "#EF4444" : server.cpu > 60 ? "#FBBF24" : ACCENT,
                          }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] text-[#5F5854] flex items-center gap-1">
                          <MemoryStick className="w-2.5 h-2.5" /> Mem
                        </span>
                        <span className="text-[9px] text-[#5F5854]">{Math.round(server.mem)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#0B0F14] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, server.mem)}%`,
                            background: server.mem > 80 ? "#EF4444" : server.mem > 60 ? "#FBBF24" : "#7CB9E8",
                          }} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
