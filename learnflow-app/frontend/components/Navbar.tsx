"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, User, BookOpen, Terminal, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

import { useSession, signOut } from "@/lib/auth-client";

const NAV_LINKS = [
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Terminal },
  { href: "/teacher", label: "Teacher", icon: ShieldCheck },
];

/**
 * HASSAAN AI ARCHITECT — LearnFlow Navbar
 * Unified Auth Node Synchronization.
 */
export function Navbar() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const user = session?.user ?? null;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-bg-base/80 backdrop-blur-xl border-b border-border-fine flex items-center transition-editorial">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-editorial"
        >
          <Logo />
          <div className="flex flex-col">
            <span className="text-sm font-serif font-bold tracking-[0.1em] text-text-primary uppercase">
              HASSAAN
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
              AI ARCHITECT
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-300 relative group py-2 flex items-center gap-2",
                pathname === link.href
                  ? "text-accent"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              <link.icon
                size={14}
                className={cn(
                  "transition-colors",
                  pathname === link.href
                    ? "text-accent"
                    : "opacity-30 group-hover:opacity-80",
                )}
              />
              {link.label}
              <span
                className={cn(
                  "absolute bottom-0 left-0 w-full h-[1.5px] bg-accent transition-transform duration-500 scale-x-0 group-hover:scale-x-100 origin-left",
                  pathname === link.href && "scale-x-100",
                )}
              />
            </Link>
          ))}
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/progress"
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-xl border transition-editorial group",
                    pathname === "/progress"
                      ? "bg-accent/10 border-accent/30 text-accent shadow-lg shadow-accent/5"
                      : "border-border-fine text-text-muted hover:border-text-primary hover:text-text-primary",
                  )}
                  title={user.email}
                >
                  <User
                    size={18}
                    className="text-accent group-hover:scale-110 transition-transform"
                  />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-[9px] font-bold uppercase tracking-widest text-red-500/80 hover:text-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-border-fine text-text-muted hover:border-text-primary hover:text-text-primary transition-editorial group"
              >
                <User
                  size={18}
                  className="group-hover:scale-110 transition-transform"
                />
              </Link>
            )}
          </div>

          <Link
            href={user ? "/learn" : "/sign-up"}
            className="hidden sm:flex btn-tactile px-6 py-2.5 bg-bg-elevated text-accent text-[10px] font-bold uppercase tracking-[0.3em] rounded-xl border border-border-fine hover:bg-accent hover:text-white shadow-card transition-editorial"
          >
            {user ? "Dashboard" : "Sign Up"}
          </Link>

          <button className="lg:hidden text-text-muted">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
