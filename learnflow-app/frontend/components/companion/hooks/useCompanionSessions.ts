"use client";

/**
 * useCompanionSessions — localStorage-backed session CRUD (H0 variant).
 * Storage key: `aira-sessions-${platform}`
 */

import { useState, useCallback, useEffect } from "react";
import type { CompanionSession, CompanionMessage, CompanionPlatform } from "@/types/companion";

const GREETINGS: Record<CompanionPlatform, string> = {
  H0: "Hello! I am Aira, your Portfolio Hub assistant. Ask me anything about the projects.",
  H1: "Hello! I am Aira, your Physical AI Textbook companion.",
  H2: "Hello! I am Aira, your TaskFlow assistant.",
  H3: "Hello! I am Aira, your LearnFlow tutor.",
  H4: "Greetings, Architect. I am Aira, your Digital FTE specialist.",
};

const storageKey = (platform: CompanionPlatform) => `aira-sessions-${platform}`;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createSession(platform: CompanionPlatform): CompanionSession {
  const now = new Date().toISOString();
  return {
    id:        generateId(),
    title:     "New Chat",
    createdAt: now,
    updatedAt: now,
    platform,
    messages: [{
      role:      "assistant",
      content:   GREETINGS[platform],
      timestamp: now,
    }],
  };
}

function deriveTitle(messages: CompanionMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New Chat";
  const text = first.content.trim();
  return text.length > 40 ? text.slice(0, 40) + "…" : text;
}

export interface UseCompanionSessionsReturn {
  sessions:             CompanionSession[];
  activeSession:        CompanionSession | null;
  activeSessionId:      string | null;
  newSession:           () => void;
  switchSession:        (id: string) => void;
  deleteSession:        (id: string) => void;
  updateActiveMessages: (messages: CompanionMessage[]) => void;
}

export function useCompanionSessions(platform: CompanionPlatform): UseCompanionSessionsReturn {
  const [sessions,         setSessions]         = useState<CompanionSession[]>([]);
  const [activeSessionId,  setActiveSessionId]  = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey(platform));
      if (raw) {
        const stored: CompanionSession[] = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length > 0) {
          setSessions(stored);
          setActiveSessionId(stored[0].id);
          return;
        }
      }
    } catch {}
    const fresh = createSession(platform);
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
  }, [platform]);

  useEffect(() => {
    if (typeof window === "undefined" || sessions.length === 0) return;
    localStorage.setItem(storageKey(platform), JSON.stringify(sessions));
  }, [sessions, platform]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const newSession = useCallback(() => {
    const fresh = createSession(platform);
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
  }, [platform]);

  const switchSession = useCallback((id: string) => setActiveSessionId(id), []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fresh = createSession(platform);
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) setActiveSessionId(next[0].id);
      return next;
    });
  }, [activeSessionId, platform]);

  const updateActiveMessages = useCallback((messages: CompanionMessage[]) => {
    setSessions((prev) => prev.map((s) => {
      if (s.id !== activeSessionId) return s;
      return { ...s, messages, title: deriveTitle(messages), updatedAt: new Date().toISOString() };
    }));
  }, [activeSessionId]);

  return { sessions, activeSession, activeSessionId, newSession, switchSession, deleteSession, updateActiveMessages };
}
