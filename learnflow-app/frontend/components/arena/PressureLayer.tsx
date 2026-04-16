"use client";

import { motion } from "framer-motion";
import { Zap, CheckCircle2, Circle } from "lucide-react";

export default function PressureLayer() {
  const challenges = [
    { id: 1, title: "Complete 2 Focus Sessions", type: "focus", completed: false, xp: 200 },
    { id: 2, title: "Score 500 in Concept Sprint", type: "sprint", completed: true, xp: 350 }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 text-[#9C948A]">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="text-sm font-semibold uppercase tracking-widest">Daily Pressure Rules</h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {challenges.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center justify-between p-4 rounded-2xl border ${
              c.completed 
                ? "border-[#96D1C7]/30 bg-[#96D1C7]/5 text-[#F2EDE7]" 
                : "border-[#2E2B27] bg-[#1C1A17] text-[#9C948A]"
            }`}
          >
            <div className="flex items-center gap-4">
              {c.completed ? (
                <CheckCircle2 className="w-6 h-6 text-[#96D1C7]" />
              ) : (
                <Circle className="w-6 h-6 text-[#5F5854]" />
              )}
              <span className={`font-medium ${c.completed ? "line-through opacity-70" : ""}`}>
                {c.title}
              </span>
            </div>
            <div className="text-sm font-mono bg-[#0B0F14] px-3 py-1 rounded-lg border border-[#2E2B27]">
              +{c.xp} XP
            </div>
          </motion.div>
        ))}
        <div className="mt-2 text-xs text-center text-[#5F5854]">
          Failure triggers streak decay at 00:00 UTC.
        </div>
      </div>
    </div>
  );
}
