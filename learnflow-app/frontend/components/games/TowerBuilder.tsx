"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, RotateCcw, ArrowLeft } from "lucide-react";

const ACCENT = "#6EE7B7";

interface Question {
  question: string;
  answer: string;
  choices: string[];
  category: string;
}

const ALL_QUESTIONS: Question[] = [
  { question: "What does HTTP stand for?", answer: "HyperText Transfer Protocol", choices: ["HyperText Transfer Protocol", "Hyper Transfer Text Protocol", "High-Tech Text Protocol", "Host Transfer Text Protocol"], category: "Basics" },
  { question: "What is the time complexity of binary search?", answer: "O(log n)", choices: ["O(log n)", "O(n)", "O(n log n)", "O(1)"], category: "Algorithms" },
  { question: "Which data structure uses LIFO order?", answer: "Stack", choices: ["Stack", "Queue", "Deque", "Heap"], category: "Data Structures" },
  { question: "What does SQL stand for?", answer: "Structured Query Language", choices: ["Structured Query Language", "Simple Query Logic", "System Query Language", "Scalable Query Layer"], category: "Databases" },
  { question: "What does REST stand for in API design?", answer: "Representational State Transfer", choices: ["Representational State Transfer", "Remote Execution Service Transfer", "Request-Response State Transport", "Resource-Event State Transfer"], category: "APIs" },
  { question: "Which HTTP status code means 'Not Found'?", answer: "404", choices: ["404", "403", "500", "301"], category: "HTTP" },
  { question: "What does CI/CD stand for?", answer: "Continuous Integration / Continuous Delivery", choices: ["Continuous Integration / Continuous Delivery", "Code Inspection / Code Deployment", "Container Integration / Container Deploy", "Compile Integration / Compile Delivery"], category: "DevOps" },
  { question: "What is a foreign key in a relational database?", answer: "A field linking to a primary key in another table", choices: ["A field linking to a primary key in another table", "An encrypted primary key", "A field that is always unique", "A key stored in an external file"], category: "Databases" },
  { question: "Which protocol does DNS use by default?", answer: "UDP", choices: ["UDP", "TCP", "HTTP", "ICMP"], category: "Networking" },
  { question: "What is the purpose of a CDN?", answer: "Serve content from servers closest to the user", choices: ["Serve content from servers closest to the user", "Encrypt traffic between client and server", "Balance load across application servers", "Store backups of production databases"], category: "Infrastructure" },
  { question: "What is memoization?", answer: "Caching the results of function calls for the same inputs", choices: ["Caching the results of function calls for the same inputs", "Storing data in long-term memory", "Compressing data before storage", "Documenting function behavior"], category: "Algorithms" },
  { question: "Which HTTP method is idempotent but NOT safe?", answer: "PUT", choices: ["PUT", "GET", "HEAD", "OPTIONS"], category: "HTTP" },
  { question: "What does ACID stand for in databases?", answer: "Atomicity, Consistency, Isolation, Durability", choices: ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Compliance, Integrity, Data", "Async, Committed, Indexed, Distributed", "Authorised, Cached, Isolated, Durable"], category: "Databases" },
  { question: "What is a race condition?", answer: "When output depends on the unpredictable order of concurrent operations", choices: ["When output depends on the unpredictable order of concurrent operations", "When two threads crash simultaneously", "When a program runs faster than expected", "When CPU cores compete for the same register"], category: "Concurrency" },
  { question: "Which layer of the OSI model handles routing?", answer: "Network (Layer 3)", choices: ["Network (Layer 3)", "Transport (Layer 4)", "Data Link (Layer 2)", "Session (Layer 5)"], category: "Networking" },
  { question: "What is the purpose of an index in a database?", answer: "Speed up data retrieval at the cost of additional storage", choices: ["Speed up data retrieval at the cost of additional storage", "Ensure row uniqueness across a table", "Encrypt stored column values", "Automatically archive old records"], category: "Databases" },
  { question: "What does 'immutable' mean in programming?", answer: "An object whose state cannot change after creation", choices: ["An object whose state cannot change after creation", "An object that cannot be garbage collected", "A variable stored in read-only memory", "A function with no return value"], category: "Concepts" },
  { question: "What is the difference between TCP and UDP?", answer: "TCP is reliable and ordered; UDP is faster but unreliable", choices: ["TCP is reliable and ordered; UDP is faster but unreliable", "TCP is faster; UDP has error correction", "TCP uses datagrams; UDP uses streams", "TCP is connectionless; UDP requires a handshake"], category: "Networking" },
  { question: "Which sorting algorithm has the best average-case time complexity?", answer: "Quicksort (O(n log n))", choices: ["Quicksort (O(n log n))", "Bubble sort (O(n²))", "Insertion sort (O(n²))", "Selection sort (O(n²))"], category: "Algorithms" },
  { question: "What is a deadlock in concurrent systems?", answer: "Two or more processes each waiting for the other to release a resource", choices: ["Two or more processes each waiting for the other to release a resource", "A process that enters an infinite loop", "A thread that exceeds its memory allocation", "A process killed by the OS due to high CPU use"], category: "Concurrency" },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const BLOCK_COLORS = [
  "#6EE7B7", "#96D1C7", "#7CB9E8", "#A78BFA",
  "#FBBF24", "#FB923C", "#F472B6", "#818CF8",
  "#34D399", "#22D3EE", "#A3E635", "#E879F9",
];

export default function TowerBuilder({ onExit }: { onExit: (score: number) => void }) {
  const [started, setStarted] = useState(false);
  const [questions] = useState(() => shuffle(ALL_QUESTIONS));
  const [qIdx, setQIdx] = useState(0);
  const [towerHeight, setTowerHeight] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [shakeTower, setShakeTower] = useState(false);

  const startGame = useCallback(() => {
    setQIdx(0);
    setTowerHeight(0);
    setScore(0);
    setSelected(null);
    setFeedback(null);
    setGameOver(false);
    setAddingBlock(false);
    setShakeTower(false);
    setStarted(true);
  }, []);

  const handleAnswer = useCallback((choice: string) => {
    if (selected !== null || feedback !== null) return;
    const q = questions[qIdx % questions.length];
    const correct = choice === q.answer;
    setSelected(choice);
    setFeedback(correct ? "correct" : "wrong");

    if (correct) {
      setAddingBlock(true);
      setTimeout(() => {
        setTowerHeight(h => h + 1);
        setScore(s => s + Math.max(50, (towerHeight + 1) * 50));
        setAddingBlock(false);
        setSelected(null);
        setFeedback(null);
        setQIdx(i => i + 1);
      }, 700);
    } else {
      setShakeTower(true);
      setTimeout(() => {
        setShakeTower(false);
        setGameOver(true);
      }, 800);
    }
  }, [selected, feedback, questions, qIdx, towerHeight]);

  // ── Pre-start ─────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}>
            <Layers className="w-8 h-8" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-3xl font-black mb-2">Tower Builder</h1>
          <p className="text-[#9C948A] text-sm mb-8 leading-relaxed">
            Every correct answer adds a block to your tower. One wrong answer and the whole thing collapses. How high can you go?
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8 text-left">
            {[
              ["🏗 Build High", "Each correct answer = +1 block"],
              ["💥 One Strike", "Any wrong answer ends the game"],
              ["📈 Score Scales", "Higher tower = more points per block"],
              ["♾ Endless", "20 questions cycling, no repeats"],
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
            Start Building
          </button>
        </div>
      </div>
    );
  }

  // ── Game Over ─────────────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-8 text-center"
        >
          <div className="text-5xl mb-4">💥</div>
          <h2 className="text-2xl font-black mb-1">Tower Collapsed!</h2>
          <p className="text-[#9C948A] text-sm mb-8">You reached {towerHeight} blocks high.</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">Final Score</p>
            </div>
            <div className="bg-[#0B0F14] rounded-2xl p-4">
              <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>{towerHeight}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#5F5854] mt-1">Height</p>
            </div>
          </div>

          {/* Mini tower preview */}
          {towerHeight > 0 && (
            <div className="flex flex-col-reverse items-center gap-1 mb-6 max-h-32 overflow-hidden">
              {Array.from({ length: Math.min(towerHeight, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 rounded-sm opacity-60"
                  style={{
                    width: `${Math.max(40, 100 - i * 4)}%`,
                    background: BLOCK_COLORS[i % BLOCK_COLORS.length],
                  }}
                />
              ))}
              {towerHeight > 8 && (
                <p className="text-[9px] text-[#5F5854] mt-1">+{towerHeight - 8} more blocks</p>
              )}
            </div>
          )}

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
              <RotateCcw className="w-4 h-4" /> Rebuild
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  const q = questions[qIdx % questions.length];
  const displayBlocks = Math.min(towerHeight, 6); // show max 6 blocks in HUD

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F2EDE7] flex flex-col items-center justify-center p-6 select-none">
      {/* Top bar */}
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <button onClick={() => onExit(score)} className="p-2 text-[#5F5854] hover:text-[#F2EDE7] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-5">
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            Height <span className="font-black" style={{ color: ACCENT }}>{towerHeight}</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#5F5854]">
            Score <span className="font-black tabular-nums" style={{ color: ACCENT }}>{score.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Mini tower preview */}
      <div className="w-full max-w-sm flex flex-col-reverse items-center gap-1 mb-4 min-h-[100px] justify-end">
        <AnimatePresence>
          {addingBlock && (
            <motion.div
              key="adding"
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="h-5 rounded-sm w-full"
              style={{
                background: BLOCK_COLORS[towerHeight % BLOCK_COLORS.length],
                maxWidth: `${Math.max(30, 100 - towerHeight * 3)}%`,
              }}
            />
          )}
        </AnimatePresence>
        <motion.div
          animate={shakeTower ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col-reverse items-center gap-1"
        >
          {Array.from({ length: displayBlocks }).map((_, i) => (
            <div
              key={i}
              className="h-5 rounded-sm"
              style={{
                background: BLOCK_COLORS[i % BLOCK_COLORS.length],
                width: `${Math.max(30, 100 - i * 4)}%`,
                opacity: 0.7 + i * 0.05,
              }}
            />
          ))}
          {towerHeight > displayBlocks && (
            <p className="text-[9px] text-[#5F5854] mb-1">+{towerHeight - displayBlocks} below</p>
          )}
          {towerHeight === 0 && (
            <p className="text-[9px] uppercase tracking-widest text-[#3A3530]">Answer correctly to start building</p>
          )}
        </motion.div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-sm"
        >
          <div className="bg-[#1C1A17] border border-[#2E2B27] rounded-3xl p-5 mb-4">
            <span className="text-[8px] uppercase tracking-widest text-[#5F5854] block mb-2">{q.category}</span>
            <p className="text-sm font-medium leading-relaxed">{q.question}</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {q.choices.map(c => {
              const isSel = selected === c;
              const isRight = c === q.answer;
              let bg = "#1C1A17", border = "#2E2B27", color = "#F2EDE7";
              if (isSel && feedback === "correct")  { bg = `${ACCENT}25`; border = ACCENT; color = ACCENT; }
              if (isSel && feedback === "wrong")     { bg = "#F9731615"; border = "#F97316"; color = "#F97316"; }
              if (feedback === "wrong" && isRight)   { bg = `${ACCENT}15`; border = `${ACCENT}50`; color = ACCENT; }

              return (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(c)}
                  disabled={selected !== null}
                  className="w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all"
                  style={{ background: bg, borderColor: border, color }}
                >
                  {c}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
