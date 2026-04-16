"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Languages, Sun, Snowflake, CloudRain, CloudLightning, Cloud, MessageSquare, BookOpen } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "next-themes";
import { useCompanion } from "@/components/companion/CompanionContext";

/**
 * HASSAAN AI ARCHITECT — ActionDock v6.0
 * Apple-tier elastic spring animations, swipe-to-dismiss bottom-sheet, full ARIA.
 */

type WeatherMode = "clear" | "snow" | "rain" | "storm" | "cloudy" | "sunny";
const WEATHER_CYCLE: WeatherMode[] = ["clear", "snow", "rain", "storm", "cloudy", "sunny"];

const WEATHER_ICONS: Record<WeatherMode, React.ReactNode> = {
  clear:  <Sun size={20} />,
  snow:   <Snowflake size={20} />,
  rain:   <CloudRain size={20} />,
  storm:  <CloudLightning size={20} />,
  cloudy: <Cloud size={20} />,
  sunny:  <Sun size={20} className="text-yellow-400" />,
};

const WEATHER_LABELS: Record<WeatherMode, string> = {
  clear:  "Clear sky",
  snow:   "Snow",
  rain:   "Rain",
  storm:  "Storm",
  cloudy: "Cloudy",
  sunny:  "Sunny",
};

// ── Spring presets ─────────────────────────────────────────────────────────────
// "zoop zoop" — snappy, high-stiffness spring with just enough damping to bounce once.
const SPRING_ZOOP   = { type: "spring", stiffness: 620, damping: 18, mass: 0.8 } as const;
// Gentler sheet spring for the language modal appear/dismiss.
const SPRING_SHEET  = { type: "spring", stiffness: 380, damping: 28, mass: 1.0 } as const;
// Icon swap inside the weather button.
const SPRING_ICON   = { type: "spring", stiffness: 500, damping: 14, mass: 0.6 } as const;

export function ActionDock({ isPortfolio = false }: { isPortfolio?: boolean }) {
  const { lang, changeLanguage, t, languages } = useLanguage();
  const { isOpen: companionOpen, toggle: toggleCompanion } = useCompanion();
  const [showLanguage, setShowLanguage] = useState(false);
  const [weatherIndex, setWeatherIndex] = useState(0);
  const { resolvedTheme } = useTheme();

  const dockRef     = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  const currentWeather = WEATHER_CYCLE[weatherIndex];

  useEffect(() => {
    const savedWeather = localStorage.getItem("weather_mode") as WeatherMode;
    if (savedWeather) {
      const idx = WEATHER_CYCLE.indexOf(savedWeather);
      if (idx !== -1) setWeatherIndex(idx);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        showLanguage &&
        languageRef.current &&
        !languageRef.current.contains(event.target as Node)
      ) {
        setShowLanguage(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLanguage]);

  const toggleWeather = () => {
    const nextIdx  = (weatherIndex + 1) % WEATHER_CYCLE.length;
    const nextMode = WEATHER_CYCLE[nextIdx];
    setWeatherIndex(nextIdx);
    localStorage.setItem("weather_mode", nextMode);
    window.dispatchEvent(new CustomEvent("weather-change", { detail: { mode: nextMode } }));
  };

  // ── Swipe-to-dismiss handler for the language bottom-sheet ───────────────────
  const handleSheetDragEnd = (_: any, info: PanInfo) => {
    // Dismiss if user drags down more than 50 px OR at a fast downward velocity.
    if (info.offset.y > 50 || info.velocity.y > 200) {
      setShowLanguage(false);
    }
  };

  const navItems = [
    {
      id:          "lang",
      icon:        <Languages size={20} />,
      label:       t.ui.language,
      action:      () => setShowLanguage((v) => !v),
      active:      showLanguage,
      ariaLabel:   "Toggle language selector",
      ariaExpanded: showLanguage,
    },
    {
      id:   "weather",
      icon: (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWeather}
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1,   rotate: 0   }}
            exit={   { opacity: 0, scale: 0.5, rotate: 45  }}
            transition={SPRING_ICON}
            style={{ willChange: "transform, opacity" }}
          >
            {WEATHER_ICONS[currentWeather]}
          </motion.div>
        </AnimatePresence>
      ),
      label:      `Weather: ${WEATHER_LABELS[currentWeather]}`,
      action:      toggleWeather,
      active:      weatherIndex !== 0,
      ariaLabel:  `Weather effect: ${WEATHER_LABELS[currentWeather]}. Click to cycle.`,
      ariaPressed: weatherIndex !== 0,
    },
    {
      id:             "chat",
      icon:           <MessageSquare size={20} />,
      label:          t.ui.companion,
      action:         toggleCompanion,
      active:         companionOpen,
      ariaLabel:      "Toggle AI companion chat",
      isCompanionOrb: true,
    },
    ...(!isPortfolio
      ? [
          {
            id:        "notebook",
            icon:      <BookOpen size={20} />,
            label:     t.ui.notebook,
            action:    () => window.dispatchEvent(new CustomEvent("toggle-notebook")),
            active:    false,
            ariaLabel: "Toggle learning notebook",
          },
        ]
      : []),
  ];

  return (
    <div
      ref={dockRef}
      className={`fixed bottom-10 z-[9999] flex flex-col items-center gap-4 ${
        lang === "ur" ? "left-10" : "right-10"
      }`}
    >
      {/* ── Language Selector — iOS-style draggable bottom-sheet ────────────── */}
      <AnimatePresence>
        {showLanguage && (
          <motion.div
            ref={languageRef}
            role="dialog"
            aria-label="Language selector"
            aria-modal="true"
            // Appear/exit animation
            initial={{ opacity: 0, scale: 0.88, y: 16, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1,    y: 0,  filter: "blur(0px)"  }}
            exit={   { opacity: 0, scale: 0.88, y: 16, filter: "blur(12px)" }}
            transition={SPRING_SHEET}
            // ── Swipe-to-dismiss drag ────────────────────────────────────────
            drag="y"
            dragConstraints={{ top: 0, bottom: 120 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleSheetDragEnd}
            className="flex flex-col gap-2 glass-apple p-2 rounded-2xl shadow-float mb-2 cursor-grab active:cursor-grabbing"
            style={{ willChange: "transform, opacity, filter", touchAction: "none" }}
          >
            {/* Drag handle pill */}
            <div className="mx-auto mb-1 w-8 h-1 rounded-full bg-white/20 flex-shrink-0" />

            {Object.keys(languages).map((l) => (
              <button
                key={l}
                onClick={() => {
                  changeLanguage(l);
                  setShowLanguage(false);
                }}
                aria-label={`Switch language to ${(languages as any)[l].name}`}
                aria-current={lang === l ? "true" : undefined}
                className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all uppercase tracking-widest ${
                  lang === l
                    ? "bg-accent text-white shadow-md scale-105"
                    : "text-text-secondary hover:bg-bg-base hover:text-accent"
                }`}
              >
                {(languages as any)[l].name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Dock ───────────────────────────────────────────────────────── */}
      <div
        role="toolbar"
        aria-label="Quick-action dock"
        className="flex flex-col gap-3 glass-apple p-2.5 rounded-full shadow-float border-white/20 dark:border-white/10"
      >
        {navItems.map((item) => {
          const ariaProps: Record<string, string | boolean | undefined> = {
            "aria-label": item.ariaLabel ?? item.label,
          };
          if ("ariaExpanded" in item) ariaProps["aria-expanded"] = item.ariaExpanded;
          if ("ariaPressed"  in item) ariaProps["aria-pressed"]  = item.ariaPressed;

          const isOrb   = !!(item as any).isCompanionOrb;
          const isGhost = isOrb && companionOpen;

          return (
            <motion.button
              key={item.id}
              layoutId={isOrb ? "companion-orb" : undefined}
              onClick={item.action}
              whileHover={!isGhost ? { scale: 1.12, y: -3 } : {}}
              whileTap={!isGhost ? { scale: 0.82 } : {}}
              transition={SPRING_ZOOP}
              aria-hidden={isGhost ? true : undefined}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative group ${
                item.active
                  ? "bg-accent text-white shadow-lg"
                  : "text-text-secondary hover:bg-bg-surface hover:text-accent hover:shadow-md"
              }`}
              style={{
                willChange:    "transform, border-radius",
                pointerEvents: isGhost ? "none" : "auto",
                opacity:       isGhost ? 0 : 1,
              }}
              title={item.label}
              {...ariaProps}
            >
              {item.icon}
              {!isGhost && (
                <div
                  className={`absolute ${
                    lang === "ur" ? "left-full ml-4" : "right-full mr-4"
                  } px-3 py-1.5 bg-text-primary text-bg-base text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-[0.2em] font-bold shadow-xl border border-white/20`}
                  aria-hidden="true"
                >
                  {item.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
