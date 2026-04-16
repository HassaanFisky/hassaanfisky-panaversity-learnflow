"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, Lock, MessageSquare, PlayCircle, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import AiTutorPanel from "@/components/AiTutorPanel";

const MODULE_TOPICS: Record<string, { slug: string; title: string; description: string }[]> = {
  syntax: [
    { slug: "variables",        title: "Variables & Data Types",    description: "Numbers, text, and true/false basics." },
    { slug: "operators",        title: "Basic Math & Logic",        description: "Adding, comparing, and combining values." },
    { slug: "control-flow",     title: "Smart Decisions (If Statements)", description: "Making your code choose the right path." },
    { slug: "loops",            title: "Repeating Actions (Loops)",      description: "Automating tasks by repeating code." },
  ],
  logic: [
    { slug: "functions",        title: "Reusable Blocks (Functions)",    description: "Write once, use everywhere." },
    { slug: "recursion",        title: "Recursive Thinking",             description: "Solving problems by breaking them down." },
  ],
};

const DEFAULT_TOPICS = [
  { slug: "intro",     title: "Introduction",       description: "Overview of what we'll learn." },
  { slug: "concepts",  title: "Core Concepts",      description: "Foundational ideas." },
  { slug: "practice",  title: "Guided Practice",    description: "Try it yourself." },
];

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = params.module as string;
  const topics = useMemo(() => MODULE_TOPICS[moduleSlug] ?? DEFAULT_TOPICS, [moduleSlug]);

  const [loading, setLoading] = useState(true);
  const [showAiTutor, setShowAiTutor] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin shadow-sm" />
          <p className="font-bold text-text-muted animate-pulse uppercase text-[10px] tracking-[0.4em]">Loading Syllabus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans selection:bg-accent/10">
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
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Mastery Path</span>
              <ChevronRight size={12} className="text-text-muted/40" />
              <span className="text-sm font-serif font-bold text-text-primary italic">
                {moduleSlug.replace(/-/g, ' ')}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAiTutor(!showAiTutor)}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${showAiTutor ? 'bg-text-primary text-white border-text-primary shadow-float' : 'bg-white border-border-fine text-text-primary hover:border-accent hover:text-accent shadow-sm'}`}
          >
            <MessageSquare size={16} />
            Ask Tutor
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-20 space-y-16">
        <section className="space-y-6">
           <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-accent-soft border border-accent/10">
              <BookOpen size={12} className="text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent">Chapter Overview</span>
           </div>
           <h1 className="text-5xl font-serif font-bold italic tracking-tighter text-text-primary leading-tight">
              {moduleSlug.replace(/-/g, ' ')}
           </h1>
           <p className="text-xl font-serif italic text-text-secondary opacity-70">
              Building the core foundations of your autonomous developer journey.
           </p>
        </section>

        {/* PHASE 2: Simple Card-based List */}
        <section className="space-y-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-text-muted border-b border-border-fine pb-4 mb-8">Learning Topics</h2>
          <div className="grid gap-6">
            {topics.map((topic, i) => (
              <motion.div
                key={topic.slug}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/learn/${moduleSlug}/${topic.slug}`} className="group block">
                  <div className="bg-white border border-border-fine rounded-2xl p-8 flex items-center justify-between shadow-sm hover:shadow-card hover:-translate-y-1 transition-all duration-500">
                    <div className="flex items-center gap-8">
                       <div className="w-12 h-12 bg-bg-surface border border-border-fine rounded-xl flex items-center justify-center text-accent font-serif italic font-bold">
                          {i + 1}
                       </div>
                       <div className="space-y-1">
                          <h3 className="text-xl font-serif font-bold text-text-primary group-hover:text-accent transition-colors">{topic.title}</h3>
                          <p className="text-sm text-text-secondary opacity-60 leading-tight">{topic.description}</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* AI Tutor Sidebar */}
      <aside 
        className={`fixed top-0 right-0 h-full w-[400px] z-50 transform transition-transform duration-700 shadow-2xl ${showAiTutor ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <AiTutorPanel 
          context={{ module: moduleSlug }} 
          onClose={() => setShowAiTutor(false)}
        />
      </aside>
    </div>
  );
}
