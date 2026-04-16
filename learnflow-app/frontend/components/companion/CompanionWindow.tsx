"use client";

/**
 * CompanionWindow — H0 two-pane window (sidebar + chat).
 * Uses H0's useLanguage which returns `lang` (not `language`).
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CompanionSidebar } from "./CompanionSidebar";
import { CompanionChat }    from "./CompanionChat";
import { useCompanionSessions } from "./hooks/useCompanionSessions";
import { useLanguage } from "@/context/LanguageContext";
import type { CompanionPlatform } from "@/types/companion";

interface CompanionWindowProps {
  platform:     CompanionPlatform;
  context:      string;
  isPortfolio?: boolean;
  onClose:      () => void;
}

const SPRING_SIDEBAR = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;

export function CompanionWindow({ platform, context, isPortfolio = false, onClose }: CompanionWindowProps) {
  const { lang } = useLanguage();
  const isRTL    = lang === "ur";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    sessions, activeSession, activeSessionId,
    newSession, switchSession, deleteSession, updateActiveMessages,
  } = useCompanionSessions(platform);

  const sidebarInitialX = isRTL ? 240 : -240;

  const sidebarContent = (
    <CompanionSidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      onNewSession={newSession}
      onSelectSession={switchSession}
      onDeleteSession={deleteSession}
      onCollapse={() => setSidebarOpen(false)}
    />
  );

  return (
    <div className="flex w-full h-full overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Desktop inline sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar-desktop"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{    width: 0, opacity: 0 }}
            transition={SPRING_SIDEBAR}
            className="hidden md:flex h-full flex-shrink-0 overflow-hidden border-r border-border-fine bg-bg-base/50"
            style={{ willChange: "width, opacity" }}
          >
            <div className="w-60 h-full flex-shrink-0">{sidebarContent}</div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile overlay drawer */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <>
            <motion.div
              key="sidebar-scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden absolute inset-0 bg-black/20 z-[1]"
            />
            <motion.aside
              key="sidebar-mobile"
              initial={{ x: sidebarInitialX, opacity: 0 }}
              animate={{ x: 0,               opacity: 1 }}
              exit={  { x: sidebarInitialX,  opacity: 0 }}
              drag="x"
              dragConstraints={isRTL ? { left: 0, right: 240 } : { left: -240, right: 0 }}
              dragElastic={isRTL ? { right: 0.2 } : { left: 0.2 }}
              onDragEnd={(_, info) => {
                const shouldClose = isRTL
                  ? info.offset.x > 60 || info.velocity.x > 300
                  : info.offset.x < -60 || info.velocity.x < -300;
                if (shouldClose) setSidebarOpen(false);
              }}
              transition={SPRING_SIDEBAR}
              className={`md:hidden absolute inset-y-0 ${isRTL ? "right-0" : "left-0"} w-60 z-[2] bg-bg-base shadow-xl border-r border-border-fine overflow-hidden`}
              style={{ willChange: "transform" }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CompanionChat
        platform={platform}
        context={context}
        session={activeSession}
        onUpdateMessages={updateActiveMessages}
        onClose={onClose}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
}
