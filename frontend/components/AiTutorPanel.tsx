"use client";

import { motion } from "framer-motion";
import { AlertCircle, Bot, Bug, Code, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
      content: "Hello! I'm your LearnFlow AI Tutor. How can I help you with Python today? You can ask me to explain a concept, review your code, or help you debug an error." 
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
          level: "beginner"
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
        content: "Oops! I hit a temporary brain freeze while routing your request. Please try again in a moment." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b bg-secondary/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Bot size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm uppercase tracking-widest italic">AI Tutor Specialist</span>
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-muted-foreground uppercase">Online - llama-3.3-70b</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/50 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary/40 border-2 border-background shadow-inner rounded-tl-none decoration-primary'}`}>
               <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                 {msg.content}
               </p>
            </div>
            
            {msg.role === 'assistant' && msg.type && (
               <div className="mt-4 w-full p-4 rounded-2xl bg-secondary/80 border text-[10px]">
                 <SpecialistDetail type={msg.type} data={msg.data} />
               </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2 px-1">
              {msg.role === 'user' ? 'Learner' : 'LearnFlow Tutor'}
            </span>
          </motion.div>
        ))}
        {loading && (
          <div className="flex flex-col items-start space-y-2 opacity-50 grayscale animate-pulse">
            <div className="max-w-[85%] p-4 rounded-3xl bg-secondary/40 border-2 border-background rounded-tl-none">
               <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce shadow-lg shadow-primary" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-75 shadow-lg shadow-primary" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-150 shadow-lg shadow-primary" />
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t shrink-0">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask me anything about Python..."
            className="w-full bg-secondary/50 border-2 border-background group-hover:border-primary/50 transition-all rounded-[2rem] py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:border-primary resize-none h-20"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-3 bottom-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-widest opacity-50">
          Powered by groq llama-3.3-70b-versatile
        </p>
      </div>
    </div>
  );
}

function SpecialistDetail({ type, data }: { type: string, data: any }) {
  if (!data) return null;

  switch (type) {
    case "explanation":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
            <Sparkles size={14} /> Concept Insights
          </div>
          <div className="font-mono bg-background p-3 rounded-lg border text-primary">
            {data.code_example}
          </div>
          <div className="p-2 border-l-2 border-primary italic">
             Ready to try? {data.try_it}
          </div>
        </div>
      );
    case "review":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-tighter">
            <Code size={14} /> Style Review ({data.score}%)
          </div>
          <div className="grid gap-2">
            {data.issues.slice(0,2).map((issue: any, i: number) => (
               <div key={i} className="flex gap-2">
                  <span className="font-bold text-destructive underline">{issue.category}:</span>
                  <span>{issue.message}</span>
               </div>
            ))}
          </div>
        </div>
      );
    case "debug":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-500 font-black uppercase tracking-tighter">
            <Bug size={14} /> Debug Hint
          </div>
          <div className="space-y-1">
             <span className="font-bold opacity-60">Probable Cause:</span>
             <p className="font-mono">{data.likely_cause}</p>
          </div>
          <div className="space-y-1">
             <span className="font-bold opacity-60">Try these steps:</span>
             <ul className="list-decimal pl-4 space-y-1">
               {data.breadcrumb.map((b: string, i: number) => <li key={i}>{b}</li>)}
             </ul>
          </div>
        </div>
      );
    default:
      return null;
  }
}
