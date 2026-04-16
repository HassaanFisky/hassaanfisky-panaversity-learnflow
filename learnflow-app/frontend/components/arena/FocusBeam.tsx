"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair } from "lucide-react";

const DURATION = 45; // seconds
const TARGET_RADIUS = 36; // px — outer beam radius
const TARGET_MOVE_INTERVAL = 1800; // ms between target jumps
const HOLD_REWARD_INTERVAL = 300; // ms of hold = +1 score

export default function FocusBeam({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 }); // percent
  const [isHolding, setIsHolding] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [isOver, setIsOver] = useState(false);
  const [beamSize, setBeamSize] = useState(TARGET_RADIUS);
  const [phase, setPhase] = useState<"ready" | "active" | "done">("ready");

  const moveTarget = useCallback(() => {
    setTargetPos({
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
    });
  }, []);

  // Start game
  const startGame = () => {
    setPhase("active");
    setScore(0);
    setTimeLeft(DURATION);
    setBeamSize(TARGET_RADIUS);
    moveTarget();
  };

  // Move target on interval
  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(moveTarget, TARGET_MOVE_INTERVAL);
    return () => clearInterval(iv);
  }, [phase, moveTarget]);

  // Countdown
  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(iv);
          setPhase("done");
          setIsOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Score while holding
  useEffect(() => {
    if (!isHolding || phase !== "active") return;
    const iv = setInterval(() => {
      setScore((s) => s + 1);
      // Beam narrows as difficulty increases (minimum 18px)
      setBeamSize((b) => Math.max(18, b - 0.3));
    }, HOLD_REWARD_INTERVAL);
    return () => clearInterval(iv);
  }, [isHolding, phase]);

  // Mouse/touch handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "active") return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    const dx = px - targetPos.x;
    const dy = py - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Scale distance to percentage space — approx 1% ≈ rect.width/100 px
    const pxDist = (dist / 100) * rect.width;
    setIsHolding(pxDist < beamSize);
  };

  const handlePointerLeave = () => setIsHolding(false);

  if (phase === "ready") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 text-center max-w-sm px-4"
      >
        <div className="w-20 h-20 rounded-full border-2 border-[#E58A6D]/60 flex items-center justify-center relative">
          <Crosshair size={36} className="text-[#E58A6D]" />
          <div className="absolute inset-0 rounded-full border border-[#E58A6D]/20 animate-ping" />
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-2">Focus Beam</h2>
          <p className="text-[#9C948A] text-sm leading-relaxed max-w-xs">
            Keep your cursor locked on the moving target. Hold steady — the beam narrows as you score. Stay sharp.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center w-full mt-2">
          {[["45s", "Duration"], ["Narrows", "Beam size"], ["+1/300ms", "Points"]].map(([v, l]) => (
            <div key={l} className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl py-4 px-2">
              <div className="text-sm font-bold text-[#E58A6D]">{v}</div>
              <div className="text-[9px] uppercase tracking-widest text-[#9C948A] mt-1">{l}</div>
            </div>
          ))}
        </div>
        <button
          onClick={startGame}
          className="mt-2 px-10 py-4 bg-[#E58A6D] text-[#0B0F14] font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#d97a5f] transition-colors"
        >
          Lock In
        </button>
        <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest">
          Go Back
        </button>
      </motion.div>
    );
  }

  if (isOver) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-8 text-center"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#9C948A] mb-2">Beam Collapsed</div>
          <h2 className="text-4xl font-bold">Focus Complete</h2>
        </div>
        <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl px-12 py-8 flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#9C948A]">Hold Score</span>
          <span className="text-6xl font-black text-[#E58A6D]">{score}</span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={startGame}
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

  return (
    <div className="flex flex-col items-center w-full max-w-2xl gap-6">
      {/* HUD */}
      <div className="w-full flex items-center justify-between px-2">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Hold Score</span>
          <motion.span key={score} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.2 }} className="text-3xl font-black text-[#E58A6D]">
            {score}
          </motion.span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Time</span>
          <span className={`text-3xl font-black tabular-nums ${timeLeft <= 10 ? "text-red-500" : "text-[#F2EDE7]"}`}>{timeLeft}s</span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#9C948A] block mb-1">Beam Size</span>
          <span className="text-sm font-bold text-[#96D1C7]">{Math.round(beamSize)}px</span>
        </div>
      </div>

      {/* Arena */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative w-full rounded-3xl border border-[#2E2B27] bg-[#080C10] overflow-hidden cursor-crosshair select-none touch-none"
        style={{ height: "360px" }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#96D1C7 1px, transparent 1px), linear-gradient(90deg, #96D1C7 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Target */}
        <AnimatePresence>
          <motion.div
            key={`${targetPos.x}-${targetPos.y}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute"
            style={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Outer pulse ring */}
            <div
              className="absolute rounded-full border transition-all duration-700"
              style={{
                width: beamSize * 2,
                height: beamSize * 2,
                borderColor: isHolding ? "#6EE7B7" : "#E58A6D",
                opacity: 0.3,
                transform: "translate(-50%, -50%) scale(1)",
                left: "50%",
                top: "50%",
              }}
            />
            {/* Glow ring */}
            <div
              className="absolute rounded-full transition-colors duration-300"
              style={{
                width: beamSize * 1.2,
                height: beamSize * 1.2,
                background: isHolding
                  ? "radial-gradient(circle, rgba(110,231,183,0.18) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(229,138,109,0.15) 0%, transparent 70%)",
                transform: "translate(-50%, -50%)",
                left: "50%",
                top: "50%",
              }}
            />
            {/* Core */}
            <div
              className="rounded-full transition-colors duration-200 flex items-center justify-center"
              style={{
                width: 12,
                height: 12,
                background: isHolding ? "#6EE7B7" : "#E58A6D",
                boxShadow: isHolding ? "0 0 12px #6EE7B7" : "0 0 12px #E58A6D",
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Hold indicator overlay */}
        <AnimatePresence>
          {isHolding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-[#6EE7B7]/10 border border-[#6EE7B7]/30"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6EE7B7]">Locked</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={onExit} className="text-[#5F5854] hover:text-[#E58A6D] transition-colors text-xs uppercase tracking-widest mt-2">
        Abort Beam
      </button>
    </div>
  );
}
