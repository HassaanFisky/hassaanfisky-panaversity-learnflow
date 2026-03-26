import { Navbar } from "@/components/Navbar";
import { MotionDiv, fadeUp, stagger } from "@/components/motion";

export default function LandingPage() {
  const [modules, setModules] = useState<ModulePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/modules?select=*&order=order.asc`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          },
        });
        const data = await response.json();
        setModules(data || []);
      } catch (error) {
        console.error("Failed to fetch modules:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-24 pb-12">
          {/* Radial Gradients */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 900px 600px at 50% -100px, rgba(212,165,116,0.08), transparent 70%),
                radial-gradient(ellipse 600px 400px at 80% 80%, rgba(61,214,140,0.04), transparent 60%),
                var(--bg-base)`
            }}
          />

          {/* Noise Texture */}
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-[0.035]">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
              <feColorMatrix type="saturate" values="0"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)"/>
          </svg>

          <MotionDiv 
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="relative z-10 container mx-auto px-4 text-center max-w-4xl"
          >
            <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-muted)] mb-6">
              Panaversity Hackathon III
            </div>
            
            <h1 className="text-[52px] font-semibold tracking-[-0.03em] leading-[1.1] text-[var(--text-primary)] mb-8">
              Master Python with
              <br />
              <span style={{ color: "var(--accent)" }}>AI-Powered Flow.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[17px] text-[var(--text-secondary)] font-medium leading-relaxed mb-10">
              Real-time feedback, interactive coding sandbox, and a personalized AI tutor that adapts to your learning style.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/learn"
                className="bg-[var(--accent)] text-[#0A0A0A] font-medium text-[13px] px-8 py-3 rounded-[var(--radius-sm)] hover:brightness-110 active:scale-[0.97] transition-all duration-150 flex items-center gap-2 shadow-sm"
              >
                Start Learning Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/practice"
                className="bg-transparent border border-[var(--border-muted)] text-[var(--text-primary)] text-[13px] font-medium px-8 py-3 rounded-[var(--radius-sm)] hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)] transition-all duration-150 flex items-center gap-2"
              >
                <Terminal className="h-4 w-4" />
                Open Sandbox
              </Link>
            </div>
          </MotionDiv>
        </section>

        {/* Feature Cards */}
        <section className="relative z-10 py-24 bg-[var(--bg-base)]">
          <div className="container mx-auto px-4">
            <MotionDiv 
              variants={stagger}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <FeatureCard 
                icon={<Code className="text-[var(--accent)]" size={24} />}
                title="Interactive Sandbox"
                description="Write and run code directly in your browser with the same power as a local IDE."
              />
              <FeatureCard 
                icon={<Sparkles className="text-[var(--accent)]" size={24} />}
                title="AI Tutor Triage"
                description="Smartly routes your questions to specialists for concepts, debugging, or code review."
              />
              <FeatureCard 
                icon={<LineChart className="text-[var(--accent)]" size={24} />}
                title="Mastery Tracking"
                description="Monitor your progress through every Python module with weighted mastery scores."
              />
            </MotionDiv>
          </div>
        </section>

        {/* Module Preview */}
        <section className="py-24 bg-[var(--bg-base)] border-t border-[var(--border-subtle)]">
          <div className="container mx-auto px-4 space-y-12">
            <MotionDiv
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-muted)]">
                  The Journey
                </div>
                <h2 className="text-[32px] font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                  <GraduationCap className="text-[var(--accent)] h-8 w-8" />
                  Python Curriculum
                </h2>
              </div>
              <Link href="/learn" className="text-[var(--accent)] font-medium text-[13px] flex items-center gap-1 hover:brightness-110 transition-all">
                View All Modules <ArrowRight size={14} />
              </Link>
            </MotionDiv>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-[var(--radius-md)] bg-[var(--bg-surface)] animate-pulse border border-[var(--border-subtle)]" />
                ))
              ) : modules.length > 0 ? (
                modules.slice(0, 4).map((module, i) => (
                  <MotionDiv
                    key={module.id}
                    variants={fadeUp}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Link href={`/learn/${module.slug}`} className="block h-full group">
                      <div className="h-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] hover:border-[var(--border-muted)] hover:-translate-y-[1px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] space-y-4">
                        <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] flex items-center justify-center font-bold text-[var(--accent)] text-[14px]">
                          {module.order}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-[17px] text-[var(--text-primary)] tracking-tight">{module.name}</h3>
                          <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </MotionDiv>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-[var(--text-muted)]">
                  No modules found. Please seed the database.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] py-12 bg-[var(--bg-base)] text-center">
        <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-muted)]">
          &copy; 2026 LearnFlow | Panaversity Hackathon III
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <MotionDiv 
      variants={fadeUp}
      className="p-8 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)] space-y-6 hover:border-[var(--border-muted)] hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group"
    >
      <div className="p-3 bg-[var(--accent-dim)] rounded-[var(--radius-md)] w-fit group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">{title}</h3>
      <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{description}</p>
    </MotionDiv>
  );
}
