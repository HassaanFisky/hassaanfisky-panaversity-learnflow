"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, Sparkles, Layout, Zap, ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * LearnFlow — Your Skill Roadmap
 * Simplified view for the final Panaversity rollout.
 */
export default function LearnPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      const { data } = await supabase
        .from('modules')
        .select('*')
        .order('order', { ascending: true });
      
      const standardModules = [
        { id: "m1", name: "Python Basics", slug: "syntax", description: "Learn variables, math, and making choices.", order: 1 },
        { id: "m2", name: "Advanced Logic", slug: "logic", description: "Master functions and recursive thinking.", order: 2 }
      ];

      setModules(data && data.length > 0 ? data : standardModules);
      setLoading(false);
    };

    fetchModules();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans text-text-primary selection:bg-accent/10">
      <header className="border-b border-border-fine bg-white/80 backdrop-blur-xl h-20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2.5 hover:bg-bg-surface rounded-xl transition-all group border border-transparent hover:border-border-fine">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <h1 className="text-xl font-serif font-bold italic tracking-tight uppercase">Skill Roadmap</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted hidden md:block">Active Connection: Secured</div>
             <div className="p-2.5 bg-accent/5 rounded-xl border border-accent/10 text-accent shadow-sm">
               <Layout size={18} />
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-24 space-y-20">
        <section className="text-center space-y-6">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft border border-accent/10 mb-2">
              <Sparkles size={12} className="text-accent" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Linear Progression</span>
           </div>
           <h2 className="text-5xl md:text-7xl font-serif font-bold italic tracking-tighter text-text-primary leading-tight">Your Roadmap</h2>
           <p className="text-xl font-serif italic text-text-secondary opacity-60 max-w-xl mx-auto">Pick a stage and start building. One step at a time.</p>
        </section>

        {/* Simplified Skill Grid */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[2rem] bg-white border border-border-fine animate-pulse" />
            ))
          ) : modules.map((module, i) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/learn/${module.slug}`} className="group block h-full">
                <div className="h-full bg-white border border-border-fine rounded-[2.5rem] p-12 shadow-sm hover:shadow-float hover:-translate-y-2 transition-all duration-700 relative flex flex-col justify-between overflow-hidden">
                  <div className="space-y-8 relative z-10">
                     <div className="flex items-center justify-between">
                        <div className="w-14 h-14 bg-bg-surface border border-border-fine rounded-2xl flex items-center justify-center text-accent shadow-sm group-hover:bg-accent group-hover:text-white transition-all duration-500">
                           <BookOpen size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-40 italic">Stage 0{i+1}</span>
                     </div>
                     <div className="space-y-3">
                        <h3 className="text-3xl font-serif font-bold text-text-primary group-hover:text-accent transition-colors tracking-tight">{module.name}</h3>
                        <p className="text-base font-serif italic text-text-secondary opacity-60 leading-relaxed">{module.description}</p>
                     </div>
                  </div>

                  <div className="pt-10 border-t border-border-fine flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mt-10">
                     <span className="group-hover:text-accent transition-colors">Start Blueprint</span>
                     <ArrowRight size={18} className="group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </section>

        <section className="pt-12 text-center opacity-40">
           <div className="h-px w-24 bg-border-fine mx-auto mb-8" />
           <p className="text-[9px] font-black uppercase tracking-[0.5em] text-text-muted">More Stages Coming to the Ecosystem soon.</p>
        </section>
      </main>
    </div>
  );
}
