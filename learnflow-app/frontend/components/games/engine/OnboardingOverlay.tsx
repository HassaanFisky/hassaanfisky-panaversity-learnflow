"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface OnboardingStep {
  visual: ReactNode;
  line: string;
}

interface OnboardingOverlayProps {
  steps: OnboardingStep[];
  accentColor: string;
  storageKey: string;
  onDone: () => void;
}

export default function OnboardingOverlay({
  steps,
  accentColor,
  storageKey,
  onDone,
}: OnboardingOverlayProps) {
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey);
      if (seen) {
        onDone();
        return;
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [storageKey, onDone]);

  const finish = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    onDone();
  };

  const next = () => {
    if (idx < steps.length - 1) setIdx(idx + 1);
    else finish();
  };

  if (!ready) return null;

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-lg bg-black/85 flex items-center justify-center p-6">
      <button
        onClick={finish}
        className="absolute top-6 right-6 text-xs uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors min-w-[48px] min-h-[48px] flex items-center justify-end"
        style={{ padding: "12px" }}
      >
        Skip
      </button>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-full h-56 flex items-center justify-center mb-8">
              {step.visual}
            </div>
            <p
              className="text-white text-lg leading-relaxed font-medium max-w-sm"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              {step.line}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className="transition-all"
              style={{
                width: i === idx ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === idx ? accentColor : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={next}
            className="px-8 py-4 rounded-full font-bold text-sm uppercase tracking-[0.2em] min-h-[48px] min-w-[160px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
            style={{
              background: accentColor,
              color: "#000",
              boxShadow: `0 8px 32px ${accentColor}55`,
            }}
          >
            {isLast ? "Let's go" : "Next"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
