"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import FocusShield from "@/components/arena/FocusShield";
import ConceptSprint from "@/components/arena/ConceptSprint";
import ProgressionHUD from "@/components/arena/ProgressionHUD";
import PressureLayer from "@/components/arena/PressureLayer";
import FluxMode from "@/components/arena/FluxMode";

type ArenaMode = "SELECT" | "FOCUS" | "SPRINT" | "FLUX";

// The Arena Habit Engine
// Core Rule: Zero Clutter, 1 main action at a time.
export default function ArenaPage() {
  const [activeMode, setActiveMode] = useState<ArenaMode>("SELECT");

  // Force strict Dark Mode for Arena
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] font-inter overflow-hidden relative selection:bg-[#E58A6D] selection:text-[#0B0F14]">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F14]/50 to-[#0B0F14] pointer-events-none" />

      {/* Top HUD (Always visible) */}
      <ProgressionHUD setActiveMode={(m) => setActiveMode(m as ArenaMode)} />

      <main className="relative z-10 container mx-auto px-4 sm:px-6 min-h-[calc(100vh-80px)] flex flex-col justify-center items-center py-12">

        <AnimatePresence mode="wait">
          {/* State 1: Selection Mode */}
          {activeMode === "SELECT" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-5xl"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2E2B27] bg-[#1C1A17] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E58A6D] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#9C948A]">Training Modes</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">The Habit Engine</h1>
                <p className="text-[#9C948A] text-sm max-w-sm mx-auto">Choose your mode. Each one trains a different dimension of your mind.</p>
              </div>

              {/* Three mode cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-10">
                {/* Focus Shield */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveMode("FOCUS")}
                  className="group relative p-7 rounded-3xl border border-[#2E2B27] bg-[#1C1A17] hover:border-[#E58A6D]/50 text-left overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_60px_-12px_rgba(229,138,109,0.15)] transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[#E58A6D] opacity-[0.03] rounded-bl-full group-hover:opacity-[0.08] transition-opacity" />
                  <div className="w-10 h-10 rounded-xl bg-[#E58A6D]/10 border border-[#E58A6D]/20 flex items-center justify-center mb-4">
                    <span className="w-2 h-2 rounded-full bg-[#E58A6D] animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Focus Shield</h2>
                  <p className="text-[#9C948A] text-xs leading-relaxed mb-5">
                    25-minute deep focus. Tab-tracking enabled. Extreme pressure.
                  </p>
                  <div className="text-[9px] uppercase tracking-[0.4em] text-[#E58A6D] font-bold">Start →</div>
                </motion.button>

                {/* Concept Sprint */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveMode("SPRINT")}
                  className="group relative p-7 rounded-3xl border border-[#2E2B27] bg-[#1C1A17] hover:border-[#96D1C7]/50 text-left overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_60px_-12px_rgba(150,209,199,0.15)] transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[#96D1C7] opacity-[0.03] rounded-bl-full group-hover:opacity-[0.08] transition-opacity" />
                  <div className="w-10 h-10 rounded-xl bg-[#96D1C7]/10 border border-[#96D1C7]/20 flex items-center justify-center mb-4">
                    <span className="w-2 h-2 rounded-full bg-[#96D1C7] animate-pulse" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Concept Sprint</h2>
                  <p className="text-[#9C948A] text-xs leading-relaxed mb-5">
                    60-second rapid matching. Adaptive difficulty. Combo multipliers.
                  </p>
                  <div className="text-[9px] uppercase tracking-[0.4em] text-[#96D1C7] font-bold">Start →</div>
                </motion.button>

                {/* Flux Mode — premium card */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveMode("FLUX")}
                  className="group relative p-7 rounded-3xl border border-[#2E2B27] bg-gradient-to-br from-[#1C1A17] to-[#14100D] hover:border-[#E58A6D]/60 text-left overflow-hidden shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_70px_-12px_rgba(229,138,109,0.2)] transition-all duration-300"
                >
                  {/* Premium shimmer */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at top right, rgba(229,138,109,0.07) 0%, transparent 60%)" }}
                  />
                  <div className="absolute top-3 right-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] px-2 py-1 rounded-full border border-[#E58A6D]/30 text-[#E58A6D] bg-[#E58A6D]/8">
                      5 Mechanics
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E58A6D]/20 to-[#9B8FFF]/20 border border-[#E58A6D]/30 flex items-center justify-center mb-4">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L10.5 6H15L11 9.5L12.5 14.5L8 11.5L3.5 14.5L5 9.5L1 6H5.5L8 1Z" fill="#E58A6D" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    Flux Mode
                    <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-[#E58A6D]">NEW</span>
                  </h2>
                  <p className="text-[#9C948A] text-xs leading-relaxed mb-5">
                    Five interactive mechanics. Time Bending, Focus Beam, Reality Glitch, Decision Storm, Memory Ghost.
                  </p>
                  <div className="text-[9px] uppercase tracking-[0.4em] text-[#E58A6D] font-bold group-hover:text-[#FFB088] transition-colors">Start →</div>
                </motion.button>
              </div>

              {/* Daily Pressure Rules */}
              <PressureLayer />
            </motion.div>
          )}

          {/* State 2: Focus Mode */}
          {activeMode === "FOCUS" && (
            <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
              <FocusShield onExit={() => setActiveMode("SELECT")} />
            </motion.div>
          )}

          {/* State 3: Sprint Mode */}
          {activeMode === "SPRINT" && (
            <motion.div key="sprint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
              <ConceptSprint onExit={() => setActiveMode("SELECT")} />
            </motion.div>
          )}

          {/* State 4: Flux Mode */}
          {activeMode === "FLUX" && (
            <motion.div key="flux" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
              <FluxMode onExit={() => setActiveMode("SELECT")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
