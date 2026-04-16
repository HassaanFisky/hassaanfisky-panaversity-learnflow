"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Bug, CheckCircle2, ChevronRight, Loader2, Play, RefreshCw, Send, Sparkles, Terminal, Trophy, Cpu, Zap, Activity } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import MonacoEditor from "@/components/MonacoEditor";
import AiTutorPanel from "@/components/AiTutorPanel";

interface Exercise {
  id: string; // CHANGED: Added ID for persistence
  title: string;
  prompt: string;
  starter_code: string;
  test_cases: any[];
  hints: string[];
  module_slug: string;
}

interface GradeResult {
  passed: boolean;
  output: string;
  feedback: string;
  score: number;
  tests_passed: number;
  tests_total: number;
  error?: string;
  submission_id?: string; // CHANGED: Track submission ID
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const moduleSlug = searchParams.get("module") || "basics";
  const topicSlug = searchParams.get("topic") || "";

  const [code, setCode] = useState("");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [activeTab, setActiveTab] = useState<"instructions" | "output">("instructions");
  const [showAiTutor, setShowAiTutor] = useState(false);

  useEffect(() => {
    const fetchExercise = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_EXERCISE_SERVICE_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module_slug: moduleSlug, topic: topicSlug, level: "beginner" }),
        });
        const data = await response.json();
        setExercise(data);
        setCode(data.starter_code || "");
      } catch (error) {
        console.error("Failed to fetch exercise:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [moduleSlug, topicSlug]);

  const handleRun = async () => {
    if (!exercise) return;
    setGrading(true);
    setActiveTab("output");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_EXERCISE_SERVICE_URL}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code, 
          test_cases: exercise.test_cases,
          exercise_id: exercise.id, // CHANGED: Pass exercise ID for persistence
          user_id: "anonymous_user", // CHANGED: Pass user ID (hardcoded for now as per project spec)
          exercise_title: exercise.title 
        }),
      });
      const data = await response.json();
      setResult(data);
      
      // If passed, update progress via progress-service
      if (data.passed) {
        fetch(`${process.env.NEXT_PUBLIC_PROGRESS_SERVICE_URL}/progress/anonymous_user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_slug: moduleSlug,
            exercise_score: data.score
          })
        }).catch(err => console.error("Progress update failed:", err));
      }
    } catch (error) {
      console.error("Grading failed:", error);
    } finally {
      setGrading(false);
    }
  };

  const handleReset = () => {
    if (exercise) {
      setCode(exercise.starter_code);
      setResult(null);
      setActiveTab("instructions");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-base relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-20" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-full border-[0.8px] border-accent/30 flex items-center justify-center animate-pulse">
            <Cpu className="text-accent animate-spin-slow" />
          </div>
          <p className="font-bold text-[10px] uppercase tracking-[0.4em] text-text-muted animate-pulse">Initializing Execution Environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg-base flex flex-col overflow-hidden selection:bg-accent/10">
      {/* Universal Header */}
      <header className="h-16 border-b border-border-fine bg-bg-base/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/learn" className="p-2 hover:bg-bg-surface rounded-xl transition-editorial group border border-transparent hover:border-border-fine shadow-sm hover:shadow-md">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-text-secondary" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-bold tracking-tight text-text-primary capitalize">{exercise?.title}</span>
              <div className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-bold tracking-widest border border-border-fine ${grading ? 'bg-accent/10 text-accent animate-pulse' : 'bg-bg-surface text-text-muted'}`}>
                {grading ? "Executing..." : "Sandbox"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowAiTutor(!showAiTutor)}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-editorial border shadow-sm ${showAiTutor ? 'bg-text-primary border-text-primary text-white' : 'bg-white border-border-fine text-text-secondary hover:border-accent/50'}`}
          >
            <Sparkles size={14} className={showAiTutor ? "animate-pulse" : ""} />
            Aira Intelligence
          </button>
          <button 
            onClick={handleRun} 
            disabled={grading}
            className="flex items-center gap-3 px-8 py-2.5 rounded-xl bg-accent text-white text-[11px] font-bold uppercase tracking-widest hover:brightness-110 transition-editorial disabled:opacity-50 shadow-float"
          >
            <Play size={14} fill="currentColor" className={grading ? "animate-pulse" : ""} />
            Execute Solution
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Enhanced Editor */}
        <div className="flex-1 flex flex-col border-r border-border-fine bg-bg-surface/30 relative">
          <div className="h-10 bg-bg-base/50 flex items-center justify-between px-6 border-b border-border-fine">
            <div className="flex items-center gap-3">
               <Terminal size={12} className="text-accent" />
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">main.py</span>
            </div>
            <div className="flex items-center gap-4 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                <span className="text-[9px] font-bold uppercase tracking-widest">Python 3.12</span>
                <div className="w-2 h-2 rounded-full bg-[#579D84]" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <MonacoEditor 
              value={code} 
              onChange={setCode} 
            />
          </div>
        </div>

        {/* Right: High-Fidelity Info Panel */}
        <div className={`w-[500px] flex flex-col bg-bg-base shrink-0 transition-all duration-500 border-l border-border-fine ${showAiTutor ? 'opacity-0 translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
          <div className="h-12 flex border-b border-border-fine shrink-0 bg-bg-surface/50 p-1">
            <button 
              onClick={() => setActiveTab("instructions")}
              className={`flex-1 flex items-center justify-center gap-3 text-[10px] font-bold tracking-widest uppercase transition-editorial rounded-lg ${activeTab === "instructions" ? 'bg-white text-text-primary shadow-sm border border-border-fine' : 'text-text-muted hover:text-text-primary'}`}
            >
              <BookOpen size={14} /> Mission
            </button>
            <button 
              onClick={() => setActiveTab("output")}
              className={`flex-1 flex items-center justify-center gap-3 text-[10px] font-bold tracking-widest uppercase transition-editorial rounded-lg ${activeTab === "output" ? 'bg-white text-text-primary shadow-sm border border-border-fine' : 'text-text-muted hover:text-text-primary'}`}
            >
              <Activity size={14} /> Console {(result?.tests_passed ?? 0) > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#579D84] animate-pulse" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-12 scroll-smooth bg-dot-grid">
            {activeTab === "instructions" ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent">Active Protocol</div>
                  <h2 className="text-4xl font-serif font-bold tracking-tight text-text-primary italic -ml-1 pr-4">{exercise?.title}</h2>
                  <p className="prose-editorial text-text-secondary leading-relaxed opacity-80">
                    {exercise?.prompt}
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-bg-surface/40 border border-border-fine space-y-6 shadow-inner relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={64} className="text-accent" />
                  </div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-primary flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#579D84]" />
                    Architectural Requirements
                  </h3>
                  <ul className="space-y-4 text-xs text-text-secondary">
                    <li className="flex gap-4">
                      <span className="text-accent font-bold mt-0.5">/ 01</span>
                      <span className="leading-relaxed">Logic must reflect deterministic behavior as specified in the prompt payload.</span>
                    </li>
                    <li className="flex gap-4">
                      <span className="text-accent font-bold mt-0.5">/ 02</span>
                      <span className="leading-relaxed">Adhere to strict structural integrity (PEP 8) within the execution scope.</span>
                    </li>
                  </ul>
                </div>

                {exercise?.hints && exercise.hints.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-primary flex items-center gap-3">
                      <Sparkles size={16} className="text-accent" />
                      Intelligence Nodes
                    </h3>
                    <div className="space-y-4">
                      {exercise?.hints.map((hint, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-white border border-border-fine text-[11px] leading-relaxed italic text-text-secondary shadow-sm hover:shadow-md transition-editorial">
                          "{hint}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleReset}
                  className="w-full py-5 rounded-3xl border border-dashed border-border-fine text-text-muted hover:border-accent/40 hover:text-accent transition-editorial text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4 group bg-bg-surface/20"
                >
                  <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                  Re-Initialize Sandbox
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                {!result && !grading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 opacity-40 group">
                    <div className="w-24 h-24 rounded-full border-[0.8px] border-border-fine border-dashed flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                      <Play size={32} className="text-text-muted translate-x-1" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-text-primary">Awaiting Execution</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Initialize solution to stream output log.</p>
                    </div>
                  </div>
                ) : grading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                    <div className="w-20 h-20 rounded-full border-[0.8px] border-border-fine flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-accent" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-text-primary animate-pulse">Running Architectural Validation</h4>
                      <p className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Aira is synthesizing your instruction set.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6">
                    {/* Mastery Result Wheel */}
                    <div className={`p-12 rounded-[3rem] flex flex-col items-center text-center gap-8 ${result?.passed ? 'bg-[#FCFAF8] border-[#579D84]/30' : 'bg-red-50 border-red-200'} border shadow-float`}>
                      <div className="relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="2" fill="transparent" className="opacity-10 text-text-muted" />
                          <motion.circle 
                            initial={{ strokeDashoffset: 351.8 }}
                            animate={{ strokeDashoffset: 351.8 - (351.8 * (result ? result.score : 0)) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="4" fill="transparent"
                            strokeDasharray={351.8}
                            className={`transition-all ${result?.passed ? 'text-[#579D84]' : 'text-accent'}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-3xl font-serif italic text-text-primary">{result?.score}%</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-serif italic tracking-tight text-text-primary">
                          {result?.passed ? "Mission Completed" : "Partial Validation"}
                        </h3>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                           {result?.tests_passed} of {result?.tests_total} nodes validated
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent border-b border-border-fine pb-4">Execution Feedback</h3>
                      <p className="prose-editorial text-text-primary italic border-l-2 border-accent/40 pl-6 text-sm">
                        "{result?.feedback}"
                      </p>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-muted border-b border-border-fine pb-4">Standard Output</h3>
                      <div className="p-6 rounded-2xl bg-bg-surface/50 border border-border-fine font-mono text-[10px] leading-loose whitespace-pre-wrap overflow-x-auto shadow-inner text-text-secondary">
                        {result?.output || "No data streamed to stdout."}
                      </div>
                    </div>

                    {result?.error && (
                      <div className="p-6 rounded-2xl bg-red-50 border border-red-100 space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.34m] text-red-600 flex items-center gap-3">
                          <Bug size={14} /> Logic Exception
                        </h4>
                        <pre className="text-[10px] font-mono whitespace-pre-wrap text-red-700/80 leading-relaxed">
                          {result.error}
                        </pre>
                      </div>
                    )}

                    {result?.passed ? (
                      <Link 
                        href="/learn" 
                        className="w-full flex items-center justify-between p-8 rounded-3xl bg-text-primary text-white hover:brightness-110 transition-editorial font-bold text-[11px] uppercase tracking-[0.3em] group shadow-float shadow-text-primary/20"
                      >
                        Advance Protocol
                        <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
                      </Link>
                    ) : (
                      <button 
                        onClick={() => { setShowAiTutor(true); setActiveTab("instructions"); }}
                        className="w-full flex items-center justify-between p-8 rounded-3xl bg-white border border-border-fine text-text-primary hover:border-accent/40 transition-editorial font-bold text-[11px] uppercase tracking-[0.3em] group shadow-sm hover:shadow-md"
                      >
                        Engage Aira Intelligence
                        <Sparkles size={18} className="text-accent animate-pulse" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* AI Tutor Sidebar Overlay */}
        <aside 
          className={`fixed top-0 right-0 h-full w-[500px] bg-bg-base border-l border-border-fine z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.4, 0, 0.2, 1)] shadow-float ${showAiTutor ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <AiTutorPanel 
            context={{ module: moduleSlug, code: code, result: result }} 
            onClose={() => setShowAiTutor(false)}
          />
        </aside>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
        <div className="h-screen flex items-center justify-center bg-bg-base">
            <div className="flex flex-col items-center gap-6">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted animate-pulse">Synchronizing Node</span>
            </div>
        </div>}>
      <PracticePageContent />
    </Suspense>
  );
}
