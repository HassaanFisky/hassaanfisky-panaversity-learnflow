"use client";

import { motion } from "framer-motion";
import { Flame, Trophy, ChevronLeft, Target } from "lucide-react";

export default function ProgressionHUD({ setActiveMode }: { setActiveMode: (mode: "SELECT" | "FOCUS" | "SPRINT") => void }) {
  // Mock Psychology Data
  const xp = 1450;
  const level = 12;
  const streak = 14; // days
  const progressPercent = 65; // XP to next level

  return (
    <nav className="w-full h-20 border-b border-[#2E2B27] flex items-center justify-between px-6 bg-[#0B0F14]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <button 
          onClick={() => setActiveMode("SELECT")}
          className="text-[#9C948A] hover:text-[#F2EDE7] transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-wide text-[#F2EDE7] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#E58A6D]" /> Level {level}
          </span>
          <span className="text-xs text-[#9C948A] uppercase tracking-widest">{xp} XP - Focus Beast</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Streak System: Fire Bar */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[#E58A6D] font-bold">
            <Flame className="w-5 h-5 fill-[#E58A6D]" /> {streak} Day Streak
          </div>
          {/* Energy Meter */}
          <div className="w-32 h-1.5 bg-[#1C1A17] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-[#E58A6D] to-[#FFB088]"
            />
          </div>
        </div>

        {/* Level Progress */}
        <div className="flex flex-col items-end gap-1 w-48">
          <div className="flex items-center justify-between w-full text-xs text-[#9C948A]">
            <span>Rank Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1C1A17] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="h-full bg-[#96D1C7]"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
