// src/app/page.tsx — Abbonamento scaduto (Subscription expired)
// Frontend-only rewrite. No backend logic touched.
"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

type Lang = "it" | "en";

// ─── Hydration-safe "mounted" flag (React 19 idiom, no setState-in-effect) ───
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// ─── Language store via useSyncExternalStore (localStorage-backed) ───
const LANG_EVENT = "abbonamento-lang-change";

function subscribeLang(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANG_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LANG_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getLangClient(): Lang {
  try {
    const saved = localStorage.getItem("abbonamento-lang");
    if (saved === "it" || saved === "en") return saved;
    if (typeof navigator !== "undefined") {
      const bl = navigator.language.toLowerCase();
      if (bl.startsWith("en")) return "en";
    }
  } catch {
    /* ignore */
  }
  return "it";
}

function getLangServer(): Lang {
  return "it";
}

function setLangValue(l: Lang) {
  try {
    localStorage.setItem("abbonamento-lang", l);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LANG_EVENT));
  }
}

// ════════════════════════════════════════
//  TRANSLATIONS
// ════════════════════════════════════════
const T = {
  it: {
    title: "Abbonamento scaduto",
    subtitle:
      "Il tuo periodo di accesso è terminato. Rinnova il piano per continuare a utilizzare il servizio.",
    cta: "Rinnova abbonamento",
    footerProblem: "Problemi con il codice?",
    contactManager: "Contatta il gestore",
    mailtoSubject: "Problema abbonamento scaduto M2M",
  },
  en: {
    title: "Subscription expired",
    subtitle:
      "Your access period has ended. Renew your plan to keep using the service.",
    cta: "Renew subscription",
    footerProblem: "Issues with the code?",
    contactManager: "Contact the manager",
    mailtoSubject: "Expired subscription issue M2M",
  },
} as const;

// ════════════════════════════════════════
//  ANIMATED PRIMITIVES
// ════════════════════════════════════════

// ─── FadeIn wrapper (entrance animation with blur) ───
function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
  duration = 0.7,
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale" | "none";
  className?: string;
  duration?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const transforms: Record<string, string> = {
    up: "translateY(28px)",
    down: "translateY(-28px)",
    left: "translateX(28px)",
    right: "translateX(-28px)",
    scale: "scale(0.9)",
    none: "none",
  };

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        filter: visible ? "blur(0px)" : "blur(6px)",
        transition: `opacity ${duration}s cubic-bezier(.16,1,.3,1) ${delay}ms, transform ${duration}s cubic-bezier(.16,1,.3,1) ${delay}ms, filter ${duration}s cubic-bezier(.16,1,.3,1) ${delay}ms`,
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </div>
  );
}

// ─── Floating particles (ambient background, orange-toned) ───
function FloatingParticles() {
  const particles = [
    { size: 10, left: 8, top: 18, opacity: 0.12, dur: 6, delay: 0, blur: 0 },
    { size: 22, left: 22, top: 65, opacity: 0.1, dur: 8, delay: 1.2, blur: 4 },
    { size: 14, left: 40, top: 30, opacity: 0.14, dur: 7, delay: 0.6, blur: 0 },
    { size: 30, left: 58, top: 75, opacity: 0.08, dur: 9, delay: 2, blur: 6 },
    { size: 12, left: 72, top: 22, opacity: 0.13, dur: 6.5, delay: 1.5, blur: 0 },
    { size: 18, left: 88, top: 55, opacity: 0.11, dur: 7.5, delay: 0.3, blur: 2 },
    { size: 8, left: 50, top: 12, opacity: 0.15, dur: 5.5, delay: 2.4, blur: 0 },
    { size: 16, left: 15, top: 45, opacity: 0.09, dur: 8.5, delay: 1.8, blur: 3 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(249,115,22,${p.opacity})`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            filter: p.blur ? `blur(${p.blur}px)` : undefined,
            animation: `float-particle ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated clock with X overlay (expired state icon) ───
function AnimatedClock() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="w-10 h-10"
      style={{ animation: "clock-pop 0.7s cubic-bezier(.16,1,.3,1) 0.3s both" }}
    >
      {/* Outer ring */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="rgba(249,115,22,0.25)"
        strokeWidth="2.5"
        style={{
          strokeDasharray: 226,
          strokeDashoffset: 226,
          animation: "circle-draw 0.8s ease-out 0.4s forwards",
        }}
      />
      {/* Inner fill */}
      <circle
        cx="40"
        cy="40"
        r="32"
        fill="rgba(249,115,22,0.06)"
        style={{ opacity: 0, animation: "fade-in 0.5s ease-out 0.8s forwards" }}
      />
      {/* Hour hand */}
      <line
        x1="40"
        y1="40"
        x2="40"
        y2="22"
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          transformOrigin: "40px 40px",
          animation: "hand-sweep 0.6s cubic-bezier(.16,1,.3,1) 1s both",
        }}
      />
      {/* Minute hand */}
      <line
        x1="40"
        y1="40"
        x2="55"
        y2="40"
        stroke="#f97316"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transformOrigin: "40px 40px",
          animation: "hand-sweep-min 0.5s cubic-bezier(.16,1,.3,1) 1.2s both",
        }}
      />
      {/* Center dot */}
      <circle
        cx="40"
        cy="40"
        r="3"
        fill="#f97316"
        style={{ opacity: 0, animation: "fade-in 0.3s ease-out 1s forwards" }}
      />
      {/* X overlay */}
      <g style={{ opacity: 0, animation: "fade-in 0.4s ease-out 1.5s forwards" }}>
        <line
          x1="54"
          y1="54"
          x2="66"
          y2="66"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="66"
          y1="54"
          x2="54"
          y2="66"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx="60"
          cy="60"
          r="10"
          fill="rgba(249,115,22,0.1)"
          stroke="#f97316"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

// ─── Language switcher (top-right floating pill) ───
function LanguageSwitcher({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div
      className="fixed top-5 right-5 z-50 inline-flex items-center p-1 rounded-full backdrop-blur-xl"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}
    >
      {(["it", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="relative px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide transition-colors duration-300 rounded-full"
          style={{
            color: lang === l ? "#fff" : "#6b7280",
            zIndex: lang === l ? 2 : 1,
          }}
          aria-pressed={lang === l}
        >
          {lang === l && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
                animation: "lang-slide 0.35s cubic-bezier(.16,1,.3,1)",
                zIndex: -1,
              }}
            />
          )}
          {l}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════

export default function AbbonamentoScaduto() {
  const router = useRouter();

  // Hydration-safe: false on server, true after client hydration
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot
  );
  // Language: backed by localStorage via useSyncExternalStore (no setState-in-effect)
  const lang = useSyncExternalStore(subscribeLang, getLangClient, getLangServer);
  const setLang = setLangValue;
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const cardWrapRef = useRef<HTMLDivElement>(null);

  const t = T[lang];

  // Mouse parallax tilt (disabled on touch devices)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const handler = (e: MouseEvent) => {
      if (!cardWrapRef.current) return;
      const rect = cardWrapRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setMouse({
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <>
      {/* ── Global keyframes ── */}
      <style jsx global>{`
        @keyframes float-particle {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          50% {
            transform: translate(8px, -12px) rotate(90deg) scale(1.05);
          }
          100% {
            transform: translate(16px, -24px) rotate(180deg) scale(0.95);
          }
        }
        @keyframes circle-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fade-in {
          to {
            opacity: 1;
          }
        }
        @keyframes clock-pop {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes hand-sweep {
          0% {
            transform: rotate(-90deg);
            opacity: 0;
          }
          100% {
            transform: rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes hand-sweep-min {
          0% {
            transform: rotate(-180deg);
            opacity: 0;
          }
          100% {
            transform: rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes gradient-pan {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
        @keyframes lang-slide {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes blob-1 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(60px, -40px) scale(1.1);
          }
          66% {
            transform: translate(-30px, 30px) scale(0.95);
          }
        }
        @keyframes blob-2 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-50px, 50px) scale(1.05);
          }
          66% {
            transform: translate(40px, -30px) scale(0.9);
          }
        }
        @keyframes blob-3 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, -50px) scale(1.1);
          }
        }
        @keyframes shimmer-sweep {
          0% {
            transform: translateX(-120%) skewX(-20deg);
          }
          100% {
            transform: translateX(220%) skewX(-20deg);
          }
        }
        .btn-shimmer::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
        }
        .btn-shimmer:hover::before {
          animation: shimmer-sweep 0.9s ease-out;
        }
      `}</style>

      <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden bg-[#f5f5f7]">
        {/* ── Animated background blobs (red-toned for expired state) ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-40 -left-32 w-[480px] h-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(249,115,22,0.26) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "blob-1 22s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-1/3 -right-40 w-[420px] h-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(249,115,22,0.20) 0%, transparent 70%)",
              filter: "blur(50px)",
              animation: "blob-2 28s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-40 left-1/4 w-[360px] h-[360px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(236,72,153,0.16) 0%, transparent 70%)",
              filter: "blur(45px)",
              animation: "blob-3 20s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── Floating particles ── */}
        <FloatingParticles />

        {/* ── Language switcher ── */}
        <LanguageSwitcher lang={lang} setLang={setLang} />

        {/* ── Card wrapper (with parallax tilt) ── */}
        <div
          ref={cardWrapRef}
          className="w-full max-w-[420px] relative z-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted
              ? `perspective(1400px) rotateY(${mouse.x * 4}deg) rotateX(${-mouse.y * 4}deg) translateY(0) scale(1)`
              : "translateY(40px) scale(0.96)",
            transition: mounted
              ? "opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.25s cubic-bezier(.22,1,.36,1)"
              : "opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* ── Card with gradient border ── */}
          <FadeIn delay={150} direction="scale">
            {/* Gradient border wrapper */}
            <div
              className="rounded-[24px] p-[1px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,115,22,0.3) 50%, rgba(255,255,255,0.9) 100%)",
              }}
            >
              <div
                className="rounded-[23px] px-8 py-10 text-center relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  backdropFilter: "blur(40px) saturate(1.8)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                  boxShadow:
                    "0 0 0 0.5px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06), 0 12px 48px rgba(0,0,0,0.05)",
                }}
              >
                {/* Icon with pulse ring + animated clock */}
                <FadeIn
                  delay={250}
                  direction="scale"
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "rgba(249,115,22,0.10)",
                        animation: "pulse-ring 2.5s ease-out infinite",
                      }}
                    />
                    <div
                      className="relative w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,237,213,0.9) 0%, rgba(254,215,170,0.8) 100%)",
                        boxShadow:
                          "0 8px 32px rgba(249,115,22,0.25), 0 0 0 6px rgba(249,115,22,0.06)",
                      }}
                    >
                      <AnimatedClock />
                    </div>
                  </div>
                </FadeIn>

                {/* Title with gradient text + pan animation */}
                <FadeIn delay={400} direction="up">
                  <h1
                    className="text-[26px] font-bold tracking-tight leading-tight"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #1f2937 0%, #c2410c 50%, #1f2937 100%)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      animation: "gradient-pan 6s linear infinite",
                    }}
                  >
                    {t.title}
                  </h1>
                </FadeIn>

                {/* Description */}
                <FadeIn delay={500} direction="up">
                  <p className="text-[15px] text-gray-400 mt-3 leading-relaxed max-w-[300px] mx-auto">
                    {t.subtitle}
                  </p>
                </FadeIn>

                {/* CTA Button with shimmer */}
                <FadeIn delay={650} direction="up" className="mt-8">
                  <button
                    onClick={() => router.push("/rinnova-abbonamento")}
                    className="btn-shimmer w-full py-4 rounded-2xl text-white font-semibold text-[16px] tracking-tight transition-all duration-300 active:scale-[0.97] hover:scale-[1.02] relative overflow-hidden group"
                    style={{
                      background:
                        "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                      backgroundSize: "200% 200%",
                      animation: "gradient-shift 4s ease infinite",
                      boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {t.cta}
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
            </div>
          </FadeIn>

          {/* ── Footer ── */}
          <FadeIn delay={800} direction="up">
            <p className="text-center text-[12px] text-gray-400 mt-6 tracking-wide">
              {t.footerProblem}{" "}
              <a
                href={`mailto:SOSTITUISCI@EMAIL.COM?subject=${encodeURIComponent(
                  t.mailtoSubject
                )}`}
                className="text-orange-500 font-medium hover:text-orange-600 underline underline-offset-2 transition-colors duration-200"
              >
                {t.contactManager}
              </a>
            </p>
          </FadeIn>
        </div>
      </div>
    </>
  );
}
