"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, RotateCcw, ArrowLeft, Zap } from "lucide-react";

const ACCENT = "#9B8FFF";
const ROUND_TIME = 60; // seconds total

interface Question {
  definition: string;
  answer: string;
  choices: string[];
}

const ALL_QUESTIONS: Question[] = [
  { definition: "A function passed as an argument to another function, called after an async operation completes.", answer: "Callback", choices: ["Callback", "Promise", "Iterator", "Generator"] },
  { definition: "A proxy that sits between a client and server, forwarding requests and caching responses.", answer: "Reverse Proxy", choices: ["Load Balancer", "Reverse Proxy", "API Gateway", "CDN"] },
  { definition: "An immutable, ordered log of state changes shared across a distributed system.", answer: "Event Log", choices: ["Message Queue", "Event Log", "State Machine", "WAL"] },
  { definition: "A design pattern where an object notifies its dependents when its state changes.", answer: "Observer", choices: ["Observer", "Decorator", "Strategy", "Facade"] },
  { definition: "A container format that bundles code and its dependencies into a portable unit.", answer: "Docker Image", choices: ["Virtual Machine", "Docker Image", "Namespace", "Sandbox"] },
  { definition: "A consistency model where every read returns the most recently written value.", answer: "Strong Consistency", choices: ["Eventual Consistency", "Strong Consistency", "Causal Consistency", "Read-your-writes"] },
  { definition: "A pattern where services communicate by publishing and subscribing to named channels.", answer: "Pub/Sub", choices: ["Request/Reply", "Pub/Sub", "RPC", "Webhook"] },
  { definition: "A technique that splits a large dataset across multiple database nodes by a key.", answer: "Sharding", choices: ["Replication", "Sharding", "Partitioning", "Federation"] },
  { definition: "An algorithm that elects a single coordinator node among distributed processes.", answer: "Leader Election", choices: ["Consensus", "Leader Election", "Quorum", "Gossip Protocol"] },
  { definition: "A fault-tolerance pattern that stops routing requests to an unhealthy downstream service.", answer: "Circuit Breaker", choices: ["Circuit Breaker", "Retry", "Bulkhead", "Timeout"] },
  { definition: "A hashing strategy where adding/removing nodes minimally redistributes stored keys.", answer: "Consistent Hashing", choices: ["Rendezvous Hashing", "Consistent Hashing", "Linear Hashing", "Jump Hashing"] },
  { definition: "A data structure that answers set-membership queries with possible false positives.", answer: "Bloom Filter", choices: ["Hash Set", "Bloom Filter", "Skip List", "Trie"] },
  { definition: "An HTTP method that sends data to create a new resource, returning its URI.", answer: "POST", choices: ["PUT", "PATCH", "POST", "OPTIONS"] },
  { definition: "A JavaScript value that represents the eventual result of an asynchronous operation.", answer: "Promise", choices: ["Observable", "Future", "Promise", "Deferred"] },
  { definition: "A memory layout where the most recently used items are kept and older ones evicted.", answer: "LRU Cache", choices: ["FIFO Cache", "LRU Cache", "LFU Cache", "MRU Cache"] },
  { definition: "A type of index that allows fast range queries by maintaining sorted order.", answer: "B-Tree Index", choices: ["Hash Index", "B-Tree Index", "Bitmap Index", "GiST Index"] },
  { definition: "A pattern where side effects happen in response to events, not imperative calls.", answer: "Reactive", choices: ["Imperative", "Reactive", "Functional", "Declarative"] },
  { definition: "A network protocol that sends a single packet to all devices on a subnet.", answer: "Broadcast", choices: ["Unicast", "Anycast", "Multicast", "Broadcast"] },
  { definition: "A software design principle stating a class should have only one reason to change.", answer: "Single Responsibility", choices: ["Open/Closed", "Single Responsibility", "Liskov Substitution", "DRY"] },
  { definition: "A build strategy that creates a second identical environment before switching traffic.", answer: "Blue-Green Deploy", choices: ["Rolling Deploy", "Canary Deploy", "Blue-Green Deploy", "Recreate Deploy"] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildRound(pool: Question[]): { questions: Question[]; remaining: Question[] } {
  const shuffled = shuffle(pool);
  const used = shuffled.slice(0, Math.min(10, shuffled.length));
  const remaining = shuffled.slice(used.length);
  return { questions: used, remaining };
}

export default function CodeMatch({ onExit }: { onExit: (score: number) => void }) {
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<"PLAYING" | "FEEDBACK" | "COMPLETE">("PLAYING");
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionPoolRef = useRef(shuffle(ALL_QUESTIONS));

  const startGame = useCallback(() => {
    const { questions: qs } = buildRound(questionPoolRef.current);
    setQuestions(qs);
    setQIdx(0);
    setScore(0);
    setCombo(0);
    setTimeLeft(ROUND_TIME);
    setSelected(null);
    setPhase("PLAYING");
    setStarted(true);
  }, []);

  // Timer
  useEffect(() => {
    if (!started || phase !== "PLAYING") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("COMPLETE");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [started, phase]);

  const handleChoice = useCallback((choice: string) => {
    if (phase !== "PLAYING" || selected !== null) return;
    const q = questions[qIdx];
    const correct = choice === q.answer;
    setSelected(choice);
    setIsCorrect(correct);

    if (correct) {
      const multiplier = 1 + Math.floor(combo / 3) * 0.5;
      const gained = Math.round(100 * multiplier);
      setScore(s => s + gained);
      setCombo(c => c + 1);
    } else {
      setCombo(0);
    }

    setPhase("FEEDBACK");
    setTimeout(() => {
      setSelected(null);
      const nextIdx = qIdx + 1;
      if (nextIdx >= questions.length) {
        // Regenerate more questions from shuffled pool
        const newPool = shuffle(ALL_QUESTIONS);
        questionPoolRef.current = newPool;
        const { questions: newQs } = buildRound(newPool);
        setQuestions(newQs);
        setQIdx(0);
      } else {
        setQIdx(nextIdx);
      }
      setPhase("PLAYING");
    }, 600);
  }, [phase, selected, questions, qIdx, combo]);

  // ── Pre-start screen ──────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}>
            <Code2 className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-3xl font-black mb-2">Code Match</h1>
          <p className="text-[#9C948A] text-sm mb-8 leading-relaxed">
            A tech definition appears. Pick the correct term in 60 seconds. Combos multiply your score.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8 text-left">
            {[
              ["⚡ Combos", "3+ correct in a row = ×1.5 score"],
              ["⏱ 60 Seconds", "As many correct as you can"],
              ["🎯 20 Topics", "Systems, patterns, protocols"],
              ["🔄 Infinite", "New questions each session"],
            ].map(([t, d]) => (
              <div key={t} className="bg-[#1C1A17] border border-[#2E2B27] rounded-2xl p-4">
                <p className="text-xs font-bold mb-1">{t}</p>
                <p className="text-[10px] text-[#9C948A]">{d}</p>
              </div>
            ))}
          </div>
          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-[#0B0F14]"
            style={{ background: ACCENT }}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // ── Complete screen ───────────────────────────────────────────────────────
  if (phase === "COMPLETE") {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}>
            <Code2 className="w-7 h-7" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl font-black mb-1">Time&apos;s Up!</h2>
          <p className="text-[#9C948A] text-sm mb-8">Good run. Can you beat it?</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">Score</p>
            </div>
            <div className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{qIdx}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">Answered</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onExit(score)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#2E2B27] text-[#9C948A] text-xs font-bold uppercase tracking-widest hover:border-[#5F5854] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Hub
            </button>
            <button
              onClick={startGame}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[#0B0F14] text-xs font-black uppercase tracking-widest"
              style={{ background: ACCENT }}
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = questions[qIdx];
  if (!q) return null;
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const comboLabel = combo >= 6 ? "🔥 MEGA COMBO" : combo >= 3 ? "⚡ COMBO ×" + (1 + Math.floor(combo / 3) * 0.5) : null;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6 select-none">
      {/* Top bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button onClick={() => onExit(score)} className="p-2 text-[#5F5854] hover:text-[#F2EDE7] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</span>
          {combo >= 3 && (
            <motion.span
              key={combo}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[9px] font-black uppercase tracking-widest text-[#F6C90E]"
            >
              {comboLabel}
            </motion.span>
          )}
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#F6C90E]" />
            <span className="text-[10px] font-bold text-[#F6C90E]">{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full max-w-md h-1 bg-[#2E2B27] rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: timerPct > 30 ? ACCENT : "#F97316" }}
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${qIdx}-${questions[qIdx]?.answer}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-6 mb-4">
            <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mb-3">What is this?</p>
            <p className="text-base font-medium leading-relaxed text-[#F2EDE7]">{q.definition}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {q.choices.map(choice => {
              const isSelected = selected === choice;
              const correct = q.answer === choice;
              let bg = "#1C1A17";
              let border = "#2E2B27";
              let textColor = "#F2EDE7";
              if (isSelected && isCorrect)  { bg = `${ACCENT}25`; border = ACCENT; textColor = ACCENT; }
              if (isSelected && !isCorrect) { bg = "#F9731615"; border = "#F97316"; textColor = "#F97316"; }
              if (phase === "FEEDBACK" && correct && !isCorrect && selected !== null) {
                bg = `${ACCENT}15`; border = `${ACCENT}60`; textColor = ACCENT;
              }

              return (
                <motion.button
                  key={choice}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleChoice(choice)}
                  disabled={selected !== null}
                  className="w-full text-left px-5 py-4 rounded-2xl border font-medium text-sm transition-all"
                  style={{ background: bg, borderColor: border, color: textColor }}
                >
                  {choice}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
