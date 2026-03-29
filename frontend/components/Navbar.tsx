// e:/panaversity/hackathon-3/learnflow-app/frontend/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GraduationCap, Menu, User, BookOpen, Terminal } from "lucide-react";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "/learn", label: "Knowledge Nodes", icon: BookOpen },
  { href: "/practice", label: "Mastery Flow", icon: Terminal },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-20 glass-nav border-b border-border-fine flex items-center transition-editorial">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-editorial">
          <Logo />
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
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              <link.icon size={14} className="opacity-50" />
              {link.label}
              <span className={cn(
                "absolute bottom-0 left-0 w-full h-[1.5px] bg-accent transition-transform duration-500 scale-x-0 group-hover:scale-x-100 origin-left",
                pathname === link.href && "scale-x-100"
              )} />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/progress" className="text-text-muted hover:text-accent transition-editorial">
              <User size={18} strokeWidth={2.5} />
            </Link>
          </div>
          <button className="btn-tactile px-6 py-2.5 bg-text-primary text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-text-primary/10">
            Current Session
          </button>
          <button className="lg:hidden text-text-muted">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
