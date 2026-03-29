"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { MotionDiv, fadeUp, stagger } from "@/components/motion";
import { 
  ArrowRight, 
  Code, 
  Sparkles, 
  LineChart, 
  Terminal,
  ChevronRight,
  BookOpen,
  Cpu,
  Bookmark
} from "lucide-react";

interface ModulePreview {
  id: string;
  name: string;
  description: string;
  slug: string;
  order: number;
}

export default function LandingPage() {
  const [modules, setModules] = useState<ModulePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?select=*&order=order.asc`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          },
        });
        const data = await response.json();
        setModules(data || []);
      } catch (error) {
        console.error("Failed to fetch modules:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans selection:bg-accent/10">
      <Navbar />

      <main className="flex-1">
        {/* Editorial Hero Section */}
        <section className="relative pt-48 pb-32 overflow-hidden flex items-center justify-center text-center px-6">
          <MotionDiv 
            variants={stagger}
            initial="initial"
            animate="animate"
            className="max-w-4xl relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft border border-accent/10 mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                System Logic • Autonomy
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-serif tracking-tight text-text-primary mb-10 leading-[1.05]">
              Master Python.
              <br />
              <span className="text-accent italic">Engineered for Flow.</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-xl md:text-2xl font-serif italic text-text-secondary leading-relaxed mb-16 opacity-80">
              Transforming raw syntax into agentic mastery. A high-fidelity sandbox paired with an adaptive AI tutor — scaled for the modern scholar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href="/learn"
                className="btn-tactile bg-accent text-white font-bold text-[14px] uppercase tracking-widest px-12 py-5 rounded-xl shadow-float shadow-accent/20 flex items-center gap-4 w-full sm:w-auto justify-center"
              >
                Enter Protocol <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/practice"
                className="btn-tactile bg-white border border-border-fine text-text-primary font-bold text-[14px] uppercase tracking-widest px-12 py-5 rounded-xl hover:bg-bg-surface transition-colors flex items-center gap-4 w-full sm:w-auto justify-center"
              >
                <Terminal className="h-4 w-4" />
                Live Sandbox
              </Link>
            </div>
          </MotionDiv>

          {/* Background Texture Ornamentation */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full pointer-events-none opacity-[0.02]">
            <div className="absolute top-20 left-10 w-96 h-96 border border-accent rounded-full animate-pulse" />
            <div className="absolute bottom-20 right-10 w-64 h-64 border border-accent rounded-full" />
          </div>
        </section>

        {/* The Feature Exhibits */}
        <section className="py-40 bg-white/50 border-t border-border-fine relative z-10">
          <div className="container mx-auto px-6">
            <MotionDiv 
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3"
            >
              <FeatureCard 
                icon={<Code size={24} />}
                title="Monolith Sandbox"
                description="A heavy-duty browser IDE providing sub-millisecond execution for complex Python algorithms."
              />
              <FeatureCard 
                icon={<Cpu size={24} />}
                title="Neural Triage"
                description="Proprietary AI routing system that connects your specific query to optimized knowledge models."
              />
              <FeatureCard 
                icon={<LineChart size={24} />}
                title="Mastery Metrics"
                description="Visualizing intellectual growth through weighted performance analytics and deep-skill mapping."
              />
            </MotionDiv>
          </div>
        </section>

        {/* The Curriculum Protocol */}
        <section className="py-40 border-t border-border-fine bg-bg-base relative overflow-hidden">
          <div className="container mx-auto px-6 space-y-24 relative z-10">
            <MotionDiv
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-border-fine pb-16"
            >
              <div className="max-w-2xl space-y-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.4em] text-accent">
                  The Protocol
                </div>
                <h2 className="text-5xl md:text-6xl font-serif text-text-primary tracking-tight leading-none">
                  A Guided Path to Python Expertise
                </h2>
                <p className="text-xl md:text-2xl font-serif italic text-text-secondary opacity-80 leading-relaxed">
                  Structured curriculum engineered for deep scholarship.
                </p>
              </div>
              <Link 
                href="/learn" 
                className="group inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.3em] text-accent hover:opacity-80 transition-editorial"
              >
                <span>Full Syllabus</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </MotionDiv>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-white border border-border-fine animate-pulse" />
                ))
              ) : modules.length > 0 ? (
                modules.map((module, i) => (
                  <MotionDiv
                    key={module.id}
                    variants={fadeUp}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Link href={`/learn/${module.slug}`} className="block h-full group">
                      <div className="h-full bg-white border border-border-fine rounded-2xl p-10 shadow-card hover:shadow-float transition-editorial group-hover:-translate-y-2 flex flex-col justify-between">
                        <div className="space-y-8">
                          <div className="w-14 h-14 rounded-xl bg-bg-elevated flex items-center justify-center font-bold text-accent text-sm border-[0.8px] border-border-fine shadow-sm">
                            {module.order < 10 ? `0${module.order}` : module.order}
                          </div>
                          <div className="space-y-4">
                            <h3 className="font-serif font-bold text-2xl text-text-primary tracking-tight group-hover:text-accent transition-editorial">
                              {module.name}
                            </h3>
                            <p className="text-sm prose-editorial text-text-secondary leading-relaxed line-clamp-3">
                              {module.description}
                            </p>
                          </div>
                        </div>
                        <div className="pt-10 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted transition-colors">
                            <Bookmark size={14} className="opacity-50" /> Proceed
                          </div>
                          <ArrowRight size={14} className="text-accent opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-editorial" />
                        </div>
                      </div>
                    </Link>
                  </MotionDiv>
                ))
              ) : (
                <div className="col-span-full py-32 bg-white border border-dashed border-border-fine rounded-2xl text-center text-text-muted font-serif italic text-xl shadow-inner">
                  Project curriculum is currently being compiled by the AI.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="py-32 border-t border-border-fine bg-white relative z-10 transition-editorial">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 items-start gap-16 mb-24">
            <div className="space-y-8">
              <div className="flex flex-col gap-4">
                <span className="font-serif font-bold text-4xl tracking-tight text-text-primary">LearnFlow</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent">Panaversity Engine</span>
              </div>
              <p className="text-sm prose-editorial text-text-secondary leading-relaxed">
                Empowering the next generation of autonomous engineers through rigorous scholarship and agentic pedagogy.
              </p>
            </div>
            
            <div className="grid grid-cols-2 col-span-2 gap-10">
              <div className="space-y-8">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-muted">Research</h4>
                <div className="flex flex-col gap-6 text-[12px] font-bold uppercase tracking-[0.2em] text-text-primary">
                  <Link href="/" className="hover:text-accent transition-editorial">Methodology</Link>
                  <Link href="/" className="hover:text-accent transition-editorial">Skill Library</Link>
                  <Link href="/" className="hover:text-accent transition-editorial">Benchmarks</Link>
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-muted">Institutional</h4>
                <div className="flex flex-col gap-6 text-[12px] font-bold uppercase tracking-[0.2em] text-text-primary">
                  <Link href="/" className="hover:text-accent transition-editorial">Faculty</Link>
                  <Link href="/" className="hover:text-accent transition-editorial">Ethical Framework</Link>
                  <Link href="/" className="hover:text-accent transition-editorial">Contact</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-16 border-t border-border-fine flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-muted">
              &copy; 2026 Panaversity &bull; Systemic Excellence
            </div>
            <div className="flex items-center gap-8">
              <div className="w-10 h-10 rounded-lg border border-border-fine flex items-center justify-center text-text-primary hover:border-accent hover:text-accent transition-editorial cursor-pointer">
                <Sparkles size={16} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <MotionDiv 
      variants={fadeUp}
      className="p-12 bg-white border border-border-fine rounded-2xl shadow-card hover:shadow-float transition-editorial group relative overflow-hidden"
    >
      <div className="p-4 bg-bg-surface rounded-xl border border-border-fine w-fit mb-10 group-hover:scale-110 transition-transform duration-700 text-accent">
        {icon}
      </div>
      <h3 className="text-3xl font-serif font-bold text-text-primary tracking-tight mb-6 group-hover:text-accent transition-editorial">
        {title}
      </h3>
      <p className="text-lg prose-editorial text-text-secondary leading-relaxed opacity-80">
        {description}
      </p>
    </MotionDiv>
  );
}
