// src/components/client/scan/ScanStatus.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScanStatusProps {
  status: "idle" | "verifying" | "success" | "error";
  message: string;
  error?: string | null;
  restaurantName?: string;
  tableNumber?: string | number;
  primaryColor?: string;
  logoUrl?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const l = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${l(r1, r2)}, ${l(g1, g2)}, ${l(b1, b2)})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Animated checkmark (inspired by 21st.dev) ───────────────────────────────

function AnimatedCheckmark({ color, size = 72 }: { color: string; size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <motion.circle
          cx="50" cy="50" r="44"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
        <motion.path
          d="M30 52L42 64L70 36"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.85 }}
        />
      </svg>
    </motion.div>
  );
}

// ── Floating particle ────────────────────────────────────────────────────────

interface FloatingDot {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
}

function useParticles(count: number): FloatingDot[] {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 2,
        delay: Math.random() * 3,
        duration: Math.random() * 6 + 5,
        driftX: (Math.random() - 0.5) * 30,
        driftY: (Math.random() - 0.5) * 30,
      })),
    [count],
  );
}

// ── Pulse rings ──────────────────────────────────────────────────────────────

function PulseRings({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ border: `1.5px solid ${color}` }}
          initial={{ width: 90, height: 90, opacity: 0.5 }}
          animate={{ width: 240, height: 240, opacity: 0 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Spinner dots ─────────────────────────────────────────────────────────────

function SpinnerDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: color,
          }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ScanStatus({
  status,
  message,
  error,
  restaurantName = "Il tuo ristorante",
  tableNumber,
  primaryColor = "#C07A3A",
  logoUrl,
}: ScanStatusProps) {
  const BEIGE = "#F2EDE4";
  const PRIMARY = primaryColor;
  const isLight = luminance(PRIMARY) > 0.55;

  const [colorT, setColorT] = useState(0);
  const [exitVisible, setExitVisible] = useState(false);
  const [progress, setProgress] = useState(5);
  const progressRef = useRef(5);
  const rafRef = useRef<number | null>(null);
  const particles = useParticles(22);

  const bgColor = lerpColor(BEIGE, PRIMARY, colorT);
  const fgColor = colorT > 0.5 ? (isLight ? "#2a2118" : "#FFFFFF") : "#2C1A0E";
  const subColor =
    colorT > 0.5
      ? isLight
        ? "rgba(42,33,24,0.55)"
        : "rgba(255,255,255,0.6)"
      : "rgba(44,26,14,0.5)";
  const particleColor =
    colorT > 0.5
      ? isLight
        ? "rgba(42,33,24,0.08)"
        : "rgba(255,255,255,0.1)"
      : "rgba(192,122,58,0.1)";
  const ringColor =
    colorT > 0.5
      ? isLight
        ? "rgba(42,33,24,0.12)"
        : "rgba(255,255,255,0.18)"
      : "rgba(192,122,58,0.2)";
  const checkColor = colorT > 0.5 ? (isLight ? "#2a2118" : "#ffffff") : PRIMARY;

  // ── Color transition ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      let start: number | null = null;
      function animate(ts: number) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const raw = Math.min(elapsed / 2000, 1);
        const eased = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2;
        setColorT(eased);
        if (raw < 1) rafRef.current = requestAnimationFrame(animate);
      }
      rafRef.current = requestAnimationFrame(animate);
    }, 500);
    return () => {
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Progress bar ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "verifying") {
      const iv = setInterval(() => {
        progressRef.current = Math.min(progressRef.current + 0.35, 75);
        setProgress(progressRef.current);
        if (progressRef.current >= 75) clearInterval(iv);
      }, 30);
      return () => clearInterval(iv);
    }
    if (status === "success") {
      const iv = setInterval(() => {
        progressRef.current = Math.min(progressRef.current + 2.5, 100);
        setProgress(progressRef.current);
        if (progressRef.current >= 100) clearInterval(iv);
      }, 16);
      return () => clearInterval(iv);
    }
    if (status === "error") setProgress(0);
  }, [status]);

  // ── Exit ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => setExitVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [status]);

  const isError = status === "error";
  const isVerifying = status === "idle" || status === "verifying";

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: bgColor,
        transition: "background 0.08s linear",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Particles ── */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: particleColor,
          }}
          animate={{
            x: [0, p.driftX, -p.driftX * 0.6, 0],
            y: [0, p.driftY, -p.driftY * 0.4, 0],
            opacity: [0.3, 0.7, 0.4, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ── Radial glow ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            colorT > 0.5
              ? isLight
                ? "radial-gradient(circle, rgba(42,33,24,0.06) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(192,122,58,0.1) 0%, transparent 70%)",
          transition: "background 0.5s",
        }}
      />

      {/* ── Pulse rings (while loading) ── */}
      {isVerifying && !isError && <PulseRings color={ringColor} />}

      {/* ── Main content ── */}
      <motion.div
        animate={exitVisible ? { scale: 1.06, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: "easeIn" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          padding: "0 28px",
          zIndex: 2,
        }}
      >
        {/* ── Logo / Icon / Checkmark ── */}
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="check"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              <AnimatedCheckmark color={checkColor} size={80} />
            </motion.div>
          ) : (
            <motion.div
              key="logo"
              initial={{ scale: 0.8, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.2,
              }}
            >
              {logoUrl ? (
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 28,
                    overflow: "hidden",
                    boxShadow: `0 12px 40px ${colorT > 0.5 ? "rgba(0,0,0,0.2)" : `${PRIMARY}30`}`,
                    transition: "box-shadow 0.4s",
                  }}
                >
                  <img
                    src={logoUrl}
                    alt={restaurantName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <motion.div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 28,
                    background: colorT > 0.5
                      ? isLight ? "rgba(42,33,24,0.08)" : "rgba(255,255,255,0.12)"
                      : "rgba(192,122,58,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                    boxShadow: `0 12px 40px ${colorT > 0.5 ? "rgba(0,0,0,0.15)" : `${PRIMARY}20`}`,
                    transition: "background 0.4s, box-shadow 0.4s",
                  }}
                  animate={{ rotate: [0, -6, 6, -3, 0] }}
                  transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                >
                  🍽️
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Text ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center" }}
        >
          {/* Table label */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: subColor,
              marginBottom: 10,
              transition: "color 0.3s",
            }}
          >
            {tableNumber ? `Tavolo ${tableNumber}` : "Benvenuto"}
          </motion.p>

          {/* Restaurant name */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(28px, 7vw, 40px)",
              fontWeight: 700,
              color: fgColor,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "0 0 12px",
              transition: "color 0.3s",
            }}
          >
            {isError ? "Accesso non riuscito" : restaurantName}
          </motion.h1>

          {/* Status message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              style={{
                fontSize: 15,
                color: subColor,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                transition: "color 0.3s",
              }}
            >
              {isError ? error || "Token QR non valido." : message}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* ── Spinner dots (while verifying) ── */}
        {isVerifying && !isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <SpinnerDots color={fgColor} />
          </motion.div>
        )}

        {/* ── Error box ── */}
        <AnimatePresence>
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              style={{
                background: "rgba(255,59,48,0.08)",
                border: "1px solid rgba(255,59,48,0.18)",
                borderRadius: 16,
                padding: "14px 22px",
                color: "#FF3B30",
                fontSize: 13,
                maxWidth: 320,
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              Scansiona nuovamente il QR o chiedi assistenza al personale.
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Progress bar ── */}
      {!isError && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: colorT > 0.5
              ? isLight ? "rgba(42,33,24,0.08)" : "rgba(255,255,255,0.12)"
              : "rgba(192,122,58,0.12)",
            zIndex: 10,
            transition: "background 0.3s",
          }}
        >
          <motion.div
            style={{
              height: "100%",
              borderRadius: "0 2px 2px 0",
              background: colorT > 0.5
                ? isLight ? "rgba(42,33,24,0.5)" : "rgba(255,255,255,0.8)"
                : PRIMARY,
              transition: "background 0.3s",
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}
