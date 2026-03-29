// e:/panaversity/hackathon-3/learnflow-app/frontend/components/Logo.tsx
import * as React from "react";

export function Logo() {
  return (
    <div className="flex items-center gap-3 group">
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Architectural Geometry: A stylized 'L' within a precision frame */}
        <div className="absolute inset-0 border-[0.8px] border-border-fine rounded-lg group-hover:rotate-45 transition-editorial" />
        <div className="absolute inset-2 border-[1.5px] border-accent rounded-sm opacity-20" />
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-accent group-hover:scale-110 transition-editorial"
        >
          <path d="M4 19h16" />
          <path d="M4 19V5" />
          <path d="M12 19V11" />
          <path d="M20 19V7" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-serif font-bold text-xl tracking-tight text-text-primary">
          LearnFlow
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mt-1">
          Panaversity
        </span>
      </div>
    </div>
  );
}
