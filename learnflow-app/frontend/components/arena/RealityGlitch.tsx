"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan } from "lucide-react";

const QUESTIONS = [
  { real: "LLM", ghosts: ["LM", "LLN", "L1M"] },
  { real: "FastAPI", ghosts: ["FaastAPI", "FastAP1", "FastAP|"] },
  { real: "Supabase", ghosts: ["Supabaase", "Supabase", "5upabase"] },
  { real: "Vercel", ghosts: ["Verceł", "Vercei", "Verçel"] },
  { real: "Next.js", ghosts: ["Next.jS", "Next,js", "Nxt.js"] },
  { real: "Groq", ghosts: ["Gr0q", "Groα", "Gr0q"] },
  { real: "Python", ghosts: ["Pythoη", "Pyth0n", "Pythan"] },
  { real: "Docker", ghosts: ["D0cker", "Dockar", "Dockerr"] },
  { real: "Kafka", ghosts: ["Kafkα", "Kafak", "K4fka"] },
  { real: "Koyeb", ghosts: ["K0yeb", "Koyéb", "Koyev"] },
];

const ROUND_COUNT = 8;
const ROUND_DURATION = 4000; // ms per round (shrinks with progress)

type Card = { label: string; isReal: boolean; id: string };

function buildRound(q: typeof QUESTIONS[0]): Card[] {
  const all: Card[] = [
    { label: q.real, isReal: true, id: "real" },
    ...q.ghosts.slice(0, 3).map((g, i) => ({ label: g, isReal: false, id: `ghost-${i}` })),
  ];
  return all.sort(() => Math.random() - 0.5);
}

export default function RealityGlitch({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [glitchActive, setGlitchActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const q = QUESTIONS[round % QUESTIONS.length];

  const startRound = (r: number) => {
    setSelected(null);
    setResult(null);
    setRound(r);
    setCards(buildRound(QUESTIONS[r % QUESTIONS.length]));
    const duration = Math.max(1500, ROUND_DURATION - r * 200);
    setTimeLeft(duration);

    // Intermittent glitch effect
    const glitchIv = setInterval(() => setGlitchActive((g) => !g), 800 + Math.random() * 600);
    timerRef.current = setTimeout(() => {
      clearInterval(glitchIv);
      setGlitchActive(false);
      // Time ran out — wrong
      setResult("wrong");
      setTimeout(() => {
        if (r + 1 >= ROUND_COUNT) { setPhase("done"); }
        else { startRound(r + 1); }
      }, 900);
    }, duration);
    return () => { clearTimeout(timerRef.current!); clearInterval(glitchIv); };
  };

  useEffect(() => {
    if (phase === "playing") return startRound(0);
  }, [phase]);

  const handlePick = (card: Card) => {
    if (selected || phase !== "playing") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelected(card.id);
    if (card.isReal) {
      setResult("correct");
      setScore((s) => s + Math.max(10, Math.round((timeLeft / ROUND_DURATION) * 200)));
    } else {
      setResult("wrong");
    }
    setTimeout(() => {
      if (round + 1 >= ROUND_COUNT) { setPhase("done"); }
      else { startRound(round + 1); }
    }, 900);
  };

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 text-center max-w-sm px-4"
      >
        <div className="w-20 h-20 rounded-2xl border border-[#E58A6D]/40 flex items-center justify-center bg-[#1C1A17] relative overflow-hidden">
          <Scan size={36} className="text-[#E58A6D]" />
          {/* glitch line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[0.2, 0.6, 0.85].map((t, i) => (
              <div
                key={i}
                className="absolute w-full h-[1px] bg-[#E58A6D] opacity-30"
                style={{ top: `${t * 100}%`, animation: `slide-glitch ${0.8 + i * 0.3}s ease-in-out infinite` }}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Reality Glitch</h2>
          <p className="text-[#9C948A] text-sm leading-relaxed max-w-xs">
            Four cards appear. Only one is real. Ghost cards look almost identical — slight character shifts. Find the real one before time runs out.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center w-full mt-2">
          {[["8", "Rounds"], ["4s → 1.5s", "Shrinking time"], ["Speed bonus", "Scoring"]].map(([v, l]) => (
            <div key={l} className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl py-4 px-2">
              <div className="text-sm font-bold text-[#E58A6D]">{v}</div>
              <div className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-1">{l}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setPhase("playing")}
          className="mt-2 px-10 py-4 bg-[#E58A6D] text-[#0B0F14] font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#d97a5f] transition-colors"
        >
          Enter Glitch
        </button>
        <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest">
          Go Back
        </button>
      </motion.div>
    );
  }

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-8 text-center"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#9C948A] mb-2">Reality Restored</div>
          <h2 className="text-4xl font-bold">Glitch Complete</h2>
        </div>
        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl px-12 py-8 flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#9C948A]">Clarity Score</span>
          <span className="text-6xl font-black text-[#E58A6D]">{score}</span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => { setRound(0); setScore(0); setPhase("playing"); }}
            className="px-6 py-3 bg-[#1C1A17] border border-[#E58A6D]/30 text-[#E58A6D] rounded-xl text-xs uppercase tracking-widest font-bold hover:border-[#E58A6D] transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 bg-[#1C1A17] border border-[#2E2B27] text-[#9C948A] rounded-xl text-xs uppercase tracking-widest font-bold hover:text-[#F2EDE7] transition-colors"
          >
            Exit Flux
          </button>
        </div>
      </motion.div>
    );
  }

  const roundDuration = Math.max(1500, ROUND_DURATION - round * 200);

  return (
    <div className="flex flex-col items-center w-full max-w-lg gap-8 px-4">
      {/* HUD */}
      <div className="w-full flex justify-between items-center">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Round</span>
          <span className="text-xl font-black text-[#F2EDE7]">{round + 1} / {ROUND_COUNT}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Score</span>
          <motion.span key={score} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.25 }} className="text-2xl font-black text-[#E58A6D]">
            {score}
          </motion.span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Window</span>
          <span className="text-sm font-bold text-[#96D1C7]">{(roundDuration / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-0.5 bg-[#1C1A17] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#E58A6D] rounded-full"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: roundDuration / 1000, ease: "linear" }}
          key={round}
        />
      </div>

      {/* Instruction */}
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-widest text-[#9C948A]">Find the real</span>
        <h3 className="text-lg font-bold text-[#F2EDE7] mt-1">{q.real.replace(/./g, "•")}</h3>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <AnimatePresence mode="popLayout">
          {cards.map((card) => {
            const isPicked = selected === card.id;
            const isWrongPick = isPicked && !card.isReal;
            const isCorrectReveal = (isPicked && card.isReal) || (selected && card.isReal && result === "wrong");
            return (
              <motion.button
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: glitchActive && !card.isReal ? `blur(${Math.random() * 0.6}px)` : "blur(0px)",
                  x: glitchActive && !card.isReal ? (Math.random() - 0.5) * 3 : 0,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                whileHover={!selected ? { scale: 1.03 } : {}}
                whileTap={!selected ? { scale: 0.97 } : {}}
                onClick={() => handlePick(card)}
                className={`py-8 px-4 rounded-2xl border font-bold text-lg transition-all duration-200 text-center ${
                  isCorrectReveal
                    ? "border-[#6EE7B7] bg-[#6EE7B7]/10 text-[#6EE7B7]"
                    : isWrongPick
                    ? "border-red-500 bg-red-500/10 text-red-400"
                    : "border-[#2E2B27] bg-[#1C1A17] text-[#F2EDE7] hover:border-[#E58A6D]/40"
                }`}
              >
                {card.label}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-sm font-black uppercase tracking-widest ${result === "correct" ? "text-[#6EE7B7]" : "text-red-400"}`}
        >
          {result === "correct" ? "Real Identified" : "Ghost Caught You"}
        </motion.div>
      )}

      <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest mt-2">
        Abort Glitch
      </button>
    </div>
  );
}
