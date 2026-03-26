import * as React from "react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-[15px] h-[15px]">
        {/* Back square */}
        <div 
          className="absolute inset-0 rounded-[var(--radius-sm)] border border-[var(--border-active)]"
          style={{ transform: 'translate(3px, 3px)' }}
        />
        {/* Front square */}
        <div 
          className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--accent)]"
        />
      </div>
      <span 
        className="font-sans font-semibold text-[15px] text-[var(--text-primary)] tracking-[-0.02em]"
      >
        LearnFlow
      </span>
    </div>
  );
}
