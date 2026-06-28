// src/app/abbonamento-scaduto/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "scale";
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const transforms = {
    up: "translateY(28px)",
    down: "translateY(-28px)",
    scale: "scale(0.9)",
  };

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${6 + i * 5}px`,
            height: `${6 + i * 5}px`,
            background: `rgba(239,68,68,${0.06 + i * 0.015})`,
            left: `${8 + i * 12}%`,
            top: `${15 + (i % 4) * 20}%`,
            animation: `float-particle ${6 + i * 1.2}s ease-in-out ${i * 0.6}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

function AnimatedClock() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="w-16 h-16"
      style={{ animation: "clock-pop 0.7s cubic-bezier(.16,1,.3,1) 0.3s both" }}
    >
      {/* Outer ring */}
      <circle
        cx="40" cy="40" r="36"
        fill="none"
        stroke="rgba(239,68,68,0.2)"
        strokeWidth="2.5"
        style={{
          strokeDasharray: 226,
          strokeDashoffset: 226,
          animation: "circle-draw 0.8s ease-out 0.4s forwards",
        }}
      />
      {/* Inner fill */}
      <circle
        cx="40" cy="40" r="32"
        fill="rgba(239,68,68,0.06)"
        style={{ opacity: 0, animation: "fade-in 0.5s ease-out 0.8s forwards" }}
      />
      {/* Hour hand */}
      <line
        x1="40" y1="40" x2="40" y2="22"
        stroke="#ef4444"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          transformOrigin: "40px 40px",
          animation: "hand-sweep 0.6s cubic-bezier(.16,1,.3,1) 1s both",
        }}
      />
      {/* Minute hand */}
      <line
        x1="40" y1="40" x2="55" y2="40"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transformOrigin: "40px 40px",
          animation: "hand-sweep-min 0.5s cubic-bezier(.16,1,.3,1) 1.2s both",
        }}
      />
      {/* Center dot */}
      <circle
        cx="40" cy="40" r="3"
        fill="#ef4444"
        style={{ opacity: 0, animation: "fade-in 0.3s ease-out 1s forwards" }}
      />
      {/* X overlay */}
      <g style={{ opacity: 0, animation: "fade-in 0.4s ease-out 1.5s forwards" }}>
        <line x1="54" y1="54" x2="66" y2="66" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="66" y1="54" x2="54" y2="66" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="60" r="10" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export default function AbbonamentoScaduto() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <style jsx global>{`
        @keyframes float-particle {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(10px, -16px) rotate(120deg); }
        }
        @keyframes circle-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fade-in {
          to { opacity: 1; }
        }
        @keyframes clock-pop {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes hand-sweep {
          0% { transform: rotate(-90deg); opacity: 0; }
          100% { transform: rotate(0deg); opacity: 1; }
        }
        @keyframes hand-sweep-min {
          0% { transform: rotate(-180deg); opacity: 0; }
          100% { transform: rotate(0deg); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="min-h-screen relative flex items-center justify-center px-4 py-12 bg-[#f5f5f7]">
        <FloatingParticles />

        <div
          className="w-full max-w-[420px] relative z-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "none" : "translateY(40px) scale(0.96)",
            transition: "all 0.8s cubic-bezier(.16,1,.3,1)",
          }}
        >
          {/* Card */}
          <FadeIn delay={150} direction="scale">
            <div
              className="rounded-[24px] px-8 py-10 text-center relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(40px) saturate(1.8)",
                WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow:
                  "0 0 0 0.5px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06), 0 12px 48px rgba(0,0,0,0.04)",
              }}
            >
              {/* Icon with pulse ring */}
              <FadeIn delay={250} direction="scale" className="flex justify-center mb-6">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      animation: "pulse-ring 2.5s ease-out infinite",
                    }}
                  />
                  <div className="relative w-20 h-20 rounded-full bg-red-50/80 flex items-center justify-center">
                    <AnimatedClock />
                  </div>
                </div>
              </FadeIn>

              {/* Title */}
              <FadeIn delay={400} direction="up">
                <h1 className="text-[26px] font-bold text-gray-900 tracking-tight leading-tight">
                  Abbonamento scaduto
                </h1>
              </FadeIn>

              {/* Description */}
              <FadeIn delay={500} direction="up">
                <p className="text-[15px] text-gray-400 mt-3 leading-relaxed max-w-[300px] mx-auto">
                  Il tuo periodo di accesso è terminato. Rinnova il piano per continuare a utilizzare il servizio.
                </p>
              </FadeIn>

              {/* CTA Button */}
              <FadeIn delay={650} direction="up" className="mt-8">
                <button
                  onClick={() => router.push("/rinnova-abbonamento")}
                  className="w-full py-4 rounded-2xl text-white font-semibold text-[16px] tracking-tight transition-all duration-300 active:scale-[0.97] relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                    backgroundSize: "200% 200%",
                    animation: "gradient-shift 4s ease infinite",
                    boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Rinnova abbonamento
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                </button>
              </FadeIn>
            </div>
          </FadeIn>

          {/* Footer */}
          <FadeIn delay={800} direction="up">
            <p className="text-center text-[12px] text-gray-400 mt-6 tracking-wide">
              Problemi con il codice?{" "}
              <a
                href="mailto:SOSTITUISCI@EMAIL.COM?subject=Problema%20abbonamento%20scaduto%20M2M"
                className="text-orange-500 font-medium hover:text-orange-600 underline underline-offset-2 transition-colors duration-200"
              >
                Contatta il gestore
              </a>
            </p>
          </FadeIn>
        </div>
      </div>
    </>
  );
}