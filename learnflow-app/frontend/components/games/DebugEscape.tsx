"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Bug, Search, Code2, Clock } from "lucide-react";
import GameOnboarding from "./onboarding/GameOnboarding";
import { GameEngine } from "./engine/GameEngine";

const ACCENT = "#F97316";
const GAME_ID = "debugescape" as const;

interface CodeLine {
  id: number;
  text: string;
  hasBug: boolean;
  bugDescription: string;
  fixes: string[];
  correctFix: number;
}

interface Puzzle {
  title: string;
  lines: CodeLine[];
}

const PUZZLES: Puzzle[] = [
  {
    title: "User Login Flow",
    lines: [
      { id: 0, text: "1  function loginUser(email, password) {", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 1, text: "2    const user = db.findUser(email);", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 2, text: "3    if (user.password === password) {", hasBug: true, bugDescription: "Comparing raw password — should hash first", fixes: ["if (hash(user.password) === hash(password))", "if (user.password === hash(password))", "if (hash(password) === user.password)"], correctFix: 0 },
      { id: 3, text: "4      return createSession(user.id);", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 4, text: "5  }", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
    ],
  },
  {
    title: "Rate Limiter Logic",
    lines: [
      { id: 0, text: "1  function checkRateLimit(userId) {", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 1, text: "2    const count = cache.get(userId) || 0;", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 2, text: "3    if (count >= MAX_REQUESTS) return false;", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 3, text: "4    cache.set(userId, count + 1);", hasBug: true, bugDescription: "Missing TTL — counter never resets", fixes: ["cache.set(userId, count + 1, TTL_SECONDS)", "cache.set(userId, count, TTL_SECONDS)", "cache.set(userId, count + 1)"], correctFix: 0 },
      { id: 4, text: "5    return true;", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
    ],
  },
  {
    title: "Async Data Fetch",
    lines: [
      { id: 0, text: "1  async function fetchUserData(id) {", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 1, text: "2    const response = fetch(`/api/user/${id}`);", hasBug: true, bugDescription: "Missing await — response is a Promise, not data", fixes: ["const response = await fetch(`/api/user/${id}`);", "const response = fetch(`/api/user/${id}`).json();", "const response = fetchSync(`/api/user/${id}`);"], correctFix: 0 },
      { id: 2, text: "3    if (!response.ok) throw new Error('Failed');", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 3, text: "4    return await response.json();", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 4, text: "5  }", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
    ],
  },
  {
    title: "Token Expiry Check",
    lines: [
      { id: 0, text: "1  function isTokenValid(token) {", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 1, text: "2    const decoded = jwt.decode(token);", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 2, text: "3    const now = Date.now() / 1000;", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 3, text: "4    return decoded.exp > now;", hasBug: true, bugDescription: "Missing null check — decoded could be null", fixes: ["return decoded && decoded.exp > now;", "return decoded.exp !== null && decoded.exp > now;", "return decoded.exp > now || decoded === null;"], correctFix: 0 },
      { id: 4, text: "5  }", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
    ],
  },
  {
    title: "Retry With Backoff",
    lines: [
      { id: 0, text: "1  async function retryRequest(fn, maxRetries) {", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 1, text: "2    for (let i = 0; i <= maxRetries; i++) {", hasBug: true, bugDescription: "Off-by-one: <= runs maxRetries+1 times", fixes: ["for (let i = 0; i < maxRetries; i++)", "for (let i = 1; i <= maxRetries; i++)", "for (let i = 0; i <= maxRetries + 1; i++)"], correctFix: 0 },
      { id: 2, text: "3      try { return await fn(); }", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 3, text: "4      catch { await sleep(2 ** i * 100); }", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
      { id: 4, text: "5    }", hasBug: false, bugDescription: "", fixes: [], correctFix: -1 },
    ],
  },
];

const ONBOARDING_STEPS = [
  {
    title: "Find the Bug",
    body: "Each puzzle shows a short code block. One or more lines contain a real bug. Your job: find them.",
    icon: Bug,
  },
  {
    title: "Click the Buggy Line",
    body: "Tap the line number you suspect has the bug. It highlights. Then choose the correct fix from 3 options.",
    icon: Search,
  },
  {
    title: "Precision Matters",
    body: "Correct line + correct fix = 150 points. Wrong guess costs 75 points. Partial credit for right line, wrong fix.",
    icon: Code2,
  },
  {
    title: "Time Pressure",
    body: "45 seconds per puzzle. Faster correct answers earn a time bonus. 5 puzzles total per session.",
    icon: Clock,
  },
];

type Phase = "ONBOARDING" | "PLAYING" | "FIX_SELECT" | "RESULT" | "COMPLETE";

export default function DebugEscape({ onExit }: { onExit: (score: number) => void }) {
  const [gameState] = useState(() => GameEngine.loadState());
  const [stateRef, setStateRef] = useState(gameState);
  const [phase, setPhase] = useState<Phase>(() =>
    GameEngine.isOnboarded(gameState, GAME_ID) ? "PLAYING" : "ONBOARDING"
  );

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastPoints, setLastPoints] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const puzzle = PUZZLES[puzzleIndex % PUZZLES.length];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("RESULT");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (phase === "PLAYING") {
      setSelectedLine(null);
      setTimeLeft(45);
      startTimer();
    }
    if (phase === "FIX_SELECT") {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, puzzleIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLineClick = useCallback((lineId: number) => {
    if (phase !== "PLAYING") return;
    const line = puzzle.lines.find(l => l.id === lineId);
    if (!line) return;

    setSelectedLine(lineId);

    if (!line.hasBug) {
      setScore(s => Math.max(0, s - 75));
      setLastCorrect(false);
      setLastPoints(-75);
      setPhase("RESULT");
    } else {
      setPhase("FIX_SELECT");
    }
  }, [phase, puzzle]);

  const handleFixSelect = useCallback((fixIndex: number) => {
    if (selectedLine === null) return;
    const line = puzzle.lines.find(l => l.id === selectedLine);
    if (!line) return;

    if (fixIndex === line.correctFix) {
      const timeBonus = Math.floor(timeLeft * 2);
      const pts = 150 + timeBonus;
      setScore(s => s + pts);
      setLastCorrect(true);
      setLastPoints(pts);
    } else {
      setScore(s => Math.max(0, s - 50));
      setLastCorrect(false);
      setLastPoints(-50);
    }
    setPhase("RESULT");
  }, [selectedLine, puzzle, timeLeft]);

  const nextPuzzle = () => {
    if (puzzleIndex + 1 >= PUZZLES.length) {
      setPhase("COMPLETE");
    } else {
      setPuzzleIndex(p => p + 1);
      setLastCorrect(null);
      setPhase("PLAYING");
    }
  };

  const reset = () => { setPuzzleIndex(0); setScore(0); setLastCorrect(null); setPhase("PLAYING"); };

  const handleOnboardingComplete = useCallback(() => {
    const updated = GameEngine.markOnboarded(stateRef, GAME_ID);
    setStateRef(updated);
    setPhase("PLAYING");
  }, [stateRef]);

  const timerPct = (timeLeft / 45) * 100;
  const timerColor = timerPct > 50 ? ACCENT : timerPct > 25 ? "#FBBF24" : "#EF4444";

  if (phase === "ONBOARDING") return (
    <div className="min-h-screen bg-[#0B0F14]">
      <GameOnboarding steps={ONBOARDING_STEPS} onComplete={handleOnboardingComplete} accentColor={ACCENT} gameName="Debug Escape" />
    </div>
  );

  if (phase === "COMPLETE") return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}>
          <Bug className="w-8 h-8" style={{ color: ACCENT }} />
        </div>
        <h2 className="text-2xl font-bold text-[#F2EDE7] mb-1">Debug Escape</h2>
        <p className="text-[#5F5854] text-xs uppercase tracking-widest mb-8">Session complete</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Final Score", value: score.toLocaleString(), color: ACCENT },
            { label: "Puzzles", value: `${PUZZLES.length}/${PUZZLES.length}`, color: "#96D1C7" },
            { label: "Last Result", value: lastCorrect ? "Correct" : "Miss", color: lastCorrect ? "#6EE7B7" : "#EF4444" },
            { label: "XP Earned", value: `+${Math.floor(score * 0.4)}`, color: "#F2EDE7" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-[#5F5854] text-[9px] uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => onExit(score)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] hover:text-[#F2EDE7] transition-colors text-xs">
            <ArrowLeft className="w-3 h-3" /> Hub
          </button>
          <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (phase === "RESULT") {
    const bugLine = puzzle.lines.find(l => l.hasBug);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8">
          <div className="text-center mb-6">
            <p className="text-3xl font-black mb-2" style={{ color: lastCorrect ? "#6EE7B7" : "#EF4444" }}>
              {lastCorrect ? "Fixed!" : "Missed"}
            </p>
            <p className="text-xl font-black tabular-nums" style={{ color: lastPoints > 0 ? ACCENT : "#EF4444" }}>
              {lastPoints > 0 ? `+${lastPoints}` : lastPoints} pts
            </p>
          </div>
          {bugLine && (
            <div className="bg-[#0B0F14] rounded-2xl p-4 mb-6 font-mono text-xs">
              <p className="text-[#5F5854] mb-2 text-[9px] uppercase tracking-widest not-italic">The bug was:</p>
              <p className="text-[#EF4444] mb-2">{bugLine.text.trim()}</p>
              <p className="text-[#5F5854] mb-1">↳ {bugLine.bugDescription}</p>
              <p className="text-[#6EE7B7]">✓ {bugLine.fixes[bugLine.correctFix]}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => onExit(score)} className="flex-1 py-3 rounded-2xl border border-[#2E2B27] text-[#9C948A] text-xs hover:text-[#F2EDE7] transition-colors">Exit</button>
            <button onClick={nextPuzzle} className="flex-1 py-3 rounded-2xl font-bold text-sm" style={{ background: ACCENT, color: "#0B0F14" }}>
              {puzzleIndex + 1 >= PUZZLES.length ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1A17]">
        <button onClick={() => onExit(score)} className="text-[#3A3530] hover:text-[#9C948A] transition-colors" aria-label="Exit">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Puzzle</p>
            <p className="text-sm font-bold">{puzzleIndex + 1}/{PUZZLES.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Score</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
          </div>
          {phase === "PLAYING" && (
            <div className="text-center">
              <p className="text-[#5F5854] text-[9px] uppercase tracking-widest">Time</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</p>
            </div>
          )}
        </div>
        <div className="w-4" />
      </div>
      {phase === "PLAYING" && (
        <div className="h-0.5 bg-[#1C1A17]">
          <div className="h-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-2">{puzzle.title}</p>
        <p className="text-xs text-[#5F5854] mb-6">
          {phase === "PLAYING" ? "Click the line with the bug" : "Select the correct fix"}
        </p>

        {/* Code block */}
        <div className="w-full bg-[#0D1117] rounded-2xl border border-[#2E2B27] overflow-hidden font-mono mb-4">
          {puzzle.lines.map((line) => {
            const isSelected = selectedLine === line.id;
            return (
              <motion.button
                key={line.id}
                onClick={() => phase === "PLAYING" && handleLineClick(line.id)}
                whileHover={phase === "PLAYING" ? { backgroundColor: "rgba(249,115,22,0.06)" } : {}}
                className="w-full text-left px-4 py-3 text-xs border-b border-[#1C1A17] last:border-0 transition-colors min-h-[44px] focus-visible:outline-none"
                style={{
                  background: isSelected
                    ? line.hasBug ? "rgba(249,115,22,0.12)" : "rgba(239,68,68,0.1)"
                    : "transparent",
                  color: isSelected ? (line.hasBug ? ACCENT : "#EF4444") : "#9C948A",
                  cursor: phase === "PLAYING" ? "pointer" : "default",
                }}
              >
                {line.text}
              </motion.button>
            );
          })}
        </div>

        {/* Fix selection */}
        <AnimatePresence>
          {phase === "FIX_SELECT" && selectedLine !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5F5854] mb-3 text-center">
                Choose the correct fix
              </p>
              <div className="flex flex-col gap-2">
                {(puzzle.lines.find(l => l.id === selectedLine)?.fixes ?? []).map((fix, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleFixSelect(i)}
                    className="text-left px-4 py-3 rounded-2xl border border-[#2E2B27] bg-[#1C1A17] font-mono text-xs text-[#F2EDE7] hover:border-[#F97316]/40 transition-all min-h-[44px]"
                  >
                    {fix}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
