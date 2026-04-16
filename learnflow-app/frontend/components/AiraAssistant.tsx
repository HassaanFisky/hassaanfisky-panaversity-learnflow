"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2, Bookmark, MessageCircle, Bot, Eraser } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AiraAssistantProps {
  platform: "H0" | "H1" | "H2" | "H3" | "H4";
  context: string;
}

/**
 * HASSAAN AI ARCHITECT — Aira Assistant
 * Humanized interface for the Panaversity Ecosystem.
 */
export function AiraAssistant({ platform, context }: AiraAssistantProps) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "notebook">("chat");
  const [notes, setNotes] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with Global Event Bus
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleNotebook = () => {
      setIsOpen(true);
      setActiveTab("notebook");
    };
    
    window.addEventListener("toggle-chat", handleToggle);
    window.addEventListener("toggle-aira", handleToggle);
    window.addEventListener("toggle-notebook", handleNotebook);
    
    return () => {
      window.removeEventListener("toggle-chat", handleToggle);
      window.removeEventListener("toggle-aira", handleToggle);
      window.removeEventListener("toggle-notebook", handleNotebook);
    };
  }, []);

  // Persistence Logic
  useEffect(() => {
    const savedMessages = localStorage.getItem(`aira-session-${platform}`);
    const savedNotes = localStorage.getItem(`aira-notes-${platform}`);
    
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      const greeting = lang === "ur" ? "Assalam-o-Alaikum! Main Aira hoon." : 
                       lang === "ro" ? "Salam! Main Aira hoon." :
                       `Hello! I am Aira, your assistant for the ${platform} platform. How can I help you today?`;
      
      setMessages([{ 
        role: "assistant", 
        content: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }

    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, [platform, lang]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`aira-session-${platform}`, JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, platform]);

  useEffect(() => {
    localStorage.setItem(`aira-notes-${platform}`, notes);
  }, [notes, platform]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const currentInput = input;
    const userMsg: Message = { 
      role: "user", 
      content: currentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: context,
          platform: platform,
          lang: lang
        }),
      });

      const data = await response.json();

      const assistantMsg: Message = { 
        role: "assistant", 
        content: data.error ? `Something went wrong: ${data.error}` : data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearSession = () => {
    const greeting = lang === "ur" ? "Assalam-o-Alaikum! Main Aira hoon." : 
                     lang === "ro" ? "Salam! Main Aira hoon." :
                     `Hello! I am Aira, your assistant for the ${platform} platform.`;
    
    const defaultMsg: Message = { 
      role: "assistant", 
      content: greeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([defaultMsg]);
    localStorage.removeItem(`aira-session-${platform}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed inset-x-4 md:inset-x-0 bottom-24 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[450px] h-[650px] max-h-[85vh] glass-apple rounded-[2.5rem] shadow-float z-[10001] flex flex-col overflow-hidden border-white/20 dark:border-white/10"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-border-fine bg-bg-base/40 flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-[0.3em] text-accent uppercase font-mono">
                    {platform} LIVE STATUS
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isTyping ? 'bg-accent' : 'bg-emerald-500'}`} />
                </div>
                <h3 className="text-xl font-serif font-bold text-text-primary mt-0.5">Aira Assistant</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 border border-border-fine flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="mx-8 mt-4 flex border border-border-fine rounded-2xl p-1 bg-bg-elevated/30">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'chat' ? 'bg-bg-base text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <MessageCircle size={14} strokeWidth={2.4} /> Chat
              </button>
              <button 
                onClick={() => setActiveTab('notebook')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'notebook' ? 'bg-bg-base text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Bookmark size={14} strokeWidth={2.4} /> My Notes
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-hide">
              {activeTab === 'chat' ? (
                <>
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] px-5 py-4 rounded-[22px] text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-accent text-white rounded-tr-none shadow-sm' 
                        : 'bg-bg-elevated/60 border border-border-fine text-text-secondary rounded-tl-none font-serif italic shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[8px] font-bold text-text-muted mt-2 tracking-widest uppercase opacity-60 px-1">{msg.timestamp}</span>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-text-muted font-serif italic text-[10px] animate-pulse">
                      <Loader2 size={12} className="animate-spin text-accent" /> Aira is thinking...
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-bg-surface rounded-lg flex items-center justify-center text-accent shadow-sm border border-border-fine">
                          <Bot size={18} />
                        </div>
                        <h4 className="font-serif text-sm font-bold text-text-primary">Research Notes</h4>
                     </div>
                     <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest bg-bg-elevated px-2 py-1 rounded">Syncing</span>
                   </div>
                   
                   <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Capture your thoughts, ideas, or notes here..."
                    className="flex-1 w-full bg-bg-elevated/40 border border-border-fine rounded-2xl p-6 text-sm text-text-secondary leading-relaxed focus:outline-none focus:border-accent/40 resize-none font-serif italic scrollbar-hide"
                   />
                   
                   <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-widest opacity-60 px-2 pb-2">
                     <Sparkles size={10} className="text-accent" /> Your notes are automatically saved.
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-8 border-t border-border-fine bg-bg-base/30 backdrop-blur-md">
              <div className="relative group">
                <input 
                  type="text"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  placeholder="Type a message..."
                  className="w-full pl-6 pr-24 py-4 rounded-2xl bg-bg-surface border border-border-fine text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:shadow-inner transition-all placeholder:text-text-muted/40"
                  disabled={isTyping}
                />
                
                <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                  <button 
                    onClick={clearSession}
                    title="Clear Chat History"
                    className="w-10 h-full rounded-xl flex items-center justify-center text-text-muted hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100"
                    disabled={isTyping}
                  >
                    <Eraser size={16} />
                  </button>
                  <button 
                    onClick={handleSend}
                    className={`px-4 h-full bg-accent text-white rounded-xl shadow-md shadow-accent/20 hover:brightness-110 transition-all flex items-center justify-center active:scale-95 ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isTyping}
                  >
                    {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.4} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
