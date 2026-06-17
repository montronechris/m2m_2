// src/components/client/scan/ScanStatus.tsx
"use client";

import { useEffect, useState, useRef } from "react";

interface ScanStatusProps {
  status: "idle" | "verifying" | "success" | "error";
  message: string;
  error?: string | null;
  restaurantName?: string;
  tableNumber?: string | number;
  primaryColor?: string;   // hex, e.g. "#C07A3A"
  logoUrl?: string;
}

// ── Particle ──────────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  color: string;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
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

  // 0 = full beige, 1 = full primary
  const [colorT, setColorT] = useState(0);
  const [phase, setPhase] = useState<"enter" | "loading" | "reveal" | "exit">("enter");
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [logoVisible, setLogoVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [exitVisible, setExitVisible] = useState(false);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const bgColor = lerpColor(BEIGE, PRIMARY, colorT);
  const fgColor = colorT > 0.5 ? "#FFFFFF" : "#2C1A0E";
  const subColor = colorT > 0.5 ? "rgba(255,255,255,0.65)" : "rgba(44,26,14,0.55)";
  const particleBase = colorT > 0.5 ? "rgba(255,255,255," : "rgba(192,122,58,";

  // ── Init particles ────────────────────────────────────────────────────────
  useEffect(() => {
    const pts: Particle[] = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.18 + 0.04,
      speedX: (Math.random() - 0.5) * 0.012,
      speedY: (Math.random() - 0.5) * 0.012,
      color: "",
    }));
    setParticles(pts);
  }, []);

  // ── Animate particles ─────────────────────────────────────────────────────
  useEffect(() => {
    let animId: number;
    function tick() {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: ((p.x + p.speedX + 100) % 100),
          y: ((p.y + p.speedY + 100) % 100),
        }))
      );
      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Orchestration sequence ────────────────────────────────────────────────
  useEffect(() => {
    // Phase 1: enter (0–600ms) — beige fades in, logo appears
    const t1 = setTimeout(() => {
      setPhase("loading");
      setLogoVisible(true);
      setTextVisible(true);
    }, 300);

    // Phase 2: loading (600ms–?) — color starts shifting, progress bar runs
    const t2 = setTimeout(() => {
      setPhase("loading");
      // start color transition
      let start: number | null = null;
      function colorAnim(ts: number) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const t = Math.min(elapsed / 1800, 1);
        // ease in-out cubic
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setColorT(eased);
        if (t < 1) rafRef.current = requestAnimationFrame(colorAnim);
      }
      rafRef.current = requestAnimationFrame(colorAnim);
    }, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Progress bar tied to status ───────────────────────────────────────────
  useEffect(() => {
    if (status === "idle") {
      setProgress(5);
    } else if (status === "verifying") {
      // Animate from 5 → 75 smoothly
      let p = progressRef.current;
      const interval = setInterval(() => {
        p = Math.min(p + 0.4, 75);
        progressRef.current = p;
        setProgress(p);
        if (p >= 75) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    } else if (status === "success") {
      // Shoot to 100
      let p = progressRef.current;
      const interval = setInterval(() => {
        p = Math.min(p + 2, 100);
        progressRef.current = p;
        setProgress(p);
        if (p >= 100) clearInterval(interval);
      }, 16);
      return () => clearInterval(interval);
    } else if (status === "error") {
      setProgress(0);
    }
  }, [status]);

  // ── Exit animation on success ─────────────────────────────────────────────
  useEffect(() => {
    if (status === "success") {
      setTimeout(() => {
        setPhase("exit");
        setExitVisible(true);
      }, 800);
    }
  }, [status]);

  const isError = status === "error";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        backgroundColor: bgColor,
        transition: "background-color 0.1s linear",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* ── Particles ── */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: `${particleBase}${p.opacity})`,
            pointerEvents: "none",
            transition: "background-color 0.3s",
          }}
        />
      ))}

      {/* ── Radial glow behind logo ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            colorT > 0.5
              ? "radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(192,122,58,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
          transition: "background 0.5s",
        }}
      />

      {/* ── Main card area ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          padding: "0 24px",
          transform: exitVisible ? "scale(1.04)" : "scale(1)",
          opacity: exitVisible ? 0 : 1,
          transition: exitVisible
            ? "opacity 0.55s ease-in, transform 0.55s ease-in"
            : "none",
          zIndex: 2,
        }}
      >
        {/* ── Logo / Icon ── */}
        <div
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "scale(1) translateY(0)" : "scale(0.82) translateY(12px)",
            transition: "opacity 0.7s cubic-bezier(0.34,1.56,0.64,1), transform 0.7s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {logoUrl ? (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 26,
                overflow: "hidden",
                boxShadow:
                  colorT > 0.5
                    ? "0 8px 32px rgba(0,0,0,0.22)"
                    : "0 8px 32px rgba(192,122,58,0.18)",
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
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 26,
                backgroundColor:
                  colorT > 0.5 ? "rgba(255,255,255,0.15)" : "rgba(192,122,58,0.13)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                transition: "background-color 0.4s",
                boxShadow:
                  colorT > 0.5
                    ? "0 8px 32px rgba(0,0,0,0.18)"
                    : "0 8px 32px rgba(192,122,58,0.13)",
              }}
            >
              🍽️
            </div>
          )}
        </div>

        {/* ── Pulse ring (only while verifying) ── */}
        {(status === "verifying" || status === "idle") && !isError && (
          <div
            style={{
              position: "absolute",
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: `1.5px solid ${colorT > 0.5 ? "rgba(255,255,255,0.25)" : "rgba(192,122,58,0.25)"}`,
              animation: "pulseRing 2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* ── Text ── */}
        <div
          style={{
            textAlign: "center",
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.65s 0.2s ease, transform 0.65s 0.2s ease",
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: subColor,
              marginBottom: 8,
              transition: "color 0.3s",
            }}
          >
            {tableNumber ? `Tavolo ${tableNumber}` : "Benvenuto"}
          </p>

          <h1
            style={{
              fontSize: "clamp(26px, 6vw, 36px)",
              fontWeight: 700,
              color: fgColor,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: "0 0 10px",
              transition: "color 0.3s",
            }}
          >
            {isError ? "Accesso non riuscito" : restaurantName}
          </h1>

          <p
            style={{
              fontSize: 15,
              color: subColor,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              transition: "color 0.3s",
            }}
          >
            {isError ? error || "Token QR non valido." : message}
          </p>
        </div>

        {/* ── Error box ── */}
        {isError && (
          <div
            style={{
              backgroundColor: "rgba(255,59,48,0.10)",
              border: "1px solid rgba(255,59,48,0.22)",
              borderRadius: 14,
              padding: "12px 20px",
              color: "#FF3B30",
              fontSize: 13,
              maxWidth: 320,
              textAlign: "center",
              animation: "fadeSlideUp 0.4s ease both",
            }}
          >
            Scansiona nuovamente il QR o chiedi assistenza al personale.
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {!isError && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor:
              colorT > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(192,122,58,0.15)",
            zIndex: 10,
            transition: "background-color 0.3s",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor:
                colorT > 0.5 ? "rgba(255,255,255,0.85)" : PRIMARY,
              borderRadius: "0 2px 2px 0",
              transition: "width 0.3s ease, background-color 0.3s",
            }}
          />
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(2.2);  opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}