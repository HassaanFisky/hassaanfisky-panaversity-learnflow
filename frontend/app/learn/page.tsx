"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, CircleDashed, Filter, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProgressRing from "@/components/ProgressRing";

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  total_topics: number;
}

interface UserProgress {
  module_slug: string;
  mastery_score: number;
  attempts: number;
}

export default function LearnPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [userId] = useState("anonymous_user"); // In a real app, this would come from auth

  useEffect(() => {
    const fetchLearnData = async () => {
      try {
        const [modulesResponse, progressResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?select=*&order=order.asc`, {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
            },
          }),
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/progress?user_id=eq.${userId}&select=*`, {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
            },
          }),
        ]);

        const modulesData = await modulesResponse.json();
        const progressData = await progressResponse.json();

        // MOCK DATA: Provide high-fidelity defaults if DB is empty
        const defaultModules: Module[] = [
          {
            id: "m1",
            name: "The Generative Shift",
            slug: "gen-shift",
            description: "Understanding the move from predictive to generative models.",
            order: 1,
            total_topics: 12
          },
          {
            id: "m2",
            name: "Prompt Engineering v4",
            slug: "prompt-v4",
            description: "Mastering the linguistic architecture of modern LLMs.",
            order: 2,
            total_topics: 18
          },
          {
            id: "m3",
            name: "Agentic Workflows",
            slug: "agentic-flows",
            description: "Designing autonomous loops that solve complex problems.",
            order: 3,
            total_topics: 15
          },
          {
            id: "m4",
            name: "AI Ethics & Global Governance",
            slug: "ethics",
            description: "Navigating the legal and moral landscape of AI.",
            order: 4,
            total_topics: 8
          }
        ];

        setModules(modulesData && modulesData.length > 0 ? modulesData : defaultModules);
        
        const progressMap: Record<string, UserProgress> = {};
        (progressData || []).forEach((p: UserProgress) => {
          progressMap[p.module_slug] = p;
        });
        setUserProgress(progressMap);
      } catch (error) {
        console.error("Failed to fetch learn data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLearnData();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2 hover:bg-secondary rounded-lg transition-colors group">
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Sparkles size={18} />
              </div>
              <span className="font-bold text-lg">LearnFlow</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary border border-primary flex items-center justify-center text-primary font-bold">
              U
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 space-y-12 max-w-7xl mx-auto w-full">
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight">Browse Modules</h1>
              <p className="text-muted-foreground">Select a module to start learning. Your mastery is tracked automatically.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl border text-sm font-medium">
              <Filter size={16} />
              All Levels
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />
            ))
          ) : modules.length > 0 ? (
            modules.map((module, i) => {
              const progress = userProgress[module.slug] || { mastery_score: 0, attempts: 0 };
              const isMastered = progress.mastery_score >= 80;
              const isStarted = progress.attempts > 0;

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ y: -4 }}
                >
                  <Link href={`/learn/${module.slug}/intro`} className="block group h-full">
                    <div className={`h-full p-8 rounded-[2rem] border-2 transition-all relative overflow-hidden flex flex-col items-center text-center space-y-6 glass-morphism ${isMastered ? 'border-primary/40 bg-primary/5' : 'border-background hover:border-primary/30'}`}>
                      {/* Visual progress indicator */}
                      <div className="relative">
                        <ProgressRing 
                          percentage={progress.mastery_score} 
                          size={120} 
                          strokeWidth={10} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-2xl font-black text-foreground">
                            {Math.round(progress.mastery_score)}%
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none">
                            Mastery
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {module.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {module.total_topics} Topics • {module.slug}
                        </p>
                      </div>

                      <div className="w-full pt-4 mt-auto border-t flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                        {isMastered ? (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 size={14} /> Completed
                          </span>
                        ) : isStarted ? (
                          <span className="flex items-center gap-1 text-amber-500">
                            <CircleDashed size={14} className="animate-spin-slow" /> In Progress
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <BookOpen size={14} /> Start Module
                          </span>
                        )}
                        <span className="text-primary group-hover:underline underline-offset-4">
                          Enter Module
                        </span>
                      </div>

                      {isMastered && (
                        <div className="absolute top-4 right-4 text-primary">
                          <Sparkles size={18} />
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 space-y-2">
              <h3 className="font-bold">No modules available</h3>
              <p className="text-sm">Seed your Supabase database with Python modules to see them here.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="py-12 border-t container mx-auto px-6 text-center text-muted-foreground text-sm opacity-50">
        LearnFlow Dashboard v1.0.0
      </footer>
    </div>
  );
}
