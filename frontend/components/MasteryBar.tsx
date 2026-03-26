"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";

interface MasteryBarProps {
  label: string;
  percentage: number;
  attempts?: number;
  isMastered?: boolean;
}

export default function MasteryBar({ 
  label, 
  percentage = 0, 
  attempts = 0,
  isMastered = false 
}: MasteryBarProps) {
  
  const statusColor = isMastered ? "bg-primary shadow-lg shadow-primary/20" : "bg-primary opacity-80 opacity-60";
  const ringColor = isMastered ? "border-primary shadow-xl shadow-primary/10" : "border-background hover:border-primary/40";
  
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col gap-6 relative group bg-background glass-morphism ${ringColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isMastered ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground opacity-60'}`}>
              {isMastered ? <Trophy size={24} /> : <Target size={24} />}
           </div>
           <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight italic group-hover:text-primary transition-colors">{label}</h3>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 <span>{attempts} Practice Sessions</span>
                 <span className="w-1 h-1 rounded-full bg-border" />
                 <span>Level {Math.ceil(attempts / 3) || 1}</span>
              </div>
           </div>
        </div>

        <div className="text-right">
           <div className="text-3xl font-black tracking-tighter italic">{Math.round(percentage)}%</div>
           <div className="text-[10px] uppercase font-black tracking-widest text-primary italic font-medium leading-none">Mastery</div>
        </div>
      </div>

      <div className="space-y-3">
         <div className="h-4 w-full bg-secondary/50 rounded-full overflow-hidden border p-0.5 shadow-inner">
            <motion.div
               initial={{ width: 0 }}
               animate={{ width: `${percentage}%` }}
               transition={{ duration: 1, ease: "easeOut" }}
               className={`h-full rounded-full relative group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] duration-500 ${statusColor}`}
            >
               {/* Animated highlight */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </motion.div>
         </div>
         
         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground">Novice</span>
            <div className="flex items-center gap-2 text-primary font-bold italic h-4 shadow-primary/10">
               {isMastered ? (
                  <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Mastered</span>
               ) : (
                  <span className="flex items-center gap-1 group-hover:gap-2 transition-all">Continue Practice <ChevronRight size={12} /></span>
               )}
            </div>
            <span className="text-muted-foreground">Expert</span>
         </div>
      </div>

      {isMastered && (
         <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground p-2 rounded-xl border-4 border-background shadow-xl scale-110 drop-shadow-primary/50">
            <Sparkles size={18} className="animate-pulse" />
         </div>
      )}
    </div>
  );
}
