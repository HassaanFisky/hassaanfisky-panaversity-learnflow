// e:/panaversity/hackathon-3/learnflow-app/frontend/components/AiTutorPanel.tsx
"use client";

import { motion } from "framer-motion";
import { AlertCircle, Bot, Bug, Code, RefreshCw, Send, Sparkles, X, Milestone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AiTutorPanelProps {
  context?: {
    module?: string;
    topic?: string;
    code?: string;
    result?: any;
    error_message?: string;
  };
  onClose?: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "explanation" | "review" | "debug" | "exercise";
  data?: any;
}

export default function AiTutorPanel({ context, onClose }: AiTutorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "initial", 
      role: "assistant", 
      content: "Welcome to the LearnFlow Protocol. I am your specialized AI Tutor. Whether you seek conceptual depth, code verification, or systemic debugging, I am here to facilitate your Python mastery." 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_TRIAGE_SERVICE_URL}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          user_id: "anonymous_user",
          context: context?.code || context?.topic || "",
          level: "advanced"
        }),
      });

      const triageData = await response.json();
      const specialistResponse = triageData.response;
      
      let finalContent = "";
      let msgType: Message["type"] = "explanation";

      if (triageData.routed_to === "concepts-service") {
        finalContent = specialistResponse.explanation;
        msgType = "explanation";
      } else if (triageData.routed_to === "codereview-service") {
        finalContent = specialistResponse.summary;
        msgType = "review";
      } else if (triageData.routed_to === "debug-service") {
        finalContent = specialistResponse.hint;
        msgType = "debug";
      } else if (triageData.routed_to === "exercise-service") {
        finalContent = specialistResponse.prompt;
        msgType = "exercise";
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalContent,
        type: msgType,
        data: specialistResponse
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Triage failed:", error);
      setMessages(prev => [...prev, { 
        id: "err", 
        role: "assistant", 
        content: "Systemic interruption detected. My neural pathways are temporarily non-responsive. Please re-initiate the query." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base border-l border-border-fine transition-editorial">
      {/* Editorial Header */}
      <div className="h-20 flex items-center justify-between px-8 border-b border-border-fine bg-white/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center text-accent border border-accent/10 shadow-sm">
            <Bot size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-sm tracking-tight text-text-primary">Tutor Specialist</span>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
               <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Protocol Active</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-bg-surface rounded-lg transition-editorial text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Narrative Messages */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-8 space-y-10 bg-[radial-gradient(var(--border-fine)_1px,transparent_1px)] [background-size:24px_24px] scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex flex-col", msg.role === 'user' ? 'items-end' : 'items-start')}
          >
            <div className={cn(
              "max-w-[90%] p-6 rounded-2xl shadow-card transition-editorial",
              msg.role === 'user' 
                ? 'bg-text-primary text-white rounded-tr-none' 
                : 'bg-white border border-border-fine rounded-tl-none font-serif text-lg leading-relaxed text-text-primary'
            )}>
               <p className={cn("whitespace-pre-wrap", msg.role === 'user' ? 'font-sans font-bold text-sm tracking-wide' : 'opacity-90')}>
                 {msg.content}
               </p>
            </div>
            
            {msg.role === 'assistant' && msg.type && (
               <div className="mt-6 w-full p-6 rounded-2xl bg-white border border-border-fine shadow-float">
                 <SpecialistDetail type={msg.type} data={msg.data} />
               </div>
            )}
            
            <div className="mt-3 flex items-center gap-3 px-1">
              {msg.role === 'assistant' && <div className="h-[1px] w-4 bg-accent/30" />}
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">
                {msg.role === 'user' ? 'Scholar' : 'Specialist Agent'}
              </span>
              {msg.role === 'user' && <div className="h-[1px] w-4 bg-text-primary/30" />}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex flex-col items-start space-y-4 opacity-50 grayscale">
            <div className="max-w-[90%] p-6 rounded-2xl bg-white border border-border-fine rounded-tl-none shadow-sm">
               <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce delay-200" />
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Precision Input */}
      <div className="p-8 border-t border-border-fine bg-white shrink-0">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Formulate your query..."
            className="w-full bg-bg-base border border-border-fine group-hover:border-accent/30 transition-editorial rounded-2xl py-5 pl-7 pr-16 text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none h-24 shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-4 bottom-4 w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-editorial disabled:opacity-30 shadow-lg shadow-accent/20"
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-6 px-2">
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
             <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-accent" /> Explain</span>
             <span className="flex items-center gap-1.5"><Code size={12} className="text-accent" /> Review</span>
             <span className="flex items-center gap-1.5"><Bug size={12} className="text-accent" /> Debug</span>
          </div>
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-[0.4em] opacity-40">
            LLAMA-3.3-70B • GROQ
          </p>
        </div>
      </div>
    </div>
  );
}

function SpecialistDetail({ type, data }: { type: string, data: any }) {
  if (!data) return null;

  switch (type) {
    case "explanation":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-[0.3em] text-[10px]">
            <Sparkles size={14} /> Cognitive Insights
          </div>
          <div className="font-mono bg-bg-base p-6 rounded-xl border border-border-fine text-text-primary text-sm leading-relaxed overflow-x-auto">
            <pre><code>{data.code_example}</code></pre>
          </div>
          <div className="p-4 border-l-2 border-accent bg-accent/5 italic font-serif text-text-secondary text-sm">
             Proceed with integration: {data.try_it}
          </div>
        </div>
      );
    case "review":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-[0.3em] text-[10px]">
            <Code size={14} /> Systemic Review ({data.score}%)
          </div>
          <div className="grid gap-4">
            {data.issues.slice(0,3).map((issue: any, i: number) => (
               <div key={i} className="flex gap-3 items-start p-4 bg-bg-base rounded-xl border border-border-fine">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <span className="font-bold text-text-primary text-[11px] uppercase tracking-wider">{issue.category}</span>
                    <p className="text-sm text-text-secondary leading-relaxed">{issue.message}</p>
                  </div>
               </div>
            ))}
          </div>
        </div>
      );
    case "debug":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-error font-bold uppercase tracking-[0.3em] text-[10px]">
            <Bug size={14} /> Logical Diagnostics
          </div>
          <div className="space-y-4">
             <div className="p-4 bg-bg-surface border border-error/20 rounded-xl">
               <span className="text-[10px] font-bold uppercase text-text-muted block mb-2">Probable Cause</span>
               <p className="font-mono text-xs text-error">{data.likely_cause}</p>
             </div>
             <div className="space-y-3">
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted px-1 flex items-center gap-2">
                 <Milestone size={12} /> Resolution Path
               </span>
               <ul className="grid gap-2">
                 {data.breadcrumb.map((b: string, i: number) => (
                   <li key={i} className="text-sm font-serif text-text-secondary pl-4 border-l border-border-fine py-1">
                     {b}
                   </li>
                 ))}
               </ul>
             </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
