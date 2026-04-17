"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface OnboardingStep {
  title: string;
  body: string;
  icon: React.ElementType;
}

interface GameOnboardingProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  accentColor: string;
  gameName: string;
}

export default function GameOnboarding({
  steps,
  onComplete,
  accentColor,
  gameName,
}: GameOnboardingProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const step = steps[current];
  const isLast = current === steps.length - 1;
  const Icon = step.icon;

  const advance = () => {
    if (isLast) {
      onComplete();
    } else {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 32 : -32,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -32 : 32,
      opacity: 0,
    }),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.78)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 relative"
        style={{ boxShadow: `0 32px 80px -16px rgba(0,0,0,0.7), 0 0 0 1px #2E2B27` }}
      >
        {/* Skip */}
        <button
          onClick={onComplete}
          className="absolute top-5 right-5 text-[9px] font-bold uppercase tracking-[0.3em] text-[#5F5854] hover:text-[#9C948A] transition-colors"
        >
          Skip
        </button>

        {/* Game label */}
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-[#5F5854] mb-6">
          {gameName} · How to play
        </p>

        {/* Step content */}
        <div className="overflow-hidden min-h-[160px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: `${accentColor}18`,
                  border: `1px solid ${accentColor}35`,
                }}
              >
                <Icon className="w-6 h-6" style={{ color: accentColor }} />
              </div>

              <h2
                id="onboarding-title"
                className="text-xl font-bold text-[#F2EDE7] mb-2"
              >
                {step.title}
              </h2>
              <p className="text-sm text-[#9C948A] leading-relaxed">
                {step.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-6 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 16 : 6,
                height: 6,
                background: i <= current ? accentColor : "#2E2B27",
              }}
            />
          ))}
        </div>

        {/* Next / Start */}
        <button
          onClick={advance}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-[0.97]"
          style={{
            background: accentColor,
            color: "#0B0F14",
          }}
        >
          {isLast ? "Start Playing" : (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
