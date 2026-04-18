"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Flame, Sparkles, Star, ChevronRight } from "lucide-react";
import Afterburn from "@/components/games/Afterburn";
import TheDrift from "@/components/games/TheDrift";
import Cascade from "@/components/games/Cascade";
import GhostSignal from "@/components/games/GhostSignal";
import TheWeight from "@/components/games/TheWeight";

type GameId = "afterburn" | "drift" | "cascade" | "ghost" | "weight";
type Screen = "HUB" | GameId;

interface GameRecord {
  best: number;
  sessions: number;
}

const STORAGE_KEYS: Record<GameId, string> = {
  afterburn: "lf_afterburn",
  drift: "lf_thedrift",
  cascade: "lf_cascade",
  ghost: "lf_ghostsignal",
  weight: "lf_theweight",
};

interface GameDef {
  id: GameId;
  name: string;
  color: string;
  description: string;
}

const GAMES: GameDef[] = [
  { id: "afterburn", name: "Afterburn", color: "#FF4D00", description: "Bursts cross rails. Let the right colors pass and chain streaks." },
  { id: "drift", name: "The Drift", color: "#00C9FF", description: "A quiet field of dots. One differs. Spot it before time thins." },
  { id: "cascade", name: "Cascade", color: "#9B5DFF", description: "Tap tiles to flip them plus their neighbors. Shape the target." },
  { id: "ghost", name: "Ghost Signal", color: "#00FFB2", description: "Pads light and sing. Echo the sequence back with steady hands." },
  { id: "weight", name: "The Weight", color: "#FFB830", description: "Balance a beam using token weights. Read the goal. Settle it." },
];

interface Streak {
  count: number;
  lastDate: string;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export default function GamesPage() {
  const [screen, setScreen] = useState<Screen>("HUB");
  const [records, setRecords] = useState<Record<GameId, GameRecord>>({
    afterburn: { best: 0, sessions: 0 },
    drift: { best: 0, sessions: 0 },
    cascade: { best: 0, sessions: 0 },
    ghost: { best: 0, sessions: 0 },
    weight: { best: 0, sessions: 0 },
  });
  const [globalXP, setGlobalXP] = useState(0);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastDate: "" });

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    try {
      const next: Record<GameId, GameRecord> = { ...records };
      let changed = false;
      (Object.keys(STORAGE_KEYS) as GameId[]).forEach((id) => {
        const raw = localStorage.getItem(STORAGE_KEYS[id]);
        if (raw) {
          const parsed = JSON.parse(raw) as GameRecord;
          next[id] = parsed;
          changed = true;
        }
      });
      if (changed) setRecords(next);
      const xp = localStorage.getItem("lf_global_xp");
      if (xp) setGlobalXP(Number(xp));
      const st = localStorage.getItem("lf_streak");
      if (st) setStreak(JSON.parse(st) as Streak);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGameEnd = useCallback(
    (id: GameId, score: number) => {
      setRecords((prev) => {
        const cur = prev[id];
        const updated: GameRecord = {
          best: Math.max(cur.best, score),
          sessions: cur.sessions + 1,
        };
        const next = { ...prev, [id]: updated };
        try {
          localStorage.setItem(STORAGE_KEYS[id], JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return next;
      });
      setGlobalXP((prev) => {
        const add = Math.floor(score / 10);
        const next = prev + add;
        try {
          localStorage.setItem("lf_global_xp", String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setStreak((prev) => {
        const today = todayStr();
        let nextCount = prev.count;
        if (prev.lastDate === today) {
          // unchanged
        } else if (prev.lastDate && daysBetween(prev.lastDate, today) === 1) {
          nextCount = prev.count + 1;
        } else {
          nextCount = 1;
        }
        const next: Streak = { count: nextCount, lastDate: today };
        try {
          localStorage.setItem("lf_streak", JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setScreen("HUB");
    },
    []
  );

  const startGame = useCallback((id: GameId) => setScreen(id), []);

  const dailyFocusId = useMemo<GameId>(() => {
    const d = new Date();
    const doy = Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return GAMES[doy % GAMES.length].id;
  }, []);

  const particles = useMemo(() => {
    let r = 9133;
    const rnd = () => {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      return r / 0x7fffffff;
    };
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: rnd() * 100,
      y: rnd() * 100,
      s: 1 + rnd() * 2,
    }));
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#060412", color: "#F2EDE7" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(155,93,255,0.15) 0%, transparent 60%)",
        }}
      />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            opacity: 0.05,
          }}
        />
      ))}

      <AnimatePresence mode="wait">
        {screen === "HUB" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <HubView
              records={records}
              globalXP={globalXP}
              streak={streak}
              dailyFocusId={dailyFocusId}
              onPlay={startGame}
            />
          </motion.div>
        )}
        {screen === "afterburn" && (
          <motion.div key="afterburn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Afterburn onExit={(s) => handleGameEnd("afterburn", s)} />
          </motion.div>
        )}
        {screen === "drift" && (
          <motion.div key="drift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TheDrift onExit={(s) => handleGameEnd("drift", s)} />
          </motion.div>
        )}
        {screen === "cascade" && (
          <motion.div key="cascade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Cascade onExit={(s) => handleGameEnd("cascade", s)} />
          </motion.div>
        )}
        {screen === "ghost" && (
          <motion.div key="ghost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GhostSignal onExit={(s) => handleGameEnd("ghost", s)} />
          </motion.div>
        )}
        {screen === "weight" && (
          <motion.div key="weight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TheWeight onExit={(s) => handleGameEnd("weight", s)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface HubProps {
  records: Record<GameId, GameRecord>;
  globalXP: number;
  streak: Streak;
  dailyFocusId: GameId;
  onPlay: (id: GameId) => void;
}

function HubView({ records, globalXP, streak, dailyFocusId, onPlay }: HubProps) {
  const xpLevel = Math.floor(globalXP / 500);
  const xpInto = globalXP % 500;
  const xpFrac = xpInto / 500;

  return (
    <div className="relative container mx-auto px-4 sm:px-6 py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
            <Flame className="w-4 h-4" style={{ color: "#FFB830" }} />
            <span className="text-sm font-bold text-white tabular-nums">{streak.count}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">streak</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 min-w-[220px]">
            <Sparkles className="w-4 h-4" style={{ color: "#9B5DFF" }} />
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${xpFrac * 100}%`, background: "#9B5DFF" }}
                />
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">Lv {xpLevel}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.4em] text-white/40">Today's pick</div>
          <div className="text-sm font-bold mt-1" style={{ color: GAMES.find((g) => g.id === dailyFocusId)?.color }}>
            {GAMES.find((g) => g.id === dailyFocusId)?.name}
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white">
          Five little games.
        </h1>
        <p className="text-white/50 text-base mt-3 max-w-md">
          Short sessions. Quiet rewards. Come back tomorrow.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GAMES.map((game, i) => {
          const rec = records[game.id];
          const isFocus = game.id === dailyFocusId;
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <motion.button
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlay(game.id)}
                className="group relative w-full text-left rounded-3xl border overflow-hidden bg-white/[0.02]"
                style={{
                  borderColor: isFocus ? game.color : "rgba(255,255,255,0.08)",
                  boxShadow: isFocus ? `0 0 40px ${game.color}22` : "none",
                  minHeight: 340,
                }}
              >
                <div
                  className="relative overflow-hidden"
                  style={{ height: "55%", minHeight: 180, background: `linear-gradient(135deg, ${game.color}11, transparent)` }}
                >
                  <GamePreview id={game.id} color={game.color} />
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">{game.name}</h3>
                    {rec.best > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" style={{ color: game.color }} />
                        <span className="text-xs font-bold tabular-nums" style={{ color: game.color }}>
                          {rec.best.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed mb-4">{game.description}</p>
                  <div
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.4em] group-hover:gap-2 transition-all"
                    style={{ color: game.color }}
                  >
                    Play <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function GamePreview({ id, color }: { id: GameId; color: string }) {
  if (id === "afterburn") {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{ background: color, boxShadow: `0 0 30px ${color}` }}
          animate={{ x: [-80, 80, -80] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }
  if (id === "drift") {
    return (
      <div className="absolute inset-0 grid grid-cols-5 gap-3 p-6">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ background: color, width: 8, height: 8 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2 + (i % 3) * 0.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    );
  }
  if (id === "cascade") {
    return (
      <div className="absolute inset-0 grid grid-cols-4 gap-2 p-6">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-md aspect-square"
            style={{ background: color }}
            animate={{ opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: ((i % 4) + Math.floor(i / 4)) * 0.12 }}
          />
        ))}
      </div>
    );
  }
  if (id === "ghost") {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-8 h-8 rounded-lg"
              style={{ background: color }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.4, repeatDelay: 2 }}
            />
          ))}
        </div>
      </div>
    );
  }
  // weight
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="relative"
        animate={{ rotate: [-8, 8, -8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-40 h-1" style={{ background: color }} />
        <div className="absolute -left-4 top-1 w-3 h-6" style={{ background: color, opacity: 0.6 }} />
        <div className="absolute -right-4 top-1 w-3 h-6" style={{ background: color, opacity: 0.6 }} />
      </motion.div>
    </div>
  );
}
