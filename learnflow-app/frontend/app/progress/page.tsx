"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Sparkles, Target, Trophy, Award, Zap, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProgressPage() {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        setProgress(data);
      }
      setLoading(false);
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin shadow-sm" />
          <p className="font-bold text-text-muted animate-pulse uppercase text-[10px] tracking-[0.4em]">Loading Progress...</p>
        </div>
      </div>
    );
  }

  const masteryScore = progress?.mastery_score || 0;

  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans text-text-primary selection:bg-accent/10">
      <header className="border-b border-border-fine bg-white/80 backdrop-blur-xl h-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2.5 hover:bg-bg-surface rounded-xl transition-all group border border-transparent hover:border-border-fine">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <h1 className="text-xl font-serif font-bold italic tracking-tight">Your Progress</h1>
          </div>
          <div className="px-4 py-1.5 bg-accent/5 text-accent rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-accent/10 flex items-center gap-2">
            <Trophy size={12} />
            Architect Node
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20 space-y-16">
        {/* PHASE 2 & 5: Simple Mastery Visualization */}
        <section className="text-center space-y-10">
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="relative inline-block"
          >
             <div className="w-48 h-48 rounded-full border-4 border-bg-surface flex items-center justify-center relative">
                <div className="text-5xl font-serif font-bold text-text-primary italic">{masteryScore}%</div>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle 
                     cx="96" cy="96" r="92" 
                     fill="none" stroke="var(--accent)" strokeWidth="4" 
                     strokeDasharray={578} 
                     strokeDashoffset={578 - (578 * masteryScore) / 100}
                     strokeLinecap="round"
                     className="transition-all duration-1000 ease-out"
                   />
                </svg>
             </div>
          </motion.div>
          <div className="space-y-2">
             <h2 className="text-3xl font-serif font-bold text-text-primary">Ecosystem Mastery</h2>
             <p className="text-text-secondary opacity-70">Your overall synchronization with the Grid.</p>
          </div>
        </section>

        {/* PHASE 4: Mastery Logic → UI Cards */}
        <section className="grid sm:grid-cols-2 gap-8">
           <ProgressCard 
             icon={<Star className="text-amber-500" />} 
             label="Learning Streak" 
             value="5 Days" 
             desc="Active architecture sessions."
           />
           <ProgressCard 
             icon={<Award className="text-emerald-500" />} 
             label="Achievements" 
             value="3 Unlocked" 
             desc="Panaversity milestones."
           />
           <ProgressCard 
             icon={<Target className="text-accent" />} 
             label="Current Goal" 
             value="Advanced Logic" 
             desc="Your next mastery milestone."
           />
           <ProgressCard 
             icon={<Zap className="text-blue-500" />} 
             label="Engagement" 
             value="High" 
             desc="Recursive feedback loop status."
           />
        </section>

        <section className="bg-white border border-border-fine rounded-3xl p-10 shadow-card text-center space-y-8">
           <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto">
              <Sparkles size={24} />
           </div>
           <div className="space-y-3">
              <h3 className="text-2xl font-serif font-bold text-text-primary">AI Recommendation</h3>
              <p className="text-sm text-text-secondary opacity-70 max-w-md mx-auto">
                "Your logic gate processing is elite. I recommend jumping into **Systemic Autonomy** to finalize your H3 backend synchronization."
              </p>
           </div>
           <Link 
             href="/learn" 
             className="btn-tactile bg-text-primary text-white font-bold text-[11px] uppercase tracking-[0.3em] px-10 py-5 rounded-2xl flex items-center justify-center gap-4 mx-auto group"
           >
             Continue Latest Module <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
           </Link>
        </section>
      </main>
    </div>
  );
}

function ProgressCard({ icon, label, value, desc }: { icon: any, label: string, value: string, desc: string }) {
  return (
    <div className="bg-white border border-border-fine rounded-3xl p-8 shadow-sm flex flex-col items-start gap-4 hover:shadow-card hover:-translate-y-1 transition-all duration-500">
       <div className="w-10 h-10 bg-bg-surface border border-border-fine rounded-xl flex items-center justify-center">
          {icon}
       </div>
       <div className="space-y-1">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
          <span className="block text-2xl font-serif font-bold text-text-primary leading-tight">{value}</span>
          <p className="block text-[11px] text-text-secondary opacity-60 leading-tight">{desc}</p>
       </div>
    </div>
  );
}
