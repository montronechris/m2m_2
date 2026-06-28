// src/app/rinnova/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Step = "idle" | "loading" | "valid" | "success" | "error";

interface CodeInfo {
  id: string;
  plan: string;
  access_duration_days: number;
  max_staff: number;
  restaurant_id: string;
  restaurant_name: string;
  new_expiry: Date;
}

// ─── Animated wrapper ───
function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale" | "none";
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const transforms: Record<string, string> = {
    up: "translateY(24px)",
    down: "translateY(-24px)",
    left: "translateX(24px)",
    right: "translateX(-24px)",
    scale: "scale(0.92)",
    none: "none",
  };

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Animated step container (handles exit) ───
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
      requestAnimationFrame(() => setAnimClass("step-enter"));
    } else {
      setAnimClass("step-exit");
      const t = setTimeout(() => setRender(false), 500);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!render) return null;
  return <div className={animClass}>{children}</div>;
}

// ─── Pulse dot for loading ───
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

// ─── Animated check ───
function AnimatedCheck() {
  return (
    <svg
      className="w-10 h-10"
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
  );
}

// ─── Floating particles ───
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${8 + i * 6}px`,
            height: `${8 + i * 6}px`,
            background: `rgba(251,146,60,${0.08 + i * 0.02})`,
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float-particle ${5 + i * 1.5}s ease-in-out ${i * 0.8}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Summary row ───
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
      <div className="flex justify-between items-center py-3">
        <span className="text-[15px] text-gray-400 tracking-tight">{label}</span>
        <span
          className={`text-[15px] font-semibold tracking-tight ${
            highlight ? "text-orange-500" : "text-gray-900"
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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const CODE_LENGTH = 8;

  useEffect(() => setMounted(true), []);

  // OTP input handlers
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
        not_found: "Codice non trovato. Controlla e riprova.",
        already_used: "Questo codice è già stato utilizzato.",
        expired: "Questo codice è scaduto. Contatta il gestore del servizio.",
        not_renewal: "Questo codice è valido solo per la registrazione, non per un rinnovo.",
      };
      setErrorMsg(messages[error] || "Errore nella verifica. Riprova.");
      setStep("error");
      return;
    }

    const invite = await res.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Devi essere autenticato per rinnovare l'abbonamento.");
      setStep("error");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || !profile.restaurant_id) {
      setErrorMsg("Non sei autorizzato a rinnovare l'abbonamento.");
      setStep("error");
      return;
    }

    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, access_expires_at, status")
      .eq("id", profile.restaurant_id)
      .single();

    if (restError || !restaurant) {
      setErrorMsg("Errore nel recupero del tuo ristorante.");
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
  }, [code]);

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
          ? "Questo codice è già stato utilizzato."
          : "Errore durante il rinnovo. Riprova tra qualche istante."
      );
      setStep("error");
      setApplying(false);
      return;
    }

    setApplying(false);
    setStep("success");
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <>
      {/* ── Global keyframes ── */}
      <style jsx global>{`
        @keyframes float-particle {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(12px, -18px) rotate(180deg); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
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
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(40px) rotate(360deg); opacity: 0; }
        }
        @keyframes char-pop {
          0% { transform: scale(0.6); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .step-enter {
          animation: step-in 0.55s cubic-bezier(.16,1,.3,1) forwards;
        }
        .step-exit {
          animation: step-out 0.4s cubic-bezier(.5,0,.7,1) forwards;
        }
        @keyframes step-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: none; }
        }
        @keyframes step-out {
          from { opacity: 1; transform: none; }
          to { opacity: 0; transform: translateY(-12px) scale(0.97); }
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
          {/* ── Header ── */}
          <FadeIn delay={100} direction="up" className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] mb-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                backgroundSize: "200% 200%",
                animation: "gradient-shift 4s ease infinite",
                boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
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
            <h1 className="text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
              Rinnova Abbonamento
            </h1>
            <p className="text-[15px] text-gray-400 mt-2 leading-relaxed max-w-[320px] mx-auto">
              Inserisci il codice ricevuto per continuare a utilizzare il servizio
            </p>
          </FadeIn>

          {/* ── Card ── */}
          <FadeIn delay={250} direction="scale">
            <div
              className="rounded-[20px] p-4 sm:p-6 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(40px) saturate(1.8)",
                WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow:
                  "0 0 0 0.5px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06), 0 12px 48px rgba(0,0,0,0.04)",
              }}
            >
              {/* ─ Step: idle / loading / error ─ */}
              <AnimatedStep show={step === "idle" || step === "loading" || step === "error"}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-500 mb-3 tracking-wide uppercase text-center">
                      Codice di rinnovo
                    </label>
                    <div className="grid grid-cols-8 gap-1.5 sm:gap-2 max-w-[360px] mx-auto" onPaste={handleOtpPaste}>
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
                                  ? "0 0 0 4px rgba(249,115,22,0.12)"
                                  : "none",
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
                    className="w-full py-4 rounded-2xl text-white font-semibold text-[16px] tracking-tight transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 relative overflow-hidden"
                    style={{
                      background:
                        step === "loading"
                          ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                          : "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)",
                      boxShadow:
                        step === "loading"
                          ? "none"
                          : code.length === CODE_LENGTH
                          ? "0 4px 16px rgba(249,115,22,0.35)"
                          : "none",
                    }}
                  >
                    {step === "loading" ? (
                      <span className="flex items-center justify-center gap-3">
                        Verifica in corso <PulseLoader />
                      </span>
                    ) : (
                      "Verifica codice"
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
                        Codice valido — controlla il riepilogo
                      </div>
                    </FadeIn>

                    <div className="bg-white/60 rounded-2xl px-5 py-1 divide-y divide-gray-100/80 backdrop-blur-sm">
                      <SummaryRow label="Ristorante" value={codeInfo.restaurant_name} delay={100} />
                      <SummaryRow label="Piano" value={codeInfo.plan} delay={160} />
                      <SummaryRow label="Durata" value={`${codeInfo.access_duration_days} giorni`} delay={220} />
                      <SummaryRow label="Staff max" value={`${codeInfo.max_staff} persone`} delay={280} />
                      <SummaryRow
                        label="Accesso fino al"
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
                          className="flex-1 py-3.5 rounded-2xl text-gray-500 font-medium text-[15px] transition-all duration-200 active:scale-[0.97] hover:bg-gray-100/60"
                          style={{
                            background: "rgba(0,0,0,0.03)",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          Annulla
                        </button>
                        <button
                          onClick={confermaRinnovo}
                          disabled={applying}
                          className="flex-1 py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all duration-200 active:scale-[0.97] disabled:opacity-50 relative overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
                            boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
                          }}
                        >
                          {applying ? (
                            <span className="flex items-center justify-center gap-2">
                              Attivazione <PulseLoader />
                            </span>
                          ) : (
                            "Conferma rinnovo"
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
                    {/* Confetti */}
                    <div className="relative h-0">
                      {["#fb923c", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"].map(
                        (color, i) => (
                          <span
                            key={i}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                              background: color,
                              left: `${15 + i * 13}%`,
                              top: "-8px",
                              animation: `confetti-fall ${0.8 + i * 0.15}s ease-out ${i * 0.08}s forwards`,
                            }}
                          />
                        )
                      )}
                    </div>

                    <FadeIn delay={100} direction="scale" className="flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                        <AnimatedCheck />
                      </div>
                    </FadeIn>

                    <FadeIn delay={300} direction="up">
                      <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
                        Abbonamento rinnovato
                      </h2>
                      <p className="text-[15px] text-gray-400 mt-1.5 leading-relaxed">
                        <span className="font-semibold text-gray-600">{codeInfo.restaurant_name}</span>{" "}
                        è attivo fino al{" "}
                        <span className="font-semibold text-orange-500">
                          {formatDate(codeInfo.new_expiry)}
                        </span>
                      </p>
                    </FadeIn>

                    <FadeIn delay={500} direction="up">
                      <button
                        onClick={() => router.push("/admin")}
                        className="w-full py-4 rounded-2xl text-white font-semibold text-[16px] tracking-tight transition-all duration-300 active:scale-[0.98]"
                        style={{
                          background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                        }}
                      >
                        Vai alla dashboard
                        <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </button>
                    </FadeIn>
                  </div>
                )}
              </AnimatedStep>
            </div>
          </FadeIn>

          {/* ── Footer ── */}
          <FadeIn delay={450} direction="up">
            <p className="text-center text-[12px] text-gray-400 mt-6 tracking-wide">
              Problemi con il codice?{" "}
              <a
                href="mailto:SOSTITUISCI@EMAIL.COM?subject=Problema%20codice%20rinnovo%20M2M"
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