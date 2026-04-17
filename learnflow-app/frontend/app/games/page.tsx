"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  Zap, Brain, Code2, Calculator, Layers,
  Trophy, Star, ChevronRight, Sparkles,
  GitBranch, Users, Bug, Server, Scale,
  GitMerge, Radio, MemoryStick, Eye,
  Workflow, Activity, SlidersHorizontal,
} from "lucide-react";

import ReactionBlitz from "@/components/games/ReactionBlitz";
import MemorySequence from "@/components/games/MemorySequence";
import CodeMatch from "@/components/games/CodeMatch";
import SpeedMath from "@/components/games/SpeedMath";
import TowerBuilder from "@/components/games/TowerBuilder";
import LogicBuilder from "@/components/games/LogicBuilder";
import AgentCommander from "@/components/games/AgentCommander";
import DebugEscape from "@/components/games/DebugEscape";
import SystemArchitect from "@/components/games/SystemArchitect";
import DecisionLab from "@/components/games/DecisionLab";
import FlowFixer from "@/components/games/FlowFixer";
import SignalRunner from "@/components/games/SignalRunner";
import ResourceManager from "@/components/games/ResourceManager";
import PatternHunter from "@/components/games/PatternHunter";
import AutomationMaster from "@/components/games/AutomationMaster";
import RealWorldSim from "@/components/games/RealWorldSim";
import CodeStrategist from "@/components/games/CodeStrategist";
import { GameEngine } from "@/components/games/engine/GameEngine";
import type { GameId, GameCategory, GameState } from "@/components/games/engine/gameTypes";

type Screen = "HUB" | GameId;

interface GameDef {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  category: GameCategory;
  duration: string;
  skill: string;
  scoreLabel: string;
  color: string;
  Icon: React.ElementType;
}

const GAMES: GameDef[] = [
  // ── Quick Skills ──────────────────────────────────────────────────────────
  {
    id: "reaction", name: "Reaction Blitz", tagline: "10 rounds · pure instinct",
    description: "A glowing target flashes at a random spot. Click it before it vanishes. Score based on raw reaction speed.",
    category: "QUICK_SKILLS", duration: "~60s", skill: "Reaction Time", scoreLabel: "Best Points", color: "#E58A6D", Icon: Zap,
  },
  {
    id: "memory", name: "Memory Sequence", tagline: "Pattern recall · infinite levels",
    description: "Tiles light up in sequence. Replay them in perfect order. Every level adds one more tile to remember.",
    category: "QUICK_SKILLS", duration: "~90s", skill: "Working Memory", scoreLabel: "Best Level", color: "#96D1C7", Icon: Brain,
  },
  {
    id: "codematch", name: "Code Match", tagline: "60 seconds · knowledge sprint",
    description: "A tech definition appears. Pick the correct term from 4 choices. Combos multiply your score.",
    category: "QUICK_SKILLS", duration: "60s", skill: "Technical Recall", scoreLabel: "Best Score", color: "#9B8FFF", Icon: Code2,
  },
  {
    id: "speedmath", name: "Speed Math", tagline: "30 seconds · mental agility",
    description: "Rapid-fire arithmetic. Three choices per equation. Score every correct answer before time runs out.",
    category: "QUICK_SKILLS", duration: "30s", skill: "Mental Arithmetic", scoreLabel: "Best Correct", color: "#F6C90E", Icon: Calculator,
  },
  {
    id: "tower", name: "Tower Builder", tagline: "Endless · stack until you fall",
    description: "Each correct answer adds a block. One wrong answer collapses the tower. How high can you go?",
    category: "QUICK_SKILLS", duration: "Endless", skill: "Knowledge Depth", scoreLabel: "Best Height", color: "#6EE7B7", Icon: Layers,
  },

  // ── Systems Thinking ──────────────────────────────────────────────────────
  {
    id: "logicbuilder", name: "Logic Builder", tagline: "Sequence pipelines · beat the clock",
    description: "A target pipeline is shown. Reconstruct the exact step order by clicking blocks from a shuffled pool.",
    category: "SYSTEMS", duration: "3 levels", skill: "Workflow Design", scoreLabel: "Best Score", color: "#7CB9E8", Icon: GitBranch,
  },
  {
    id: "systemarchitect", name: "System Architect", tagline: "Design systems · validate topology",
    description: "Given a system spec, choose the right components and place them on a grid. Validate your architecture.",
    category: "SYSTEMS", duration: "4 challenges", skill: "System Design", scoreLabel: "Best Score", color: "#34D399", Icon: Server,
  },
  {
    id: "flowfixer", name: "Flow Fixer", tagline: "Repair pipelines · 60-second sprint",
    description: "A data pipeline diagram shows broken connections. Find and fix each one by selecting the correct connector.",
    category: "SYSTEMS", duration: "60s", skill: "Pipeline Reasoning", scoreLabel: "Best Score", color: "#F472B6", Icon: GitMerge,
  },
  {
    id: "realworldsim", name: "Real World Simulator", tagline: "Incident scenarios · make decisions",
    description: "A production incident unfolds as a timestamped log. Make decisions at key moments. Resolve or escalate.",
    category: "SYSTEMS", duration: "3 scenarios", skill: "Incident Response", scoreLabel: "Best Score", color: "#E879F9", Icon: Activity,
  },

  // ── Decision & Strategy ───────────────────────────────────────────────────
  {
    id: "decisionlab", name: "Decision Lab", tagline: "6 scenarios · no time pressure",
    description: "Real technical and operational dilemmas. Choose the best option. See consequence metrics after each choice.",
    category: "DECISIONS", duration: "6 scenarios", skill: "Decision Making", scoreLabel: "Best Score", color: "#FBBF24", Icon: Scale,
  },
  {
    id: "agentcommander", name: "Agent Commander", tagline: "Assign tasks · balance load",
    description: "Tasks arrive with urgency and type. Assign each to the right specialized agent within capacity limits.",
    category: "DECISIONS", duration: "3 rounds", skill: "Task Delegation", scoreLabel: "Best Score", color: "#A78BFA", Icon: Users,
  },
  {
    id: "codestrategist", name: "Code Strategist", tagline: "8 problems · pick the right approach",
    description: "Engineering problems with a given optimization constraint. Choose the algorithm that best fits the requirement.",
    category: "DECISIONS", duration: "8 rounds", skill: "Algorithmic Thinking", scoreLabel: "Best Score", color: "#6EE7B7", Icon: Code2,
  },

  // ── Debug & Fix ───────────────────────────────────────────────────────────
  {
    id: "debugescape", name: "Debug Escape", tagline: "Find bugs · fix them fast",
    description: "Short code blocks with hidden bugs. Click the buggy line, then select the correct fix from 3 options.",
    category: "DEBUG", duration: "5 puzzles", skill: "Debugging", scoreLabel: "Best Score", color: "#F97316", Icon: Bug,
  },
  {
    id: "signalrunner", name: "Signal Runner", tagline: "Route events · build combos",
    description: "Events stream in and expire quickly. Route each to the correct handler before the timer bar runs out.",
    category: "DEBUG", duration: "10 events", skill: "Event Reasoning", scoreLabel: "Best Score", color: "#22D3EE", Icon: Radio,
  },
  {
    id: "resourcemanager", name: "Resource Manager", tagline: "Balance servers · 90-second session",
    description: "Jobs arrive with CPU and memory requirements. Assign them to servers without triggering overloads.",
    category: "DEBUG", duration: "90s", skill: "Capacity Planning", scoreLabel: "Best Score", color: "#A3E635", Icon: MemoryStick,
  },

  // ── Analysis & Patterns ───────────────────────────────────────────────────
  {
    id: "patternhunter", name: "Pattern Hunter", tagline: "10 rounds · 20 seconds each",
    description: "A sequence with a hidden rule is shown. Find the pattern and select the correct next item.",
    category: "PATTERNS", duration: "10 rounds", skill: "Pattern Recognition", scoreLabel: "Best Score", color: "#818CF8", Icon: Eye,
  },
  {
    id: "automationmaster", name: "Automation Master", tagline: "Build pipelines · transform data",
    description: "Given input data and desired output, chain the correct operations in the right order to transform it.",
    category: "PATTERNS", duration: "5 challenges", skill: "Functional Thinking", scoreLabel: "Best Score", color: "#FB923C", Icon: Workflow,
  },
];

const CATEGORY_META: Record<GameCategory | "ALL", { label: string; color: string }> = {
  ALL:          { label: "All Games",         color: "#9C948A" },
  QUICK_SKILLS: { label: "Quick Skills",      color: "#E58A6D" },
  SYSTEMS:      { label: "Systems Thinking",  color: "#34D399" },
  DECISIONS:    { label: "Decision & Strategy", color: "#FBBF24" },
  DEBUG:        { label: "Debug & Fix",       color: "#F97316" },
  PATTERNS:     { label: "Analysis & Patterns", color: "#818CF8" },
};

export default function GamesPage() {
  const [screen, setScreen] = useState<Screen>("HUB");
  const [gameState, setGameState] = useState<GameState>(() => GameEngine.loadState());
  const [activeCategory, setActiveCategory] = useState<GameCategory | "ALL">("ALL");
  const [lastResult, setLastResult] = useState<{ gameId: GameId; score: number; isNewBest: boolean } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  // Refresh state from localStorage on hub return
  useEffect(() => {
    if (screen === "HUB") {
      setGameState(GameEngine.loadState());
    }
  }, [screen]);

  const handleGameEnd = useCallback((gameId: GameId, score: number) => {
    const state = GameEngine.loadState();
    const isNewBest = score > (state.highScores[gameId] ?? 0);
    const nextState = GameEngine.saveResult(state, gameId, score);
    setGameState(nextState);
    setLastResult({ gameId, score, isNewBest });
    setScreen("HUB");
  }, []);

  const startGame = useCallback((id: GameId) => {
    setLastResult(null);
    setScreen(id);
  }, []);

  // Render active game
  if (screen !== "HUB") {
    const gameProps = { onExit: (s: number) => handleGameEnd(screen as GameId, s) };
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7]">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {screen === "reaction"        && <ReactionBlitz     {...gameProps} />}
            {screen === "memory"          && <MemorySequence    {...gameProps} />}
            {screen === "codematch"       && <CodeMatch         {...gameProps} />}
            {screen === "speedmath"       && <SpeedMath         {...gameProps} />}
            {screen === "tower"           && <TowerBuilder      {...gameProps} />}
            {screen === "logicbuilder"    && <LogicBuilder      {...gameProps} />}
            {screen === "agentcommander"  && <AgentCommander    {...gameProps} />}
            {screen === "debugescape"     && <DebugEscape       {...gameProps} />}
            {screen === "systemarchitect" && <SystemArchitect   {...gameProps} />}
            {screen === "decisionlab"     && <DecisionLab       {...gameProps} />}
            {screen === "flowfixer"       && <FlowFixer         {...gameProps} />}
            {screen === "signalrunner"    && <SignalRunner      {...gameProps} />}
            {screen === "resourcemanager" && <ResourceManager   {...gameProps} />}
            {screen === "patternhunter"   && <PatternHunter     {...gameProps} />}
            {screen === "automationmaster"&& <AutomationMaster  {...gameProps} />}
            {screen === "realworldsim"    && <RealWorldSim      {...gameProps} />}
            {screen === "codestrategist"  && <CodeStrategist    {...gameProps} />}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const { highScores, totalXP, mastery } = gameState;
  const totalPlayed = Object.values(highScores).filter(s => s > 0).length;
  const filteredGames = activeCategory === "ALL" ? GAMES : GAMES.filter(g => g.category === activeCategory);
  const categoryGroups: (GameCategory | "ALL")[] = ["ALL", "QUICK_SKILLS", "SYSTEMS", "DECISIONS", "DEBUG", "PATTERNS"];

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] relative overflow-hidden selection:bg-[#E58A6D] selection:text-[#0B0F14]">
      {/* Subtle dot-grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(229,138,109,0.05) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-[#E58A6D]/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-6xl relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2E2B27] bg-[#1C1A17] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E58A6D] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#9C948A]">
                Play & Learn
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
              Think. Play. Level Up.
            </h1>
            <p className="text-[#9C948A] text-sm max-w-md leading-relaxed">
              17 games across 5 skill domains. Real problems. Real thinking. No lectures.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 shrink-0">
            <div className="flex flex-col items-center justify-center px-5 py-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] min-w-[90px]">
              <Sparkles className="w-4 h-4 text-[#E58A6D] mb-1" />
              <span className="text-xl font-black text-[#E58A6D] tabular-nums">{totalXP.toLocaleString()}</span>
              <span className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-0.5">Total XP</span>
            </div>
            <div className="flex flex-col items-center justify-center px-5 py-4 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] min-w-[90px]">
              <Trophy className="w-4 h-4 text-[#96D1C7] mb-1" />
              <span className="text-xl font-black text-[#96D1C7] tabular-nums">{totalPlayed}/{GAMES.length}</span>
              <span className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-0.5">Played</span>
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
                <span className="text-[#E58A6D] text-lg">{lastResult.isNewBest ? "🏆" : "✅"}</span>
                <p className="text-sm text-[#F2EDE7]">
                  {lastResult.isNewBest ? (
                    <>
                      <span className="font-bold text-[#E58A6D]">New best!</span>{" "}
                      You scored <span className="font-bold">{lastResult.score.toLocaleString()}</span> on{" "}
                      <span className="font-bold">{GAMES.find(g => g.id === lastResult.gameId)?.name}</span>.
                      {" "}+{Math.floor(lastResult.score * 0.4)} XP earned.
                    </>
                  ) : (
                    <>
                      You scored <span className="font-bold">{lastResult.score.toLocaleString()}</span> on{" "}
                      <span className="font-bold">{GAMES.find(g => g.id === lastResult.gameId)?.name}</span>.
                      {" "}Keep pushing.
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-8">
          {categoryGroups.map(cat => {
            const meta = CATEGORY_META[cat];
            const isActive = activeCategory === cat;
            return (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                style={{
                  background: isActive ? `${meta.color}18` : "#1C1A17",
                  borderColor: isActive ? meta.color : "#2E2B27",
                  color: isActive ? meta.color : "#5F5854",
                }}
              >
                {cat === "ALL" && <SlidersHorizontal className="w-3 h-3" />}
                {meta.label}
              </motion.button>
            );
          })}
        </div>

        {/* Games grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredGames.map((game, i) => {
              const best = highScores[game.id] ?? 0;
              const gameMastery = mastery[game.id] ?? 0;
              const hasPlayed = best > 0;
              const masteryLevel = GameEngine.getMasteryLevel(gameMastery);
              const masteryColor = gameMastery >= 80 ? "#A78BFA" : gameMastery >= 60 ? "#34D399" : gameMastery >= 40 ? "#FBBF24" : gameMastery > 0 ? "#E58A6D" : "#3A3530";

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.04 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.015, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startGame(game.id)}
                    className="group relative w-full text-left p-6 rounded-3xl border border-[#2E2B27] bg-[#1C1A17] overflow-hidden transition-shadow duration-300 hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]"
                  >
                    {/* Radial glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at top right, ${game.color}09 0%, transparent 65%)` }}
                    />

                    {/* Category badge + icon row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{ background: `${game.color}15`, borderColor: `${game.color}30` }}>
                        <game.Icon className="w-5 h-5" style={{ color: game.color }} />
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPlayed && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: masteryColor }} />
                            <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: masteryColor }}>
                              {masteryLevel}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Name + tagline */}
                    <h3 className="text-lg font-bold mb-0.5">{game.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: game.color }}>
                      {game.tagline}
                    </p>

                    {/* Description */}
                    <p className="text-[#9C948A] text-xs leading-relaxed mb-5">{game.description}</p>

                    {/* Stats row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-[#5F5854]">{game.duration}</span>
                        {hasPlayed && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3 h-3" style={{ color: game.color }} />
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: game.color }}>
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

                    {/* Skill label */}
                    <div className="mt-4 pt-4 border-t border-[#2E2B27]">
                      <span className="text-[9px] uppercase tracking-[0.3em] text-[#5F5854]">Trains: </span>
                      <span className="text-[9px] uppercase tracking-[0.3em] text-[#9C948A] font-semibold">
                        {game.skill}
                      </span>
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-[#3A3530] text-[10px] uppercase tracking-widest mt-12">
          All scores saved locally · No account required · Play anytime
        </p>
      </div>
    </div>
  );
}
