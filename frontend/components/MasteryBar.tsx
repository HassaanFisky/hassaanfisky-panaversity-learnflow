"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Sparkles, Target, Trophy } from "lucide-react";

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
  
  return (
    <div className={`p-8 card-humanist relative group flex flex-col gap-8 transition-all duration-500`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-5">
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 ${isMastered ? 'bg-accent-soft text-accent border border-accent/10' : 'bg-bg-elevated text-text-muted border border-fine'}`}>
              {isMastered ? <Trophy size={26} /> : <Target size={26} />}
           </div>
           <div className="space-y-1.5">
              <h3 className="text-2xl font-serif text-text-primary tracking-tight group-hover:text-accent transition-colors">
                {label}
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
                 <span>{attempts} Sessions</span>
                 <span className="w-1 h-1 rounded-full bg-border-fine" />
                 <span className="text-text-secondary">Level {Math.ceil(attempts / 3) || 1}</span>
              </div>
           </div>
        </div>

        <div className="text-right">
           <div className="text-4xl font-serif text-text-primary tracking-tight leading-none group-hover:text-accent transition-colors">
            {Math.round(percentage)}%
           </div>
           <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-accent mt-2">
            Mastery
           </div>
        </div>
      </div>

      <div className="space-y-4">
         <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden border border-fine">
            <motion.div
               initial={{ width: 0 }}
               animate={{ width: `${percentage}%` }}
               transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
               className={`h-full rounded-full bg-accent relative`}
            />
         </div>
         
         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
            <span>Basic</span>
            <div className={`flex items-center gap-2 transition-all duration-300 ${isMastered ? 'text-success' : 'text-text-secondary group-hover:text-accent'}`}>
               {isMastered ? (
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Concept Mastered</span>
               ) : (
                  <span className="flex items-center gap-1.5 group-hover:gap-2 transition-all">Continue Practice <ChevronRight size={14} /></span>
               )}
            </div>
            <span>Advanced</span>
         </div>
      </div>

      {isMastered && (
         <div className="absolute -top-3 -right-3 bg-white text-accent p-2 rounded-xl border border-fine shadow-float scale-110">
            <Sparkles size={18} className="animate-pulse" />
         </div>
      )}
    </div>
  );
}

