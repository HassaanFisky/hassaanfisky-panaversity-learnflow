"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Crosshair, Scan, Bolt, Ghost, ChevronLeft } from "lucide-react";
import TimeBendQuiz from "./TimeBendQuiz";
import FocusBeam from "./FocusBeam";
import RealityGlitch from "./RealityGlitch";
import DecisionStorm from "./DecisionStorm";
import MemoryGhost from "./MemoryGhost";

type FluxMechanic = "SELECT" | "TIME_BEND" | "FOCUS_BEAM" | "REALITY_GLITCH" | "DECISION_STORM" | "MEMORY_GHOST";

const MECHANICS = [
  {
    id: "TIME_BEND" as FluxMechanic,
    icon: Clock,
    title: "Time Bending Quiz",
    tagline: "Correct answers slow time. Mistakes speed it up.",
    color: "#6EE7B7",
    colorFaint: "rgba(110,231,183,0.08)",
    colorBorder: "rgba(110,231,183,0.25)",
    tag: "Quiz",
  },
  {
    id: "FOCUS_BEAM" as FluxMechanic,
    icon: Crosshair,
    title: "Focus Beam",
    tagline: "Lock your cursor on the target. Hold steady as the beam narrows.",
    color: "#E58A6D",
    colorFaint: "rgba(229,138,109,0.08)",
    colorBorder: "rgba(229,138,109,0.25)",
    tag: "Precision",
  },
  {
    id: "REALITY_GLITCH" as FluxMechanic,
    icon: Scan,
    title: "Reality Glitch",
    tagline: "Four cards. Only one is real. Ghost cards shift and distort.",
    color: "#9B8FFF",
    colorFaint: "rgba(155,143,255,0.08)",
    colorBorder: "rgba(155,143,255,0.25)",
    tag: "Perception",
  },
  {
    id: "DECISION_STORM" as FluxMechanic,
    icon: Bolt,
    title: "Decision Storm",
    tagline: "True or False. Instantly. Time window shrinks every round.",
    color: "#F59E0B",
    colorFaint: "rgba(245,158,11,0.08)",
    colorBorder: "rgba(245,158,11,0.25)",
    tag: "Instinct",
  },
  {
    id: "MEMORY_GHOST" as FluxMechanic,
    icon: Ghost,
    title: "Memory Ghost",
    tagline: "Compete against your past self. Beat your ghost, set a new one.",
    color: "#9C948A",
    colorFaint: "rgba(156,148,138,0.08)",
    colorBorder: "rgba(156,148,138,0.20)",
    tag: "Memory",
  },
];

export default function FluxMode({ onExit }: { onExit: () => void }) {
  const [active, setActive] = useState<FluxMechanic>("SELECT");

  const goBack = () => setActive("SELECT");

  return (
    <AnimatePresence mode="wait">
      {active === "SELECT" && (
        <motion.div
          key="select"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-4xl px-4"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-10">
            <button
              onClick={onExit}
              className="text-[#5F5854] hover:text-[#F2EDE7] transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E58A6D] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#9C948A]">Flux Mode</span>
              </div>
              <h2 className="text-3xl font-bold text-[#F2EDE7] tracking-tight">Choose Your Mechanic</h2>
            </div>
          </div>

          {/* Mechanic grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MECHANICS.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActive(m.id)}
                  className="group relative p-6 rounded-3xl border text-left overflow-hidden transition-all duration-300"
                  style={{
                    borderColor: m.colorBorder,
                    background: m.colorFaint,
                  }}
                >
                  {/* Glow top-right */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle, ${m.color}20 0%, transparent 70%)` }}
                  />

                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${m.color}15`, border: `1px solid ${m.color}30` }}
                    >
                      <Icon size={18} style={{ color: m.color }} />
                    </div>
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.4em] px-2 py-0.5 rounded-full"
                      style={{ color: m.color, background: `${m.color}12`, border: `1px solid ${m.color}20` }}
                    >
                      {m.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#F2EDE7] mb-2">{m.title}</h3>
                  <p className="text-[#9C948A] text-xs leading-relaxed">{m.tagline}</p>

                  <div
                    className="mt-4 text-[9px] font-black uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5"
                    style={{ color: m.color }}
                  >
                    Enter <span>→</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {active === "TIME_BEND" && (
        <motion.div key="time_bend" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
          <TimeBendQuiz onExit={goBack} />
        </motion.div>
      )}

      {active === "FOCUS_BEAM" && (
        <motion.div key="focus_beam" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
          <FocusBeam onExit={goBack} />
        </motion.div>
      )}

      {active === "REALITY_GLITCH" && (
        <motion.div key="reality_glitch" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
          <RealityGlitch onExit={goBack} />
        </motion.div>
      )}

      {active === "DECISION_STORM" && (
        <motion.div key="decision_storm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
          <DecisionStorm onExit={goBack} />
        </motion.div>
      )}

      {active === "MEMORY_GHOST" && (
        <motion.div key="memory_ghost" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
          <MemoryGhost onExit={goBack} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
