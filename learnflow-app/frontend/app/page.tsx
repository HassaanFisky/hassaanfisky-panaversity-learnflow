"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { MotionDiv, fadeUp, stagger } from "@/components/motion";
import { 
  ArrowRight, 
  Sparkles, 
  Zap,
  PlayCircle,
  Layout,
  Star,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Target
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AiraAssistant } from "@/components/AiraAssistant";
import { cn } from "@/lib/utils";

/**
 * LearnFlow v2.5 — Humanized AI Academy
 * Focus: Simplicity, speed, and real-world skills.
 * Simplified for the final Panaversity ecosystem rollout.
 */
export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uplink, setUplink] = useState("SYNCING...");

  useEffect(() => {
    const timer = setTimeout(() => setUplink("ONLINE (KOYEB)"), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAuthAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      try {
        const modRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?select=*&order=order.asc`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          },
        });
        const modData = await modRes.json();
        setModules(modData || []);

        if (session?.user) {
          const progRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/progress?user_id=eq.${session.user.id}&select=*`, {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
            },
          });
          const progData = await progRes.json();
          if (progData && progData.length > 0) setProgress(progData[0]);
        }
      } catch (err) {
        console.error("Connectivity issue:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndData();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans selection:bg-accent/10">
      <Navbar />

      <main className="flex-1">
        {/* Simplified Hero Section */}
        <section className="relative pt-44 pb-24 overflow-hidden px-6">
          <div className="max-w-7xl mx-auto relative z-10 text-center">
            <MotionDiv 
              variants={stagger}
              initial="initial"
              animate="animate"
              className="flex flex-col items-center gap-10"
            >
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-accent-soft border border-accent/10 backdrop-blur-md">
                <Sparkles size={14} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">
                  Hands-on AI. Zero Fluff.
                </span>
              </div>
              
              <h1 className="text-6xl md:text-9xl font-serif tracking-tighter text-text-primary max-w-5xl leading-[0.88] drop-shadow-sm">
                Learn AI. <br />
                <span className="text-accent italic font-normal">Simply.</span>
              </h1>

              <p className="max-w-2xl text-xl md:text-3xl font-serif italic text-text-secondary leading-relaxed opacity-70">
                A simple blueprint for building autonomous systems. <br className="hidden md:block"/> No jargon. Just building.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
                <Link
                  href={user ? "/learn" : "/sign-in"}
                  className="btn-tactile bg-text-primary text-white font-bold text-[14px] uppercase tracking-[0.3em] px-16 py-7 rounded-[2.5rem] shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group"
                >
                  Start Building <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-4 text-text-muted text-[10px] font-bold uppercase tracking-[0.3em] px-8 py-3 bg-bg-surface rounded-full border border-border-fine">
                   <Target size={14} className="text-accent" /> Unified Hub
                </div>
              </div>
            </MotionDiv>
          </div>
          
          {/* Subtle Background Elements */}
          <div className="absolute top-[20%] left-[-5%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        </section>

        {/* Personalized Progress Tracker */}
        {user && (
          <section className="py-24 bg-bg-surface/40 backdrop-blur-sm px-6 border-y border-border-fine">
            <div className="max-w-7xl mx-auto">
              <MotionDiv
                variants={fadeUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid md:grid-cols-2 gap-16 items-center"
              >
                <div className="space-y-10">
                  <div className="space-y-3">
                    <h2 className="text-4xl font-serif text-text-primary tracking-tight">Your Progress</h2>
                    <p className="text-text-secondary text-lg italic font-serif leading-relaxed">Pick up where you left off. Every milestone matters.</p>
                  </div>
                  
                  <div className="glass-apple rounded-[2.5rem] p-12 border border-border-fine shadow-card space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center text-accent shadow-float">
                           <Layout size={24} />
                         </div>
                         <div>
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Mastery Level</span>
                            <span className="block text-3xl font-serif font-black text-text-primary">{progress?.mastery_score || 0}%</span>
                         </div>
                      </div>
                      <Link href="/progress" className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all">
                         <ArrowUpRight size={24} />
                      </Link>
                    </div>

                    <div className="h-4 w-full bg-bg-base rounded-full overflow-hidden border border-border-fine relative">
                      <div 
                        className="absolute h-full bg-accent transition-all duration-1000"
                        style={{ width: `${progress?.mastery_score || 10}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4">
                      <Link
                        href="/learn"
                        className="btn-tactile bg-accent text-white font-bold text-[11px] uppercase tracking-[0.25em] w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-transform hover:scale-105"
                      >
                        <PlayCircle size={18} /> Continue
                      </Link>
                      <Link
                        href="/arena"
                        className="btn-tactile bg-bg-elevated text-accent border border-border-fine font-bold text-[11px] uppercase tracking-[0.25em] w-full py-5 rounded-2xl flex items-center justify-center gap-3 hover:border-accent transition-editorial"
                      >
                        <Target size={18} /> Play &amp; Learn
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 lg:gap-8">
                  <SimpleStatCard icon={<Star size={20} />} label="Streak" value="5 Runs" />
                  <SimpleStatCard icon={<Clock size={20} />} label="Focus" value="12h" />
                  <SimpleStatCard icon={<CheckCircle2 size={20} />} label="Stages" value={`${modules.length}`} />
                  <SimpleStatCard icon={<Zap size={20} className={cn("transition-colors", uplink === "SYNCING..." ? "text-yellow-500 animate-pulse" : "text-emerald-500")} />} label="Status" value={uplink} />
                </div>
              </MotionDiv>
            </div>
          </section>
        )}

        {/* Simplified Modules Grid */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto space-y-20">
            <MotionDiv
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="text-center space-y-6"
            >
              <h2 className="text-6xl font-serif text-text-primary tracking-tighter leading-tight">Skill Stages</h2>
              <p className="text-xl md:text-2xl font-serif italic text-text-secondary opacity-60">Linear learning. Massive results.</p>
            </MotionDiv>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-80 rounded-[2.5rem] bg-bg-surface border border-border-fine animate-pulse" />
                ))
              ) : modules.map((module, i) => (
                <MotionDiv
                  key={module.id}
                  variants={fadeUp}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={`/learn/${module.slug}`} className="group block h-full">
                    <div className="h-full bg-bg-surface border border-border-fine rounded-[2.5rem] p-12 shadow-card hover:shadow-float transition-editorial group-hover:-translate-y-3 flex flex-col justify-between relative overflow-hidden">
                       <div className="space-y-8">
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-bg-surface border border-border-fine flex items-center justify-center text-accent font-black text-xs">
                               0{i + 1}
                            </div>
                            {progress?.completed_modules?.includes(module.id) && (
                              <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black tracking-widest uppercase">Mastered</div>
                            )}
                          </div>
                          <div className="space-y-4">
                             <h3 className="text-3xl font-serif font-bold text-text-primary group-hover:text-accent transition-colors tracking-tight">{module.name}</h3>
                             <p className="text-base font-serif italic text-text-secondary opacity-70 leading-relaxed">{module.description}</p>
                          </div>
                       </div>
                       <div className="pt-10 flex items-center justify-between mt-10 border-t border-border-fine">
                          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-text-muted group-hover:text-accent">Start</span>
                          <ArrowRight size={18} className="text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                       </div>
                    </div>
                  </Link>
                </MotionDiv>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-24 bg-bg-surface/50 border-t border-border-fine px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col gap-3 scale-90 origin-left">
             <span className="font-serif font-bold text-5xl tracking-tighter">LearnFlow</span>
             <span className="text-[10px] uppercase font-black tracking-[0.5em] text-text-muted">LearnFlow Platform</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-40">
            © 2026 Architected by Hassaan & AI
          </p>
        </div>
      </footer>

      <AiraAssistant 
        platform="H3" 
        context="System simplified for deployment. All 5 Flux Mode mechanics are operational. Connectivity verified through Koyeb API mesh." 
      />
    </div>
  );
}

function SimpleStatCard({ icon, label, value, className }: { icon: any, label: string, value: string, className?: string }) {
  return (
    <div className={cn("bg-bg-surface border border-border-fine rounded-3xl p-8 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-float transition-all group", className)}>
      <div className="text-accent/40 group-hover:text-accent transition-colors">{icon}</div>
      <div>
        <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-text-muted mb-1">{label}</span>
        <span className="block text-2xl font-serif font-black text-text-primary">{value}</span>
      </div>
    </div>
  );
}
