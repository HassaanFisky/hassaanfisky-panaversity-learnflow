"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function FocusShield({ onExit }: { onExit: () => void }) {
  const TOTAL_TIME = 25 * 60; // 25 mins
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [shieldHp, setShieldHp] = useState(100);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [freeSwitchUsed, setFreeSwitchUsed] = useState(false);

  useEffect(() => {
    // Basic countdown
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // document.hidden tracking
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabHidden(true);
        if (!freeSwitchUsed) {
          setFreeSwitchUsed(true);
          // Toast or logic for warning
        } else {
          setShieldHp((prev) => Math.max(0, prev - 20));
        }
      } else {
        setIsTabHidden(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [freeSwitchUsed]);

  const percentage = (timeLeft / TOTAL_TIME) * 100;
  const isCritical = shieldHp < 50;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center w-full max-w-lg"
    >
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-widest text-[#F2EDE7] uppercase">Deep Focus</h2>
        <p className="text-[#E58A6D] text-sm mt-2">{shieldHp}% Integrity Remaining</p>
      </div>

      {/* SVG Ring Visual */}
      <div className="relative w-80 h-80 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="160" cy="160" r="140"
            className="stroke-[#1C1A17] fill-transparent stroke-[12]"
          />
          <motion.circle
            cx="160" cy="160" r="140"
            className={`fill-transparent stroke-[12] transition-all duration-1000 ease-linear ${
              isCritical ? "stroke-red-500" : shieldHp < 100 ? "stroke-yellow-500" : "stroke-[#96D1C7]"
            }`}
            strokeDasharray={2 * Math.PI * 140}
            strokeDashoffset={(2 * Math.PI * 140) * ((100 - percentage) / 100)}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-7xl font-bold text-[#F2EDE7] tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(242,237,231,0.2)]">
            {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </span>
          {isTabHidden ? (
            <span className="flex items-center gap-2 mt-4 text-red-500 animate-pulse text-sm">
              <AlertTriangle className="w-4 h-4" /> Focus Lost
            </span>
          ) : (
            <span className={`flex items-center gap-2 mt-4 text-sm ${isCritical ? "text-red-500" : "text-[#96D1C7]"}`}>
              <ShieldCheck className="w-4 h-4" /> Shield Active
            </span>
          )}
        </div>
      </div>

      <p className="mt-12 text-[#9C948A] text-center text-sm px-8">
        If you leave this tab, your shield will decay. <br/> Preserve integrity to earn *Overdrive Mode*.
      </p>

      <button
        onClick={onExit}
        className="mt-8 text-[#5F5854] hover:text-[#E58A6D] transition-colors uppercase tracking-widest text-xs"
      >
        Abort Sequence
      </button>
    </motion.div>
  );
}
