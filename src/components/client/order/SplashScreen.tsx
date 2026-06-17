// src/components/client/order/SplashScreen.tsx
"use client";

import { useEffect, useState, useMemo } from "react";

interface SplashScreenProps {
  restaurantName: string;
  tableNumber?: string | number | null;
  logoUrl?: string | null;
  brandColor: string;
  /** "enter" | "hold" | "exit" — guidata dal parent (OrderPage) */
  phase: "enter" | "hold" | "exit";
}

/** Converte #rrggbb → [r,g,b] (stessa logica usata in OrderPage) */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Estrae l'iniziale (prima lettera maiuscola) dal nome ristorante */
function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

/** Genera N particelle con posizione/dimensione/delay pseudo-random ma stabile (seed fisso) */
function useParticles(count: number) {
  return useMemo(() => {
    // seed deterministico per evitare "flash" diversi ad ogni render
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      top: 10 + rand() * 80,       // %
      left: 5 + rand() * 90,       // %
      size: 3 + rand() * 5,        // px
      delay: rand() * 2.6,         // s
      duration: 4 + rand() * 3,    // s
      drift: -20 + rand() * 40,    // px orizzontale di deriva
    }));
  }, [count]);
}

export default function SplashScreen({
  restaurantName,
  tableNumber,
  logoUrl,
  brandColor,
  phase,
}: SplashScreenProps) {
  const [r, g, b] = hexToRgb(brandColor);
  const alpha = (a: number) => `rgba(${r},${g},${b},${a})`;
  const particles = useParticles(14);

  // Progress bar: parte a 0 in "enter", si riempie durante "hold", arriva a 100 prima dell'exit
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (phase === "enter") {
      setProgress(8); // piccolo step iniziale, dà subito feedback
    } else if (phase === "hold") {
      // breve defer per garantire la transition CSS
      const t = setTimeout(() => setProgress(100), 30);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const exiting = phase === "exit";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        overflow: "hidden",
        background: "#fafaf7", // crema base, sovrascritto dal gradiente sottostante
        pointerEvents: exiting ? "none" : "auto",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.06)" : "scale(1)",
        transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1), transform 0.85s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <style>{`
        @keyframes splashGradientExpand {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.2); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes splashLogoIn {
          0%   { opacity: 0; transform: scale(0.72); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashLogoPulse {
          0%, 100% { box-shadow: 0 0 0 0 ${alpha(0.35)}, 0 18px 50px ${alpha(0.25)}; }
          50%      { box-shadow: 0 0 0 14px ${alpha(0.0)}, 0 18px 60px ${alpha(0.35)}; }
        }
        @keyframes splashTextUp {
          0%   { opacity: 0; transform: translateY(22px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashParticleFloat {
          0%   { transform: translate(0,0); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate(var(--drift,0px), -140px); opacity: 0; }
        }
      `}</style>

      {/* ── Gradiente che si espande dal centro ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "180vmax",
          height: "180vmax",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(0.55)} 0%, ${alpha(0.30)} 32%, ${alpha(0.10)} 58%, transparent 78%)`,
          animation: "splashGradientExpand 1.3s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      />
      {/* base crema che resta sotto, per dare profondità */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(160deg, #fdfbf7 0%, ${alpha(0.06)} 60%, #fdfbf7 100%)`,
          zIndex: -1,
        }}
      />

      {/* ── Particelle leggere ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,255,255,0.9), ${alpha(0.5)})`,
              boxShadow: `0 0 6px 1px ${alpha(0.25)}`,
              animation: `splashParticleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
              ["--drift" as any]: `${p.drift}px`,
            }}
          />
        ))}
      </div>

      {/* ── Contenuto centrale ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        {/* Logo / iniziale */}
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 28,
            overflow: "hidden",
            background: logoUrl ? "#fff" : `linear-gradient(135deg, ${brandColor}, ${alpha(0.7)})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: `splashLogoIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards, splashLogoPulse 2.2s ease-in-out 0.7s infinite`,
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={restaurantName}
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }}
            />
          ) : (
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 44,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {getInitial(restaurantName)}
            </span>
          )}
        </div>

        {/* Testo: nome + benvenuto */}
        <div
          style={{
            animation: "splashTextUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s forwards",
            opacity: 0, // parte invisibile, l'animazione lo porta a 1
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.9rem, 6vw, 2.6rem)",
              fontWeight: 800,
              color: "#2a2118",
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {restaurantName}
          </h1>
          {tableNumber != null && (
            <p
              style={{
                margin: 0,
                fontSize: "clamp(0.95rem, 2.6vw, 1.1rem)",
                fontWeight: 500,
                color: "#6b5f4e",
              }}
            >
              Benvenuto al tavolo <strong style={{ color: brandColor }}>{tableNumber}</strong>
            </p>
          )}
        </div>
      </div>

      {/* ── Progress bar in basso ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 56,
          transform: "translateX(-50%)",
          width: "min(220px, 60vw)",
          height: 3,
          borderRadius: 3,
          background: "rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${alpha(0.6)}, ${brandColor})`,
            borderRadius: 3,
            transition: "width 2.0s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}