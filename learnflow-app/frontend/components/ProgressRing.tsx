"use client";

import { motion } from "framer-motion";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function ProgressRing({ 
  percentage = 0, 
  size = 120, 
  strokeWidth = 10,
  color = "hsl(var(--primary))"
}: ProgressRingProps) {
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center drop-shadow-2xl">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--secondary))"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ 
            filter: "drop-shadow(0 0 10px rgba(59,130,246,0.5))"
          }}
        />
      </svg>
      {/* Subtle background glow */}
      <div 
        className="absolute inset-4 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-1000"
        style={{ 
          backgroundColor: color,
          transform: `scale(${0.5 + (percentage / 200)})`
        }} 
      />
    </div>
  );
}
