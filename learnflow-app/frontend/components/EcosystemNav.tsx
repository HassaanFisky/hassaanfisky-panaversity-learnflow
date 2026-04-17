"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Globe, User, LogOut, LogIn } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

/**
 * HASSAAN AI ARCHITECT — Ecosystem Hub Node
 * v4.0: Unified Project Hub & Identity Sync.
 * Standardized across all hackathon modules.
 */
const ECOSYSTEM_APPS = [
  { name: "Portfolio Hub",         image: "https://panaversity-h0-portfolio.vercel.app/blueprint-footer.png", url: "https://panaversity-h0-portfolio.vercel.app",    id: "H0" },
  { name: "Physical AI & Robotics",image: "https://panaversity-h0-portfolio.vercel.app/h1-thumb.png",         url: "https://h1-robotics-textbook.vercel.app",                            id: "H1" },
  { name: "Evolution of To-Do",    image: "https://panaversity-h0-portfolio.vercel.app/h2-thumb.png",         url: "https://hassaanfisky-panaversity-todo-app.vercel.app",         id: "H2" },
  { name: "LearnFlow Engine",      image: "https://panaversity-h0-portfolio.vercel.app/h3-thumb.png",         url: "https://learnflow-platform-h3.vercel.app",                            id: "H3" },
  { name: "AI Companion FTE",      image: "https://panaversity-h0-portfolio.vercel.app/h4-thumb.png",         url: "https://hassaanfisky-aira-digital-fte.vercel.app", id: "H4" },
];

export function EcosystemNav() {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user ?? null;

  const handleSignIn = () => {
    if (typeof window !== 'undefined') {
       // Single Sign-On Hub (H2 - Evolution of To-Do)
       const authHub = "https://hassaanfisky-panaversity-todo-app.vercel.app/sign-in";
       window.location.href = `${authHub}?redirect=${encodeURIComponent(window.location.href)}`;
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Identity Node — Top Right (or Left in UR) */}
      <div className={`fixed top-24 z-[10000] ${lang === 'ur' ? 'left-6' : 'right-6'}`}>
        <div className="relative">
          <button 
            onClick={() => setIsAuthOpen(!isAuthOpen)}
            className="w-12 h-12 glass-apple rounded-full shadow-float flex items-center justify-center text-text-secondary hover:text-accent border-white/20 transition-all hover:scale-110 active:scale-90 group"
          >
            <User size={20} className={user ? "text-accent" : ""} />
            {user && <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-bg-base shadow-sm animate-pulse" />}
          </button>
          
          <AnimatePresence>
            {isAuthOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`absolute top-14 w-72 glass-apple rounded-2xl shadow-float overflow-hidden p-2 origin-top-right border-white/20 ${lang === 'ur' ? 'left-0' : 'right-0'}`}
                dir={t.dir}
              >
                <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.3em] text-accent border-b border-white/10 mb-2">
                  Network Identity
                </div>
                {user ? (
                  <div className="flex flex-col gap-1">
                    <div className="px-3 py-3 bg-bg-base/40 rounded-xl mb-1 border border-white/5 shadow-inner flex flex-col items-center text-center">
                       <div className="w-10 h-10 bg-accent/10 rounded-full mb-2 flex items-center justify-center text-accent">
                         <User size={18} />
                       </div>
                       <span className="text-[11px] font-bold text-text-primary truncate max-w-full">{user.email}</span>
                       <span className="text-[9px] text-emerald-500 uppercase tracking-widest block mt-1 font-serif italic">Verified Architect Node</span>
                    </div>
                    <button onClick={handleSignOut} className="flex flex-row-reverse justify-center items-center gap-3 px-3 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all text-[10px] font-bold w-full mt-1 border border-red-500/20 uppercase tracking-widest">
                      Terminate Session <LogOut size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-1">
                    <div className="text-center py-4">
                       <p className="text-[11px] font-medium text-text-secondary leading-relaxed px-2 font-serif italic">Identity verification is required for full ecosystem access.</p>
                    </div>
                    <button onClick={handleSignIn} className="flex justify-center items-center gap-2 px-3 py-3 rounded-xl bg-accent text-white transition-all text-[10px] font-bold w-full shadow-lg shadow-accent/20 uppercase tracking-widest">
                      Initialize Uplink <LogIn size={15} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ecosystem Hub — Bottom Left (or Right in UR) */}
      <div className={`fixed bottom-10 z-[10000] ${lang === 'ur' ? 'right-10' : 'left-10'}`}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`absolute bottom-16 w-80 glass-apple rounded-2xl shadow-float overflow-hidden p-2 border-white/20 ${lang === 'ur' ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}`}
              dir={t.dir}
            >
              <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.3em] text-accent border-b border-white/10 mb-2 flex items-center justify-between">
                <span>Ecosystem Grid</span>
                <span className="text-[8px] opacity-60">Status: WIRED</span>
              </div>
              <div className="space-y-1">
                {ECOSYSTEM_APPS.map((app) => (
                  <a
                    key={app.id}
                    href={app.url}
                    className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/10 transition-all group border border-transparent hover:border-white/10"
                  >
                    <div className="relative w-11 h-11 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden transition-all shadow-inner">
                      <img 
                        src={app.image} 
                        alt={app.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        onError={(e) => {
                           (e.target as any).src = "https://raw.githubusercontent.com/Hassaanfisky/hassaanfisky-panaversity-portfolio/main/public/blueprint-footer.png";
                        }}
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[11px] font-bold text-text-primary group-hover:text-accent transition-colors uppercase tracking-wider">{app.name}</span>
                      <span className="text-[8px] text-text-muted uppercase tracking-widest font-serif italic mt-0.5">{app.id} Node &bull; Production</span>
                    </div>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 glass-apple border-white/20 rounded-full shadow-float flex items-center justify-center text-text-primary hover:text-accent group relative transition-all active:scale-95 hover:scale-110"
        >
          <Globe size={24} className={isOpen ? "rotate-90" : "animate-[spin_30s_linear_infinite]"} strokeWidth={1.5} />
          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-accent rounded-full border-2 border-bg-base shadow-sm animate-pulse" />
        </button>
      </div>
    </>
  );
}

export default EcosystemNav;
