"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, GitMerge, Wrench, Link, Clock } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#F472B6";
const GAME_ID = "flowfixer" as const;

type ConnectorType = "HTTP" | "gRPC" | "EventBus" | "SQL" | "Stream";

interface PipelineNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface PipelineEdge {
  id: string;
  from: string;
  to: string;
  correct: ConnectorType;
  options: ConnectorType[];
  broken: boolean;
  redHerring?: boolean;
}

interface Puzzle {
  title: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

const PUZZLES: Puzzle[] = [
  {
    title: "API to Database",
    nodes: [
      { id: "client", label: "Client",    x: 5,  y: 40 },
      { id: "api",    label: "API",       x: 30, y: 40 },
      { id: "cache",  label: "Cache",     x: 55, y: 20 },
      { id: "db",     label: "Database",  x: 80, y: 40 },
    ],
    edges: [
      { id: "e1", from: "client", to: "api",   correct: "HTTP",     options: ["HTTP", "gRPC", "EventBus"], broken: false },
      { id: "e2", from: "api",    to: "cache",  correct: "HTTP",     options: ["HTTP", "SQL", "Stream"],   broken: true },
      { id: "e3", from: "api",    to: "db",     correct: "SQL",      options: ["SQL", "HTTP", "gRPC"],     broken: true },
    ],
  },
  {
    title: "Event Processing Pipeline",
    nodes: [
      { id: "producer", label: "Producer",  x: 5,  y: 50 },
      { id: "queue",    label: "Queue",     x: 28, y: 50 },
      { id: "worker",   label: "Worker",    x: 55, y: 50 },
      { id: "store",    label: "Store",     x: 80, y: 50 },
      { id: "monitor",  label: "Monitor",   x: 55, y: 20 },
    ],
    edges: [
      { id: "e1", from: "producer", to: "queue",   correct: "EventBus", options: ["EventBus", "HTTP", "SQL"],    broken: true },
      { id: "e2", from: "queue",    to: "worker",  correct: "Stream",   options: ["Stream", "HTTP", "gRPC"],     broken: false },
      { id: "e3", from: "worker",   to: "store",   correct: "SQL",      options: ["SQL", "EventBus", "Stream"],  broken: true },
      { id: "e4", from: "worker",   to: "monitor", correct: "HTTP",     options: ["HTTP", "gRPC", "EventBus"],   broken: false, redHerring: false },
    ],
  },
  {
    title: "Microservice Mesh",
    nodes: [
      { id: "gateway", label: "Gateway",   x: 5,  y: 40 },
      { id: "auth",    label: "Auth",      x: 30, y: 15 },
      { id: "order",   label: "Orders",    x: 30, y: 65 },
      { id: "notify",  label: "Notify",    x: 60, y: 40 },
      { id: "db",      label: "DB",        x: 85, y: 40 },
    ],
    edges: [
      { id: "e1", from: "gateway", to: "auth",   correct: "gRPC",     options: ["gRPC", "HTTP", "EventBus"],  broken: true },
      { id: "e2", from: "gateway", to: "order",  correct: "HTTP",     options: ["HTTP", "gRPC", "Stream"],    broken: false },
      { id: "e3", from: "order",   to: "notify", correct: "EventBus", options: ["EventBus", "HTTP", "SQL"],   broken: true },
      { id: "e4", from: "notify",  to: "db",     correct: "SQL",      options: ["SQL", "HTTP", "gRPC"],       broken: false, redHerring: false },
    ],
  },
  {
    title: "Data Streaming System",
    nodes: [
      { id: "source",    label: "Source",     x: 5,  y: 50 },
      { id: "ingest",    label: "Ingestion",  x: 28, y: 50 },
      { id: "transform", label: "Transform",  x: 55, y: 50 },
      { id: "sink",      label: "Sink",       x: 80, y: 50 },
    ],
    edges: [
      { id: "e1", from: "source",    to: "ingest",    correct: "Stream", options: ["Stream", "HTTP", "SQL"],   broken: true },
      { id: "e2", from: "ingest",    to: "transform", correct: "Stream", options: ["Stream", "EventBus", "gRPC"], broken: false },
      { id: "e3", from: "transform", to: "sink",      correct: "SQL",    options: ["SQL", "Stream", "HTTP"],   broken: true },
    ],
  },
];

const ONBOARDING_STEPS = [
  {
    title: "Pipeline Diagrams",
    body: "Each puzzle shows a data flow pipeline. Nodes are connected by edges — some edges are broken and shown in red.",
    icon: GitMerge,
  },
  {
    title: "Click to Fix",
    body: "Click on a broken edge (shown as ✕). A popover appears with 3 connector type choices. Pick the right one.",
    icon: Wrench,
  },
  {
    title: "Connector Types",
    body: "HTTP connects web clients. SQL connects databases. gRPC for internal services. EventBus for async events. Stream for real-time data.",
    icon: Link,
  },
  {
    title: "Speed Bonus",
    body: "60 seconds for all puzzles. Each correct fix earns 200 points. Remaining time multiplies your score.",
    icon: Clock,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "COMPLETE";

const CONNECTOR_COLORS: Record<ConnectorType, string> = {
  HTTP: "#7CB9E8",
  gRPC: "#A78BFA",
  EventBus: "#FBBF24",
  SQL: "#F97316",
  Stream: "#22D3EE",
};

export default function FlowFixer({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [edgeStates, setEdgeStates] = useState<Record<string, { fixed: boolean; selected: boolean }>>({});
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const puzzle = PUZZLES[puzzleIndex % PUZZLES.length];
  const brokenEdges = puzzle.edges.filter(e => e.broken);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setPhase("COMPLETE"); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (phase === "PLAYING") {
      setEdgeStates({});
      setActiveEdge(null);
      setFeedback(null);
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdgeClick = useCallback((edgeId: string) => {
    const edge = puzzle.edges.find(e => e.id === edgeId);
    if (!edge || !edge.broken || edgeStates[edgeId]?.fixed) return;
    setActiveEdge(activeEdge === edgeId ? null : edgeId);
  }, [puzzle, edgeStates, activeEdge]);

  const handleConnectorSelect = useCallback((connector: ConnectorType) => {
    if (!activeEdge) return;
    const edge = puzzle.edges.find(e => e.id === activeEdge);
    if (!edge) return;

    if (connector === edge.correct) {
      setScore(s => s + 200);
      setEdgeStates(prev => ({ ...prev, [activeEdge]: { fixed: true, selected: false } }));
      setFeedback("Fixed!");

      // Check if all broken edges in puzzle fixed
      const newFixed = { ...edgeStates, [activeEdge]: { fixed: true, selected: false } };
      const allFixed = brokenEdges.every(e => newFixed[e.id]?.fixed);
      if (allFixed) {
        const nextIdx = puzzleIndex + 1;
        if (nextIdx >= PUZZLES.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          setScore(s => s + timeLeft * 3);
          setPhase("COMPLETE");
        } else {
          setPuzzleIndex(nextIdx);
          setEdgeStates({});
          setActiveEdge(null);
        }
      }
    } else {
      setScore(s => Math.max(0, s - 50));
      setFeedback("Wrong connector");
    }
    setActiveEdge(null);
    setTimeout(() => setFeedback(null), 800);
  }, [activeEdge, puzzle, edgeStates, brokenEdges, puzzleIndex, timeLeft]);

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  const timerPct = (timeLeft / 60) * 100;
  const timerColor = timerPct > 50 ? ACCENT : timerPct > 25 ? "#FBBF24" : "#EF4444";

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Flow Fixer" />
    </div>
  );

  if (phase === "COMPLETE") return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
          <GitMerge className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Flow Fixer</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">Session complete</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Final Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Puzzles Fixed", value: `${puzzleIndex}/${PUZZLES.length}`, color: "#96D1C7" },
            { label: "Time Left", value: `${timeLeft}s`, color: timerColor },
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
          <button onClick={() => { setPuzzleIndex(0); setScore(0); setTimeLeft(60); setPhase("PLAYING"); }}
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
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Puzzle</p>
            <p className="text-sm font-bold">{Math.min(puzzleIndex + 1, PUZZLES.length)}/{PUZZLES.length}</p>
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
      <div className="h-0.5 bg-[#1C1A17]">
        <div className="h-full transition-all duration-500" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6 max-w-2xl mx-auto w-full">
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-1">Pipeline: {puzzle.title}</p>
          <p className="text-xs text-[#5F5854]">{activeEdge ? "Choose the correct connector type" : "Click a broken edge (✕) to fix it"}</p>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm font-bold" style={{ color: feedback === "Fixed!" ? ACCENT : "#EF4444" }}>
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>

        {/* SVG Pipeline Diagram */}
        <div className="w-full bg-[#0D1117] border border-[#2E2B27] rounded-2xl p-4" style={{ minHeight: 200 }}>
          <svg viewBox="0 0 100 80" className="w-full" style={{ height: 200 }}>
            {/* Edges */}
            {puzzle.edges.map(edge => {
              const from = puzzle.nodes.find(n => n.id === edge.from)!;
              const to = puzzle.nodes.find(n => n.id === edge.to)!;
              const isFixed = edgeStates[edge.id]?.fixed;
              const isBroken = edge.broken && !isFixed;
              const isActive = activeEdge === edge.id;

              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              const edgeColor = isFixed ? ACCENT : isBroken ? "#EF4444" : "#5F5854";

              return (
                <g key={edge.id} onClick={() => handleEdgeClick(edge.id)} style={{ cursor: isBroken ? "pointer" : "default" }}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isActive ? ACCENT : edgeColor}
                    strokeWidth={isActive ? 1.5 : 1}
                    strokeDasharray={isBroken ? "2,1.5" : undefined}
                    opacity={0.8}
                  />
                  {isBroken && (
                    <text x={mx} y={my - 2} textAnchor="middle" fontSize={4} fill="#EF4444" style={{ fontWeight: "bold", userSelect: "none" }}>✕</text>
                  )}
                  {isFixed && (
                    <text x={mx} y={my - 2} textAnchor="middle" fontSize={4} fill={ACCENT} style={{ userSelect: "none" }}>✓</text>
                  )}
                  {/* Connector label on fixed edges */}
                  {isFixed && (
                    <text x={mx} y={my + 3} textAnchor="middle" fontSize={3} fill={ACCENT} style={{ userSelect: "none" }}>{edge.correct}</text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {puzzle.nodes.map(node => (
              <g key={node.id}>
                <rect x={node.x - 8} y={node.y - 4.5} width={16} height={9} rx={2}
                  fill="#1C1A17" stroke="#2E2B27" strokeWidth={0.5} />
                <text x={node.x} y={node.y + 1.5} textAnchor="middle" fontSize={3.5}
                  fill="#9C948A" style={{ userSelect: "none" }}>
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Connector picker */}
        <AnimatePresence>
          {activeEdge && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3 text-center">Select connector type</p>
              <div className="flex flex-wrap justify-center gap-2">
                {(puzzle.edges.find(e => e.id === activeEdge)?.options ?? []).map(connector => (
                  <motion.button
                    key={connector}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleConnectorSelect(connector)}
                    className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px]"
                    style={{
                      background: `${CONNECTOR_COLORS[connector]}15`,
                      borderColor: `${CONNECTOR_COLORS[connector]}50`,
                      color: CONNECTOR_COLORS[connector],
                    }}
                  >
                    {connector}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <p className="text-[#5F5854] text-xs">
          {brokenEdges.filter(e => edgeStates[e.id]?.fixed).length}/{brokenEdges.length} breaks repaired
        </p>
      </div>
    </div>
  );
}
