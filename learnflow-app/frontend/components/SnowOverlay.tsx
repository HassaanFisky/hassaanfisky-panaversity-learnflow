"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Snowflake {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

/**
 * HASSAAN AI ARCHITECT — SnowOverlay Component
 */
export function SnowOverlay() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  const generateSnowflakes = useCallback(() => {
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 60; i++) {
      flakes.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 15,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    setSnowflakes(flakes);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("h1_snow_enabled") === "true";
    setIsEnabled(saved);
    if (saved) generateSnowflakes();

    const handleToggle = (e: any) => {
      const enabled = e.detail?.enabled;
      setIsEnabled(enabled);
      if (enabled) {
        generateSnowflakes();
      } else {
        setSnowflakes([]);
      }
    };

    window.addEventListener("toggle-snow" as any, handleToggle);
    return () => window.removeEventListener("toggle-snow" as any, handleToggle);
  }, [generateSnowflakes]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[8888] overflow-hidden">
      <AnimatePresence>
        {isEnabled && snowflakes.map((flake) => (
          <motion.div
            key={flake.id}
            initial={{ 
              opacity: 0, 
              x: `${flake.x}vw`, 
              y: "-5vh" 
            }}
            animate={{ 
              opacity: flake.opacity,
              y: "110vh",
              x: [`${flake.x}vw`, `${flake.x + (Math.random() * 10 - 5)}vw`, `${flake.x}vw`]
            }}
            transition={{ 
              duration: flake.duration, 
              repeat: Infinity, 
              delay: flake.delay,
              ease: "linear",
              times: [0, 0.5, 1]
            }}
            className="absolute bg-[var(--snow-color)] rounded-full blur-[1px]"
            style={{
              width: `${flake.size}px`,
              height: `${flake.size}px`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
