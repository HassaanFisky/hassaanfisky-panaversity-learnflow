"use client";

import { motion } from "framer-motion";
import { 
  AlertCircle, ArrowLeft, BarChart3, CheckCircle2, GraduationCap, 
  LayoutDashboard, LineChart, MessageSquare, PieChart, PieChartIcon, 
  RefreshCw, Send, Users, Cpu, Activity 
} from "lucide-react";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Bar, BarChart, Cell, Legend, Pie, PieChart as RePieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis 
} from "recharts";

interface StruggleAlert {
  id: string;
  user_id: string;
  module_slug: string;
  alert_type: string;
  created_at: string;
  details: {
    mastery_score: number;
    attempts: number;
    latest_exercise_score: number;
  };
}

interface AnalyticsSummary {
  total_users: number;
  avg_mastery: number;
  struggling_users: number;
  module_distribution: Array<{ name: string; value: number }>;
}

interface Submission {
  id: string;
  user_id: string;
  exercise_id: string;
  code: string;
  passed: boolean;
  score: number;
  output: string;
  created_at: string;
  exercises?: { title: string };
}

import { supabase } from "@/lib/supabase";

export default function TeacherDashboard() {
  const [alerts, setAlerts] = useState<StruggleAlert[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [alertsRes, submissionsRes, analyticsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/struggle_alerts?select=*&order=created_at.desc`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/submissions?select=*,exercises(title)&order=created_at.desc&limit=5`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_PROGRESS_SERVICE_URL}/analytics/summary`)
      ]);

      const [alertsData, submissionsData, analyticsData] = await Promise.all([
        alertsRes.json(),
        submissionsRes.json(),
        analyticsRes.json()
      ]);

      setAlerts(alertsData || []);
      setSubmissions(submissionsData || []);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error("Dashboard fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up Realtime subscriptions
    const submissionChannel = supabase.channel('public:submissions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, async (payload) => {
         // Need to fetch the joined exercise title since it won't be in the base payload
         try {
           const res = await supabase.from('exercises').select('title').eq('id', payload.new.exercise_id).single();
           const newSub = { ...payload.new, exercises: { title: res.data?.title || "Python Node" } } as Submission;
           setSubmissions(current => [newSub, ...current].slice(0, 5));
         } catch (e) {
           setSubmissions(current => [payload.new as unknown as Submission, ...current].slice(0, 5));
         }
      })
      .subscribe();

    const alertsChannel = supabase.channel('public:struggle_alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'struggle_alerts' }, (payload) => {
         setAlerts(current => [payload.new as StruggleAlert, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
          <p className="font-bold text-muted-foreground animate-pulse text-[10px] uppercase tracking-widest">Generating Teacher Insights...</p>
        </div>
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="h-20 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-10 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="p-2.5 hover:bg-secondary rounded-2xl transition-editorial group border border-transparent hover:border-border-fine shadow-sm">
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <LayoutDashboard size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight italic text-text-primary">Teacher Hub</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Institutional Oversight Node</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-secondary/30 border border-border-fine">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-xs font-bold">{analytics?.total_users || 0} Learners</span>
           </div>
           <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-float hover:scale-105 active:scale-95 transition-editorial uppercase tracking-widest">
             <Send size={16} /> Broadcast Lesson
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r bg-secondary/10 p-8 flex flex-col gap-10 shrink-0">
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-2 opacity-50">Observation Metrics</h3>
            <div className="space-y-1">
              <NavButton 
                icon={<Users size={18} />} 
                label="Student Directory" 
                active 
              />
              <NavButton 
                icon={<BarChart3 size={18} />} 
                label={`Class Mastery: ${analytics?.avg_mastery || 0}%`} 
              />
              <NavButton icon={<GraduationCap size={18} />} label="Curriculum Analysis" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-2 opacity-50">Neural Interventions</h3>
            <div className="space-y-1">
               <NavButton 
                 icon={<AlertCircle size={18} className="text-destructive font-black" />} 
                 label="Struggle Alerts" 
                 badge={alerts.length.toString()}
               />
               <NavButton icon={<MessageSquare size={18} />} label="Live Sessions" />
            </div>
          </div>

          <div className="mt-auto p-8 rounded-[2.5rem] bg-white border border-border-fine space-y-4 relative overflow-hidden group shadow-inner">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Cpu size={48} className="text-primary" />
            </div>
            <h4 className="font-serif italic font-bold text-sm text-text-primary">Aira Tutor Assistant</h4>
            <p className="text-[10px] font-medium leading-relaxed text-text-secondary opacity-80">
              "{analytics?.struggling_users ? `${analytics?.struggling_users} students are currently triggering alerts. I recommend initiating a focused Socratic review of 'Data Structures'.` : "Your class is at peak coherence. No interventions required."}"
            </p>
            <button className="w-full py-3 bg-text-primary text-white rounded-2xl text-[10px] font-bold hover:scale-[1.02] transition-transform uppercase tracking-widest">
              DEPLOY AUTOMATION
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-12 space-y-16">
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                   <h1 className="text-4xl font-serif font-black italic tracking-tighter text-text-primary">Institutional Analytics</h1>
                   <p className="text-text-secondary opacity-60">High-fidelity pedagogical oversight across cognitive nodes.</p>
                </div>
                <button className="flex items-center gap-3 px-8 py-3.5 bg-white rounded-2xl border border-border-fine font-bold text-[10px] uppercase tracking-widest hover:border-primary transition-editorial shadow-sm">
                  <RefreshCw size={14} className="text-primary" /> Sync Data
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-10">
                <div className="p-10 rounded-[3rem] bg-background border border-border-fine flex flex-col gap-8 shadow-float">
                   <div className="space-y-2">
                      <h3 className="text-lg font-bold flex items-center gap-3 italic tracking-tight text-text-primary">
                        <PieChartIcon className="text-primary" size={22} />
                        Concentration Sphere
                      </h3>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Active learner presence across modules.</p>
                   </div>
                   <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <RePieChart>
                         <Pie
                            data={analytics?.module_distribution || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            paddingAngle={10}
                            dataKey="value"
                            stroke="none"
                         >
                           {(analytics?.module_distribution || []).map((entry: any, index: number) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip 
                            contentStyle={{ borderRadius: "2rem", border: "1px solid #E5E7EB", padding: "1rem", fontSize: "10px", fontWeight: 800 }}
                         />
                         <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-bold uppercase tracking-widest p-2">{value}</span>}/>
                       </RePieChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="p-12 rounded-[3.5rem] bg-text-primary text-white flex flex-col gap-10 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                      <LineChart size={120} />
                   </div>
                   <div className="space-y-3 relative z-10">
                      <h3 className="text-3xl font-serif italic tracking-tight">Performance Vector</h3>
                      <p className="text-xs opacity-60 font-medium">Class-wide average performance relative to target mastery curves.</p>
                   </div>
                   <div className="h-[280px] w-full relative z-10">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={analytics?.module_distribution || []}>
                         <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'white', opacity: 0.5, fontSize: 8, fontWeight: 900 }}
                         />
                         <YAxis hide />
                         <Tooltip 
                            cursor={{ fill: "white", opacity: 0.1 }}
                            contentStyle={{ borderRadius: "1rem", border: "none", color: "#111" }}
                         />
                         <Bar dataKey="value" fill="white" radius={[12, 12, 0, 0]} barSize={24} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Struggle Alerts Feed */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-border-fine pb-6">
                    <h3 className="text-2xl font-serif font-black italic tracking-tight text-text-primary flex items-center gap-4">
                      <AlertCircle size={28} className="text-accent animate-soft-pulse" />
                      Critical Alerts
                    </h3>
                  </div>

                  {alerts.length > 0 ? (
                    <div className="space-y-4">
                      {alerts.map((alert, i) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="p-8 rounded-3xl bg-white border border-border-fine hover:border-accent/40 hover:shadow-lg transition-editorial flex items-center justify-between group"
                        >
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center text-accent shadow-sm">
                                 <Users size={24} />
                              </div>
                              <div className="space-y-1.5">
                                <h4 className="font-bold text-text-primary text-lg">User_{alert.user_id.slice(0, 5)}</h4>
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
                                  Stuck in <span className="text-accent italic">{alert.module_slug}</span> • {alert.details.attempts} attempts
                                </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="block text-2xl font-serif italic text-accent">{alert.details.mastery_score}%</span>
                              <span className="text-[9px] font-black tracking-widest text-text-muted uppercase">Coherence</span>
                           </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 rounded-[3rem] border-2 border-dashed border-border-fine flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                       <CheckCircle2 size={48} className="text-[#579D84]" />
                       <p className="font-bold text-xs uppercase tracking-widest">Atmosphere Nominal</p>
                    </div>
                  )}
                </div>

                {/* Live Activity Feed */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-border-fine pb-6">
                    <h3 className="text-2xl font-serif font-black italic tracking-tight text-text-primary flex items-center gap-4">
                      <Activity size={28} className="text-[#579D84] animate-soft-pulse" />
                      Live Feed
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {submissions.length > 0 ? (
                      submissions.map((sub, i) => (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="p-8 rounded-3xl bg-bg-surface/30 border border-border-fine flex flex-col gap-6"
                        >
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className={`w-3 h-3 rounded-full ${sub.passed ? 'bg-[#579D84]' : 'bg-accent'}`} />
                                 <span className="font-bold text-[11px] uppercase tracking-widest text-text-primary">{sub.exercises?.title || "Python Node"}</span>
                              </div>
                              <span className="text-[9px] font-black text-text-muted whitespace-nowrap">{new Date(sub.created_at).toLocaleTimeString()}</span>
                           </div>
                           <div className="font-mono text-[10px] bg-white p-6 rounded-2xl border border-border-fine text-text-muted shadow-inner relative overflow-hidden h-24 overflow-y-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80" />
                              <pre><code>{sub.code}</code></pre>
                           </div>
                           <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-text-muted uppercase tracking-[0.2em]">Learner ID: {sub.user_id.slice(0,6)}</span>
                              <span className={sub.passed ? 'text-[#579D84]' : 'text-accent'}>{sub.passed ? 'SUCCESS' : 'FAILURE'}</span>
                           </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-64 rounded-[3rem] border-2 border-dashed border-border-fine flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                         <span className="font-bold text-xs uppercase tracking-widest">No Stream Data Detected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
           </div>
        </main>
      </div>
    </div>
  );
}

function NavButton({ icon, label, badge, active = false }: { icon: React.ReactNode, label: string, badge?: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-bold transition-editorial uppercase tracking-widest ${active ? 'bg-text-primary text-white shadow-float' : 'text-text-muted hover:bg-bg-surface hover:text-text-primary'}`}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="px-3 py-1 rounded-full bg-accent text-white text-[9px] font-black">
          {badge}
        </span>
      )}
    </button>
  );
}
