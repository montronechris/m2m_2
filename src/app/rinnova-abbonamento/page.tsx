// src/app/rinnova/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Step = "idle" | "loading" | "valid" | "success" | "error";
type Lang = "it" | "en";

interface CodeInfo {
  id: string;
  plan: string;
  access_duration_days: number;
  max_staff: number;
  restaurant_id: string;
  restaurant_name: string;
  new_expiry: Date;
}

// ════════════════════════════════════════
//  TRANSLATIONS
// ════════════════════════════════════════
const T = {
  it: {
    title: "Rinnova Abbonamento",
    subtitle: "Inserisci il codice ricevuto per continuare a utilizzare il servizio",
    codeLabel: "Codice di rinnovo",
    verifyBtn: "Verifica codice",
    verifying: "Verifica in corso",
    validNotice: "Codice valido — controlla il riepilogo",
    restaurant: "Ristorante",
    plan: "Piano",
    duration: "Durata",
    days: "giorni",
    maxStaff: "Staff max",
    people: "persone",
    accessUntil: "Accesso fino al",
    cancel: "Annulla",
    confirmBtn: "Conferma rinnovo",
    activating: "Attivazione",
    successTitle: "Abbonamento rinnovato",
    successSubtitle: "è attivo fino al",
    goToDashboard: "Vai alla dashboard",
    footerProblem: "Problemi con il codice?",
    contactManager: "Contatta il gestore",
    mailtoSubject: "Problema codice rinnovo M2M",
    stepVerify: "Verifica",
    stepConfirm: "Conferma",
    stepDone: "Fatto",
    errors: {
      not_found: "Codice non trovato. Controlla e riprova.",
      already_used: "Questo codice è già stato utilizzato.",
      expired: "Questo codice è scaduto. Contatta il gestore del servizio.",
      not_renewal: "Questo codice è valido solo per la registrazione, non per un rinnovo.",
      default: "Errore nella verifica. Riprova.",
      no_auth: "Devi essere autenticato per rinnovare l'abbonamento.",
      not_authorized: "Non sei autorizzato a rinnovare l'abbonamento.",
      no_restaurant: "Errore nel recupero del tuo ristorante.",
      renewal_failed: "Errore durante il rinnovo. Riprova tra qualche istante.",
    },
  },
  en: {
    title: "Renew Subscription",
    subtitle: "Enter the code you received to keep using the service",
    codeLabel: "Renewal code",
    verifyBtn: "Verify code",
    verifying: "Verifying",
    validNotice: "Valid code — please review the summary",
    restaurant: "Restaurant",
    plan: "Plan",
    duration: "Duration",
    days: "days",
    maxStaff: "Max staff",
    people: "people",
    accessUntil: "Access until",
    cancel: "Cancel",
    confirmBtn: "Confirm renewal",
    activating: "Activating",
    successTitle: "Subscription renewed",
    successSubtitle: "is active until",
    goToDashboard: "Go to dashboard",
    footerProblem: "Issues with the code?",
    contactManager: "Contact the manager",
    mailtoSubject: "Renewal code issue M2M",
    stepVerify: "Verify",
    stepConfirm: "Confirm",
    stepDone: "Done",
    errors: {
      not_found: "Code not found. Please check and try again.",
      already_used: "This code has already been used.",
      expired: "This code has expired. Please contact the service manager.",
      not_renewal: "This code is valid only for registration, not for renewal.",
      default: "Verification error. Please try again.",
      no_auth: "You must be authenticated to renew the subscription.",
      not_authorized: "You are not authorized to renew the subscription.",
      no_restaurant: "Error retrieving your restaurant.",
      renewal_failed: "Error during renewal. Please try again in a moment.",
    },
  },
} as const;

// ════════════════════════════════════════
//  ANIMATED PRIMITIVES
// ════════════════════════════════════════

// ─── FadeIn wrapper (entrance animation) ───
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

// ─── Animated step container (smooth enter + exit) ───
function AnimatedStep({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [render, setRender] = useState(show);
  const [animClass, setAnimClass] = useState(show ? "step-enter" : "");

  useEffect(() => {
    if (show) {
      setRender(true);
      // double-rAF to ensure the browser paints the initial state before transitioning
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimClass("step-enter"))
      );
    } else {
      setAnimClass("step-exit");
      const t = setTimeout(() => setRender(false), 480);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!render) return null;
  return <div className={animClass}>{children}</div>;
}

// ─── Pulse loader (loading state) ───
function PulseLoader() {
  return (
    <span className="inline-flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-white"
          style={{
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Animated check (success state) ───
function AnimatedCheck() {
  return (
    <div className="relative">
      {/* Expanding rings */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "2px solid rgba(34,197,94,0.4)",
          animation: "ring-expand 1.6s ease-out 0.4s infinite",
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: "2px solid rgba(34,197,94,0.25)",
          animation: "ring-expand 1.6s ease-out 0.8s infinite",
        }}
      />
      <svg
        className="w-10 h-10 relative z-10"
        viewBox="0 0 52 52"
        style={{ animation: "check-pop 0.6s cubic-bezier(.16,1,.3,1) forwards" }}
      >
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          style={{
            strokeDasharray: 151,
            strokeDashoffset: 151,
            animation: "circle-draw 0.5s ease-out 0.2s forwards",
          }}
        />
        <path
          d="M15 27l7 7 15-15"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: "check-draw 0.4s ease-out 0.6s forwards",
          }}
        />
      </svg>
    </div>
  );
}

// ─── Floating particles (ambient background) ───
function FloatingParticles() {
  const particles = [
    { size: 10, left: 8, top: 18, opacity: 0.12, dur: 6, delay: 0, blur: 0 },
    { size: 22, left: 22, top: 65, opacity: 0.10, dur: 8, delay: 1.2, blur: 4 },
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
            background: `rgba(251,146,60,${p.opacity})`,
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
        >
          {lang === l && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
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

// ─── Progress steps (3-dot indicator) ───
function ProgressSteps({
  current,
  labels,
}: {
  current: 0 | 1 | 2;
  labels: { verify: string; confirm: string; done: string };
}) {
  const items = [labels.verify, labels.confirm, labels.done];
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {items.map((label, i) => {
        const active = i <= current;
        const isCurrent = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="relative w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500"
                style={{
                  background: active
                    ? "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)"
                    : "rgba(0,0,0,0.06)",
                  color: active ? "#fff" : "#9ca3af",
                  boxShadow: isCurrent
                    ? "0 0 0 4px rgba(249,115,22,0.15)"
                    : "none",
                  transform: isCurrent ? "scale(1.1)" : "scale(1)",
                }}
              >
                {i < current ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: "2px solid rgba(249,115,22,0.4)",
                      animation: "ring-expand 1.8s ease-out infinite",
                    }}
                  />
                )}
              </div>
              <span
                className="text-[11px] font-medium transition-colors duration-300 hidden sm:inline"
                style={{ color: active ? "#1f2937" : "#9ca3af" }}
              >
                {label}
              </span>
            </div>
            {i < items.length - 1 && (
              <div
                className="w-6 h-[2px] rounded-full overflow-hidden"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: i < current ? "100%" : "0%",
                    background: "linear-gradient(90deg, #fb923c, #ea580c)",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary row (with hover effect) ───
function SummaryRow({
  label,
  value,
  highlight = false,
  delay = 0,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <FadeIn delay={delay} direction="left">
      <div
        className="flex justify-between items-center py-3 px-1 rounded-lg transition-all duration-300 hover:bg-orange-50/40 group"
      >
        <span className="text-[15px] text-gray-400 tracking-tight group-hover:text-gray-500 transition-colors">
          {label}
        </span>
        <span
          className={`text-[15px] font-semibold tracking-tight transition-transform duration-300 group-hover:scale-105 ${
            highlight
              ? "text-orange-500"
              : "text-gray-900 group-hover:text-gray-700"
          }`}
        >
          {value}
        </span>
      </div>
    </FadeIn>
  );
}

// ════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════

export default function RinnovaAbbonamento() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [applying, setApplying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [lang, setLang] = useState<Lang>("it");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const CODE_LENGTH = 8;

  const t = T[lang];

  // Init: mount + restore language
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("rinnova-lang") as Lang | null;
      if (saved === "it" || saved === "en") {
        setLang(saved);
      } else if (typeof navigator !== "undefined") {
        const bl = navigator.language.toLowerCase();
        if (bl.startsWith("en")) setLang("en");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (mounted) {
      try { localStorage.setItem("rinnova-lang", lang); } catch {}
    }
  }, [lang, mounted]);

  // Mouse parallax (disabled on touch)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const handler = (e: MouseEvent) => {
      if (!cardWrapRef.current) return;
      const rect = cardWrapRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setMouse({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // ─── OTP input handlers (UNCHANGED LOGIC) ───
  const handleOtpChange = (index: number, value: string) => {
    if (step === "error") setStep("idle");
    const char = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    const arr = code.padEnd(CODE_LENGTH, " ").split("");
    arr[index] = char || " ";
    const next = arr.join("").replace(/ /g, "");
    setCode(next);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = code.padEnd(CODE_LENGTH, " ").split("");
      if (arr[index] !== " ") {
        arr[index] = " ";
        setCode(arr.join("").replace(/ /g, ""));
      } else if (index > 0) {
        arr[index - 1] = " ";
        setCode(arr.join("").replace(/ /g, ""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && code.length === CODE_LENGTH) {
      verificaCodice();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
    setCode(pasted);
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
  };

  // ─── verificaCodice (BACKEND LOGIC INTACT — only error strings translated) ───
  const verificaCodice = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setStep("loading");
    setErrorMsg("");
    setCodeInfo(null);

    // 1. Verifica codice tramite API route (service_role, bypassa RLS)
    const res = await fetch("/api/verify-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      const messages: Record<string, string> = {
        not_found: t.errors.not_found,
        already_used: t.errors.already_used,
        expired: t.errors.expired,
        not_renewal: t.errors.not_renewal,
      };
      setErrorMsg(messages[error] || t.errors.default);
      setStep("error");
      return;
    }

    const invite = await res.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg(t.errors.no_auth);
      setStep("error");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || !profile.restaurant_id) {
      setErrorMsg(t.errors.not_authorized);
      setStep("error");
      return;
    }

    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, access_expires_at, status")
      .eq("id", profile.restaurant_id)
      .single();

    if (restError || !restaurant) {
      setErrorMsg(t.errors.no_restaurant);
      setStep("error");
      return;
    }

    const base =
      restaurant.access_expires_at && new Date(restaurant.access_expires_at) > new Date()
        ? new Date(restaurant.access_expires_at)
        : new Date();

    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + invite.access_duration_days);

    setCodeInfo({
      id: invite.id,
      plan: invite.plan,
      access_duration_days: invite.access_duration_days,
      max_staff: invite.max_staff,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      new_expiry: newExpiry,
    });

    setStep("valid");
  }, [code, t]);

  // ─── confermaRinnovo (BACKEND LOGIC INTACT — only error strings translated) ───
  async function confermaRinnovo() {
    if (!codeInfo) return;
    setApplying(true);

    const res = await fetch("/api/confirm-renewal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invite_id: codeInfo.id,
        restaurant_id: codeInfo.restaurant_id,
        plan: codeInfo.plan,
        max_staff: codeInfo.max_staff,
        new_expiry: codeInfo.new_expiry.toISOString(),
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setErrorMsg(
        error === "already_used"
          ? t.errors.already_used
          : t.errors.renewal_failed
      );
      setStep("error");
      setApplying(false);
      return;
    }

    setApplying(false);
    setStep("success");
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString(lang === "it" ? "it-IT" : "en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // Progress step index
  const progressIdx: 0 | 1 | 2 =
    step === "idle" || step === "loading" || step === "error"
      ? 0
      : step === "valid"
      ? 1
      : 2;

  return (
    <>
      {/* ── Global keyframes ── */}
      <style jsx global>{`
        @keyframes float-particle {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(8px, -12px) rotate(90deg) scale(1.05); }
          100% { transform: translate(16px, -24px) rotate(180deg) scale(0.95); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes circle-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes check-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ring-expand {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradient-pan {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 1; }
          60% { opacity: 1; }
          100% { transform: translateY(60px) rotate(540deg) scale(0.5); opacity: 0; }
        }
        @keyframes char-pop {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lang-slide {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes blob-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -40px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
        }
        @keyframes blob-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 50px) scale(1.05); }
          66% { transform: translate(40px, -30px) scale(0.9); }
        }
        @keyframes blob-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.1); }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(249,115,22,0.12), 0 0 20px rgba(249,115,22,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(249,115,22,0.18), 0 0 30px rgba(249,115,22,0.35); }
        }
        .step-enter {
          animation: step-in 0.55s cubic-bezier(.16,1,.3,1) forwards;
        }
        .step-exit {
          animation: step-out 0.48s cubic-bezier(.5,0,.7,1) forwards;
        }
        @keyframes step-in {
          from { opacity: 0; transform: translateY(20px) scale(0.96); filter: blur(4px); }
          to { opacity: 1; transform: none; filter: blur(0); }
        }
        @keyframes step-out {
          from { opacity: 1; transform: none; filter: blur(0); }
          to { opacity: 0; transform: translateY(-14px) scale(0.96); filter: blur(4px); }
        }
        .btn-shimmer::before {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
        }
        .btn-shimmer:hover::before {
          animation: shimmer-sweep 0.9s ease-out;
        }
      `}</style>

      <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden bg-[#f5f5f7]">
        {/* ── Animated background blobs ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-40 -left-32 w-[480px] h-[480px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(251,146,60,0.28) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "blob-1 22s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-1/3 -right-40 w-[420px] h-[420px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)",
              filter: "blur(50px)",
              animation: "blob-2 28s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-40 left-1/4 w-[360px] h-[360px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)",
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
          {/* ── Header ── */}
          <FadeIn delay={100} direction="up" className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] mb-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                backgroundSize: "200% 200%",
                animation: "gradient-shift 4s ease infinite",
                boxShadow: "0 8px 32px rgba(249,115,22,0.4), 0 0 0 6px rgba(249,115,22,0.08)",
              }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ animation: "spin 8s linear infinite" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h1
              className="text-[28px] font-bold text-gray-900 tracking-tight leading-tight"
              style={{
                backgroundImage: "linear-gradient(135deg, #1f2937 0%, #4b5563 50%, #1f2937 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradient-pan 6s linear infinite",
              }}
            >
              {t.title}
            </h1>
            <p className="text-[15px] text-gray-400 mt-2 leading-relaxed max-w-[320px] mx-auto">
              {t.subtitle}
            </p>
          </FadeIn>

          {/* ── Card ── */}
          <FadeIn delay={250} direction="scale">
            {/* Gradient border wrapper */}
            <div
              className="rounded-[24px] p-[1px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,115,22,0.3) 50%, rgba(255,255,255,0.9) 100%)",
              }}
            >
              <div
                className="rounded-[23px] p-4 sm:p-6 relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  backdropFilter: "blur(40px) saturate(1.8)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                  boxShadow:
                    "0 0 0 0.5px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06), 0 12px 48px rgba(0,0,0,0.05)",
                }}
              >
                {/* Progress indicator */}
                <ProgressSteps
                  current={progressIdx}
                  labels={{
                    verify: t.stepVerify,
                    confirm: t.stepConfirm,
                    done: t.stepDone,
                  }}
                />

                {/* ─ Step: idle / loading / error ─ */}
                <AnimatedStep show={step === "idle" || step === "loading" || step === "error"}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-medium text-gray-500 mb-3 tracking-wide uppercase text-center">
                        {t.codeLabel}
                      </label>
                      <div
                        className="grid grid-cols-8 gap-1.5 sm:gap-2 max-w-[360px] mx-auto"
                        onPaste={handleOtpPaste}
                      >
                        {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                          const char = code[i] || "";
                          const isFocused = focusedIdx === i;
                          const isFilled = !!char;
                          return (
                            <div
                              key={i}
                              className="relative min-w-0"
                              style={{
                                animation: isFilled
                                  ? `char-pop 0.3s cubic-bezier(.16,1,.3,1) forwards`
                                  : undefined,
                              }}
                            >
                              <input
                                ref={(el) => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                maxLength={1}
                                value={char}
                                disabled={step === "loading"}
                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                onFocus={() => setFocusedIdx(i)}
                                onBlur={() => setFocusedIdx(-1)}
                                className="w-full aspect-[4/5] rounded-xl text-center text-[15px] sm:text-[20px] font-bold font-mono uppercase focus:outline-none transition-all duration-200 caret-transparent"
                                style={{
                                  background: isFilled
                                    ? "rgba(249,115,22,0.08)"
                                    : "rgba(0,0,0,0.03)",
                                  border: isFocused
                                    ? "2px solid #f97316"
                                    : isFilled
                                    ? "2px solid rgba(249,115,22,0.25)"
                                    : "2px solid rgba(0,0,0,0.06)",
                                  color: "#1f2937",
                                  boxShadow: isFocused
                                    ? "0 0 0 4px rgba(249,115,22,0.12), 0 0 20px rgba(249,115,22,0.2)"
                                    : "none",
                                  animation: isFocused
                                    ? "glow-pulse 2s ease-in-out infinite"
                                    : undefined,
                                }}
                              />
                              {!isFilled && !isFocused && (
                                <div
                                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                >
                                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {step === "error" && (
                      <div
                        className="flex items-start gap-3 bg-red-50/80 text-red-600 px-4 py-3.5 rounded-2xl text-[14px] leading-relaxed backdrop-blur-sm"
                        style={{ animation: "shake 0.5s ease-out" }}
                      >
                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        {errorMsg}
                      </div>
                    )}

                    <button
                      onClick={verificaCodice}
                      disabled={step === "loading" || code.length < CODE_LENGTH}
                      className="btn-shimmer w-full py-4 rounded-2xl text-white font-semibold text-[16px] tracking-tight transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
                      style={{
                        background:
                          step === "loading"
                            ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                            : "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                        backgroundSize: "200% 200%",
                        boxShadow:
                          step === "loading"
                            ? "none"
                            : code.length === CODE_LENGTH
                            ? "0 4px 16px rgba(249,115,22,0.35)"
                            : "none",
                        animation:
                          step !== "loading" && code.length === CODE_LENGTH
                            ? "gradient-shift 3s ease infinite"
                            : undefined,
                      }}
                    >
                      {step === "loading" ? (
                        <span className="flex items-center justify-center gap-3">
                          {t.verifying} <PulseLoader />
                        </span>
                      ) : (
                        t.verifyBtn
                      )}
                    </button>
                  </div>
                </AnimatedStep>

                {/* ─ Step: valid ─ */}
                <AnimatedStep show={step === "valid"}>
                  {codeInfo && (
                    <div className="space-y-5">
                      <FadeIn delay={50} direction="up">
                        <div className="flex items-center gap-3 bg-emerald-50/80 text-emerald-700 px-4 py-3.5 rounded-2xl text-[14px] font-medium backdrop-blur-sm">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          {t.validNotice}
                        </div>
                      </FadeIn>

                      <div className="bg-white/60 rounded-2xl px-5 py-1 divide-y divide-gray-100/80 backdrop-blur-sm">
                        <SummaryRow label={t.restaurant} value={codeInfo.restaurant_name} delay={100} />
                        <SummaryRow label={t.plan} value={codeInfo.plan} delay={160} />
                        <SummaryRow label={t.duration} value={`${codeInfo.access_duration_days} ${t.days}`} delay={220} />
                        <SummaryRow label={t.maxStaff} value={`${codeInfo.max_staff} ${t.people}`} delay={280} />
                        <SummaryRow
                          label={t.accessUntil}
                          value={formatDate(codeInfo.new_expiry)}
                          highlight
                          delay={340}
                        />
                      </div>

                      <FadeIn delay={400} direction="up">
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setStep("idle");
                              setCode("");
                              setCodeInfo(null);
                            }}
                            className="flex-1 py-3.5 rounded-2xl text-gray-500 font-medium text-[15px] transition-all duration-200 active:scale-[0.97] hover:bg-gray-100/60 hover:text-gray-700"
                            style={{
                              background: "rgba(0,0,0,0.03)",
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            {t.cancel}
                          </button>
                          <button
                            onClick={confermaRinnovo}
                            disabled={applying}
                            className="btn-shimmer flex-1 py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all duration-200 active:scale-[0.97] hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden"
                            style={{
                              background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
                              backgroundSize: "200% 200%",
                              boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
                              animation: "gradient-shift 3s ease infinite",
                            }}
                          >
                            {applying ? (
                              <span className="flex items-center justify-center gap-2">
                                {t.activating} <PulseLoader />
                              </span>
                            ) : (
                              t.confirmBtn
                            )}
                          </button>
                        </div>
                      </FadeIn>
                    </div>
                  )}
                </AnimatedStep>

                {/* ─ Step: success ─ */}
                <AnimatedStep show={step === "success"}>
                  {codeInfo && (
                    <div className="text-center space-y-5 py-2">
                      {/* Confetti — two waves */}
                      <div className="relative h-0">
                        {["#fb923c", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"].map(
                          (color, i) => (
                            <span
                              key={i}
                              className="absolute w-2 h-2 rounded-full"
                              style={{
                                background: color,
                                left: `${10 + i * 11}%`,
                                top: "-8px",
                                animation: `confetti-fall ${0.9 + i * 0.12}s ease-out ${i * 0.06}s forwards`,
                              }}
                            />
                          )
                        )}
                      </div>

                      <FadeIn delay={100} direction="scale" className="flex justify-center">
                        <div
                          className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center relative"
                          style={{
                            boxShadow: "0 0 0 1px rgba(34,197,94,0.15), 0 8px 32px rgba(34,197,94,0.15)",
                          }}
                        >
                          <AnimatedCheck />
                        </div>
                      </FadeIn>

                      <FadeIn delay={300} direction="up">
                        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
                          {t.successTitle}
                        </h2>
                        <p className="text-[15px] text-gray-400 mt-1.5 leading-relaxed">
                          <span className="font-semibold text-gray-600">{codeInfo.restaurant_name}</span>{" "}
                          {t.successSubtitle}{" "}
                          <span className="font-semibold text-orange-500">
                            {formatDate(codeInfo.new_expiry)}
                          </span>
                        </p>
                      </FadeIn>

                      <FadeIn delay={500} direction="up">
                        <button
                          onClick={() => router.push("/admin")}
                          className="btn-shimmer group w-full py-4 rounded-2xl text-white font-semibold text-[16px] tracking-tight transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] relative overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                          }}
                        >
                          {t.goToDashboard}
                          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </button>
                      </FadeIn>
                    </div>
                  )}
                </AnimatedStep>
              </div>
            </div>
          </FadeIn>

          {/* ── Footer ── */}
          <FadeIn delay={450} direction="up">
            <p className="text-center text-[12px] text-gray-400 mt-6 tracking-wide">
              {t.footerProblem}{" "}
              <a
                href={`mailto:SOSTITUISCI@EMAIL.COM?subject=${encodeURIComponent(t.mailtoSubject)}`}
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
