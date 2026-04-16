// e:/panaversity/hackathon-3/learnflow-app/frontend/components/AiTutorPanel.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, Bot, Bug, Code, RefreshCw, Send, Sparkles, X, 
  Milestone, BrainCircuit, Activity, ChevronRight, BarChart 
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  type?: "explanation" | "review" | "debug" | "exercise" | "progress";
  data?: any;
}

/**
 * SpecialistResponse: A specialized renderer for high-fidelity chat content.
 */
function SpecialistResponse({ content, role }: { content: string, role: string }) {
  if (role === 'user') return <p className="font-sans font-bold text-[13px] tracking-wide leading-relaxed">{content}</p>;

  const lines = content.split('\n');
  
  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const isHeading = line.match(/^([A-Z][a-z]+(\s[A-Z][a-z]+)*):/);
        
        if (isHeading) {
          return (
            <div key={i} className="mt-8 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-accent border-b border-accent/20 pb-1.5 block w-fit">
                {line}
              </span>
            </div>
          );
        }

        if (line.trim().startsWith('•') || line.trim().match(/^\d+\./)) {
           return (
             <p key={i} className="font-serif italic text-[16px] text-text-secondary leading-relaxed pl-4 border-l border-border-fine my-3">
               {line}
             </p>
           );
        }

        if (!line.trim()) return <div key={i} className="h-2" />;

        return (
          <p key={i} className="font-serif text-[17px] text-text-primary leading-relaxed opacity-90 first-of-type:font-bold first-of-type:italic first-of-type:text-accent/80 first-of-type:text-sm first-of-type:tracking-wide">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function AiTutorPanel({ context, onClose }: AiTutorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "initial", 
      role: "assistant", 
      content: "Protocol: Learning Initialization\nWelcome to the LearnFlow Engine. I am your specialized Panaversity assistant. Whether you seek conceptual depth, code verification, or systemic debugging, I am here to facilitate your Python mastery through precision diagnostics." 
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
        finalContent = `Conceptual Analysis:\n${specialistResponse.explanation}`;
        msgType = "explanation";
      } else if (triageData.routed_to === "codereview-service") {
        finalContent = `Systemic Integrity Review:\n${specialistResponse.summary}`;
        msgType = "review";
      } else if (triageData.routed_to === "debug-service") {
        finalContent = `Logical Diagnostic Report:\n${specialistResponse.hint}`;
        msgType = "debug";
      } else if (triageData.routed_to === "exercise-service") {
        finalContent = `Protocol Advancement:\n${specialistResponse.prompt}`;
        msgType = "exercise";
      } else if (triageData.routed_to === "progress-service") {
        finalContent = `Performance Analytics Sync:\nOverall mastery is ${specialistResponse.overall_mastery}%.`;
        msgType = "progress";
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
        content: "Logical Exception:\nSystemic interruption detected. My neural pathways are temporarily non-responsive. Please re-initiate the query." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base border-l border-border-fine transition-editorial shadow-2xl">
      <div className="h-24 flex items-center justify-between px-10 border-b border-border-fine bg-bg-base/80 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-bg-base flex items-center justify-center text-accent border border-border-fine shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src="/avatar.png" alt="Specialist" className="w-full h-full object-cover relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg tracking-tight text-text-primary italic">Panaversity Specialist</span>
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-[#579D84] animate-soft-pulse" />
               <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Knowledge Node Active</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-3 hover:bg-bg-surface rounded-xl transition-editorial text-text-muted hover:text-text-primary border border-transparent hover:border-border-fine">
            <X size={20} />
          </button>
        )}
      </div>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-10 space-y-12 bg-dot-grid scroll-smooth scrollbar-none"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn("flex flex-col", msg.role === 'user' ? 'items-end' : 'items-start')}
            >
              <div className={cn(
                "max-w-[92%] p-8 transition-editorial",
                msg.role === 'user' 
                  ? 'bg-text-primary text-white rounded-[2rem] rounded-tr-none shadow-float' 
                  : 'bg-bg-surface border border-border-fine rounded-[2rem] rounded-tl-none shadow-sm'
              )}>
                 <SpecialistResponse role={msg.role} content={msg.content} />
              </div>
              
              {msg.role === 'assistant' && msg.type && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-8 w-full p-8 rounded-[2rem] bg-bg-surface/50 border border-border-fine shadow-inner"
                  >
                   <SpecialistDetail type={msg.type} data={msg.data} context={context} />
                 </motion.div>
              )}
              
              <div className="mt-4 flex items-center gap-3 px-4">
                {msg.role === 'assistant' && <Activity size={10} className="text-accent/40" />}
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-muted opacity-60">
                  {msg.role === 'user' ? 'Scholar Payload' : 'Agent Response'}
                </span>
                {msg.role === 'user' && <Activity size={10} className="text-text-primary/40 rotate-180" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-start space-y-4"
          >
            <div className="max-w-[150px] p-6 rounded-[2rem] bg-bg-surface border border-border-fine rounded-tl-none shadow-sm flex items-center justify-center gap-3">
               <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
               <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
               <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent px-4 animate-pulse">Synthesizing...</span>
          </motion.div>
        )}
      </div>

      <div className="p-10 border-t border-border-fine bg-bg-base/90 backdrop-blur-xl shrink-0">
        <div className="relative group max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Formulate your query for the Specialist..."
            className="w-full bg-bg-base border border-border-fine group-hover:border-accent/40 transition-editorial rounded-3xl py-6 pl-8 pr-20 text-[13px] font-bold text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent resize-none h-28 shadow-inner"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-5 bottom-5 w-14 h-14 rounded-2xl bg-text-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-editorial disabled:opacity-20 shadow-float"
          >
            {loading ? <RefreshCw size={22} className="animate-spin" /> : <Send size={22} className="text-accent" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-8 px-4 opacity-50">
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">
             <div className="flex items-center gap-2 group cursor-help">
                <Sparkles size={14} className="text-accent group-hover:scale-125 transition-transform" /> 
                <span className="group-hover:text-text-primary transition-colors">Cognitive</span>
             </div>
             <div className="flex items-center gap-2 group cursor-help">
                <Code size={14} className="text-accent group-hover:scale-125 transition-transform" /> 
                <span className="group-hover:text-text-primary transition-colors">Integrity</span>
             </div>
             <div className="flex items-center gap-2 group cursor-help">
                <Bug size={14} className="text-accent group-hover:scale-125 transition-transform" /> 
                <span className="group-hover:text-text-primary transition-colors">Diagnostic</span>
             </div>
          </div>
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-[0.5em] italic">
            Panaversity Orchestrator • v2.5.0
          </p>
        </div>
      </div>
    </div>
  );
}

function SpecialistDetail({ type, data, context }: { type: string, data: any, context?: any }) {
  if (!data) return null;

  switch (type) {
    case "explanation":
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-accent font-bold uppercase tracking-[0.4em] text-[10px]">
            <Sparkles size={16} /> Synthetic Architecture
          </div>
          {data.code_example && (
            <div className="font-mono bg-bg-base p-8 rounded-2xl border border-border-fine text-text-primary text-xs leading-loose overflow-x-auto shadow-inner relative group">
              <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest bg-bg-elevated/50 px-2 py-1 rounded border border-border-fine opacity-0 group-hover:opacity-100 transition-opacity">Example Logic</div>
              <pre><code>{data.code_example}</code></pre>
            </div>
          )}
          {data.try_it && (
            <div className="p-6 border-l-2 border-accent bg-accent/5 italic font-serif text-[15px] text-text-secondary leading-relaxed rounded-r-2xl">
               <span className="font-bold text-accent uppercase text-[10px] tracking-widest block mb-2">Advanced Protocol:</span>
               "{data.try_it}"
            </div>
          )}
          <Link 
            href={`/practice?module=${context?.module || 'basics'}&topic=${data.concept || ''}`}
            className="w-full flex items-center justify-between p-6 rounded-2xl border border-accent/20 bg-accent-soft hover:bg-accent/10 transition-editorial font-bold text-[10px] uppercase tracking-[0.2em] text-accent group"
          >
            Practice this Topology
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      );
    case "review":
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-[#579D84] font-bold uppercase tracking-[0.4em] text-[10px]">
            <Code size={16} /> Structural Verification Report ({data.score}%)
          </div>
          <div className="grid gap-6">
            {data.issues?.slice(0,3).map((issue: any, i: number) => (
               <div key={i} className="flex gap-4 items-start p-6 bg-bg-surface rounded-2xl border border-border-fine shadow-sm hover:shadow-md transition-editorial">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0 animate-pulse",
                    issue.severity === 'error' ? 'bg-accent' : 'bg-[#579D84]'
                  )} />
                  <div className="space-y-2">
                    <span className="font-bold text-text-primary text-[11px] uppercase tracking-wider">{issue.category}</span>
                    <p className="font-serif italic text-sm text-text-secondary leading-relaxed">{issue.message}</p>
                  </div>
               </div>
            ))}
          </div>
          {data.corrected_code && (
            <div className="space-y-6">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted border-b border-border-fine pb-4">Specialist Optimized Logic</h3>
               <div className="font-mono bg-bg-base p-8 rounded-2xl border border-border-fine text-text-primary text-xs leading-loose overflow-x-auto shadow-inner relative group">
                  <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest bg-white/50 px-2 py-1 rounded border border-border-fine opacity-0 group-hover:opacity-100 transition-opacity">Corrected Syntax</div>
                  <pre><code>{data.corrected_code}</code></pre>
               </div>
            </div>
          )}
        </div>
      );
    case "debug":
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-accent font-bold uppercase tracking-[0.4em] text-[10px]">
            <Bug size={16} /> Logical Diagnostic Trace
          </div>
          <div className="space-y-6">
             <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl">
               <span className="text-[10px] font-bold uppercase tracking-widest text-accent/60 block mb-3">Identified Root Cause</span>
               <p className="font-serif italic font-bold text-[15px] text-text-primary leading-relaxed">"{data.likely_cause}"</p>
             </div>
             <div className="space-y-4">
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted px-2 flex items-center gap-3">
                 <Milestone size={14} className="text-accent" /> Resolution Roadmap
               </span>
               <div className="grid gap-3">
                  {data.breadcrumb?.map((b: string, i: number) => (
                    <div key={i} className="flex gap-4 items-center p-4 rounded-xl bg-white border border-border-fine text-xs">
                      <span className="font-bold text-accent opacity-30 text-[10px]">0{i+1}</span>
                      <span className="font-serif italic text-text-secondary">{b}</span>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        </div>
      );
    case "exercise":
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-accent font-bold uppercase tracking-[0.4em] text-[10px]">
            <Milestone size={16} /> Technical Challenge Node
          </div>
          <div className="p-6 bg-accent text-white rounded-2x shadow-float space-y-4">
             <h4 className="font-serif italic font-bold text-lg">{data.title}</h4>
             <p className="text-[13px] opacity-90 leading-relaxed font-sans">{data.prompt?.split('\n')[0]}</p>
          </div>
          <div className="font-mono bg-bg-base p-8 rounded-2xl border border-border-fine text-text-primary text-xs leading-loose overflow-x-auto shadow-inner relative group">
            <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest bg-white/50 px-2 py-1 rounded border border-border-fine opacity-0 group-hover:opacity-100 transition-opacity">Starter Logic</div>
            <pre><code>{data.starter_code}</code></pre>
          </div>
          <Link 
            href={`/practice?module=${data.module_slug || context?.module || 'basics'}&topic=${data.topic || ''}`}
            className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-text-primary text-white hover:brightness-110 transition-editorial font-bold text-[11px] uppercase tracking-[0.3em] group shadow-float"
          >
            Launch Sandbox Workflow
            <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
          </Link>
        </div>
      );
    case "progress":
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-text-primary font-bold uppercase tracking-[0.4em] text-[10px]">
            <BarChart size={16} /> Mastery Progression Report
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-6 rounded-2xl bg-bg-surface border border-border-fine shadow-sm flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2">Mastery</span>
                <span className="text-3xl font-serif italic text-accent">{data.overall_mastery}%</span>
             </div>
             <div className="p-6 rounded-2xl bg-bg-surface border border-border-fine shadow-sm flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2">Nodes</span>
                <span className="text-3xl font-serif italic text-text-primary">{data.modules_mastered}/{data.modules?.length || 0}</span>
             </div>
          </div>
          <div className="space-y-4">
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted px-2">Top Performance Spheres</span>
             <div className="space-y-2">
                {data.modules?.filter((m: any) => m.mastery_score > 0).slice(0, 4).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-bg-surface/50 border border-border-fine">
                    <span className="text-[11px] font-bold text-text-primary truncate">{m.module_name || m.module_slug}</span>
                    <span className="text-[11px] font-mono text-[#579D84]">{m.mastery_score}%</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
