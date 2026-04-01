"use client";

// frontend/app/learn/[module]/page.tsx
// Module overview page: fetches module metadata from Supabase and lists
// curated topics. Acts as the hub between the Learn browse page and individual
// topic readers at /learn/[module]/[topic].

import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CircleDashed,
  CheckCircle2,
  Lock,
  MessageSquare,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiTutorPanel from "@/components/AiTutorPanel";
import ProgressRing from "@/components/ProgressRing";

// Static topic curriculum keyed by module slug.
// In a production system this would be stored in Supabase `topics` table.
const MODULE_TOPICS: Record<string, { slug: string; title: string; description: string }[]> = {
  basics: [
    { slug: "variables",        title: "Variables & Data Types",    description: "Integers, floats, strings, booleans and how Python infers type." },
    { slug: "operators",        title: "Operators & Expressions",   description: "Arithmetic, comparison, logical, and bitwise operators." },
    { slug: "control-flow",     title: "Control Flow",              description: "if / elif / else, truthiness, and short-circuit evaluation." },
    { slug: "loops",            title: "Loops",                     description: "for, while, break, continue, and the else clause." },
    { slug: "functions-intro",  title: "Functions — Introduction",  description: "def, return, positional vs keyword arguments." },
    { slug: "io",               title: "Input & Output",            description: "print(), input(), format strings, and f-strings." },
  ],
  "data-structures": [
    { slug: "lists",           title: "Lists",                      description: "Mutable sequences, indexing, slicing, and common methods." },
    { slug: "tuples",          title: "Tuples",                     description: "Immutable sequences and unpacking." },
    { slug: "sets",            title: "Sets",                       description: "Unique collections, set algebra, and frozenset." },
    { slug: "dicts",           title: "Dictionaries",               description: "Mapping types, comprehensions, and the collections module." },
    { slug: "comprehensions",  title: "Comprehensions",             description: "List, dict, set, and generator comprehensions." },
  ],
  functions: [
    { slug: "scope",           title: "Scope & Closures",           description: "LEGB rule, nonlocal, closures, and captured variables." },
    { slug: "lambdas",         title: "Lambda Functions",           description: "Anonymous functions, map(), filter(), and sorted()." },
    { slug: "recursion",       title: "Recursion",                  description: "Base cases, call stack, memoization, and tail calls." },
    { slug: "args-kwargs",     title: "*args and **kwargs",         description: "Variadic positional and keyword arguments." },
    { slug: "functools",       title: "functools module",           description: "partial(), reduce(), lru_cache, and wraps()." },
  ],
  oop: [
    { slug: "classes",         title: "Classes & Objects",          description: "__init__, self, instance vs class attributes." },
    { slug: "inheritance",     title: "Inheritance",                description: "Single and multiple inheritance, MRO, and super()." },
    { slug: "dunder",          title: "Dunder Methods",             description: "__str__, __repr__, __len__, __eq__, and more." },
    { slug: "properties",      title: "Properties & Descriptors",   description: "@property, getter/setter patterns, and slots." },
    { slug: "dataclasses",     title: "Dataclasses",                description: "@dataclass, fields, post_init, and frozen dataclasses." },
  ],
  "error-handling": [
    { slug: "exceptions",      title: "Exception Hierarchy",        description: "BaseException, Exception, and common built-in errors." },
    { slug: "try-except",      title: "try / except / finally",     description: "Catching, re-raising, and the else clause." },
    { slug: "custom-errors",   title: "Custom Exceptions",          description: "Subclassing Exception, adding context, and chaining." },
    { slug: "context-managers",title: "Context Managers",           description: "with statement, __enter__/__exit__, and contextlib." },
  ],
  "file-io": [
    { slug: "text-files",      title: "Reading & Writing Text",     description: "open(), modes, encoding, and context managers." },
    { slug: "pathlib",         title: "pathlib",                    description: "Path objects, globbing, and cross-platform file ops." },
    { slug: "csv-json",        title: "CSV & JSON",                 description: "csv module, json.loads/dumps, and streaming." },
  ],
  decorators: [
    { slug: "basics",          title: "Decorator Basics",           description: "First-class functions, wrapping, and the @ syntax." },
    { slug: "parameterized",   title: "Parameterized Decorators",   description: "Decorator factories and stacking decorators." },
    { slug: "class-deco",      title: "Class Decorators",           description: "Applying decorators to entire classes." },
  ],
  async: [
    { slug: "asyncio-intro",   title: "asyncio Fundamentals",       description: "Event loop, coroutines, and the async/await syntax." },
    { slug: "tasks",           title: "Tasks & Futures",            description: "asyncio.create_task, gather, and wait." },
    { slug: "aiohttp",         title: "aiohttp HTTP Calls",         description: "Async HTTP requests, sessions, and error handling." },
  ],
};

// Fallback topics for unknown slugs
const DEFAULT_TOPICS = [
  { slug: "intro",     title: "Introduction",       description: "Overview and learning objectives for this module." },
  { slug: "concepts",  title: "Core Concepts",      description: "Foundational theory and mental models." },
  { slug: "practice",  title: "Guided Practice",    description: "Worked examples with incremental complexity." },
  { slug: "challenge", title: "Challenge Exercises", description: "Apply your knowledge to progressively harder problems." },
];

interface ModuleData {
  name: string;
  slug: string;
  description: string;
  total_topics: number;
}

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = params.module as string;

  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAiTutor, setShowAiTutor] = useState(false);

  const topics = MODULE_TOPICS[moduleSlug] ?? DEFAULT_TOPICS;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modRes, progRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?slug=eq.${moduleSlug}&select=name,slug,description,total_topics`,
            {
              headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
              },
            }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/progress?user_id=eq.anonymous_user&module_slug=eq.${moduleSlug}&select=mastery_score`,
            {
              headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
              },
            }
          ),
        ]);

        const modData = await modRes.json();
        const progData = await progRes.json();

        if (modData && modData[0]) {
          setModuleData(modData[0]);
        } else {
          // Graceful fallback for unknown slug
          setModuleData({
            name: moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            slug: moduleSlug,
            description: "Comprehensive exploration of this Python topic.",
            total_topics: topics.length,
          });
        }

        // Build per-topic progress — simplified as flat module mastery for now
        const mastery = progData?.[0]?.mastery_score ?? 0;
        const map: Record<string, number> = {};
        topics.forEach((t, i) => {
          // Distribute mastery linearly across topics for visual fidelity
          map[t.slug] = i === 0 ? mastery : mastery > (i / topics.length) * 100 ? 100 : 0;
        });
        setUserProgress(map);
      } catch (err) {
        console.error("Failed to fetch module data:", err);
        setModuleData({
          name: moduleSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          slug: moduleSlug,
          description: "Comprehensive exploration of this Python topic.",
          total_topics: topics.length,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [moduleSlug, topics]);

  const overallMastery =
    topics.reduce((sum, t) => sum + (userProgress[t.slug] ?? 0), 0) / topics.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-text-muted animate-pulse">Loading Module...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showAiTutor ? "mr-[420px]" : ""}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 border-b border-border-fine bg-bg-base/80 backdrop-blur-md flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-bg-surface rounded-lg transition-editorial group"
              aria-label="Back"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-2 text-text-muted text-sm font-bold uppercase tracking-widest">
              <BookOpen size={14} />
              <span>{moduleData?.name}</span>
            </div>
          </div>

          <button
            onClick={() => setShowAiTutor(!showAiTutor)}
            id="ai-tutor-toggle"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-editorial ${
              showAiTutor
                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                : "bg-bg-surface border-border-fine text-text-primary hover:border-accent/50"
            }`}
          >
            <MessageSquare size={15} />
            Ask AI Tutor
          </button>
        </header>

        {/* Hero */}
        <section className="px-8 pt-16 pb-12 border-b border-border-fine bg-white/50">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent">
                Module Overview
              </div>
              <h1 className="text-5xl font-serif font-bold tracking-tight text-text-primary leading-none">
                {moduleData?.name}
              </h1>
              <p className="text-xl font-serif italic text-text-secondary leading-relaxed max-w-xl opacity-80">
                {moduleData?.description}
              </p>
              <div className="flex items-center gap-6 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
                  {topics.length} Topics
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">•</span>
                <Link
                  href={`/practice?module=${moduleSlug}`}
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-accent hover:opacity-80 transition-editorial"
                  id="module-practice-link"
                >
                  <Play size={12} fill="currentColor" /> Jump to Practice
                </Link>
              </div>
            </div>

            <div className="shrink-0">
              <div className="relative">
                <ProgressRing percentage={overallMastery} size={140} strokeWidth={12} />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-text-primary">
                    {Math.round(overallMastery)}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-text-muted">
                    Mastery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Topic list */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16 space-y-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-serif font-bold text-text-primary tracking-tight">
              Curriculum
            </h2>
            <Link
              href={`/learn/${moduleSlug}/${topics[0].slug}`}
              id="start-module-btn"
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-float shadow-accent/20 hover:opacity-90 transition-editorial"
            >
              <Play size={14} fill="currentColor" /> Start Learning
            </Link>
          </div>

          <div className="space-y-3">
            {topics.map((topic, i) => {
              const mastery = userProgress[topic.slug] ?? 0;
              const isCompleted = mastery >= 80;
              const isStarted = mastery > 0 && mastery < 80;
              const isLocked = i > 0 && (userProgress[topics[i - 1].slug] ?? 0) === 0;

              return (
                <motion.div
                  key={topic.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    href={isLocked ? "#" : `/learn/${moduleSlug}/${topic.slug}`}
                    id={`topic-${topic.slug}`}
                    className={`group flex items-center gap-6 p-6 rounded-2xl border transition-editorial ${
                      isLocked
                        ? "opacity-40 cursor-not-allowed bg-bg-surface border-border-fine"
                        : isCompleted
                        ? "bg-white border-border-fine hover:shadow-float hover:-translate-y-0.5"
                        : "bg-white border-border-fine hover:shadow-float hover:-translate-y-0.5 hover:border-accent/30"
                    }`}
                    onClick={(e) => isLocked && e.preventDefault()}
                    aria-disabled={isLocked}
                  >
                    {/* Ordinal / Status icon */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border text-sm font-bold ${
                        isCompleted
                          ? "bg-accent/10 border-accent/20 text-accent"
                          : isStarted
                          ? "bg-amber-50 border-amber-200 text-amber-600"
                          : isLocked
                          ? "bg-bg-elevated border-border-fine text-text-muted"
                          : "bg-bg-elevated border-border-fine text-text-secondary"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} />
                      ) : isStarted ? (
                        <CircleDashed size={18} className="animate-spin-slow" />
                      ) : isLocked ? (
                        <Lock size={16} />
                      ) : (
                        <span>{String(i + 1).padStart(2, "0")}</span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-serif font-bold text-lg tracking-tight truncate ${
                          isLocked
                            ? "text-text-muted"
                            : "text-text-primary group-hover:text-accent transition-editorial"
                        }`}
                      >
                        {topic.title}
                      </h3>
                      <p className="text-sm text-text-muted leading-relaxed mt-0.5 line-clamp-1">
                        {topic.description}
                      </p>
                    </div>

                    {/* Progress bar + CTA */}
                    <div className="flex items-center gap-6 shrink-0">
                      {isStarted && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                            {Math.round(mastery)}%
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all duration-700"
                              style={{ width: `${mastery}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {!isLocked && (
                        <ChevronRight
                          size={18}
                          className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-editorial"
                        />
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </main>
      </div>

      {/* ── AI Tutor Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 right-0 h-full w-[420px] z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          showAiTutor ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <AiTutorPanel
          context={{ module: moduleSlug }}
          onClose={() => setShowAiTutor(false)}
        />
      </aside>
    </div>
  );
}
