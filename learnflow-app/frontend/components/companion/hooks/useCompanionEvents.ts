"use client";

import { useEffect } from "react";

interface UseCompanionEventsProps {
  open:   () => void;
  close:  () => void;
  toggle: () => void;
}

export function useCompanionEvents({ open, close, toggle }: UseCompanionEventsProps): void {
  useEffect(() => {
    const onToggleChat     = () => toggle();
    const onToggleAira     = () => toggle();
    const onToggleNotebook = () => open();
    const onCloseAll       = () => close();

    window.addEventListener("toggle-chat",      onToggleChat);
    window.addEventListener("toggle-aira",      onToggleAira);
    window.addEventListener("toggle-notebook",  onToggleNotebook);
    window.addEventListener("close-all-panels", onCloseAll);

    return () => {
      window.removeEventListener("toggle-chat",      onToggleChat);
      window.removeEventListener("toggle-aira",      onToggleAira);
      window.removeEventListener("toggle-notebook",  onToggleNotebook);
      window.removeEventListener("close-all-panels", onCloseAll);
    };
  }, [open, close, toggle]);
}
