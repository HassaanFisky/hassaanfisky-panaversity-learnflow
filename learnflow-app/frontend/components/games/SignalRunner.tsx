"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Radio, Cpu, Shield, RefreshCw, Activity } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#22D3EE";
const GAME_ID = "signalrunner" as const;

type EventType = "USER_ACTION" | "SYSTEM_EVENT" | "ERROR" | "TIMEOUT" | "SUCCESS";
type Handler = "AuthHandler" | "ErrorBoundary" | "CacheInvalidator" | "EventBus";

interface GameEvent {
  id: string;
  type: EventType;
  label: string;
  correctHandler: Handler;
  spawnTime: number;
  ttl: number;
}

const HANDLER_META: Record<Handler, { color: string; description: string; icon: React.ElementType }> = {
  AuthHandler:      { color: "#7CB9E8", description: "Handles user auth and permissions", icon: Shield },
  ErrorBoundary:    { color: "#EF4444", description: "Catches and processes errors",       icon: Activity },
  CacheInvalidator: { color: "#FBBF24", description: "Refreshes stale cached data",        icon: RefreshCw },
  EventBus:         { color: "#A78BFA", description: "Routes async system events",          icon: Cpu },
};

const EVENTS_POOL: Omit<GameEvent, "id" | "spawnTime">[] = [
  { type: "USER_ACTION",  label: "login_attempt",      correctHandler: "AuthHandler",      ttl: 4000 },
  { type: "ERROR",        label: "null_pointer_exc",   correctHandler: "ErrorBoundary",    ttl: 3500 },
  { type: "SYSTEM_EVENT", label: "user_preferences_updated", correctHandler: "CacheInvalidator", ttl: 4000 },
  { type: "USER_ACTION",  label: "token_refresh",      correctHandler: "AuthHandler",      ttl: 4000 },
  { type: "SUCCESS",      label: "order_completed",    correctHandler: "EventBus",         ttl: 4500 },
  { type: "TIMEOUT",      label: "session_expired",    correctHandler: "AuthHandler",      ttl: 3500 },
  { type: "ERROR",        label: "db_connection_fail", correctHandler: "ErrorBoundary",    ttl: 3500 },
  { type: "SYSTEM_EVENT", label: "config_changed",     correctHandler: "CacheInvalidator", ttl: 4000 },
  { type: "USER_ACTION",  label: "permission_check",   correctHandler: "AuthHandler",      ttl: 4000 },
  { type: "SUCCESS",      label: "payment_processed",  correctHandler: "EventBus",         ttl: 4500 },
  { type: "ERROR",        label: "rate_limit_exceeded",correctHandler: "ErrorBoundary",    ttl: 3500 },
  { type: "SYSTEM_EVENT", label: "product_stock_changed", correctHandler: "CacheInvalidator", ttl: 4000 },
  { type: "USER_ACTION",  label: "logout_request",     correctHandler: "AuthHandler",      ttl: 4000 },
  { type: "TIMEOUT",      label: "api_request_timeout",correctHandler: "ErrorBoundary",    ttl: 3500 },
  { type: "SUCCESS",      label: "email_sent",         correctHandler: "EventBus",         ttl: 4500 },
];

const EVENT_COLOR: Record<EventType, string> = {
  USER_ACTION:  "#7CB9E8",
  SYSTEM_EVENT: "#A78BFA",
  ERROR:        "#EF4444",
  TIMEOUT:      "#FBBF24",
  SUCCESS:      "#6EE7B7",
};

const ONBOARDING_STEPS = [
  {
    title: "Event Stream",
    body: "Events appear in the log feed at the top. Each event has a type label and a short identifier. They expire quickly.",
    icon: Radio,
  },
  {
    title: "Route Each Event",
    body: "Below are 4 handler buttons. Click the correct handler for each active event before its timer bar runs out.",
    icon: Cpu,
  },
  {
    title: "Know Your Handlers",
    body: "AuthHandler: auth events. ErrorBoundary: errors & timeouts. CacheInvalidator: system/config changes. EventBus: success events.",
    icon: Shield,
  },
  {
    title: "Build Combos",
    body: "3 correct routes in a row trigger a ×1.5 score multiplier. Wrong or expired events reset your combo.",
    icon: Activity,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "COMPLETE";

const HANDLERS: Handler[] = ["AuthHandler", "ErrorBoundary", "CacheInvalidator", "EventBus"];
const EVENTS_PER_ROUND = 10;
const SPAWN_INTERVAL = 2200;

export default function SignalRunner({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const [log, setLog] = useState<{ label: string; ok: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [spawnedCount, setSpawnedCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnedCountRef = useRef(0);
  const activeEventsRef = useRef<GameEvent[]>([]);

  useEffect(() => { activeEventsRef.current = activeEvents; }, [activeEvents]);

  const endGame = useCallback(() => {
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (expireRef.current) clearInterval(expireRef.current);
    setPhase("COMPLETE");
  }, []);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    spawnedCountRef.current = 0;
    setSpawnedCount(0);
    setActiveEvents([]);
    setLog([]);
    setScore(0);
    setCombo(0);

    spawnRef.current = setInterval(() => {
      if (spawnedCountRef.current >= EVENTS_PER_ROUND) {
        clearInterval(spawnRef.current!);
        // End after last events expire
        setTimeout(endGame, 5000);
        return;
      }
      const template = EVENTS_POOL[spawnedCountRef.current % EVENTS_POOL.length];
      const ev: GameEvent = {
        ...template,
        id: `${Date.now()}-${spawnedCountRef.current}`,
        spawnTime: Date.now(),
      };
      spawnedCountRef.current++;
      setSpawnedCount(c => c + 1);
      setActiveEvents(prev => [...prev, ev]);
    }, SPAWN_INTERVAL);

    // Expire events
    expireRef.current = setInterval(() => {
      const now = Date.now();
      setActiveEvents(prev => {
        const expired = prev.filter(e => now - e.spawnTime > e.ttl);
        if (expired.length > 0) {
          setCombo(0);
          setLog(l => [...expired.map(e => ({ label: e.label, ok: false })), ...l].slice(0, 8));
        }
        return prev.filter(e => now - e.spawnTime <= e.ttl);
      });
    }, 200);

    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (expireRef.current) clearInterval(expireRef.current);
    };
  }, [phase, endGame]);

  const handleRoute = useCallback((handler: Handler) => {
    if (activeEvents.length === 0) return;
    const event = activeEvents[0]; // route the oldest active event

    const correct = handler === event.correctHandler;
    const comboMultiplier = combo >= 3 ? 1.5 : 1;
    const pts = correct ? Math.round(100 * comboMultiplier) : 0;

    setActiveEvents(prev => prev.filter(e => e.id !== event.id));
    setScore(s => s + pts);
    setCombo(c => correct ? c + 1 : 0);
    setLog(prev => [{ label: event.label, ok: correct }, ...prev].slice(0, 8));
    setFeedback(correct ? (comboMultiplier > 1 ? `+${pts} COMBO!` : "Correct") : "Wrong handler");
    setTimeout(() => setFeedback(null), 600);
  }, [activeEvents, combo]);

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Signal Runner" />
    </div>
  );

  if (phase === "COMPLETE") {
    const correct = log.filter(l => l.ok).length;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
            <Radio className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Signal Runner</h2>
          <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">Round complete</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Score", value: score.toLocaleString(), color: ACCENT },
              { label: "Routed", value: `${correct}/${EVENTS_PER_ROUND}`, color: "#96D1C7" },
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
            <button onClick={() => { setPhase("PLAYING"); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const now = Date.now();

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
          {combo >= 2 && (
            <div className="text-center">
              <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Combo</p>
              <p className="text-sm font-bold text-[#FBBF24]">×{combo}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Events</p>
            <p className="text-sm font-bold">{spawnedCount}/{EVENTS_PER_ROUND}</p>
          </div>
        </div>
        <div className="w-4" />
      </div>

      <div className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-2xl mx-auto w-full">
        {/* Event log */}
        <div className="bg-[#0D1117] border border-[#2E2B27] rounded-2xl p-3 h-32 overflow-hidden">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">Event Stream</p>
          <div className="font-mono text-xs space-y-0.5">
            {log.slice(0, 5).map((entry, i) => (
              <p key={i} style={{ color: entry.ok ? "#6EE7B7" : "#EF4444", opacity: 1 - i * 0.18 }}>
                {entry.ok ? "✓" : "✗"} {entry.label}
              </p>
            ))}
            {log.length === 0 && (
              <motion.p animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-[#2E2B27]">
                awaiting events...
              </motion.p>
            )}
          </div>
        </div>

        {/* Active events */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">
            Active Events — route the oldest one
          </p>
          <div className="flex flex-col gap-2 min-h-[80px]">
            <AnimatePresence>
              {activeEvents.slice(0, 3).map((ev) => {
                const elapsed = now - ev.spawnTime;
                const pct = Math.max(0, 1 - elapsed / ev.ttl);
                const isOldest = ev.id === activeEvents[0]?.id;
                return (
                  <motion.div key={ev.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{
                      background: `${EVENT_COLOR[ev.type]}08`,
                      borderColor: isOldest ? `${EVENT_COLOR[ev.type]}60` : "#2E2B27",
                    }}
                  >
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                      style={{ color: EVENT_COLOR[ev.type], background: `${EVENT_COLOR[ev.type]}20` }}>
                      {ev.type}
                    </span>
                    <span className="font-mono text-xs flex-1 text-[#F2EDE7]">{ev.label}</span>
                    <div className="w-16 h-1 bg-[#2E2B27] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct * 100}%`, background: pct > 0.5 ? ACCENT : pct > 0.25 ? "#FBBF24" : "#EF4444" }} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {activeEvents.length === 0 && (
              <p className="text-[#2E2B27] text-xs text-center py-4">No active events</p>
            )}
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-sm font-bold"
              style={{ color: feedback.includes("Correct") || feedback.includes("COMBO") ? ACCENT : "#EF4444" }}>
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Handler buttons */}
        <div className="grid grid-cols-2 gap-3">
          {HANDLERS.map(handler => {
            const meta = HANDLER_META[handler];
            const Icon = meta.icon;
            return (
              <motion.button
                key={handler}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleRoute(handler)}
                disabled={activeEvents.length === 0}
                className="flex flex-col items-start p-4 rounded-2xl border transition-all min-h-[80px] disabled:opacity-40"
                style={{
                  background: `${meta.color}10`,
                  borderColor: `${meta.color}40`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-xs font-bold" style={{ color: meta.color }}>{handler}</span>
                </div>
                <p className="text-[9px] text-[#5F5854] leading-relaxed">{meta.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
