"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  Zap, Brain, Code2, Calculator, Layers,
  Trophy, Clock, Star, ChevronRight, Sparkles,
} from "lucide-react";
import ReactionBlitz from "@/components/games/ReactionBlitz";
import MemorySequence from "@/components/games/MemorySequence";
import CodeMatch from "@/components/games/CodeMatch";
import SpeedMath from "@/components/games/SpeedMath";
import TowerBuilder from "@/components/games/TowerBuilder";

type GameId = "reaction" | "memory" | "codematch" | "speedmath" | "tower";
type Screen = "HUB" | GameId;

interface GameDef {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  type: "QUICK" | "SKILL" | "PROGRESSION";
  duration: string;
  skill: string;
  scoreLabel: string;
  color: string;
  Icon: React.ElementType;
}

const GAMES: GameDef[] = [
  {
    id: "reaction",
    name: "Reaction Blitz",
    tagline: "10 rounds · pure instinct",
    description:
      "A glowing target flashes at a random spot. Click it before it vanishes. Score based on raw reaction speed.",
    type: "QUICK",
    duration: "~60s",
    skill: "Reaction Time",
    scoreLabel: "Best Points",
    color: "#E58A6D",
    Icon: Zap,
  },
  {
    id: "memory",
    name: "Memory Sequence",
    tagline: "Pattern recall · infinite levels",
    description:
      "Tiles light up in sequence. Replay them in perfect order. Every level adds one more tile to remember.",
    type: "QUICK",
    duration: "~90s",
    skill: "Working Memory",
    scoreLabel: "Best Level",
    color: "#96D1C7",
    Icon: Brain,
  },
  {
    id: "codematch",
    name: "Code Match",
    tagline: "60 seconds · knowledge sprint",
    description:
      "A tech definition appears. Pick the correct term from 4 choices. Combos multiply your score.",
    type: "SKILL",
    duration: "60s",
    skill: "Technical Recall",
    scoreLabel: "Best Score",
    color: "#9B8FFF",
    Icon: Code2,
  },
  {
    id: "speedmath",
    name: "Speed Math",
    tagline: "30 seconds · mental agility",
    description:
      "Rapid-fire arithmetic. Three choices per equation. Score every correct answer before time runs out.",
    type: "QUICK",
    duration: "30s",
    skill: "Mental Arithmetic",
    scoreLabel: "Best Correct",
    color: "#F6C90E",
    Icon: Calculator,
  },
  {
    id: "tower",
    name: "Tower Builder",
    tagline: "Endless · stack until you fall",
    description:
      "Each correct answer adds a block. One wrong answer and the entire tower collapses. How high can you go?",
    type: "PROGRESSION",
    duration: "Endless",
    skill: "Knowledge Depth",
    scoreLabel: "Best Height",
    color: "#6EE7B7",
    Icon: Layers,
  },
];

const TYPE_META: Record<
  GameDef["type"],
  { label: string; color: string; bg: string }
> = {
  QUICK: { label: "Quick Dopamine", color: "#E58A6D", bg: "rgba(229,138,109,0.1)" },
  SKILL: { label: "Skill Builder", color: "#9B8FFF", bg: "rgba(155,143,255,0.1)" },
  PROGRESSION: { label: "Progression", color: "#6EE7B7", bg: "rgba(110,231,183,0.1)" },
};

interface FinishedResult {
  gameId: GameId;
  score: number;
  isNewBest: boolean;
}

export default function GamesPage() {
  const [screen, setScreen] = useState<Screen>("HUB");
  const [highScores, setHighScores] = useState<Record<GameId, number>>({
    reaction: 0,
    memory: 0,
    codematch: 0,
    speedmath: 0,
    tower: 0,
  });
  const [totalXP, setTotalXP] = useState(0);
  const [lastResult, setLastResult] = useState<FinishedResult | null>(null);

  // Force dark mode identical to Arena
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lf_game_scores_v2");
      if (raw) setHighScores(JSON.parse(raw));
      const xp = localStorage.getItem("lf_game_xp_v2");
      if (xp) setTotalXP(Number(xp));
    } catch {
      /* ignore */
    }
  }, []);

  const handleGameEnd = useCallback(
    (gameId: GameId, score: number) => {
      let isNewBest = false;
      setHighScores((prev) => {
        if (score > (prev[gameId] ?? 0)) isNewBest = true;
        const updated = { ...prev, [gameId]: Math.max(prev[gameId] ?? 0, score) };
        localStorage.setItem("lf_game_scores_v2", JSON.stringify(updated));
        return updated;
      });
      const xpGain = Math.max(1, Math.floor(score * 0.5));
      setTotalXP((prev) => {
        const next = prev + xpGain;
        localStorage.setItem("lf_game_xp_v2", String(next));
        return next;
      });
      setLastResult({ gameId, score, isNewBest });
      setScreen("HUB");
    },
    []
  );

  const startGame = useCallback((id: GameId) => {
    setLastResult(null);
    setScreen(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] relative overflow-hidden selection:bg-[#E58A6D] selection:text-[#0B0F14]">
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(229,138,109,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E58A6D]/5 rounded-full blur-[80px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {screen === "HUB" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <HubView
              games={GAMES}
              highScores={highScores}
              totalXP={totalXP}
              lastResult={lastResult}
              onPlay={startGame}
            />
          </motion.div>
        )}

        {screen === "reaction" && (
          <motion.div
            key="reaction"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ReactionBlitz onExit={(s) => handleGameEnd("reaction", s)} />
          </motion.div>
        )}

        {screen === "memory" && (
          <motion.div
            key="memory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MemorySequence onExit={(s) => handleGameEnd("memory", s)} />
          </motion.div>
        )}

        {screen === "codematch" && (
          <motion.div
            key="codematch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <CodeMatch onExit={(s) => handleGameEnd("codematch", s)} />
          </motion.div>
        )}

        {screen === "speedmath" && (
          <motion.div
            key="speedmath"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <SpeedMath onExit={(s) => handleGameEnd("speedmath", s)} />
          </motion.div>
        )}

        {screen === "tower" && (
          <motion.div
            key="tower"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <TowerBuilder onExit={(s) => handleGameEnd("tower", s)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hub View ──────────────────────────────────────────────────────────────

interface HubProps {
  games: GameDef[];
  highScores: Record<GameId, number>;
  totalXP: number;
  lastResult: FinishedResult | null;
  onPlay: (id: GameId) => void;
}

function HubView({ games, highScores, totalXP, lastResult, onPlay }: HubProps) {
  const totalGamesPlayed = Object.values(highScores).filter((s) => s > 0).length;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-16 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-14">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2E2B27] bg-[#1C1A17] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E58A6D] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#9C948A]">
              Game Zone
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
            Play to Master
          </h1>
          <p className="text-[#9C948A] text-sm max-w-sm leading-relaxed">
            Five addictive games. Real skills. The more you play, the sharper you
            get.
          </p>
        </div>

        {/* XP + Stats */}
        <div className="flex gap-3 shrink-0">
          <div className="flex flex-col items-center justify-center px-5 py-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] min-w-[90px]">
            <Sparkles className="w-4 h-4 text-[#E58A6D] mb-1" />
            <span className="text-xl font-black text-[#E58A6D] tabular-nums">
              {totalXP.toLocaleString()}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-0.5">
              Total XP
            </span>
          </div>
          <div className="flex flex-col items-center justify-center px-5 py-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] min-w-[90px]">
            <Trophy className="w-4 h-4 text-[#96D1C7] mb-1" />
            <span className="text-xl font-black text-[#96D1C7] tabular-nums">
              {totalGamesPlayed}/5
            </span>
            <span className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-0.5">
              Played
            </span>
          </div>
        </div>
      </div>

      {/* Last result banner */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[#2E2B27] bg-[#1C1A17]">
              <span className="text-[#E58A6D] text-lg">
                {lastResult.isNewBest ? "🏆" : "✅"}
              </span>
              <p className="text-sm text-[#F2EDE7]">
                {lastResult.isNewBest ? (
                  <>
                    <span className="font-bold text-[#E58A6D]">New best!</span>{" "}
                    You scored{" "}
                    <span className="font-bold">{lastResult.score.toLocaleString()}</span>{" "}
                    on{" "}
                    <span className="font-bold capitalize">
                      {games.find((g) => g.id === lastResult.gameId)?.name}
                    </span>
                    . +{Math.floor(lastResult.score * 0.5)} XP earned.
                  </>
                ) : (
                  <>
                    You scored{" "}
                    <span className="font-bold">{lastResult.score.toLocaleString()}</span>{" "}
                    on{" "}
                    <span className="font-bold capitalize">
                      {games.find((g) => g.id === lastResult.gameId)?.name}
                    </span>
                    . Keep going!
                  </>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {games.map((game, i) => {
          const best = highScores[game.id] ?? 0;
          const typeMeta = TYPE_META[game.type];
          const hasPlayed = best > 0;

          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.06 }}
            >
              <motion.button
                whileHover={{ scale: 1.015, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPlay(game.id)}
                className="group relative w-full text-left p-6 rounded-3xl border border-[#2E2B27] bg-[#1C1A17] overflow-hidden transition-shadow duration-300 hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]"
                style={{
                  ["--hover-shadow" as string]: `0 20px 60px -12px ${game.color}22`,
                }}
              >
                {/* Radial glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at top right, ${game.color}09 0%, transparent 65%)`,
                  }}
                />

                {/* Top row: Icon + Type badge */}
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                      background: `${game.color}15`,
                      borderColor: `${game.color}30`,
                    }}
                  >
                    <game.Icon
                      className="w-5 h-5"
                      style={{ color: game.color }}
                    />
                  </div>
                  <span
                    className="text-[8px] font-black uppercase tracking-[0.35em] px-2 py-1 rounded-full"
                    style={{
                      color: typeMeta.color,
                      background: typeMeta.bg,
                    }}
                  >
                    {typeMeta.label}
                  </span>
                </div>

                {/* Name + tagline */}
                <h3 className="text-lg font-bold mb-0.5">{game.name}</h3>
                <p
                  className="text-[10px] uppercase tracking-widest mb-3"
                  style={{ color: game.color }}
                >
                  {game.tagline}
                </p>

                {/* Description */}
                <p className="text-[#9C948A] text-xs leading-relaxed mb-5">
                  {game.description}
                </p>

                {/* Stats row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#5F5854]" />
                      <span className="text-[10px] text-[#5F5854]">
                        {game.duration}
                      </span>
                    </div>
                    {hasPlayed && (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3 h-3" style={{ color: game.color }} />
                        <span
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: game.color }}
                        >
                          {best.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.4em] group-hover:gap-2 transition-all"
                    style={{ color: game.color }}
                  >
                    {hasPlayed ? "Play" : "Start"}
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Bottom: Skill label */}
                <div className="mt-4 pt-4 border-t border-[#2E2B27]">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#5F5854]">
                    Trains:{" "}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#9C948A] font-semibold">
                    {game.skill}
                  </span>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-[#3A3530] text-[10px] uppercase tracking-widest mt-12">
        All scores saved locally · No account required · Play anytime
      </p>
    </div>
  );
}
