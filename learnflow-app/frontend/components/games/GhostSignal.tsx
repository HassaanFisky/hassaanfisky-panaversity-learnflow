"use client";

import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, Triangle, Square, Gem, Star, Octagon } from "lucide-react";
import OnboardingOverlay from "./engine/OnboardingOverlay";

const ACCENT = "#00FFB2";
const BG = "#020F0A";
const PAD_HZ = [523, 587, 659, 698, 784, 880];
const PAD_ICONS = [Circle, Triangle, Square, Gem, Star, Octagon];

function tone(hz: number, secs: number, vol: number, shape: OscillatorType = "sine", delay = 0) {
  try {
    const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = shape;
    o.frequency.value = hz;
    const t = ac.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    o.start(t);
    o.stop(t + secs + 0.05);
  } catch {
    /* ignore */
  }
}

type Phase = "ONBOARD" | "PLAYBACK" | "INPUT" | "RESULT" | "DONE";

interface World {
  sequence: number[];
  playedIdx: number;
  userIdx: number;
  round: number;
  wrongs: number;
  score: number;
  longest: number;
  totalRight: number;
  layer: 1 | 2 | 3 | 4;
  activePad: number | null;
  ghostPad: number | null;
}

type Action =
  | { type: "START_ROUND"; sequence: number[]; layer: 1 | 2 | 3 | 4; ghost: number | null }
  | { type: "LIGHT_PAD"; idx: number | null }
  | { type: "INPUT_START" }
  | { type: "CORRECT" }
  | { type: "WRONG" }
  | { type: "COMPLETE_ROUND" };

function reducer(s: World, a: Action): World {
  switch (a.type) {
    case "START_ROUND":
      return {
        ...s,
        sequence: a.sequence,
        layer: a.layer,
        ghostPad: a.ghost,
        playedIdx: 0,
        userIdx: 0,
        activePad: null,
      };
    case "LIGHT_PAD":
      return { ...s, activePad: a.idx };
    case "INPUT_START":
      return { ...s, userIdx: 0, activePad: null };
    case "CORRECT":
      return { ...s, userIdx: s.userIdx + 1, totalRight: s.totalRight + 1 };
    case "WRONG":
      return { ...s, wrongs: s.wrongs + 1 };
    case "COMPLETE_ROUND": {
      const len = s.sequence.length;
      return {
        ...s,
        round: s.round + 1,
        longest: Math.max(s.longest, len),
        score: Math.max(s.longest, len) * 100 + (s.totalRight * 15),
      };
    }
    default:
      return s;
  }
}

const initial: World = {
  sequence: [],
  playedIdx: 0,
  userIdx: 0,
  round: 1,
  wrongs: 0,
  score: 0,
  longest: 0,
  totalRight: 0,
  layer: 1,
  activePad: null,
  ghostPad: null,
};

export default function GhostSignal({ onExit }: { onExit: (score: number) => void }) {
  const [phase, setPhase] = useState<Phase>("ONBOARD");
  const [feedback, setFeedback] = useState<"" | "right" | "wrong">("");
  const [flash, setFlash] = useState<{ idx: number; kind: "hit" | "miss" } | null>(null);
  const [world, dispatch] = useReducer(reducer, initial);
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    const len = 1 + world.round;
    const seq: number[] = [];
    for (let i = 0; i < len; i++) seq.push(Math.floor(Math.random() * 6));
    const layer: 1 | 2 | 3 | 4 =
      world.round <= 2 ? 1 : world.round <= 4 ? 2 : world.round <= 6 ? 3 : 4;
    const ghost = layer === 4 ? Math.floor(Math.random() * 6) : null;
    dispatch({ type: "START_ROUND", sequence: seq, layer, ghost });
    setPhase("PLAYBACK");
  }, [world.round]);

  useEffect(() => {
    if (phase === "PLAYBACK") {
      const dur = world.layer === 1 ? 500 : world.layer === 2 ? 400 : world.layer === 3 ? 300 : 250;
      const gap = 200;
      let i = 0;
      const playNext = () => {
        if (i >= world.sequence.length) {
          dispatch({ type: "INPUT_START" });
          setPhase("INPUT");
          return;
        }
        const pad = world.sequence[i];
        dispatch({ type: "LIGHT_PAD", idx: pad });
        tone(PAD_HZ[pad], dur / 1000, 0.12, "sine");
        playbackRef.current = setTimeout(() => {
          dispatch({ type: "LIGHT_PAD", idx: null });
          i++;
          playbackRef.current = setTimeout(playNext, gap);
        }, dur);
      };
      playbackRef.current = setTimeout(playNext, 600);
    }
    return () => {
      if (playbackRef.current) clearTimeout(playbackRef.current);
    };
  }, [phase, world.sequence, world.layer]);

  useEffect(() => {
    if (phase === "ONBOARD") return;
    if (phase === "PLAY" as Phase) return;
    if (phase === "PLAYBACK" && world.sequence.length === 0) {
      startRound();
    }
  }, [phase, world.sequence.length, startRound]);

  const handlePadTap = useCallback(
    (idx: number) => {
      if (phase !== "INPUT") return;
      const expected = world.sequence[world.userIdx];
      if (idx === expected) {
        tone(PAD_HZ[idx], 0.2, 0.1, "sine");
        dispatch({ type: "CORRECT" });
        setFlash({ idx, kind: "hit" });
        setTimeout(() => setFlash(null), 350);
        if (world.userIdx + 1 >= world.sequence.length) {
          dispatch({ type: "COMPLETE_ROUND" });
          setTimeout(() => {
            if (world.round + 1 > 10) setPhase("DONE");
            else {
              setPhase("PLAYBACK");
            }
          }, 700);
        }
      } else {
        tone(160, 0.2, 0.08, "square");
        dispatch({ type: "WRONG" });
        setFlash({ idx, kind: "miss" });
        setFeedback("wrong");
        setTimeout(() => {
          setFlash(null);
          setFeedback("");
          if (world.wrongs + 1 >= 3) {
            setPhase("DONE");
          } else {
            setPhase("PLAYBACK");
          }
        }, 700);
      }
    },
    [phase, world.sequence, world.userIdx, world.wrongs, world.round]
  );

  // Trigger first round on entering PLAYBACK with empty sequence
  useEffect(() => {
    if (phase !== "ONBOARD" && world.sequence.length === 0 && phase !== "DONE") {
      startRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Reset for subsequent rounds
  useEffect(() => {
    if (phase === "PLAYBACK" && world.sequence.length === 0) return;
  }, [phase, world.sequence.length]);

  const renderPad = (idx: number) => {
    const Icon = PAD_ICONS[idx];
    const active = world.activePad === idx;
    const ghost = world.ghostPad === idx && phase === "INPUT";
    const thisFlash = flash?.idx === idx ? flash.kind : null;
    return (
      <motion.button
        key={idx}
        onClick={() => handlePadTap(idx)}
        className="relative focus:outline-none"
        style={{
          width: 80,
          height: 80,
          minWidth: 48,
          minHeight: 48,
          borderRadius: 18,
          background: active ? ACCENT : "rgba(0,255,178,0.08)",
          border: `2px solid ${ghost ? "rgba(255,255,255,0.15)" : ACCENT}`,
          boxShadow: active ? `0 0 30px ${ACCENT}` : "none",
        }}
        animate={
          thisFlash === "hit"
            ? { scale: [1, 1.15, 1], boxShadow: [`0 0 0px ${ACCENT}`, `0 0 40px ${ACCENT}`, `0 0 0px ${ACCENT}`] }
            : thisFlash === "miss"
            ? { x: [0, -6, 6, -4, 4, 0], boxShadow: `0 0 20px #ff4466` }
            : {}
        }
        transition={{ duration: 0.35 }}
        aria-label={`Pad ${idx + 1}`}
      >
        <Icon
          className="absolute inset-0 m-auto"
          size={36}
          color={active ? "#000" : ACCENT}
          strokeWidth={2}
          style={{ opacity: ghost ? 0.3 : 1 }}
        />
        <AnimatePresence>
          {thisFlash === "hit" && (
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -30 }}
              exit={{ opacity: 0 }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold"
              style={{ color: ACCENT }}
            >
              +1
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  return (
    <div className="fixed inset-0" style={{ background: BG }}>
      {phase === "ONBOARD" && (
        <OnboardingOverlay
          storageKey="lf_ghost_on"
          accentColor={ACCENT}
          onDone={() => setPhase("PLAYBACK")}
          steps={[
            { visual: <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-12 h-12 rounded-xl" style={{ background: i === 2 ? ACCENT : "rgba(0,255,178,0.15)" }} />)}</div>, line: "Pads light up in a sequence. Each sings a note." },
            { visual: <div className="text-white text-lg">Now you.</div>, line: "Watch. Listen. Then tap them back in order." },
            { visual: <div className="text-4xl font-black" style={{ color: ACCENT }}>+1</div>, line: "Each correct tap builds your score." },
            { visual: <div className="text-white/60 text-sm">Three slips end the round.</div>, line: "Calm hands. Clear ears. Let's hear it." },
          ]}
        />
      )}

      {(phase === "PLAYBACK" || phase === "INPUT" || phase === "RESULT") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="absolute top-6 left-6 text-white">
            <div className="text-3xl font-black tabular-nums">{world.score.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest mt-1" style={{ color: ACCENT }}>
              Round {world.round}
            </div>
          </div>
          <div className="absolute top-6 right-6 text-white">
            <div className="text-xs uppercase tracking-widest">Slips</div>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{ background: i < world.wrongs ? "#ff4466" : "rgba(255,68,102,0.2)" }}
                />
              ))}
            </div>
          </div>

          <div className="mb-10 text-sm uppercase tracking-[0.4em]" style={{ color: ACCENT, minHeight: 20 }}>
            {phase === "PLAYBACK" ? "Watch" : feedback === "wrong" ? "Off. Try again." : "Now you"}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => renderPad(i))}
          </div>
        </div>
      )}

      {phase === "DONE" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
          <div className="text-sm uppercase tracking-[0.4em] mb-4" style={{ color: ACCENT }}>
            Round over
          </div>
          <div className="text-7xl font-black tabular-nums mb-6" style={{ textShadow: `0 0 30px ${ACCENT}55` }}>
            {world.score.toLocaleString()}
          </div>
          <div className="flex gap-8 mb-10 text-sm text-white/70">
            <div><span className="text-white font-bold">{world.longest}</span> longest</div>
            <div><span className="text-white font-bold">{world.totalRight}</span> right</div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => onExit(world.score)}
              className="px-6 py-3 rounded-full font-bold min-h-[48px]"
              style={{ background: ACCENT, color: "#000" }}
            >
              Again
            </button>
            <button
              onClick={() => onExit(world.score)}
              className="px-6 py-3 rounded-full font-bold min-h-[48px] border border-white/20 text-white"
            >
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
