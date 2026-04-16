"use client";

/**
 * CompanionContext — Shared open/close state for the H0 Companion System.
 * Wrap the entire app tree with <CompanionProvider> in layout.tsx.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface CompanionContextValue {
  isOpen: boolean;
  toggle: () => void;
  open:   () => void;
  close:  () => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open   = useCallback(() => setIsOpen(true), []);
  const close  = useCallback(() => setIsOpen(false), []);

  return (
    <CompanionContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) {
    throw new Error("useCompanion must be used within a <CompanionProvider>.");
  }
  return ctx;
}
