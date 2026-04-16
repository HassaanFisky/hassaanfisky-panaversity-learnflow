"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HASSAAN AI ARCHITECT — Weather Environment Engine v6.0
 * Cinematic, GPU-accelerated atmospheric environments.
 *
 * Architecture:
 *  Layer 1 (z-[2])     — Sky / Background atmosphere   → sits BELOW all page content
 *  Layer 2 (z-[5000])  — Foreground particles / effects → floats IN FRONT of content
 *
 * The actual background colour/sky change is driven by CSS custom-property transitions
 * on [data-weather] (see globals.css). Both layers are pointer-events-none.
 */

type WeatherMode = "clear" | "snow" | "rain" | "storm" | "cloudy" | "sunny";

// ─── GPU ACCELERATION HELPER ─────────────────────────────────────────────────
// Forces the browser to promote every animated element to its own GPU compositor
// layer, eliminating main-thread paint work and achieving true 60 FPS.
const GPU: React.CSSProperties = {
  willChange: "transform, opacity",
  transform: "translateZ(0)",
};

// ─── PROCEDURAL AUDIO ENGINE ─────────────────────────────────────────────────
/**
 * Synthesizes ambient weather sounds natively via Web Audio API.
 * AudioContext is deferred to first user interaction to satisfy autoplay policy.
 */
function useWeatherAudio(mode: WeatherMode) {
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const gainNodeRef    = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterNodeRef  = useRef<BiquadFilterNode | null>(null);
  const interactedRef  = useRef(false);

  const initAudioCtx = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx  = new Ctor() as AudioContext;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    audioCtxRef.current  = ctx;
    gainNodeRef.current  = gain;
  }, []);

  useEffect(() => {
    window.addEventListener("click",      initAudioCtx, { once: true });
    window.addEventListener("touchstart", initAudioCtx, { once: true });
    return () => {
      window.removeEventListener("click",      initAudioCtx);
      window.removeEventListener("touchstart", initAudioCtx);
    };
  }, [initAudioCtx]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ctx  = audioCtxRef.current;
    const gain = gainNodeRef.current;
    if (!ctx || !gain) return;

    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);

    const swapTimeout = setTimeout(() => {
      if (noiseSourceRef.current) {
        try { noiseSourceRef.current.stop(); } catch (_) {}
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
      if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
        filterNodeRef.current = null;
      }
      const SR         = ctx.sampleRate;
      const bufferSize = SR * 3;
      const buffer     = ctx.createBuffer(1, bufferSize, SR);
      const out        = buffer.getChannelData(0);

      if (mode === "rain" || mode === "storm") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616  * b5 - w * 0.0168980;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) / 7.0;
          b6 = w * 0.115926;
        }
      } else if (mode === "clear") {
        // Gentle outdoor breeze — lightly filtered pink noise
        let s = 0;
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1;
          s = (s + 0.01 * w) / 1.01;
          out[i] = Math.max(-1, Math.min(1, s * 4));
        }
      } else if (mode === "sunny") {
        // Desert wind — ultra-low frequency, barely audible
        let s = 0;
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1;
          s = (s + 0.005 * w) / 1.005;
          out[i] = Math.max(-1, Math.min(1, s * 5));
        }
      } else {
        let lastSample = 0;
        for (let i = 0; i < bufferSize; i++) {
          const w    = Math.random() * 2 - 1;
          lastSample = (lastSample + 0.02 * w) / 1.02;
          out[i]     = Math.max(-1, Math.min(1, lastSample * 3.5));
        }
      }

      const filter         = ctx.createBiquadFilter();
      filter.type          = "lowpass";
      filter.frequency.value =
        mode === "storm"  ? 600  :
        mode === "rain"   ? 1000 :
        mode === "sunny"  ? 80   :
        mode === "clear"  ? 180  : 300;
      filter.Q.value       = 0.7;

      const source   = ctx.createBufferSource();
      source.buffer  = buffer;
      source.loop    = true;
      source.connect(filter);
      filter.connect(gain);

      const targetVol =
        mode === "storm"  ? 0.30  :
        mode === "rain"   ? 0.15  :
        mode === "snow"   ? 0.06  :
        mode === "clear"  ? 0.04  :
        mode === "sunny"  ? 0.035 : 0.04;

      noiseSourceRef.current = source;
      filterNodeRef.current  = filter;
      source.start();
      gain.gain.setTargetAtTime(targetVol, ctx.currentTime, 2.0);
    }, 500);

    return () => clearTimeout(swapTimeout);
  }, [mode]);
}

// ─── MAIN OVERLAY ─────────────────────────────────────────────────────────────
export function WeatherOverlay() {
  const [mode, setMode] = useState<WeatherMode>("clear");
  useWeatherAudio(mode);

  useEffect(() => {
    const handleWeatherChange = (e: any) => {
      const newMode = (e.detail?.mode ?? "clear") as WeatherMode;
      setMode(newMode);
      document.documentElement.setAttribute("data-weather", newMode);
    };
    window.addEventListener("weather-change", handleWeatherChange);
    const saved = localStorage.getItem("weather_mode") as WeatherMode | null;
    if (saved) {
      setMode(saved);
      document.documentElement.setAttribute("data-weather", saved);
    }
    return () => window.removeEventListener("weather-change", handleWeatherChange);
  }, []);

  return (
    <>
      {/* ── LAYER 1: Sky / Background (z-2) ─────────────────────────────────
           Sits BELOW all page content. Creates the atmospheric "sky" —
           pitch-black for storm, deep navy for rain, golden amber for desert.
           The <main> element and Hero section (z-10) sit above this layer.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "sunny"  && <DesertSky   key="sky-sunny"  />}
          {mode === "rain"   && <TwilightSky key="sky-rain"   />}
          {mode === "storm"  && <StormSky    key="sky-storm"  />}
          {mode === "cloudy" && <CloudySky   key="sky-cloudy" />}
          {mode === "snow"   && <SnowSky     key="sky-snow"   />}
        </AnimatePresence>
      </div>

      {/* ── LAYER 2: Particles / Effects (z-5000) ───────────────────────────
           Floats IN FRONT of all content — rain streaks fall past text,
           sand particles drift over the UI, lightning illuminates the scene.
           pointer-events-none ensures zero interaction blocking.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-[5000] overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "snow"   && <SnowParticles   key="fx-snow"   />}
          {mode === "rain"   && <RainParticles   key="fx-rain"   />}
          {mode === "storm"  && <StormParticles  key="fx-storm"  />}
          {mode === "sunny"  && <DesertParticles key="fx-sunny"  />}
        </AnimatePresence>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LAYER 1 — SKY BACKGROUNDS
// ══════════════════════════════════════════════════════════════════════════════

// ─── DESERT SKY — Registan Golden Hour ───────────────────────────────────────
function DesertSky() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0"
      style={GPU}
    >
      {/* Layered golden-hour sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg," +
            "  #0d0500 0%," +
            "  #2a0e00 18%," +
            "  #6b2700 38%," +
            "  #b84f0a 58%," +
            "  #e07818 78%," +
            "  #f5b832 100%)",
          opacity: 0.88,
          ...GPU,
        }}
      />

      {/* Horizon haze band */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "45%",
          background:
            "radial-gradient(ellipse at 50% 100%," +
            "  rgba(255,160,40,0.35) 0%," +
            "  rgba(200,80,10,0.18) 45%," +
            "  transparent 75%)",
          ...GPU,
        }}
      />

      {/* Animated sun disk — upper-right, away from the hero name */}
      <motion.div
        animate={{ scale: [1, 1.035, 1], opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "7%",
          right: "11%",
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle," +
            "  rgba(255,255,200,1) 0%," +
            "  rgba(255,195,60,0.95) 28%," +
            "  rgba(255,130,20,0.55) 65%," +
            "  transparent 100%)",
          boxShadow:
            "0 0 90px 45px rgba(255,168,30,0.50)," +
            "0 0 180px 90px rgba(255,100,10,0.22)",
          ...GPU,
        }}
      />

      {/* Heat shimmer at ground level */}
      <motion.div
        animate={{ opacity: [0.05, 0.20, 0.05], scaleY: [1, 1.06, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "28%",
          background:
            "linear-gradient(to top, rgba(230,140,40,0.18), transparent)",
          backdropFilter: "blur(1.5px)",
          ...GPU,
        }}
      />
    </motion.div>
  );
}

// ─── TWILIGHT RAIN SKY — Deep Navy Evening ────────────────────────────────────
function TwilightSky() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0"
      style={GPU}
    >
      {/* Deep twilight gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg," +
            "  #010308 0%," +
            "  #040c1e 30%," +
            "  #071728 60%," +
            "  #0b2040 100%)",
          opacity: 0.90,
          ...GPU,
        }}
      />

      {/* Distant city wet-glow on the horizon */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "22%",
          background:
            "radial-gradient(ellipse at 50% 100%," +
            "  rgba(30,55,130,0.25) 0%," +
            "  rgba(15,30,80,0.12) 50%," +
            "  transparent 75%)",
          ...GPU,
        }}
      />
    </motion.div>
  );
}

// ─── STORM SKY — Pitch-Black Night with Moving Clouds ─────────────────────────
function StormSky() {
  // Memoised so we pay the random-generation cost only once
  const clouds = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        w:     400 + Math.random() * 550,
        h:     130 + Math.random() * 170,
        top:   Math.random() * 60,
        dur:   38 + Math.random() * 42,
        startX: -45 - Math.random() * 25,
        endX:   135 + Math.random() * 25,
        op:    0.50 + Math.random() * 0.35,
      })),
    []
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => ({
        id:    i,
        x:     Math.random() * 100,
        y:     Math.random() * 65,
        size:  0.5 + Math.random() * 1.6,
        baseOp: 0.08 + Math.random() * 0.55,
        dur:   2 + Math.random() * 4.5,
        delay: Math.random() * 6,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0"
      style={GPU}
    >
      {/* Ink-black sky base */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.92)", ...GPU }}
      />

      {/* Star field — faint, twinkling */}
      {stars.map((s) => (
        <motion.div
          key={`star-${s.id}`}
          animate={{
            opacity: [s.baseOp * 0.25, s.baseOp, s.baseOp * 0.25],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.delay,
          }}
          style={{
            position: "absolute",
            left:     `${s.x}%`,
            top:      `${s.y}%`,
            width:    `${s.size}px`,
            height:   `${s.size}px`,
            borderRadius: "50%",
            backgroundColor: "white",
            willChange: "opacity",
          }}
        />
      ))}

      {/* Moving dark storm clouds */}
      {clouds.map((c) => (
        <motion.div
          key={`cloud-${c.id}`}
          animate={{ x: [`${c.startX}%`, `${c.endX}%`] }}
          transition={{
            duration: c.dur,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            top:    `${c.top}%`,
            width:  `${c.w}px`,
            height: `${c.h}px`,
            background: `radial-gradient(ellipse,` +
              `rgba(35,42,65,${c.op}) 0%,` +
              `rgba(22,28,50,${c.op * 0.7}) 45%,` +
              `rgba(12,15,30,${c.op * 0.3}) 70%,` +
              `transparent 88%)`,
            filter: "blur(38px)",
            willChange: "transform",
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── CLOUDY SKY ───────────────────────────────────────────────────────────────
function CloudySky() {
  const cloudBlobs = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        w:   550 + Math.random() * 380,
        h:   260 + Math.random() * 180,
        top: Math.random() * 90,
        dur: 42 + Math.random() * 38,
        op:  0.30 + Math.random() * 0.25,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3 }}
      className="absolute inset-0"
      style={{ backdropFilter: "blur(1px)", ...GPU }}
    >
      <div className="absolute inset-0 bg-slate-900/15" style={GPU} />
      {cloudBlobs.map((c) => (
        <motion.div
          key={c.id}
          animate={{ x: ["-22%", "122%"] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: "linear" }}
          className="absolute bg-white rounded-full"
          style={{
            width:  c.w,
            height: c.h,
            top:    `${c.top}%`,
            left:   "-15%",
            filter: "blur(70px)",
            opacity: c.op,
            ...GPU,
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── SNOW SKY ─────────────────────────────────────────────────────────────────
function SnowSky() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      className="absolute inset-0"
      style={GPU}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a0d14 0%, #111828 40%, #1a2540 100%)",
          opacity: 0.70,
          ...GPU,
        }}
      />
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LAYER 2 — FOREGROUND PARTICLES & EFFECTS
// ══════════════════════════════════════════════════════════════════════════════

// ─── SNOW PARTICLES — Multi-layer Parallax ────────────────────────────────────
function SnowParticles() {
  // Memoised flake data: positions computed once, not on every render.
  // Critical: Framer Motion's `x` prop uses translateX (% of element width),
  // so we position flakes via CSS `left` instead — same pattern as RainParticles.
  const flakes = useMemo(
    () =>
      [1, 2, 3].flatMap((layer) =>
        Array.from({ length: 40 }, (_, i) => ({
          id:     `${layer}-${i}`,
          layer,
          left:   Math.random() * 103 - 1.5,  // % of container width
          driftX: Math.random() * 18 - 9,      // px left/right wind drift
          size:   5 + Math.random() * 10,
          dur:    10 + Math.random() * 10,
          delay:  Math.random() * 10,
        }))
      ),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="absolute inset-0"
      style={GPU}
    >
      {flakes.map((f) => (
        <motion.div
          key={f.id}
          initial={{ y: -20, opacity: 0.8 }}
          animate={{ y: "110vh", x: f.driftX, rotate: 360 }}
          transition={{
            duration: f.dur,
            repeat: Infinity,
            ease: "linear",
            delay: f.delay,
          }}
          className={`absolute text-white/50 pointer-events-none select-none drop-shadow-md snow-layer-${f.layer}`}
          style={{ left: `${f.left}%`, top: 0, fontSize: `${f.size}px`, ...GPU }}
        >
          ❄
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── RAIN PARTICLES — Evening Downpour ────────────────────────────────────────
function RainParticles() {
  const drops = useMemo(
    () =>
      Array.from({ length: 145 }, (_, i) => ({
        id:    i,
        x:     Math.random() * 115 - 5,
        h:     14 + Math.random() * 38,
        op:    0.12 + Math.random() * 0.38,
        dur:   0.28 + Math.random() * 0.22,
        delay: Math.random() * 2.2,
        angle: -9 + Math.random() * 6,
      })),
    []
  );

  const splashes = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id:    i,
        x:     Math.random() * 100,
        y:     70 + Math.random() * 24,
        size:  18 + Math.random() * 40,
        delay: Math.random() * 3.5,
        dur:   1.1 + Math.random() * 0.9,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0"
      style={GPU}
    >
      {/* Rain streaks */}
      {drops.map((d) => (
        <motion.div
          key={d.id}
          initial={{ y: "-5vh" }}
          animate={{ y: "108vh" }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            ease: "linear",
            delay: d.delay,
          }}
          style={{
            position: "absolute",
            left:     `${d.x}%`,
            top:      0,
            width:    "1.5px",
            height:   `${d.h}px`,
            background:
              "linear-gradient(to bottom," +
              "  transparent 0%," +
              "  rgba(160,205,255,0.72) 45%," +
              "  rgba(200,228,255,0.38) 100%)",
            opacity:         d.op,
            transform:       `translateZ(0) rotate(${d.angle}deg)`,
            transformOrigin: "top center",
            willChange:      "transform, opacity",
          }}
        />
      ))}

      {/* Splash ripples — bottom third of screen */}
      {splashes.map((s) => (
        <div
          key={s.id}
          className="rain-splash-ripple"
          style={{
            position:  "absolute",
            left:      `${s.x}%`,
            top:       `${s.y}%`,
            width:     `${s.size}px`,
            height:    `${s.size * 0.28}px`,
            animationDelay:    `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            ...GPU,
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── STORM PARTICLES — Heavy Rain + State-Driven Lightning ───────────────────
function StormParticles() {
  const [flash, setFlash] = useState<{ on: boolean; color: string }>({
    on: false,
    color: "rgba(255,255,255,0.88)",
  });

  // Randomised double-strike lightning
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const BOLT_COLORS = [
      "rgba(255,255,255,0.88)",
      "rgba(210,195,255,0.92)",
      "rgba(165,190,255,0.95)",
    ];

    const strike = () => {
      const color = BOLT_COLORS[Math.floor(Math.random() * BOLT_COLORS.length)];

      // Primary strike
      setFlash({ on: true, color });
      setTimeout(() => setFlash((s) => ({ ...s, on: false })), 85);

      // Echo strike (double-flash realism)
      setTimeout(() => setFlash({ on: true, color }), 175);
      setTimeout(() => setFlash((s) => ({ ...s, on: false })), 310);

      // Schedule next bolt
      timer = setTimeout(strike, 3200 + Math.random() * 8500);
    };

    timer = setTimeout(strike, 1400 + Math.random() * 2800);
    return () => clearTimeout(timer);
  }, []);

  const heavyDrops = useMemo(
    () =>
      Array.from({ length: 185 }, (_, i) => ({
        id:    i,
        x:     Math.random() * 122 - 11,
        h:     20 + Math.random() * 48,
        op:    0.18 + Math.random() * 0.44,
        dur:   0.18 + Math.random() * 0.17,
        delay: Math.random() * 1.5,
        angle: -15 + Math.random() * 10,
      })),
    []
  );

  const splashes = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id:    i,
        x:     Math.random() * 100,
        y:     68 + Math.random() * 26,
        size:  22 + Math.random() * 44,
        delay: Math.random() * 2.5,
        dur:   0.9 + Math.random() * 0.7,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0"
      style={GPU}
    >
      {/* Heavy angled rain */}
      {heavyDrops.map((d) => (
        <motion.div
          key={d.id}
          initial={{ y: "-5vh" }}
          animate={{ y: "108vh" }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            ease: "linear",
            delay: d.delay,
          }}
          style={{
            position: "absolute",
            left:     `${d.x}%`,
            top:      0,
            width:    "1.5px",
            height:   `${d.h}px`,
            background:
              "linear-gradient(to bottom," +
              "  transparent 0%," +
              "  rgba(140,175,225,0.80) 45%," +
              "  rgba(180,210,248,0.42) 100%)",
            opacity:         d.op,
            transform:       `translateZ(0) rotate(${d.angle}deg)`,
            transformOrigin: "top center",
            willChange:      "transform, opacity",
          }}
        />
      ))}

      {/* Splash ripples at bottom */}
      {splashes.map((s) => (
        <div
          key={s.id}
          className="rain-splash-ripple"
          style={{
            position:  "absolute",
            left:      `${s.x}%`,
            top:       `${s.y}%`,
            width:     `${s.size}px`,
            height:    `${s.size * 0.28}px`,
            animationDelay:    `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            ...GPU,
          }}
        />
      ))}

      {/* ── LIGHTNING FLASH ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {flash.on && (
          <motion.div
            key="lightning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.04, ease: "linear" }}
            style={{
              position:        "fixed",
              inset:           0,
              backgroundColor: flash.color,
              // 'screen' blend mode: lightens everything it touches —
              // correct for lightning illuminating a pitch-black scene.
              mixBlendMode:    "screen",
              willChange:      "opacity",
              pointerEvents:   "none",
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── DESERT PARTICLES — Wind-blown Sand & Dust ───────────────────────────────
/**
 * Three particle types:
 *  1. Fine sand  — tiny dots drifting left→right with the desert wind.
 *  2. Dust clods — larger, blurred ellipses; slower horizontal tumble.
 *  3. Haze band  — subtle animated blur at screen bottom (hot earth shimmer).
 *
 * All particles travel horizontally (wind direction), NOT falling vertically.
 * Positioned via CSS `left:0, top:Y%` + Framer Motion `x` in `vw` units so
 * translateX(Xvw) is always relative to the viewport, not the element width.
 */
function DesertParticles() {
  const sand = useMemo(
    () =>
      Array.from({ length: 72 }, (_, i) => ({
        id:      i,
        startX:  -8 - Math.random() * 10,   // vw — start off-screen left
        travelX: 120 + Math.random() * 30,   // vw — travel distance (to off-screen right)
        startY:  Math.random() * 92,          // % vertical placement
        driftY:  Math.random() * 28 - 14,     // px subtle up/down wobble
        size:    1 + Math.random() * 2.5,
        op:      0.20 + Math.random() * 0.45,
        dur:     6 + Math.random() * 12,
        delay:   Math.random() * 14,
        hue:     24 + Math.floor(Math.random() * 24),
        sat:     50 + Math.floor(Math.random() * 25),
        lit:     60 + Math.floor(Math.random() * 20),
      })),
    []
  );

  const clods = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id:      i,
        startX:  -12 - Math.random() * 10,
        travelX: 125 + Math.random() * 30,
        startY:  Math.random() * 88,
        driftY:  Math.random() * 18 - 9,
        w:       5 + Math.random() * 14,
        h:       3 + Math.random() * 7,
        op:      0.12 + Math.random() * 0.20,
        dur:     12 + Math.random() * 18,
        delay:   Math.random() * 16,
        rotate0: Math.random() * 360,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0"
      style={GPU}
    >
      {/* Fine sand particles — wind-blown left to right */}
      {sand.map((p) => (
        <motion.div
          key={`sand-${p.id}`}
          initial={{ x: `${p.startX}vw`, opacity: 0 }}
          animate={{
            x:       `${p.startX + p.travelX}vw`,
            y:       [0, p.driftY, 0],
            opacity: [0, p.op, p.op, 0],
          }}
          transition={{
            duration: p.dur,
            repeat:   Infinity,
            ease:     "linear",
            delay:    p.delay,
            times:    [0, 0.08, 0.92, 1],
          }}
          style={{
            position:        "absolute",
            left:            0,
            top:             `${p.startY}%`,
            width:           `${p.size}px`,
            height:          `${p.size}px`,
            borderRadius:    "50%",
            backgroundColor: `hsl(${p.hue},${p.sat}%,${p.lit}%)`,
            willChange:      "transform, opacity",
          }}
        />
      ))}

      {/* Dust clods — larger, blurred, slower horizontal tumble */}
      {clods.map((c) => (
        <motion.div
          key={`clod-${c.id}`}
          initial={{ x: `${c.startX}vw`, opacity: 0, rotate: c.rotate0 }}
          animate={{
            x:       `${c.startX + c.travelX}vw`,
            y:       [0, c.driftY, 0],
            rotate:  [c.rotate0, c.rotate0 + 180, c.rotate0 + 360],
            opacity: [0, c.op, c.op, 0],
          }}
          transition={{
            duration: c.dur,
            repeat:   Infinity,
            ease:     "linear",
            delay:    c.delay,
            times:    [0, 0.1, 0.9, 1],
          }}
          style={{
            position:        "absolute",
            left:            0,
            top:             `${c.startY}%`,
            width:           `${c.w}px`,
            height:          `${c.h}px`,
            borderRadius:    "40%",
            backgroundColor: "rgba(205,152,78,0.55)",
            filter:          "blur(1.8px)",
            willChange:      "transform, opacity",
          }}
        />
      ))}

      {/* Ambient warm haze at screen bottom */}
      <motion.div
        animate={{ opacity: [0.06, 0.20, 0.06] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:       "absolute",
          bottom:         0,
          left:           0,
          right:          0,
          height:         "22%",
          background:     "linear-gradient(to top, rgba(240,148,30,0.14), transparent)",
          backdropFilter: "blur(1px)",
          ...GPU,
        }}
      />
    </motion.div>
  );
}
