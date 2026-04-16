"use client";

import React from "react";
import { PlusCircle, PanelLeftClose } from "lucide-react";
import type { CompanionSession } from "@/types/companion";
import { SessionHistoryItem } from "./SessionHistoryItem";

interface CompanionSidebarProps {
  sessions:        CompanionSession[];
  activeSessionId: string | null;
  onNewSession:    () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onCollapse:      () => void;
}

export function CompanionSidebar({
  sessions, activeSessionId, onNewSession, onSelectSession, onDeleteSession, onCollapse,
}: CompanionSidebarProps) {
  return (
    <div className="flex flex-col h-full w-full py-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0 border-b border-border-fine">
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent">Chats</span>
        <button
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-surface transition-all active:scale-90"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <div className="px-3 pt-3 flex-shrink-0">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border-muted text-text-muted hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all text-[10px] font-bold uppercase tracking-widest active:scale-95"
        >
          <PlusCircle size={14} /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 px-3 space-y-1 scrollbar-hide">
        {sessions.map((session) => (
          <SessionHistoryItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => onSelectSession(session.id)}
            onDelete={() => onDeleteSession(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
