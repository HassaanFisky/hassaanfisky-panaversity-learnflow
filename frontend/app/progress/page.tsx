"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Award, BookOpen, CheckCircle2, Clock, Medal, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import MasteryBar from "@/components/MasteryBar";

interface ModuleProgress {
  module_slug: string;
  module_name: string;
  mastery_score: number;
  attempts: number;
  last_activity: string;
}

interface ProgressData {
  user_id: string;
  modules: ModuleProgress[];
  overall_mastery: number;
  total_attempts: number;
  modules_started: number;
  modules_mastered: number;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId] = useState("anonymous_user");

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_SERVICE_URL}/progress/${userId}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-muted-foreground">Analyzing Your Mastery...</p>
        </div>
      </div>
    );
  }

  const BADGES = [
    { title: "First Steps", desc: "Started your first module", icon: <Award className="text-blue-400" />, unlocked: data?.modules_started ?? 0 > 0 },
    { title: "Master Coder", desc: "Reached 80% mastery in any module", icon: <Medal className="text-amber-400" />, unlocked: data?.modules_mastered ?? 0 > 0 },
    { title: "Persistent", desc: "Completed 10+ exercises", icon: <Target className="text-emerald-400" />, unlocked: data?.total_attempts ?? 0 >= 10 },
    { title: "Elite Pythonista", desc: "Mastered all Python modules", icon: <Trophy className="text-primary" />, unlocked: data?.modules_mastered ?? 0 >= 8 },
  ];

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
                <TrendingUp size={18} />
              </div>
              <span className="font-bold text-lg tracking-tight">Mastery Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest border border-primary/20 flex items-center gap-2">
               <Trophy size={12} />
               Level 4
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 md:p-12 space-y-12 max-w-7xl">
        {/* Top Summary Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Target className="text-primary" size={24} />}
            label="Overall Mastery"
            value={`${Math.round(data?.overall_mastery ?? 0)}%`}
            color="bg-primary/5 border-primary/20"
          />
          <StatCard 
            icon={<Award className="text-amber-500" size={24} />}
            label="Modules Mastered"
            value={`${data?.modules_mastered ?? 0}`}
            color="bg-amber-500/5 border-amber-500/20"
          />
          <StatCard 
            icon={<Clock className="text-emerald-500" size={24} />}
            label="Total Exercises"
            value={`${data?.total_attempts ?? 0}`}
            color="bg-emerald-500/5 border-emerald-500/20"
          />
          <StatCard 
            icon={<BookOpen className="text-blue-500" size={24} />}
            label="Learning Streak"
            value="4 Days"
            color="bg-blue-500/5 border-blue-500/20"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-12 pt-8">
          {/* Module Mastery List */}
          <section className="lg:col-span-2 space-y-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-black">Module Mastery</h2>
              <p className="text-muted-foreground text-sm">Individual progress breakdown for each Python module.</p>
            </div>
            
            <div className="space-y-6">
              {data?.modules.map((module, i) => (
                <motion.div
                  key={module.module_slug}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <MasteryBar 
                    label={module.module_name} 
                    percentage={module.mastery_score} 
                    attempts={module.attempts}
                    isMastered={module.mastery_score >= 80}
                  />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Achievements / Badges Panel */}
          <section className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-black">Success Badges</h2>
              <p className="text-muted-foreground text-sm">Unlock rewards by reaching mastery milestones.</p>
            </div>

            <div className="grid gap-4">
              {BADGES.map((badge, i) => (
                <motion.div
                  key={badge.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                  className={`p-6 rounded-3xl border transition-all ${badge.unlocked ? 'bg-background glass-morphism' : 'grayscale opacity-40 bg-secondary'}`}
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0 shadow-inner">
                      {badge.unlocked ? badge.icon : <Target className="text-muted-foreground" size={20} />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">{badge.title}</h4>
                      <p className="text-xs text-muted-foreground">{badge.desc}</p>
                    </div>
                    {badge.unlocked && (
                      <div className="ml-auto p-1.5 bg-primary/10 rounded-full text-primary">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-8 rounded-[2.5rem] bg-primary text-primary-foreground space-y-4 shadow-xl shadow-primary/20 relative overflow-hidden group">
              <div className="relative z-10 space-y-2">
                <Sparkles className="text-white/40 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-black text-xl leading-none italic uppercase">Tutor Feedback</h3>
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  "You're making incredible progress in Functions! Your code is becoming cleaner and more Pythonic. Next, focus on Async to level up."
                </p>
              </div>
              <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors">
                <Sparkles size={120} />
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-auto py-12 border-t container mx-auto px-6 text-center text-muted-foreground text-sm opacity-50">
        Mastery Reports generated in real-time by LearnFlow Insights.
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center justify-center text-center space-y-2 hover:scale-[1.02] transition-transform ${color}`}>
      <div className="mb-2">{icon}</div>
      <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</h4>
      <p className="text-4xl font-black tracking-tighter">{value}</p>
    </div>
  );
}
