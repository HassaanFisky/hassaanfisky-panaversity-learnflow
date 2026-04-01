"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, GraduationCap, LayoutDashboard, LineChart, MessageSquare, PieChart, PieChartIcon, RefreshCw, Send, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart as RePieChart, 
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

export default function TeacherDashboard() {
  const [alerts, setAlerts] = useState<StruggleAlert[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchDashboardData = async () => {
      try {
        const [alertsResponse, analyticsResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/struggle_alerts?select=*&order=created_at.desc`, {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
            },
          }),
          fetch(`${process.env.NEXT_PUBLIC_PROGRESS_SERVICE_URL}/analytics/summary`)
        ]);

        const [alertsData, analyticsData] = await Promise.all([
          alertsResponse.json(),
          analyticsResponse.json()
        ]);

        setAlerts(alertsData || []);
        setAnalytics(analyticsData);

      } catch (error) {
        console.error("Failed to fetch teacher dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-muted-foreground">Generating Teacher Insights...</p>
        </div>
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="p-2 hover:bg-secondary rounded-lg transition-colors group">
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <LayoutDashboard size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight italic">Teacher Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex -space-x-2">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px] font-bold">
                  JS
                </div>
             ))}
             <div className="w-8 h-8 rounded-full bg-primary border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary-foreground">
               +{analytics?.total_users || 0}
             </div>
           </div>
           <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20">
             <Send size={16} /> Broadcast Lesson
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Navigation */}
        <aside className="w-64 border-r bg-secondary/20 p-6 flex flex-col gap-8 shrink-0">
          <div className="space-y-2">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-2">Overview</h3>
            <div className="space-y-1">
              <NavButton 
                icon={<Users size={18} />} 
                label={`Students: ${analytics?.total_users || 0}`} 
                active 
              />
              <NavButton 
                icon={<BarChart3 size={18} />} 
                label={`Avg Mastery: ${analytics?.avg_mastery || 0}%`} 
              />
              <NavButton icon={<GraduationCap size={18} />} label="Class Mastery" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-2">Interventions</h3>
            <div className="space-y-1">
               <NavButton 
                 icon={<AlertCircle size={18} className="text-destructive font-black" />} 
                 label="Struggle Alerts" 
                 badge={alerts.length.toString()}
               />
               <NavButton icon={<MessageSquare size={18} />} label="Active Sessions" />
            </div>
          </div>

          <div className="mt-auto p-6 rounded-3xl bg-primary/10 border-2 border-primary/20 space-y-3 relative overflow-hidden group">
            <h4 className="font-black text-sm text-primary tracking-tight">AI Teaching Assistant</h4>
            <p className="text-[10px] font-medium leading-relaxed opacity-80">
              "{analytics?.struggling_users ? `${analytics?.struggling_users} students are currently triggering struggle alerts.` : "Your class is making steady progress."} Should I adjust the difficulty context?"
            </p>
            <button className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold hover:opacity-90 transition-opacity">
              ENABLE AUTOMATION
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-12 space-y-12">
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                   <h1 className="text-4xl font-black italic tracking-tighter uppercase">Class Insights</h1>
                   <p className="text-muted-foreground">Real-time engagement and mastery analytics for your Python group.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-secondary rounded-2xl border font-bold text-xs hover:border-primary/50 transition-all">
                  <RefreshCw size={14} /> Refresh Data
                </button>
              </div>

              {/* Analytics Summary Charts */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Module Distribution Pie */}
                <div className="p-8 rounded-[2.5rem] bg-background border flex flex-col gap-6 shadow-xl shadow-secondary/10">
                   <div className="space-y-1">
                      <h3 className="text-xl font-bold flex items-center gap-2 italic tracking-tight uppercase">
                        <PieChart className="text-primary" size={20} />
                        Learner Concentration
                      </h3>
                      <p className="text-xs text-muted-foreground">Current active module distribution.</p>
                   </div>
                   <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <RePieChart>
                         <Pie
                            data={analytics?.module_distribution || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                         >
                           {(analytics?.module_distribution || []).map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip 
                            contentStyle={{ borderRadius: "1.5rem", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                         />
                         <Legend verticalAlign="bottom" height={36}/>
                       </RePieChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* Performance Chart */}
                <div className="p-8 rounded-[2.5rem] bg-background border flex flex-col gap-6 shadow-xl shadow-secondary/10">
                   <div className="space-y-1">
                      <h3 className="text-xl font-bold flex items-center gap-2 italic tracking-tight uppercase">
                        <BarChart3 className="text-emerald-500" size={20} />
                        Average Score Trend
                      </h3>
                      <p className="text-xs text-muted-foreground">Aggregate mastery scores over 8 core modules.</p>
                   </div>
                   <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={analytics?.module_distribution || []}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                         <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            style={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                         />
                         <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            style={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                         />
                         <Tooltip 
                           cursor={{ fill: "hsl(var(--primary) / 0.05)" }}
                           contentStyle={{ borderRadius: "1.5rem", border: "none" }}
                         />
                         <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>
              </div>

              {/* Struggle Alerts Table */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-3">
                    <AlertCircle className="text-destructive animate-pulse" />
                    Struggle Alerts
                  </h3>
                  <button className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">View All Alerts &rarr;</button>
                </div>

                {alerts.length > 0 ? (
                  <div className="grid gap-4">
                    {alerts.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="p-6 rounded-3xl bg-destructive/5 border-2 border-destructive/10 hover:border-destructive/30 transition-all flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                               <Users size={24} />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-black text-lg">User {alert.user_id.slice(0, 8)}...</h4>
                              <p className="text-xs font-semibold text-muted-foreground">
                                Struggling with <span className="text-primary font-black italic">{alert.module_slug}</span> after {alert.details.attempts} attempts
                              </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-12">
                            <div className="flex flex-col items-center gap-1">
                               <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Score</span>
                               <span className="text-xl font-black text-destructive">{alert.details.mastery_score}%</span>
                            </div>
                            <button className="px-6 py-3 rounded-2xl bg-destructive text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                              <MessageSquare size={14} /> Send Tip
                            </button>
                         </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                     <CheckCircle2 size={40} className="text-emerald-500" />
                     <h4 className="font-black">Smooth Sailing</h4>
                     <p className="text-xs">No students are currently hitting mastery barriers.</p>
                  </div>
                )}
              </div>
           </div>
        </main>
      </div>
    </div>
  );
}

function NavButton({ icon, label, badge, active = false }: { icon: React.ReactNode, label: string, badge?: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-destructive text-white text-[10px] font-black">
          {badge}
        </span>
      )}
    </button>
  );
}
