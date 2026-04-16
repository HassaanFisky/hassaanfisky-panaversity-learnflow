"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, MessageSquare, Sparkles, Layout, Zap, ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiTutorPanel from "@/components/AiTutorPanel";
import { toast, Toaster } from "react-hot-toast";

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = params.module as string;
  const topicSlug = params.topic as string;
  
  const [loading, setLoading] = useState(true);
  const [showAiTutor, setShowAiTutor] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Artificial delay for high-fidelity content synthesis
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    setCompleted(true);
    toast.success("Topic Mastered! Mastery Score +10", {
      icon: '🚀',
      style: {
        borderRadius: '16px',
        background: '#38312E',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin shadow-sm" />
          <p className="font-bold text-text-muted animate-pulse uppercase text-[10px] tracking-[0.4em]">Synthesizing Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans text-text-primary selection:bg-accent/10">
      <Toaster position="top-center" />
      
      {/* PHASE 2: Topic View — Clean Primary Header */}
      <header className="border-b border-border-fine bg-white/80 backdrop-blur-xl h-20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()} 
              className="p-2.5 hover:bg-bg-surface rounded-xl transition-all group border border-transparent hover:border-border-fine"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Module</span>
              <ChevronRight size={12} className="text-text-muted/40" />
              <span className="text-sm font-serif font-bold text-text-primary italic transition-all">
                {topicSlug.replace(/-/g, ' ')}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAiTutor(!showAiTutor)}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${showAiTutor ? 'bg-text-primary text-white border-text-primary shadow-float' : 'bg-white border-border-fine text-text-primary hover:border-accent hover:text-accent shadow-sm'}`}
          >
            <MessageSquare size={16} />
            Ask Tutor
            {showAiTutor && <Sparkles size={14} className="text-accent animate-pulse" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Main Content Area */}
        <main className={`flex-1 px-6 py-12 transition-all duration-700 ${showAiTutor ? 'mr-[400px]' : ''}`}>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-12"
          >
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-serif font-bold italic tracking-tighter text-text-primary leading-tight">
                {topicSlug.replace(/-/g, ' ')}
              </h1>
              <div className="h-1.5 w-24 bg-accent rounded-full" />
            </div>

            <div className="prose-editorial text-lg leading-relaxed text-text-secondary space-y-8">
               <p>
                 Welcome to your first step in building autonomous agents. Python logic is the backbone of any agentic system. In this topic, we focus on the **clarity of your code** and the **reliability of your logic gates**.
               </p>

               <div className="bg-bg-surface p-8 rounded-3xl border border-border-fine shadow-sm font-mono text-[13px] leading-relaxed text-text-primary group">
                 <div className="flex items-center justify-between mb-4 border-b border-border-fine pb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Python Architecture</span>
                    <PlayCircle size={16} className="text-accent cursor-pointer hover:scale-110 transition-transform" />
                 </div>
<pre><code>{`# Defining an autonomous logic gate
def agent_decision(input_data):
  if not input_data:
    return "Idle State"
  
  return "Executing Workflow..."

# Initiate protocol
result = agent_decision(True)
print(result)`}</code></pre>
               </div>

               <p>
                 Notice how the `if not input_data` check prevents the agent from entering an undefined state. This is called **Failsafe Engineering**.
               </p>
            </div>

            {/* PHASE 2: "Next Step" Button always visible/clear */}
            <div className="pt-12 flex flex-col gap-6">
               <button 
                 onClick={handleComplete}
                 disabled={completed}
                 className={`btn-tactile w-full py-6 rounded-2xl flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.3em] transition-all shadow-float ${completed ? 'bg-emerald-500 text-white cursor-default' : 'bg-text-primary text-white hover:bg-accent'}`}
               >
                 {completed ? <CheckCircle2 size={20} /> : <Zap size={18} />}
                 {completed ? "Topic Mastered" : "Complete Topic"}
               </button>

               <Link 
                 href="/learn"
                 className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-accent transition-colors py-4"
               >
                 Go to Dashboard <ArrowRight size={14} />
               </Link>
            </div>
          </motion.div>
        </main>

        {/* PHASE 2 & 4: Sidebar Tutor — WhatsApp Style Side-Drawer */}
        <AnimatePresence>
          {showAiTutor && (
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-white border-l border-border-fine shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border-fine flex items-center justify-between bg-bg-base/50 backdrop-blur-md">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-soft rounded-full flex items-center justify-center text-accent ring-2 ring-accent/10">
                       <Sparkles size={18} />
                    </div>
                    <div>
                       <span className="block text-sm font-bold text-text-primary">AI Tutor</span>
                       <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Wired • Online</span>
                    </div>
                 </div>
                 <button onClick={() => setShowAiTutor(false)} className="text-text-muted hover:text-text-primary">
                    <ChevronRight size={24} />
                 </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                 <div className="bg-bg-surface p-5 rounded-2xl rounded-tl-none border border-border-fine text-sm text-text-secondary">
                    Hello! I'm your AI Tutor. I can help you understand this logic gate or suggest more practice exercises. What's on your mind?
                 </div>
              </div>

              <div className="p-6 border-t border-border-fine bg-bg-base/30">
                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Ask a question..."
                      className="flex-1 bg-white border border-border-fine rounded-xl px-5 py-4 text-xs focus:ring-1 focus:ring-accent outline-none transition-all"
                    />
                    <button className="bg-text-primary text-white p-4 rounded-xl hover:bg-accent transition-colors shadow-sm">
                       <ArrowRight size={18} />
                    </button>
                 </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
