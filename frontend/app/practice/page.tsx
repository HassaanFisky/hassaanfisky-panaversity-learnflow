"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Bug, CheckCircle2, ChevronRight, Loader2, Play, RefreshCw, Send, Sparkles, Terminal, Trophy } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import MonacoEditor from "@/components/MonacoEditor";
import AiTutorPanel from "@/components/AiTutorPanel";

interface Exercise {
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
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-muted-foreground">Preparing Sandbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Mini-header */}
      <header className="h-14 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/learn" className="p-1 hover:bg-secondary rounded-lg transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm">Practice: {exercise?.title}</span>
            <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${grading ? 'bg-amber-500 animate-pulse' : 'bg-primary'} text-primary-foreground`}>
              {grading ? "Running..." : "Sandbox"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAiTutor(!showAiTutor)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${showAiTutor ? 'bg-primary border-primary text-primary-foreground' : 'bg-secondary border-background hover:border-primary/50'}`}
          >
            <Sparkles size={14} />
            Ask Tutor
          </button>
          <button 
            onClick={handleRun} 
            disabled={grading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
          >
            <Play size={14} fill="currentColor" />
            Run Solution
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col border-r bg-[#1e1e1e]">
          <div className="h-10 bg-[#2d2d2d] flex items-center px-4 border-b">
            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
              <RefreshCw size={12} className={grading ? "animate-spin" : ""} />
              main.py
            </div>
          </div>
          <div className="flex-1">
            <MonacoEditor 
              value={code} 
              onChange={setCode} 
            />
          </div>
        </div>

        {/* Right: Info/Output Panel */}
        <div className={`w-[500px] flex flex-col bg-background shrink-0 transition-all duration-300 ${showAiTutor ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}`}>
          <div className="h-12 flex border-b shrink-0">
            <button 
              onClick={() => setActiveTab("instructions")}
              className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all ${activeTab === "instructions" ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              <BookOpen size={14} /> Instructions
            </button>
            <button 
              onClick={() => setActiveTab("output")}
              className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all ${activeTab === "output" ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              <Terminal size={14} /> Results {(result?.tests_passed ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
            {activeTab === "instructions" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">{exercise?.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {exercise?.prompt}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/50 border border-primary/20 space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" />
                    Deliverables
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      The code must produce exactly the output specified in the requirements.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      Follow Python PEP8 style conventions as much as possible.
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Hints
                  </h3>
                  <div className="space-y-3">
                    {exercise?.hints.map((hint, i) => (
                      <div key={i} className="p-3 rounded-xl bg-background border text-xs leading-relaxed italic opacity-80">
                        {hint}
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleReset}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all text-sm font-black flex items-center justify-center gap-2 group"
                >
                  <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                  RESET STARTER CODE
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                {!result && !grading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50 grayscale scale-90">
                    <div className="w-20 h-20 rounded-[2rem] border-2 border-dashed flex items-center justify-center">
                      <Play size={40} className="fill-current" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-lg">No Runs Yet</h4>
                      <p className="text-xs max-w-[200px]">Submit your code to see the test results here.</p>
                    </div>
                  </div>
                ) : grading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="space-y-1">
                      <h4 className="font-black text-lg">Grading in Sandbox...</h4>
                      <p className="text-xs animate-pulse">Our AI is verifying your code logic</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Score Wheel */}
                    <div className={`p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4 ${result?.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'} border-2`}>
                      <div className="relative">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-10" />
                          <circle 
                            cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * (result ? result.score : 0)) / 100}
                            className={`transition-all duration-1000 ${result?.passed ? 'text-emerald-500' : 'text-primary'}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-black">{result?.score}%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black uppercase tracking-tighter">
                          {result?.passed ? "Mission Success!" : "Keep Trying!"}
                        </h3>
                        <p className="text-xs font-medium opacity-80">
                          Passed {result?.tests_passed} of {result?.tests_total} test cases
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-muted-foreground border-b pb-2">Feedback</h3>
                      <p className="text-sm font-medium leading-relaxed italic border-l-4 border-primary pl-4">
                        "{result?.feedback}"
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-muted-foreground border-b pb-2">Execution Log</h3>
                      <div className="p-4 rounded-xl bg-secondary/30 border font-mono text-[10px] leading-relaxed whitespace-pre-wrap overflow-x-auto shadow-inner text-muted-foreground">
                        {result?.output || "No stdout captured."}
                      </div>
                    </div>

                    {result?.error && (
                      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                          <Bug size={12} /> Runtime Error
                        </h4>
                        <pre className="text-[10px] font-mono whitespace-pre-wrap text-destructive/80">
                          {result.error}
                        </pre>
                      </div>
                    )}

                    {result?.passed ? (
                      <Link 
                        href="/learn" 
                        className="w-full flex items-center justify-between p-6 rounded-2xl bg-primary text-white hover:opacity-90 transition-all font-black text-sm group"
                      >
                        NEXT LESSON
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ) : (
                      <button 
                        onClick={() => { setShowAiTutor(true); setActiveTab("instructions"); }}
                        className="w-full flex items-center justify-between p-6 rounded-2xl bg-secondary border-2 border-primary/20 text-foreground hover:border-primary transition-all font-black text-sm group"
                      >
                        GET HELP FROM TUTOR
                        <Sparkles size={20} className="text-primary animate-pulse" />
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
          className={`fixed top-0 right-0 h-full w-[500px] bg-background border-l z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${showAiTutor ? 'translate-x-0' : 'translate-x-full'}`}
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
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PracticePageContent />
    </Suspense>
  );
}
