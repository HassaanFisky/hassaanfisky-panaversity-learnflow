"use client";

/**
 * CompanionShell — H0 morph engine.
 * Uses H0's useLanguage which returns `lang` (not `language`).
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useCompanion } from "./CompanionContext";
import { useCompanionEvents } from "./hooks/useCompanionEvents";
import { CompanionWindow } from "./CompanionWindow";
import { useLanguage } from "@/context/LanguageContext";
import type { CompanionPlatform } from "@/types/companion";

interface CompanionShellProps {
  platform:     CompanionPlatform;
  context:      string;
  isPortfolio?: boolean;
}

const SPRING_MORPH = { type: "spring", stiffness: 380, damping: 30, mass: 1.1 } as const;

export function CompanionShell({ platform, context, isPortfolio = false }: CompanionShellProps) {
  const { isOpen, open, close, toggle } = useCompanion();
  const { lang }                        = useLanguage();

  useCompanionEvents({ open, close, toggle });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isRTL = lang === "ur";
  const side  = isRTL ? "left-10" : "right-10";

  return createPortal(
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="companion-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="companion-window"
            layoutId="companion-orb"
            transition={SPRING_MORPH}
            style={{
              willChange:      "transform, border-radius, width, height",
              transformOrigin: isRTL ? "bottom left" : "bottom right",
            }}
            className={`
              fixed z-[10001]
              inset-x-0 bottom-0 rounded-t-[2rem] rounded-b-none h-[88vh]
              md:inset-x-auto md:bottom-24 ${isRTL ? "md:left-10" : "md:right-10"}
              md:w-[760px] md:h-[660px] md:rounded-[2rem]
              glass-companion shadow-float
              flex overflow-hidden
              border border-white/20 dark:border-white/8
            `}
          >
            <CompanionWindow
              platform={platform}
              context={context}
              isPortfolio={isPortfolio}
              onClose={close}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body
  );
}
