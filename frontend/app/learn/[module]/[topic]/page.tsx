"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle, ChevronRight, MessageSquare, Play, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiTutorPanel from "@/components/AiTutorPanel";

interface TopicContent {
  id: string;
  title: string;
  slug: string;
  markdown: string;
  order: number;
}

interface ModuleInfo {
  name: string;
  slug: string;
}

export default function TopicPage() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = params.module as string;
  const topicSlug = params.topic as string;
  
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [content, setContent] = useState<TopicContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAiTutor, setShowAiTutor] = useState(false);

  useEffect(() => {
    // In a real app, this would fetch from Supabase
    // For this prototype, we handle the seed modules
    const fetchContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?slug=eq.${moduleSlug}&select=name,slug`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          },
        });
        const data = await response.json();
        if (data && data[0]) {
          setModuleInfo(data[0]);
        }
        
        // Mocking content if topic retrieval not fully implemented in DB yet
        setContent({
          id: "mock_id",
          title: topicSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          slug: topicSlug,
          markdown: `
# Welcome to ${topicSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}

This is a deep dive into the foundational concepts of Python. In this lesson, we'll explore:

1. **The Syntax**: How Python represents operations and data.
2. **Best Practices**: Writing clean, readable code from day one.
3. **Common Mistakes**: What to avoid and how to debug yourself.

### Key Concepts
- Understanding the core mechanics
- Memory management basics
- Modern Python features

> "Python is a language that lets you work quickly and integrate your systems more effectively."

#### Example Code
\`\`\`python
def example():
    print("Hello from LearnFlow!")
    
example()
\`\`\`
          `,
          order: 1
        });

      } catch (error) {
        console.error("Failed to fetch topic content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [moduleSlug, topicSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-muted-foreground animate-pulse">Loading Tutorial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showAiTutor ? 'mr-[400px]' : ''}`}>
        <header className="border-b bg-background/50 backdrop-blur-md h-16 sticky top-0 z-40">
          <div className="container mx-auto px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()} 
                className="p-2 hover:bg-secondary rounded-lg transition-colors group"
                aria-label="Back"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium text-sm">
                  {moduleInfo?.name || moduleSlug}
                </span>
                <ChevronRight size={14} className="text-muted-foreground" />
                <span className="font-bold text-sm tracking-tight">{content?.title}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAiTutor(!showAiTutor)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2 ${showAiTutor ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary border-background hover:border-primary/50 text-foreground'}`}
              >
                <MessageSquare size={16} />
                Ask AI Tutor
                {showAiTutor && <Sparkles size={14} />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 container max-w-4xl mx-auto px-6 py-12">
          <motion.article 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-invert prose-primary max-w-none space-y-8"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold tracking-widest text-xs uppercase">
                <BookOpen size={14} />
                Reading Material
              </div>
              <h1 className="text-4xl md:text-5xl font-black">{content?.title}</h1>
            </div>

            <div className="bg-secondary/50 p-8 rounded-3xl border text-lg leading-relaxed space-y-6">
              <p className="text-muted-foreground italic">
                {content?.markdown.split('\n')[1].replace('# ', '')}
              </p>
              <p>
                Python is widely considered the best language for beginners because of its readable syntax and vast ecosystem. 
                In this topic, we focus on the foundational building blocks that make Python unique.
              </p>
              
              <div className="bg-background/80 p-6 rounded-2xl border-2 border-primary/20 space-y-3 shadow-inner">
                <h3 className="font-bold flex items-center gap-2 text-primary">
                  <Play size={16} className="fill-primary" />
                  Code Explorer
                </h3>
                <pre className="text-sm font-mono overflow-x-auto p-4 rounded-xl bg-background border">
{`def greet(name):
    # This is a sample function
    return f"Hello, {name}! Ready to code?"

print(greet("Human"))`}
                </pre>
              </div>

              <p>
                As you read through the documentation below, remember that programming is a "practice-first" skill. 
                Once you feel comfortable, click the practice button below to test your knowledge in the sandbox.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-12">
              <Link 
                href={`/practice?module=${moduleSlug}&topic=${topicSlug}`} 
                className="flex items-center justify-between p-8 rounded-[2.5rem] bg-primary text-primary-foreground hover:scale-[1.02] transition-transform group shadow-xl shadow-primary/20"
              >
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold tracking-widest opacity-80">Skill Check</span>
                  <h3 className="text-2xl font-black">Try Exercise</h3>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Trophy size={32} />
                </div>
              </Link>

              <button 
                onClick={() => setShowAiTutor(true)}
                className="flex items-center justify-between p-8 rounded-[2.5rem] bg-secondary border-2 border-background hover:border-primary/50 transition-all text-left text-foreground hover:scale-[1.02]"
              >
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold tracking-widest opacity-60">Stuck?</span>
                  <h3 className="text-2xl font-black">Ask AI Tutor</h3>
                </div>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <Sparkles size={32} />
                </div>
              </button>
            </div>

            <div className="pt-20 pb-12 text-center text-muted-foreground text-sm uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              End of Lesson
            </div>
          </motion.article>
        </main>
      </div>

      {/* Persistent AI Tutor Sidebar */}
      <aside 
        className={`fixed top-0 right-0 h-full w-[400px] bg-background border-l z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${showAiTutor ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <AiTutorPanel 
          context={{ module: moduleSlug, topic: topicSlug }} 
          onClose={() => setShowAiTutor(false)}
        />
      </aside>
    </div>
  );
}
