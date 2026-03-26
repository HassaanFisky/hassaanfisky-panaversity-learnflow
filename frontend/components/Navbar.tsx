"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 h-[56px] backdrop-blur-xl bg-[rgba(10,10,10,0.75)] border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {NAV_LINKS.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={cn(
                  "text-[13px] font-medium transition-colors duration-150",
                  pathname === link.href 
                    ? "text-[var(--text-primary)]" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/learn"
            className="bg-[var(--accent)] text-[#0A0A0A] font-medium text-[13px] px-4 py-1.5 rounded-[var(--radius-sm)] hover:brightness-110 active:scale-[0.97] transition-all duration-150"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
