"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Trash2 } from "lucide-react";
import type { CompanionSession } from "@/types/companion";

interface SessionHistoryItemProps {
  session:  CompanionSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function formatDate(isoString: string): string {
  const d   = new Date(isoString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function SessionHistoryItem({ session, isActive, onSelect, onDelete }: SessionHistoryItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      onClick={onSelect}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={()   => setHovered(false)}
      className={`relative flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer select-none group ${
        isActive
          ? "bg-accent/10 border border-accent/20 text-accent"
          : "border border-transparent hover:bg-bg-surface text-text-secondary"
      }`}
    >
      <MessageSquare size={13} className="mt-0.5 flex-shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold truncate leading-snug">{session.title}</p>
        <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-widest">
          {formatDate(session.updatedAt)}
        </p>
      </div>
      {hovered && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1   }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete session"
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={11} />
        </motion.button>
      )}
    </motion.div>
  );
}
