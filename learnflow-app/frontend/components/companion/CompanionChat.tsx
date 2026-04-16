"use client";

/**
 * CompanionChat — H0 Portfolio Hub variant.
 * Uses the simple /api/chat endpoint (Groq → HF fallback chain).
 * No WebLLM / hybrid agent — H0 doesn't ship on-device inference.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Sparkles, Loader2, Bookmark, MessageCircle,
  Bot, Eraser, PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { CompanionSession, CompanionMessage, CompanionPlatform } from "@/types/companion";

interface CompanionChatProps {
  platform:         CompanionPlatform;
  context:          string;
  session:          CompanionSession | null;
  onUpdateMessages: (messages: CompanionMessage[]) => void;
  onClose:          () => void;
  sidebarOpen:      boolean;
  onToggleSidebar:  () => void;
}

const GREETING = (platform: CompanionPlatform): CompanionMessage => ({
  role:      "assistant",
  content:   `Hello! I am Aira, your ${platform} assistant. How can I help you today?`,
  timestamp: new Date().toISOString(),
});

export function CompanionChat({
  platform, context, session, onUpdateMessages, onClose, sidebarOpen, onToggleSidebar,
}: CompanionChatProps) {
  const { lang, t } = useLanguage();
  const [input,     setInput]     = useState("");
  const [isTyping,  setIsTyping]  = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "notebook">("chat");
  const [notes,     setNotes]     = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const messages = session?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (activeTab === "chat") inputRef.current?.focus();
  }, [activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem(`aira-notes-${platform}`);
    if (saved) setNotes(saved);
  }, [platform]);

  useEffect(() => {
    localStorage.setItem(`aira-notes-${platform}`, notes);
  }, [notes, platform]);

  // aira-prefill: CommandPalette can inject a query
  useEffect(() => {
    const handler = (e: Event) => {
      const { query } = (e as CustomEvent<{ query: string }>).detail ?? {};
      if (query) { setInput(query); setActiveTab("chat"); }
    };
    window.addEventListener("aira-prefill", handler);
    return () => window.removeEventListener("aira-prefill", handler);
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const content = input.trim();
    const userMsg: CompanionMessage = { role: "user", content, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    onUpdateMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      // Format messages for the chat API (role + content only)
      const apiMessages = updatedMessages.map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages, context }),
      });
      const data = await res.json();
      onUpdateMessages([...updatedMessages, {
        role:      "assistant",
        content:   data.error ? `Error: ${data.error}` : (data.content ?? "No response received."),
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      onUpdateMessages([...updatedMessages, {
        role:      "assistant",
        content:   "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, onUpdateMessages, context]);

  const clearSession = () => {
    onUpdateMessages([GREETING(platform)]);
  };

  const isRTL = lang === "ur";

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-fine bg-bg-base/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-surface transition-all active:scale-90"
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold tracking-[0.3em] text-accent uppercase font-mono">
                {platform} NODE
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${isTyping ? "bg-accent animate-pulse" : "bg-emerald-500"}`} />
            </div>
            <h3 className="text-lg font-serif font-bold text-text-primary mt-0.5 leading-tight">
              {session?.title ?? "Aira Assistant"}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close companion"
          className="w-9 h-9 rounded-full bg-white/10 border border-border-fine flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-90"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mx-6 mt-3.5 flex border border-border-fine rounded-2xl p-1 bg-bg-elevated/30 flex-shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab === "chat" ? "bg-bg-base text-accent shadow-sm" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <MessageCircle size={13} strokeWidth={2.4} /> Protocol
        </button>
        <button
          onClick={() => setActiveTab("notebook")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab === "notebook" ? "bg-bg-base text-accent shadow-sm" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Bookmark size={13} strokeWidth={2.4} /> Notebook
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
        {activeTab === "chat" ? (
          <>
            {messages.map((msg, i) => (
              <motion.div
                key={`${session?.id ?? "s"}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0  }}
                transition={{ duration: 0.22 }}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`max-w-[85%] px-4 py-3.5 rounded-[20px] text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-tr-none shadow-sm"
                    : "bg-bg-elevated/60 border border-border-fine text-text-secondary rounded-tl-none font-serif italic shadow-sm"
                }`}>
                  {msg.content}
                </div>
                <span className="text-[8px] font-bold text-text-muted mt-1.5 tracking-widest uppercase opacity-60 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0  }}
                className="flex flex-col items-start"
              >
                <div className="px-4 py-3.5 rounded-[20px] bg-bg-elevated/60 border border-border-fine text-text-muted rounded-tl-none text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-accent" />
                    Aira is thinking…
                  </span>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-bg-surface rounded-lg flex items-center justify-center text-accent shadow-sm border border-border-fine">
                  <Bot size={16} />
                </div>
                <h4 className="font-serif text-sm font-bold text-text-primary">Architect Notes</h4>
              </div>
              <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest bg-bg-elevated px-2 py-1 rounded">
                Local Sync
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Log research findings, architecture decisions, or notes…"
              className="flex-1 w-full bg-bg-elevated/40 border border-border-fine rounded-2xl p-5 text-sm text-text-secondary leading-relaxed focus:outline-none focus:border-accent/40 resize-none font-serif italic scrollbar-hide"
            />
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest opacity-60 px-1 pb-2">
              <Sparkles size={10} className="text-accent" /> Notes are auto-synced to your local node.
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input footer */}
      <div className="px-5 py-4 border-t border-border-fine bg-bg-base/30 backdrop-blur-md flex-shrink-0">
        <div className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Aira anything…"
            disabled={isTyping}
            dir={isRTL ? "rtl" : "ltr"}
            className="w-full pl-5 pr-24 py-3.5 rounded-2xl bg-bg-surface border border-border-fine text-sm text-text-primary focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/40"
          />
          <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1.5">
            <button
              onClick={clearSession}
              title="Clear session"
              disabled={isTyping}
              className="w-9 h-full rounded-xl flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <Eraser size={15} />
            </button>
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className={`px-3.5 h-full bg-accent text-white rounded-xl shadow-md shadow-accent/20 hover:brightness-110 transition-all flex items-center justify-center active:scale-95 ${isTyping ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.4} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
