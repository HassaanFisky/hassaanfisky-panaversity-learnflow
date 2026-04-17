"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Server, CheckCircle, XCircle, Layout } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#34D399";
const GAME_ID = "systemarchitect" as const;

type ComponentId =
  | "api_gateway" | "load_balancer" | "cache" | "database"
  | "queue" | "worker" | "cdn" | "auth_service"
  | "rate_limiter" | "search_index";

interface ComponentDef {
  id: ComponentId;
  label: string;
  abbr: string;
  color: string;
}

const COMPONENTS: Record<ComponentId, ComponentDef> = {
  api_gateway:   { id: "api_gateway",   label: "API Gateway",    abbr: "GW",   color: "#7CB9E8" },
  load_balancer: { id: "load_balancer", label: "Load Balancer",  abbr: "LB",   color: "#A78BFA" },
  cache:         { id: "cache",         label: "Cache",          abbr: "CH",   color: "#FBBF24" },
  database:      { id: "database",      label: "Database",       abbr: "DB",   color: "#F97316" },
  queue:         { id: "queue",         label: "Message Queue",  abbr: "MQ",   color: "#F472B6" },
  worker:        { id: "worker",        label: "Worker",         abbr: "WK",   color: "#22D3EE" },
  cdn:           { id: "cdn",           label: "CDN",            abbr: "CDN",  color: "#A3E635" },
  auth_service:  { id: "auth_service",  label: "Auth Service",   abbr: "AU",   color: "#818CF8" },
  rate_limiter:  { id: "rate_limiter",  label: "Rate Limiter",   abbr: "RL",   color: "#E58A6D" },
  search_index:  { id: "search_index",  label: "Search Index",   abbr: "SI",   color: "#6EE7B7" },
};

interface Challenge {
  spec: string;
  required: ComponentId[];
  grid: number; // grid columns
  hint: string;
}

const CHALLENGES: Challenge[] = [
  {
    spec: "Build a basic web API that handles authentication and persists data.",
    required: ["api_gateway", "auth_service", "database"],
    grid: 3,
    hint: "You need a gateway, something to verify users, and somewhere to store data.",
  },
  {
    spec: "Scale an API to handle high traffic with caching and load distribution.",
    required: ["load_balancer", "api_gateway", "cache", "database"],
    grid: 4,
    hint: "Distribute load across multiple servers, cache hot data, persist the rest.",
  },
  {
    spec: "Build an async job processing system with a queue, workers, and storage.",
    required: ["api_gateway", "queue", "worker", "database"],
    grid: 4,
    hint: "Accept requests, push to a queue, workers drain the queue, results stored.",
  },
  {
    spec: "Design a globally-cached content delivery system with rate limiting.",
    required: ["cdn", "api_gateway", "rate_limiter", "cache", "database"],
    grid: 5,
    hint: "Serve from edge, throttle abusers, cache hot content, fallback to DB.",
  },
];

const ONBOARDING_STEPS = [
  {
    title: "Read the Spec",
    body: "Each challenge describes a system requirement. Your job is to pick the right components to build it.",
    icon: Layout,
  },
  {
    title: "Click to Select",
    body: "Tap a component from the palette to select it (highlighted). Then tap an empty grid slot to place it.",
    icon: Server,
  },
  {
    title: "Validate",
    body: "Once you've placed components, press Validate. Each correct component earns 150 points. Wrong placements cost 50.",
    icon: CheckCircle,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "VALIDATED" | "COMPLETE";

export default function SystemArchitect({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [challengeIndex, setChallengeIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<ComponentId | null>(null);
  const [placed, setPlaced] = useState<(ComponentId | null)[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [validationResult, setValidationResult] = useState<{ correct: ComponentId[]; wrong: ComponentId[]; missing: ComponentId[] } | null>(null);

  const challenge = CHALLENGES[challengeIndex];

  const initLevel = useCallback((idx: number) => {
    const ch = CHALLENGES[idx];
    setPlaced(Array(ch.grid * 2).fill(null));
    setSelected(null);
    setWrongAttempts(0);
    setValidationResult(null);
  }, []);

  const handleSlotClick = useCallback((slotIdx: number) => {
    if (phase !== "PLAYING") return;
    if (selected === null) return;

    setPlaced(prev => {
      const next = [...prev];
      // Toggle off if same component already there
      if (next[slotIdx] === selected) {
        next[slotIdx] = null;
      } else {
        next[slotIdx] = selected;
      }
      return next;
    });
  }, [phase, selected]);

  const validate = useCallback(() => {
    const placedComponents = placed.filter(Boolean) as ComponentId[];
    const unique = [...new Set(placedComponents)];
    const required = challenge.required;

    const correct = unique.filter(id => required.includes(id));
    const wrong = unique.filter(id => !required.includes(id));
    const missing = required.filter(id => !unique.includes(id));

    const pts = correct.length * 150 - wrong.length * 50 - wrongAttempts * 20;
    setScore(s => s + Math.max(0, pts));
    setValidationResult({ correct, wrong, missing });
    setPhase("VALIDATED");
  }, [placed, challenge, wrongAttempts]);

  const nextChallenge = () => {
    const next = challengeIndex + 1;
    if (next >= CHALLENGES.length) {
      setPhase("COMPLETE");
    } else {
      setChallengeIndex(next);
      initLevel(next);
      setPhase("PLAYING");
    }
  };

  const reset = () => {
    setChallengeIndex(0);
    setScore(0);
    initLevel(0);
    setPhase("PLAYING");
  };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    initLevel(0);
    setPhase("PLAYING");
  }, [stateRef, initLevel]);

  const paletteComponents = Object.values(COMPONENTS);
  const slots = Array.from({ length: challenge.grid * 2 });

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="System Architect" />
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
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">System Architect</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">All designs complete</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Final Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Challenges", value: `${CHALLENGES.length}/${CHALLENGES.length}`, color: "#96D1C7" },
            { label: "XP Earned", value: `+${Math.floor(score * 0.4)}`, color: "#F2EDE7" },
            { label: "Status", value: "Architect", color: "#9B8FFF" },
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

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col">
      {/* HUD */}
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

      <div className="flex-1 overflow-auto px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Spec */}
        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">System Spec</p>
          <p className="text-sm text-[#F2EDE7] leading-relaxed">{challenge.spec}</p>
          {phase === "PLAYING" && (
            <p className="text-[10px] text-[#5F5854] mt-2 italic">{challenge.hint}</p>
          )}
        </div>

        {/* Component Palette */}
        {phase === "PLAYING" && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">
              Component Palette — {selected ? `Selected: ${COMPONENTS[selected].label}` : "tap to select"}
            </p>
            <div className="flex flex-wrap gap-2">
              {paletteComponents.map(comp => (
                <motion.button
                  key={comp.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelected(selected === comp.id ? null : comp.id)}
                  className="px-3 py-2 rounded-xl border text-xs font-bold transition-all min-h-[44px]"
                  style={{
                    background: selected === comp.id ? `${comp.color}20` : "#1C1A17",
                    borderColor: selected === comp.id ? comp.color : "#2E2B27",
                    color: selected === comp.id ? comp.color : "#5F5854",
                  }}
                >
                  {comp.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Grid canvas */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3">
            {phase === "PLAYING" ? "Design Canvas — tap a slot to place selected component" : "Your Design"}
          </p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${challenge.grid}, 1fr)` }}
          >
            {slots.map((_, idx) => {
              const compId = placed[idx];
              const comp = compId ? COMPONENTS[compId] : null;
              const isCorrect = validationResult?.correct.includes(compId as ComponentId);
              const isWrong = validationResult?.wrong.includes(compId as ComponentId);

              return (
                <motion.button
                  key={idx}
                  whileHover={phase === "PLAYING" ? { scale: 1.04 } : {}}
                  whileTap={phase === "PLAYING" ? { scale: 0.96 } : {}}
                  onClick={() => handleSlotClick(idx)}
                  className="aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all min-h-[60px]"
                  style={{
                    background: comp
                      ? isCorrect ? `${comp.color}20`
                        : isWrong ? "rgba(239,68,68,0.12)"
                        : `${comp.color}12`
                      : "#1C1A17",
                    borderColor: comp
                      ? isCorrect ? comp.color
                        : isWrong ? "#EF4444"
                        : `${comp.color}50`
                      : "#2E2B27",
                  }}
                >
                  {comp ? (
                    <>
                      <span className="text-xs font-black" style={{ color: isWrong ? "#EF4444" : comp.color }}>{comp.abbr}</span>
                      {(isCorrect || isWrong) && (
                        isCorrect
                          ? <CheckCircle className="w-3 h-3 mt-1" style={{ color: comp.color }} />
                          : <XCircle className="w-3 h-3 mt-1 text-[#EF4444]" />
                      )}
                    </>
                  ) : (
                    <span className="text-[#2E2B27] text-xs">+</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Validation result */}
        <AnimatePresence>
          {phase === "VALIDATED" && validationResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-4">
              {validationResult.missing.length === 0 && validationResult.wrong.length === 0 ? (
                <p className="text-sm font-bold text-center" style={{ color: ACCENT }}>
                  Perfect architecture! All required components placed correctly.
                </p>
              ) : (
                <div className="text-xs text-[#9C948A] space-y-1">
                  {validationResult.correct.length > 0 && (
                    <p><span style={{ color: ACCENT }}>✓ Correct:</span> {validationResult.correct.map(id => COMPONENTS[id].label).join(", ")}</p>
                  )}
                  {validationResult.wrong.length > 0 && (
                    <p><span className="text-[#EF4444]">✗ Unnecessary:</span> {validationResult.wrong.map(id => COMPONENTS[id].label).join(", ")}</p>
                  )}
                  {validationResult.missing.length > 0 && (
                    <p><span className="text-[#FBBF24]">⚠ Missing:</span> {validationResult.missing.map(id => COMPONENTS[id].label).join(", ")}</p>
                  )}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => onExit(score)} className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">Exit</button>
                <button onClick={nextChallenge} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
                  {challengeIndex + 1 >= CHALLENGES.length ? "Finish" : "Next →"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "PLAYING" && (
          <button
            onClick={validate}
            disabled={placed.filter(Boolean).length === 0}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ background: ACCENT, color: "#0B0F14" }}
          >
            Validate Design
          </button>
        )}
      </div>
    </div>
  );
}
