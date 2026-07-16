// src/app/(client)/status/[sessionId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import {
  Clock, Loader2, ChefHat, CheckCircle, Utensils, Bell, ArrowRight, UtensilsCrossed, ChevronRight, Ban, X,
} from "lucide-react";
import type { Palette } from "@/components/client/order/palette";

import { getTableSession } from "@/lib/table-session";
import { useCartStore } from "@/stores/useCartStore";
import { useI18n } from "@/components/i18n/I18nProvider";
import EndScreenExperience from "@/components/client/order/EndScreenExperience";
import { setEndScreenActive } from "@/lib/end-screen-signal";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── TYPES ────────────────────────────────────────────────────────────────────

type CartCustomization = {
  optionId:           string;
  optionName:         string;
  choiceId:           string;
  choiceName:         string;
  priceModifierCents: number;
};

type OrderItem = {
  id:             string;
  menu_item_id:   string;
  name:           string;
  quantity:       number;
  note:           string;
  portata:        number;
  image_url:      string | null;
  customizations: CartCustomization[];
  delivered_at?:  string | null;
  picked_up_at?:  string | null;
  portata_delivered?: boolean;
};

type Order = {
  id:            string;
  table_id:      string | null;
  status:        "confirmed" | "pending" | "cooking" | "ready" | "served" | "completed";
  total_cents:   number;
  notes:         string | null;
  created_at:    string;
  updated_at:    string;
  confirmed_at:  string | null;
  _displayTime?: string;
  table_number:  string | null;
  items:         OrderItem[];
};

type TabKey = "attesa" | "cucina" | "pronti";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatElapsed = (dateStr: string) => {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1)  return "Adesso";
  if (mins < 60) return `${mins}m fa`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m fa`;
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

const formatPrice = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");

const shortId = (id: string) => id.slice(-4).toUpperCase();

// Brand color → rgba
const brandAlpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// Mix two hex colors
const mixHex = (h1: string, h2: string, t: number) => {
  const p = (h: string) => { const x = h.replace("#",""); return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)]; };
  const [r1,g1,b1] = p(h1), [r2,g2,b2] = p(h2);
  return "#"+[r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t].map(v => Math.round(v).toString(16).padStart(2,"0")).join("");
};

// ─── STATUS STEP MODEL ────────────────────────────────────────────────────────

type StepIdx = 0 | 1 | 2 | 3;

const STATUS_TO_STEP: Record<string, StepIdx> = {
  confirmed: 0,
  pending:   0,
  cooking:   1,
  ready:     2,
  served:    3,
  completed: 3,
};

function getStatusLabel(tS: any): Record<string, string> { return {
  confirmed: tS.waiting,
  pending:   tS.waiting,
  cooking:   tS.inPreparation,
  ready:     tS.inDelivery,
  served:    tS.served,
  completed: tS.completed,
}; }

function getStatusEta(tS: any): Record<string, string> { return {
  confirmed: tS.etaPending,
  pending:   tS.etaPending,
  cooking:   tS.etaCooking,
  ready:     tS.etaReady,
  completed: tS.etaServed,
}; }

function getStepMeta(tS: any): {
  idx: StepIdx;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}[] {
  return [
    { idx: 0, label: tS.orderConfirmed,  desc: tS.paymentConfirmed,   Icon: CheckCircle },
    { idx: 1, label: tS.inPreparation,   desc: tS.kitchenCooking,     Icon: ChefHat },
    { idx: 2, label: tS.inDelivery,      desc: tS.waiterArriving,     Icon: Bell },
    { idx: 3, label: tS.served,          desc: tS.enjoyMeal,          Icon: Utensils },
  ];
}

function deriveCurrentStep(orders: Order[]): StepIdx {
  if (orders.length === 0) return 0;
  const mostAdvanced = [...orders].sort(
    (a, b) => (STATUS_TO_STEP[b.status] ?? 0) - (STATUS_TO_STEP[a.status] ?? 0)
  )[0];
  return (STATUS_TO_STEP[mostAdvanced.status] ?? 0) as StepIdx;
}

// ─── COLOR HELPERS ────────────────────────────────────────────────────────────

function themeTokens(isDark: boolean) {
  return isDark
    ? {
        pageBg:        "#0c0a09",
        surface:       "#161412",
        surfaceAlt:    "#1c1917",
        surfaceSoft:   "rgba(255,255,255,0.04)",
        ink:           "#f5f5f4",
        inkMuted:      "#a8a29e",
        inkSoft:       "#78716c",
        border:        "rgba(255,255,255,0.06)",
        borderSoft:    "rgba(255,255,255,0.05)",
        chipBg:        "rgba(255,255,255,0.06)",
        chipBorder:    "rgba(255,255,255,0.08)",
        cardShadow:    "0 4px 24px -8px rgba(0,0,0,0.6)",
        cardShadowLg:  "0 16px 48px -12px rgba(0,0,0,0.7)",
        blobOpacity:   0.25,
      }
    : {
        pageBg:        undefined as string | undefined,
        surface:       "#ffffff",
        surfaceAlt:    "#fafaf9",
        surfaceSoft:   "rgba(0,0,0,0.02)",
        ink:           "#1c1917",
        inkMuted:      "#57534e",
        inkSoft:       "#a8a29e",
        border:        "rgba(0,0,0,0.06)",
        borderSoft:    "rgba(0,0,0,0.04)",
        chipBg:        "rgba(0,0,0,0.03)",
        chipBorder:    "rgba(0,0,0,0.06)",
        cardShadow:    "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px -8px rgba(28,25,23,0.08)",
        cardShadowLg:  "0 4px 16px -4px rgba(28,25,23,0.06), 0 24px 48px -16px rgba(28,25,23,0.12)",
        blobOpacity:   0.55,
      };
}

// ─── HERO CARD ────────────────────────────────────────────────────────────────

function HeroCard({
  currentStep,
  orders,
  brand,
  isDark,
  restaurantName,
  avgMinutes,
  activePortataNum,
  activePortataStartedAt,
  tick,
}: {
  currentStep: StepIdx;
  orders: Order[];
  brand: string;
  isDark: boolean;
  restaurantName: string | null;
  avgMinutes: number | null;
  activePortataNum?: number | null;
  activePortataStartedAt?: string | null;
  tick?: number;
}) {
  const { tr } = useI18n();
  const tS = tr.client.status;
  const STATUS_LABEL_LOC = getStatusLabel(tS);
  const STATUS_ETA_LOC = getStatusEta(tS);
  const mostAdvanced = orders.length > 0
    ? [...orders].sort((a, b) => (STATUS_TO_STEP[b.status] ?? 0) - (STATUS_TO_STEP[a.status] ?? 0))[0]
    : null;

  const etaFallback = mostAdvanced ? STATUS_ETA_LOC[mostAdvanced.status] : "—";
  const remainingMinutes = (() => {
    if (avgMinutes === null || !activePortataStartedAt) return null;
    const elapsed = Math.floor((Date.now() - new Date(activePortataStartedAt).getTime()) / 60000);
    const remaining = avgMinutes - elapsed;
    return remaining > 0 ? remaining : null;
  })();
  const eta = mostAdvanced && mostAdvanced.status !== "completed" && mostAdvanced.status !== "ready"
    ? (remainingMinutes !== null ? `~${remainingMinutes} min` : (avgMinutes !== null ? tS.arriving : etaFallback))
    : etaFallback;
  const statusLabel = mostAdvanced ? STATUS_LABEL_LOC[mostAdvanced.status] : tS.waiting;
  const isCompleted = currentStep === 3;

  const brandDark = mixHex(brand, "#000000", 0.35);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="mx-4 mb-5 mt-4 overflow-hidden rounded-[28px] relative"
      style={{
        background: `linear-gradient(135deg, ${brand} 0%, ${mixHex(brand, "#000000", 0.15)} 100%)`,
        boxShadow: `0 24px 60px -16px ${brandAlpha(brand, 0.55)}, 0 4px 16px -4px rgba(0,0,0,0.1)`,
      }}
    >
      {/* Pattern decorativo */}
      <div aria-hidden style={{
        position: "absolute", top: -60, right: -40,
        width: 180, height: 180, borderRadius: "50%",
        background: "rgba(255,255,255,0.14)", filter: "blur(50px)", pointerEvents: "none",
      }} />
      <div aria-hidden style={{
        position: "absolute", bottom: -40, left: -30,
        width: 120, height: 120, borderRadius: "50%",
        background: "rgba(0,0,0,0.12)", filter: "blur(40px)", pointerEvents: "none",
      }} />

      <div className="relative px-5 pt-5 pb-5">
        {/* Header row: LIVE chip + time */}
        <div className="mb-4 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
            style={{ background: "rgba(255,255,255,0.22)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#6ee7b7",
              display: "inline-block",
              boxShadow: "0 0 8px #6ee7b7, 0 0 4px #6ee7b7",
              animation: "livePulse 1.8s ease-in-out infinite",
            }} />
            Live
          </motion.span>
          {mostAdvanced && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(mostAdvanced._displayTime || mostAdvanced.created_at)}
            </motion.span>
          )}
        </div>

        {/* Main content: ETA + icon */}
        <div className="flex items-end justify-between gap-3">
          <div style={{ overflow: "hidden", flex: 1 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={isCompleted ? "completato" : activePortataNum != null ? `avanzamento-${activePortataNum}` : "stimato"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
              >
                {isCompleted ? tS.completedTitle : activePortataNum != null ? `${tS.progressCourse} ${activePortataNum}` : tS.estimatedTime}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={eta}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  color: "#fff",
                  fontSize: 38,
                  fontWeight: 800,
                  lineHeight: 0.95,
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "-0.04em",
                  textShadow: "0 2px 16px rgba(0,0,0,0.18)",
                }}
              >
                {eta}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={statusLabel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 6, fontWeight: 500 }}
              >
                {statusLabel}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Icon circle */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: 56, height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              border: "2px solid rgba(255,255,255,0.4)",
              backdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 8px 24px -4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.4, rotate: 30 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {isCompleted
                  ? <CheckCircle style={{ width: 28, height: 28, color: "#fff" }} />
                  : currentStep === 2
                  ? <Bell style={{ width: 28, height: 28, color: "#fff" }} />
                  : currentStep === 1
                  ? <ChefHat style={{ width: 28, height: 28, color: "#fff" }} />
                  : <Clock style={{ width: 28, height: 28, color: "#fff" }} />
                }
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 4-step segmented progress */}
        <div style={{ marginTop: 18, display: "flex", gap: 6 }}>
          {[0, 1, 2, 3].map(step => {
            const isActive = step <= currentStep;
            const isCurrent = step === currentStep;
            return (
              <div key={step} style={{ flex: 1, position: "relative", height: 8 }}>
                {/* Track */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 4, overflow: "hidden",
                }} />
                {/* Fill */}
                <motion.div
                  initial={false}
                  animate={{
                    width: isActive ? "100%" : "0%",
                    opacity: isActive ? 1 : 0,
                  }}
                  transition={{ duration: 0.5, delay: step * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: "absolute", inset: 0,
                    background: isCurrent
                      ? "linear-gradient(90deg, #fff, rgba(255,255,255,0.85))"
                      : "#fff",
                    borderRadius: 4,
                    boxShadow: isActive ? "0 0 12px rgba(255,255,255,0.5)" : "none",
                  }}
                />
                {/* Pulse dot on current */}
                {isCurrent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    style={{
                      position: "absolute", right: -3, top: -3,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 0 0 3px rgba(255,255,255,0.3), 0 0 12px rgba(255,255,255,0.6)",
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: "#fff",
                      }}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step labels */}
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          {["1", "2", "3", "4"].map((_, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                color: i <= currentStep ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}>
                {i === 0 ? tS.waiting : i === 1 ? tS.inPreparation : i === 2 ? tS.inDelivery : tS.served}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── PROGRESS STEPS (vertical list) ──────────────────────────────────────────

function ProgressSteps({
  currentStep,
  orders,
  brand,
  isDark,
}: {
  currentStep: StepIdx;
  orders: Order[];
  brand: string;
  isDark: boolean;
}) {
  const t = themeTokens(isDark);
  const { tr } = useI18n();
  const tS = tr.client.status;
  const STEP_META = getStepMeta(tS);

  const stepTime: Partial<Record<StepIdx, string>> = {};
  for (const o of orders) {
    const s = STATUS_TO_STEP[o.status];
    const ts = o._displayTime || o.created_at;
    if (!stepTime[s] || new Date(ts) > new Date(stepTime[s]!)) {
      stepTime[s] = ts;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="mx-4 mb-3 overflow-hidden rounded-[24px] px-5 pt-5 pb-2"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <motion.p
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ color: t.inkMuted, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 10, fontWeight: 700 }}
        >
          Avanzamento
        </motion.p>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          style={{
            fontSize: 10, fontWeight: 700, color: brand,
            background: brandAlpha(brand, 0.1),
            padding: "3px 8px", borderRadius: 20,
            border: `1px solid ${brandAlpha(brand, 0.2)}`,
          }}
        >
          {currentStep + 1}/4
        </motion.span>
      </div>

      <ol>
        {STEP_META.map(({ idx, label, desc, Icon }, i) => {
          const isDone    = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isPending = idx > currentStep;
          const isLast    = i === STEP_META.length - 1;

          return (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-3.5"
              style={{ position: "relative", paddingBottom: isLast ? 4 : 24 }}
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 15,
                    top: 32,
                    bottom: 4,
                    width: 2,
                    background: isDone
                      ? `linear-gradient(180deg, ${brand}, ${brandAlpha(brand, 0.3)})`
                      : isDark ? "#2a2520" : "#f0ede8",
                    borderRadius: 1,
                  }}
                  aria-hidden
                />
              )}

              {/* Step circle */}
              <motion.div
                animate={{ scale: isCurrent ? 1.05 : 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: 32, height: 32,
                  borderRadius: "50%",
                  background: isDone || isCurrent
                    ? `linear-gradient(135deg, ${brand}, ${mixHex(brand, "#000000", 0.25)})`
                    : isDark ? "#2a2520" : "#f5f5f4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  zIndex: 1,
                  boxShadow: (isDone || isCurrent)
                    ? `0 6px 18px -4px ${brandAlpha(brand, 0.5)}, 0 0 0 4px ${brandAlpha(brand, 0.12)}, inset 0 1px 0 rgba(255,255,255,0.25)`
                    : `inset 0 1px 2px rgba(0,0,0,0.04)`,
                  transition: "background 0.3s, box-shadow 0.3s",
                  border: isDone || isCurrent ? "none" : `1px solid ${t.border}`,
                }}
              >
                {isDone
                  ? <CheckCircle style={{ width: 16, height: 16, color: "#fff" }} />
                  : <Icon style={{ width: 15, height: 15, color: isCurrent ? "#fff" : t.inkSoft }} />
                }

                {/* Pulse ring on current */}
                {isCurrent && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      position: "absolute", inset: -2, borderRadius: "50%",
                      border: `2px solid ${brand}`,
                    }}
                  />
                )}
              </motion.div>

              {/* Text */}
              <div className="flex-1" style={{ paddingTop: 3 }}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: isCurrent ? 700 : 600,
                      color: isPending ? t.inkSoft : t.ink,
                      fontFamily: "'Space Grotesk', sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(isDone || isCurrent) && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.25 + i * 0.08 }}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: isDone ? brandAlpha(brand, 0.12) : brandAlpha(brand, 0.15),
                          color: isDone ? mixHex(brand, "#000000", 0.2) : brand,
                          border: `1px solid ${brandAlpha(brand, isDone ? 0.25 : 0.3)}`,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {isDone ? `✓ ${tS.completed}` : tS.badgeInProgress}
                      </motion.span>
                    )}
                    {stepTime[idx] && !isPending && (
                      <span style={{ fontSize: 11, color: t.inkSoft, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                        {formatTime(stepTime[idx]!)}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: t.inkSoft, marginTop: 2, lineHeight: 1.45 }}>
                  {desc}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.div>
  );
}

// ─── ORDER SUMMARY CARD ───────────────────────────────────────────────────────

function OrderSummaryCard({
  orders,
  brand,
  isDark,
  sessionId,
  activePortataNum,
}: {
  orders: Order[];
  brand: string;
  isDark: boolean;
  sessionId: string;
  activePortataNum?: number | null;
}) {
  const t = themeTokens(isDark);
  const { tr } = useI18n();
  const tS = tr.client.status;
  const [expanded, setExpanded] = React.useState(false);
  const cartDetailRef = React.useRef<HTMLDivElement>(null);
  const cartDetailHeight = useMotionValue(0);

  const totalCents = orders.reduce((s, o) => s + o.total_cents, 0);
  const allItems   = orders.flatMap(o => o.items);
  const totalQty   = allItems.reduce((s, i) => s + i.quantity, 0);

  const portateNums = [...new Set(allItems.map(i => i.portata ?? 1))].sort((a, b) => a - b);

  type PortataStatus = "cooking" | "waiting" | "queued" | "done";

  const isPortataDone = (num: number) => {
    if (activePortataNum != null) return num < activePortataNum;
    const items = allItems.filter(i => (i.portata ?? 1) === num);
    return items.every(i => i.delivered_at);
  };

  // Solo la prossima portata non ancora pronta (e non in cottura) è "in attesa";
  // tutte le altre non ancora pronte sono "in coda" finché non tocca a loro.
  const nextWaitingNum = portateNums.find(
    num => !isPortataDone(num) && num !== activePortataNum
  );

  const getPortataStatus = (num: number): PortataStatus => {
    if (isPortataDone(num)) return "done";
    if (activePortataNum != null && num === activePortataNum) return "cooking";
    return num === nextWaitingNum ? "waiting" : "queued";
  };

  const STATUS_ORDER: Record<PortataStatus, number> = { cooking: 0, waiting: 1, queued: 2, done: 3 };

  const sortedPortate = [...portateNums].sort((a, b) => {
    const sa = STATUS_ORDER[getPortataStatus(a)];
    const sb = STATUS_ORDER[getPortataStatus(b)];
    return sa !== sb ? sa - sb : a - b;
  });

  const COOKING_LABEL = tS.inPreparation;
  const WAITING_LABEL = tS.waiting;
  const QUEUED_LABEL  = tS.queued;
  const DONE_LABEL    = tS.concluded;

  const statusMeta = (s: PortataStatus, pNum: number) => {
    if (s === "cooking") return {
      label: COOKING_LABEL,
      accent: brand,
      dotAnim: true,
      headerBg: brandAlpha(brand, 0.08),
      headerBorder: brandAlpha(brand, 0.18),
      headerText: brand,
      itemOpacity: 1,
      icon: "🔥",
    };
    if (s === "waiting") return {
      label: WAITING_LABEL,
      accent: "#f59e0b",
      dotAnim: false,
      headerBg: "rgba(245,158,11,0.08)",
      headerBorder: "rgba(245,158,11,0.18)",
      headerText: "#b45309",
      itemOpacity: 1,
      icon: "⏳",
    };
    if (s === "queued") return {
      label: QUEUED_LABEL,
      accent: "#94a3b8",
      dotAnim: false,
      headerBg: "rgba(148,163,184,0.08)",
      headerBorder: "rgba(148,163,184,0.18)",
      headerText: "#475569",
      itemOpacity: 1,
      icon: "•",
    };
    return {
      label: DONE_LABEL,
      accent: "#10b981",
      dotAnim: false,
      headerBg: "rgba(16,185,129,0.08)",
      headerBorder: "rgba(16,185,129,0.18)",
      headerText: "#047857",
      itemOpacity: 0.6,
      icon: "✓",
    };
  };

  const thumbSource = activePortataNum != null
    ? allItems.filter(i => (i.portata ?? 1) === activePortataNum)
    : allItems;
  const thumbItems = thumbSource.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, z: 0.01 }}
      animate={{ opacity: 1, y: 0, z: 0.01 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.45, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 left-0 right-0 z-30 rounded-t-[28px]"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        boxShadow: "0 -12px 40px -8px rgba(0,0,0,0.14), 0 -4px 12px -4px rgba(0,0,0,0.06)",
        overflow: "visible",
        cursor: "grab",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* Filler */}
      <div style={{
        position: "absolute",
        top: "100%",
        left: -1, right: -1,
        height: 300,
        background: t.surface,
        borderLeft: `1px solid ${t.border}`,
        borderRight: `1px solid ${t.border}`,
      }} />

      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${brandAlpha(brand, 0.4)}, transparent)`,
      }} />

      {/* Drag handle */}
      <div
        className="flex justify-center cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ padding: "14px 0 8px" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const startY = e.clientY
          const startH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
          const base = expanded ? startH : 0

          const onMove = (ev: PointerEvent) => {
            const delta = startY - ev.clientY
            const next = Math.max(0, Math.min(startH, base + delta))
            cartDetailHeight.set(next)
          }
          const onUp = (ev: PointerEvent) => {
            const delta = startY - ev.clientY
            const fullH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
            const threshold = fullH * 0.35
            if (!expanded && delta > threshold) {
              setExpanded(true)
              animate(cartDetailHeight, fullH, { type: "spring", stiffness: 400, damping: 35 })
            } else if (expanded && delta < -threshold) {
              setExpanded(false)
              animate(cartDetailHeight, 0, { type: "spring", stiffness: 400, damping: 35 })
            } else {
              animate(cartDetailHeight, expanded ? fullH : 0, { type: "spring", stiffness: 400, damping: 35 })
            }
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
          }
          window.addEventListener("pointermove", onMove)
          window.addEventListener("pointerup", onUp)
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }} />
      </div>

      {/* Header */}
      <button
        onClick={() => {
          const next = !expanded
          setExpanded(next)
          const fullH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
          animate(cartDetailHeight, next ? fullH : 0, { type: "spring", stiffness: 400, damping: 35 })
        }}
        className="flex w-full items-center justify-between px-5 pb-3 pt-1"
      >
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: brandAlpha(brand, 0.12),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Utensils style={{ width: 14, height: 14, color: brand }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.ink, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>{tS.yourOrder}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{
            fontSize: 11, fontWeight: 600, color: t.inkMuted,
            background: t.chipBg, padding: "4px 10px", borderRadius: 20,
            border: `1px solid ${t.chipBorder}`,
            fontVariantNumeric: "tabular-nums",
          }}>
            {totalQty} {totalQty === 1 ? tS.itemSingular : tS.itemPlural} · € {formatPrice(totalCents)}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: t.chipBg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={t.inkMuted} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* Thumbnails */}
      <AnimatePresence initial={false}>
        {!expanded && (
        <motion.div
          key="thumbnails"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: "hidden" }}
        >
        <div className="flex items-center gap-2 px-5 pb-4" style={{ touchAction: "none", pointerEvents: "none" }}>
          {thumbItems.map((item, i) => (
            <motion.div
              key={`${item.id}-thumb-${i}`}
              initial={{ opacity: 0, scale: 0.7, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.06 }}
              style={{
                position: "relative",
                width: 50, height: 50, borderRadius: 14, overflow: "hidden",
                background: `linear-gradient(135deg, ${brandAlpha(brand, 0.15)}, ${brandAlpha(brand, 0.05)})`,
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${brandAlpha(brand, 0.2)}`,
                boxShadow: `0 4px 12px -2px ${brandAlpha(brand, 0.2)}`,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, color: brand, fontFamily: "'Space Grotesk', sans-serif" }}>{item.name?.trim()?.charAt(0)?.toUpperCase() || "?"}</span>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </motion.div>
          ))}
          {thumbSource.length > 4 && (
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: t.surfaceSoft, border: `1px solid ${t.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: t.inkMuted,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              +{thumbSource.length - 4}
            </div>
          )}
        </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Portate list */}
      <motion.div style={{ height: cartDetailHeight, overflow: "hidden", maxHeight: "60vh", overflowY: "auto" }}>
        <div ref={cartDetailRef} className="pb-6 pt-1">
          {sortedPortate.map((pNum, gi) => {
            const status = getPortataStatus(pNum);
            const meta = statusMeta(status, pNum);
            const items = allItems.filter(i => (i.portata ?? 1) === pNum);

            return (
              <div key={pNum} style={{ marginBottom: gi < sortedPortate.length - 1 ? 12 : 0 }}>
                <div
                  className="mx-5 flex items-center justify-between rounded-2xl px-3.5 py-2.5"
                  style={{
                    background: meta.headerBg,
                    border: `1px solid ${meta.headerBorder}`,
                    marginBottom: 4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 13 }}>{meta.icon}</span>
                    {status === "cooking" && (
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: brand, display: "inline-block", flexShrink: 0,
                        boxShadow: `0 0 8px ${brand}`,
                        animation: "livePulse 1.8s ease-in-out infinite",
                      }} />
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.headerText, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {portateNums.length > 1 ? `Portata ${pNum} · ` : ""}{meta.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: meta.headerText, opacity: 0.7, fontWeight: 600 }}>
                    {items.reduce((s, i) => s + i.quantity, 0)} pz
                  </span>
                </div>

                {items.map((item, ii) => (
                  <motion.div
                    key={`${item.id}-${ii}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: meta.itemOpacity, x: 0 }}
                    transition={{ duration: 0.3, delay: ii * 0.04 }}
                    className="flex items-center justify-between px-5 py-2.5"
                    style={{
                      borderTop: ii === 0 ? "none" : `1px solid ${t.borderSoft}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div style={{
                        position: "relative",
                        width: 36, height: 36, borderRadius: 10, overflow: "hidden",
                        flexShrink: 0, background: `linear-gradient(135deg, ${brandAlpha(brand, 0.12)}, ${brandAlpha(brand, 0.04)})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1px solid ${brandAlpha(brand, 0.15)}`,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: brand, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {item.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span style={{ fontSize: 13, fontWeight: 600, color: t.ink }} className="truncate block">
                          {item.name}
                        </span>
                        <span style={{ fontSize: 11, color: t.inkSoft }}>×{item.quantity}</span>
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontWeight: 700,
                      background: meta.accent === brand ? brandAlpha(brand, 0.12) : `${meta.accent}1a`,
                      color: meta.accent === brand ? brand : meta.accent,
                      border: `1px solid ${meta.accent === brand ? brandAlpha(brand, 0.25) : `${meta.accent}35`}`,
                      borderRadius: 20, padding: "3px 10px",
                      flexShrink: 0, marginLeft: 8,
                      letterSpacing: "0.02em",
                    }}>
                      {meta.dotAnim && (
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: meta.accent, display: "inline-block",
                          boxShadow: `0 0 6px ${meta.accent}`,
                          animation: "livePulse 1.8s ease-in-out infinite",
                        }} />
                      )}
                      {meta.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── COMANDA CARD ─────────────────────────────────────────────────────────────

function Comanda({
  order,
  tick,
  isDark,
  brand,
  restaurantLogo,
  sessionId,
  onCancelled,
}: {
  order: Order;
  tick: number;
  isDark: boolean;
  brand: string;
  restaurantLogo?: string | null;
  sessionId?: string;
  onCancelled?: () => void;
}) {
  const t = themeTokens(isDark);
  const { tr } = useI18n();
  const tS = tr.client.status;
  const displayTime = order._displayTime || order.created_at;
  const isPending = order.status === "confirmed" || order.status === "pending";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";

  // Annullamento ordine: possibile SOLO finché non è in preparazione (isPending).
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancelOrder = async () => {
    if (cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId ?? null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCancelError(data?.error || tS.cancelError);
        setCancelling(false);
        return;
      }
      // Success: l'ordine sparirà al prossimo refresh (cancelled non è tra gli attivi).
      onCancelled?.();
    } catch {
      setCancelError(tS.cancelError);
      setCancelling(false);
    }
  };

  const accent =
    isPending ? "#f59e0b" :
    isCooking ? "#3b82f6" :
                "#22c55e";
  const accentSoft = `${accent}14`;
  const accentBorder = `${accent}33`;
  const statusLabel =
    isPending ? tS.waiting :
    isCooking ? tS.cooking :
                tS.ready;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[24px]"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${brand} 80%)` }} />

      <div
        className="flex items-center justify-between gap-3 px-5 py-3.5"
        style={{ borderBottom: `1px solid ${t.borderSoft}` }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-black tracking-wider"
            style={{
              background: accentSoft, color: accent,
              border: `1px solid ${accentBorder}`,
              fontFamily: "'Courier New', monospace",
            }}
          >
            #{shortId(order.id)}
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight flex items-center gap-1.5" style={{ color: t.ink, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
              {restaurantLogo ? (
                <span className="inline-block h-5 w-5 shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5">
                  <img src={restaurantLogo} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
              )}
              Tavolo {order.table_number ?? "—"}
            </p>
            <p className="text-[11px]" style={{ color: t.inkSoft }}>{formatElapsed(displayTime)}</p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ background: accentSoft, color: accent, border: `1px solid ${accentBorder}` }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, display: "inline-block", boxShadow: `0 0 6px ${accent}`, animation: "livePulse 1.8s ease-in-out infinite" }} />
          {statusLabel}
        </span>
      </div>

      <div className="px-5 py-3">
        {order.items.length === 0 ? (
          <p className="py-3 text-sm italic" style={{ color: t.inkSoft }}>Nessun prodotto</p>
        ) : (
          <ul className="space-y-3">
            {order.items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3"
              >
                <span
                  className="mt-0.5 grid h-7 min-w-[28px] shrink-0 place-items-center rounded-lg px-1.5 text-sm font-extrabold tabular-nums"
                  style={{ background: accentSoft, color: accent }}
                >
                  {item.quantity}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-snug" style={{ color: t.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{item.name}</p>
                  {item.customizations.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.customizations.map((c, ci) => (
                        <span key={ci} className="rounded-md px-2 py-0.5 text-[11px]" style={{ background: t.chipBg, color: t.inkMuted, border: `1px solid ${t.chipBorder}` }}>
                          {c.optionName}: {c.choiceName}
                          {c.priceModifierCents > 0 && ` +€${formatPrice(c.priceModifierCents)}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <div className="mt-1.5 flex items-start gap-1 text-[11px] italic" style={{ color: "#b45309" }}>
                      <span aria-hidden>⚑</span>
                      <span>{item.note}</span>
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
        {order.notes && (
          <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] italic" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", color: "#b45309" }}>
            <span aria-hidden>⚑</span>
            <span>{order.notes}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${t.borderSoft}` }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.inkSoft }}>Totale</span>
        <span className="text-base font-bold" style={{ color: t.ink, fontFamily: "'Space Grotesk', sans-serif" }}>€ {formatPrice(order.total_cents)}</span>
      </div>

      {isPending && (
        <div className="px-5 pb-4" style={{ borderTop: `1px solid ${t.borderSoft}`, paddingTop: 12 }}>
          {cancelError && (
            <p className="mb-2 text-center text-[12px] font-medium" style={{ color: "#dc2626" }}>{cancelError}</p>
          )}
          {!confirmingCancel ? (
            <button
              type="button"
              onClick={() => { setCancelError(null); setConfirmingCancel(true); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
              style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.22)" }}
            >
              <Ban className="h-4 w-4" />
              {tS.cancelOrder}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-[12.5px] font-medium" style={{ color: t.inkSoft }}>{tS.cancelConfirmQuestion}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelling}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={{ background: t.surfaceAlt, color: t.ink, border: `1px solid ${t.border}` }}
                >
                  <X className="h-4 w-4" />
                  {tS.cancelKeep}
                </button>
                <button
                  type="button"
                  onClick={cancelOrder}
                  disabled={cancelling}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-70"
                  style={{ background: "#dc2626", border: "1px solid #dc2626" }}
                >
                  {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {cancelling ? tS.cancelling : tS.cancelConfirmYes}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

// ─── EMPTY COL ────────────────────────────────────────────────────────────────

function EmptyCol({ label, isDark }: { label: string; isDark: boolean }) {
  const t = themeTokens(isDark);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[24px] px-4 py-14 text-center"
      style={{ border: `1px dashed ${t.border}`, background: t.surfaceSoft }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
        style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}
      >
        <Clock className="h-7 w-7" style={{ color: t.inkSoft }} />
      </motion.div>
      <p className="text-sm font-medium" style={{ color: t.inkSoft, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</p>
    </motion.div>
  );
}

// ─── LAST COURSE BANNER ───────────────────────────────────────────────────────
// Rete di sicurezza: se un bug impedisce il passaggio automatico alla schermata
// finale (grazie/pagamento) una volta consegnata l'ultima portata, questo banner
// resta visibile — senza possibilità di chiuderlo — finché l'utente non tocca il
// pulsante per andarci manualmente.

function LastCourseBanner({
  brand,
  isDark,
  onContinue,
}: {
  brand: string;
  isDark: boolean;
  onContinue: () => void;
}) {
  const { tr } = useI18n();
  const tS = tr.client.status;

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ top: 144 }}
    >
      <motion.button
        onClick={onContinue}
        whileTap={{ scale: 0.98 }}
        className="flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left"
        style={{
          background: `linear-gradient(135deg, ${brand} 0%, ${mixHex(brand, "#000000", 0.15)} 100%)`,
          boxShadow: `0 16px 40px -10px ${brandAlpha(brand, 0.55)}`,
          border: "1px solid rgba(255,255,255,0.18)",
          cursor: "pointer",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <CheckCircle style={{ width: 18, height: 18, color: "#fff" }} />
          </span>
          <span
            className="truncate"
            style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {tS.lastCourseReadyTitle}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
            fontSize: 12, fontWeight: 700, color: brand,
            background: "#fff", padding: "7px 12px", borderRadius: 999,
          }}
        >
          {tS.lastCourseReadyCta}
          <ArrowRight style={{ width: 13, height: 13 }} />
        </span>
      </motion.button>
    </motion.div>
  );
}

// ─── TAB BAR ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab, setActiveTab, counts, badges, clearBadge, isDark, brand,
}: {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  counts: { attesa: number; cucina: number; pronti: number };
  badges: { attesa: number; cucina: number; pronti: number };
  clearBadge: (t: TabKey) => void;
  isDark: boolean;
  brand: string;
}) {
  const t = themeTokens(isDark);
  const { tr } = useI18n();
  const tS = tr.client.status;
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "attesa", label: tS.waiting, icon: <Clock size={15} />, color: "#f59e0b" },
    { key: "cucina", label: tS.cooking, icon: <ChefHat size={15} />, color: "#3b82f6" },
    { key: "pronti", label: tS.ready,   icon: <CheckCircle size={15} />, color: "#22c55e" },
  ];
  const brandText = `color-mix(in srgb, ${brand} 78%, #000)`;

  return (
    <div
      className="mb-5 flex items-stretch gap-1 rounded-[22px] p-1.5"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}
    >
      {tabs.map(({ key, label, icon, color }) => {
        const isActive = activeTab === key;
        const badge = badges[key];
        const count = counts[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => { setActiveTab(key); clearBadge(key); }}
            className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition"
            aria-pressed={isActive}
          >
            {isActive && (
              <motion.div layoutId="status-tab-fill" className="absolute inset-0 rounded-2xl"
                style={{ background: `${color}14` }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {isActive && (
              <motion.div layoutId="status-tab-underline" className="absolute bottom-1.5 left-1/2 h-[3px] -translate-x-1/2 rounded-full"
                style={{ background: color, width: 28, boxShadow: `0 2px 8px ${color}88` }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-1.5" style={{ color: isActive ? color : t.inkSoft }}>
              <span className="relative">
                {icon}
                {badge > 0 && !isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-2 -top-2 grid min-w-[14px] place-items-center rounded-full px-1 text-[9px] font-black text-white"
                    style={{ background: "#ef4444", height: 14, boxShadow: `0 0 0 2px ${t.surface}, 0 2px 6px rgba(239,68,68,0.4)` }}
                  >
                    {badge}
                  </motion.span>
                )}
              </span>
              <span className="text-[12px] font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
            </div>
            <span
              className="relative z-10 grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums"
              style={{
                background: isActive ? color : t.chipBg,
                color: isActive ? "#fff" : t.inkMuted,
                border: isActive ? "none" : `1px solid ${t.chipBorder}`,
                boxShadow: isActive ? `0 2px 6px ${color}55` : "none",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── PALETTE HELPER ───────────────────────────────────────────────────────────

function makePalette(brand: string): Palette {
  const mix = (h1: string, h2: string, t: number) => {
    const p = (h: string) => { const x = h.replace("#",""); return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)]; };
    const [r1,g1,b1] = p(h1), [r2,g2,b2] = p(h2);
    return "#"+[r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t].map(v => Math.round(v).toString(16).padStart(2,"0")).join("");
  };
  const [r,g,b] = [parseInt(brand.slice(1,3),16), parseInt(brand.slice(3,5),16), parseInt(brand.slice(5,7),16)];
  const alpha = (a: number) => `rgba(${r},${g},${b},${a})`;
  const dark500  = mix(brand,"#000000",0.45);
  const dark300  = mix(brand,"#000000",0.20);
  const light100 = mix(brand,"#ffffff",0.88);
  const light200 = mix(brand,"#ffffff",0.78);
  return {
    brand, bg: light100,
    bgGradient: `linear-gradient(160deg, #ffffff 0%, ${light100} 100%)`,
    text: dark500, textMuted: dark300, textSoft: dark300,
    border: alpha(0.20), borderMid: alpha(0.30), borderStrong: alpha(0.50),
    borderSoft: alpha(0.12),
    bgCard: "rgba(255,255,255,0.88)", grid: alpha(0.08),
    accent: brand, accentDark: dark300, accentBg: alpha(0.08),
    light100, light200, light300: mix(brand,"#ffffff",0.60),
    blob1: "", blob2: "", blob3: "", blob4: "",
    btnBg: `linear-gradient(135deg, ${brand}, ${dark300})`,
    btnShadow: `0 6px 24px ${alpha(0.35)}`,
    headerBg: `${mix(brand,"#ffffff",0.92)}d9`,
    footerBg: `${mix(brand,"#ffffff",0.90)}eb`,
    danger: "#ef4444", dangerBg: "#fef2f2",
    amber: "#f59e0b", amberBg: "rgba(245,158,11,0.08)",
    chipBg: alpha(0.10), chipBgActive: alpha(0.12),
    glowRing: `0 0 0 6px ${alpha(0.08)}, 0 8px 40px ${alpha(0.30)}`,
    flyDot: brand, flyGlow: `0 0 18px ${alpha(0.55)}`,
  } as Palette;
}
// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function LoadingSkeleton({ brand, isDark, bg }: { brand: string; isDark: boolean; bg?: string }) {
  const t = themeTokens(isDark);
  return (
    <div className="flex min-h-screen flex-col px-4 pt-36 gap-4" style={{ background: bg ?? (isDark ? t.pageBg : undefined) }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="shimmer rounded-[28px] h-40"
        style={{ background: `${brand}22` }}
      />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="shimmer rounded-[24px] h-52"
        style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}
      />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="shimmer rounded-[24px] h-28"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      />
    </div>
  );
}

// ─── EMPTY ORDER STATE ────────────────────────────────────────────────────────

function EmptyOrderState({ sessionId, brand, isDark }: { sessionId: string; brand: string; isDark: boolean }) {
  const t = themeTokens(isDark);
  const { tr } = useI18n();
  const tS = tr.client.status;
  const accentBg = `color-mix(in srgb, ${brand} 8%, transparent)`;
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden px-6">
      <span aria-hidden className="absolute -top-16 -right-10 h-56 w-56 rounded-full" style={{ background: accentBg, filter: "blur(40px)" }} />
      <span aria-hidden className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full opacity-70" style={{ background: accentBg, filter: "blur(50px)" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 w-full max-w-[360px] rounded-[32px] px-7 pt-11 pb-9 text-center"
        style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}
      >
        <div className="relative mx-auto mb-[22px] h-[88px] w-[88px]">
          <span aria-hidden className="pulse-ring absolute inset-0 rounded-full" style={{ background: `color-mix(in srgb, ${brand} 18%, transparent)` }} />
          <motion.div
            className="relative grid h-[88px] w-[88px] place-items-center rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 60%, #000))`, boxShadow: `0 16px 40px -8px color-mix(in srgb, ${brand} 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)` }}
            animate={{ y: [0, -6, 0], rotate: [-3, 2, -3] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Utensils className="h-9 w-9" strokeWidth={1.8} />
          </motion.div>
        </div>

        <p className="mb-1.5 text-[11px] font-extrabold uppercase" style={{ color: brand, letterSpacing: "0.16em" }}>
          {tS.orderStatus}
        </p>
        <h2 className="mb-2.5 text-[26px] font-bold" style={{ color: t.ink, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
          {tS.noActiveOrder}
        </h2>
        <p className="mb-7 px-2 text-sm leading-relaxed" style={{ color: t.inkMuted }}>
          {tS.noActiveOrderDesc}
        </p>

        <Link
          href={`/order/${sessionId}`}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-[14px] text-[15px] font-extrabold text-white transition hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 60%, #000))`, boxShadow: `0 6px 24px -4px color-mix(in srgb, ${brand} 55%, transparent)`, letterSpacing: "-0.01em" }}
        >
          <UtensilsCrossed className="h-4 w-4" />
          {tS.backToMenu}
          <ChevronRight className="h-4 w-4 -ml-0.5" strokeWidth={2.5} />
        </Link>
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const { tr, lang } = useI18n();
  const tS = tr.client.status;

  const params    = useParams();
  const sessionId = params?.sessionId as string;

  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [resolvedTableId, setResolvedTableId] = useState<string | null>(null);
  const [tick,        setTick]        = useState(0);
  const [activeTab,   setActiveTab]   = useState<TabKey>("attesa");
  const activeTabRef = useRef<TabKey>("attesa");
  const prevCountsRef = useRef<{ attesa: number; cucina: number; pronti: number }>({ attesa: 0, cucina: 0, pronti: 0 });
  const [badges, setBadges] = useState<{ attesa: number; cucina: number; pronti: number }>({ attesa: 0, cucina: 0, pronti: 0 });
  const isFirstLoad = useRef(true);

  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);

  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [backgroundType, setBackgroundType] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string>("#ffffff");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("client-theme") as "dark" | "light" | null;
      if (saved) setTheme(saved);

      const sess = getTableSession();
      const rid = sess?.restaurantId;

      if (rid) {
        const bgType = localStorage.getItem(`bg_type_${rid}`);
        if (bgType) setBackgroundType(bgType);
        const bgUrl = localStorage.getItem(`bg_url_${rid}`);
        if (bgUrl) setBackgroundImageUrl(bgUrl);
        const color = localStorage.getItem(`brand_color_${rid}`);
        if (color) setBrandColor(color);
      } else {
        const bgTypeKey = Object.keys(localStorage).find(k => k.startsWith("bg_type_"));
        if (bgTypeKey) setBackgroundType(localStorage.getItem(bgTypeKey));
        const bgUrlKey = Object.keys(localStorage).find(k => k.startsWith("bg_url_"));
        if (bgUrlKey) setBackgroundImageUrl(localStorage.getItem(bgUrlKey));
        const colorKey = Object.keys(localStorage).find(k => k.startsWith("brand_color_"));
        if (colorKey) setBrandColor(localStorage.getItem(colorKey) || "#ffffff");
      }
    } catch { /* ignore */ }
  }, []);

  const [restaurantId,    setRestaurantId]    = useState<string | null>(null);
  const [avgMinutes,      setAvgMinutes]      = useState<number | null>(null);
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);
  const [tripadvisorUrl,  setTripadvisorUrl]  = useState<string | null>(null);
  const [instagram,       setInstagram]       = useState<string | null>(null);
  const [facebook,        setFacebook]        = useState<string | null>(null);
  const [website,         setWebsite]         = useState<string | null>(null);
  const [phone,           setPhone]           = useState<string | null>(null);
  const [paymentMethod,   setPaymentMethod]   = useState<string | null>(null);
  const [orderCompleted,  setOrderCompleted]  = useState(false);
  const [isLastPortata,   setIsLastPortata]   = useState(false);

  const [allServed,       setAllServed]       = useState(false);
  const [activePortataNum, setActivePortataNum] = useState<number | null>(null);
  const [activePortataStartedAt, setActivePortataStartedAt] = useState<string | null>(null);
  const [showReview,       setShowReview]       = useState(false);
  const [reviewMinimized,  setReviewMinimized]  = useState(false);
  const [reviewStars,      setReviewStars]      = useState(0);
  const [reviewText,      setReviewText]      = useState("");
  const [reviewDishId,    setReviewDishId]    = useState<string | null>(null);
  const [reviewDishName,  setReviewDishName]  = useState<string | null>(null);
  const [reviewSending,   setReviewSending]   = useState(false);
  const [reviewSent,      setReviewSent]      = useState(false);
  const reviewShownRef       = useRef(false);
  // Nonostante il nome, questi Set tracciano id di order_item (righe), non di
  // menu_item: lo stesso piatto ordinato in due portate diverse è recensibile
  // separatamente per ciascuna occorrenza.
  const reviewedDishIdsRef   = useRef<Set<string>>(new Set());
  const [reviewedDishIds,    setReviewedDishIds]    = useState<string[]>([]);
  // Piatti (righe order_item) su cui l'utente ha premuto "Salta": non vanno
  // ri-proposti automaticamente, ma restano recensibili a mano (a differenza di
  // reviewedDishIdsRef, che riflette solo recensioni realmente inviate/presenti su DB).
  const skippedDishIdsRef    = useRef<Set<string>>(new Set());
  const deliveredCountRef    = useRef(-1);
  const pickedUpCountRef     = useRef(-1);
  const allActiveItemsRef    = useRef<OrderItem[]>([]);

  const [showPaidScreen,   setShowPaidScreen]   = useState(false);
  const [paidStep,         setPaidStep]         = useState<'idle'|'processing'|'success'>('idle');
  const [paidProgress,     setPaidProgress]     = useState(0);

  useEffect(() => {
    if (!showPaidScreen) return;
    setPaidStep('processing');
    const t1 = setTimeout(() => {
      setPaidStep('success');
      setPaidProgress(0);
      const start = Date.now();
      const duration = 3000;
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / duration) * 100);
        setPaidProgress(pct);
        if (pct < 100) requestAnimationFrame(tick);
        else router.replace(`/order/${sessionId}`);
      };
      requestAnimationFrame(tick);
    }, 2000);
    return () => clearTimeout(t1);
  }, [showPaidScreen]);

  const [showEndScreen,    setShowEndScreen]    = useState(false);
  useEffect(() => {
    setEndScreenActive(showEndScreen || orders.length === 0);
    return () => setEndScreenActive(false);
  }, [showEndScreen, orders.length]);
  useEffect(() => {
    if (allServed && !showEndScreen) setShowEndScreen(true);
  }, [allServed, showEndScreen]);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [paymentRequestSending, setPaymentRequestSending] = useState(false);
  const [paymentCallId, setPaymentCallId] = useState<string | null>(null);
  const paymentCallIdRef = useRef<string | null>(null);
  const [upsellItems,      setUpsellItems]      = useState<Array<{ id: string; name: string; description: string | null; price_cents: number; image_url: string | null; category_id: string | null }>>([]);
  const [upsellCategories, setUpsellCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedUpsellCat, setSelectedUpsellCat] = useState<string | null>(null);
  const [selectedUpsellDish, setSelectedUpsellDish] = useState<{ id: string; name: string; description: string | null; price_cents: number; image_url: string | null } | null>(null);
  const addItem = useCartStore(s => s.addItem);
  const cartSessionId = useCartStore(s => s.sessionId);
  const router = useRouter();
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { paymentCallIdRef.current = paymentCallId; }, [paymentCallId]);
  const [lastDeliveredPortata, setLastDeliveredPortata] = useState<number | null>(null);
  const dragStartY      = useRef<number | null>(null);
  const [reviewDragY,   setReviewDragY]      = useState(0);
  const reviewSheetDragStartY = useRef<number | null>(null);
  const [reviewSheetDragY, setReviewSheetDragY] = useState(0);
  const [reviewSheetDragging, setReviewSheetDragging] = useState(false);
  const [reviewSheetClosing, setReviewSheetClosing] = useState(false);
  const closeReviewSheet = useCallback(() => {
    setReviewSheetClosing(true);
    setTimeout(() => { setAllServed(false); setReviewSheetClosing(false); setReviewSheetDragY(0); }, 320);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .ilike("name", "%dolc%");
      const { data: cats2 } = await supabase
        .from("menu_categories")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .ilike("name", "%dessert%");
      const dessertCatIds = [...new Set([...(cats ?? []), ...(cats2 ?? [])].map(c => c.id))];

      let items: typeof upsellItems = [];
      if (dessertCatIds.length > 0) {
        const { data } = await supabase
          .from("menu_items")
          .select("id, name, description, price_cents, image_url, category_id")
          .in("category_id", dessertCatIds)
          .eq("is_available", true)
          .limit(20);
        items = data ?? [];
      }
      if (items.length === 0) {
        const { data } = await supabase
          .from("menu_items")
          .select("id, name, description, price_cents, image_url, category_id")
          .eq("restaurant_id", restaurantId)
          .eq("is_available", true)
          .order("created_at", { ascending: false })
          .limit(12);
        items = data ?? [];
      }
      setUpsellItems(items);

      const catIds = [...new Set(items.map(i => i.category_id).filter(Boolean))] as string[];
      if (catIds.length > 0) {
        const { data: catData } = await supabase
          .from("menu_categories")
          .select("id, name")
          .in("id", catIds);
        setUpsellCategories(catData ?? []);
      }
    })();
  }, [restaurantId]);

  const [upsellTranslations, setUpsellTranslations] = useState<Record<string, string>>({});
  useEffect(() => {
    if (lang === "it") {
      setUpsellTranslations({});
      return;
    }
    const texts = new Set<string>();
    for (const i of upsellItems) {
      if (i.name) texts.add(i.name);
      if (i.description) texts.add(i.description);
    }
    if (texts.size === 0) return;
    let cancelled = false;
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: Array.from(texts), sourceLang: "it", targetLang: lang }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.translations) setUpsellTranslations(json.translations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [upsellItems, lang]);

  const translatedUpsellItems = useMemo(
    () =>
      upsellItems.map((i) => ({
        ...i,
        name: upsellTranslations[i.name] ?? i.name,
        description: i.description ? upsellTranslations[i.description] ?? i.description : i.description,
      })),
    [upsellItems, upsellTranslations]
  );

  useEffect(() => {
    const handler = () => {
      setShowReview(true);
      setReviewMinimized(false);
      window.dispatchEvent(new CustomEvent("review-opened"));
    };
    window.addEventListener("open-review", handler);
    return () => window.removeEventListener("open-review", handler);
  }, []);

  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    supabase.from("qr_sessions").select("restaurant_id").eq("id", sessionId).maybeSingle()
      .then(({ data }) => {
        if (data?.restaurant_id) {
          setRestaurantId(data.restaurant_id);
          supabase.from("restaurants").select("brand_color, background_type, background_image_url").eq("id", data.restaurant_id).single()
            .then(({ data: r }) => {
              if (r?.brand_color) {
                setBrandColor(r.brand_color);
                try { localStorage.setItem(`brand_color_${data.restaurant_id}`, r.brand_color); } catch {}
              }
              if (r?.background_type) {
                setBackgroundType(r.background_type);
                try { localStorage.setItem(`bg_type_${data.restaurant_id}`, r.background_type); } catch {}
              }
              if (r?.background_image_url) {
                setBackgroundImageUrl(r.background_image_url);
                try { localStorage.setItem(`bg_url_${data.restaurant_id}`, r.background_image_url); } catch {}
              }
            });
        }
      });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: qr } = await supabase.from("qr_sessions").select("restaurant_id").eq("id", sessionId).maybeSingle();
        const rid = qr?.restaurant_id;
        if (!rid || cancelled) return;
        const { data: rest } = await supabase.from("restaurants").select("name, logo_url, google_review_url, tripadvisor, instagram, facebook, website, phone").eq("id", rid).maybeSingle();
        if (!cancelled && rest?.name) setRestaurantName(rest.name);
        if (!cancelled && (rest as any)?.logo_url) setRestaurantLogo((rest as any).logo_url);
        if (!cancelled && (rest as any)?.google_review_url) setGoogleReviewUrl((rest as any).google_review_url);
        if (!cancelled && (rest as any)?.tripadvisor) setTripadvisorUrl((rest as any).tripadvisor);
        if (!cancelled && (rest as any)?.instagram) setInstagram((rest as any).instagram);
        if (!cancelled && (rest as any)?.facebook) setFacebook((rest as any).facebook);
        if (!cancelled && (rest as any)?.website) setWebsite((rest as any).website);
        if (!cancelled && (rest as any)?.phone) setPhone((rest as any).phone);
      } catch { /* visual-only */ }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const isDark = theme === "dark";
  const effectiveBrand = brandColor === "#ffffff" ? "#10b981" : brandColor;

  const brandBg = (() => {
    try {
      const hex = brandColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgb(${Math.round(r + (255 - r) * 0.88)},${Math.round(g + (255 - g) * 0.88)},${Math.round(b + (255 - b) * 0.88)})`;
    } catch { return "#f5f3ec"; }
  })();

  const isImageBg = backgroundType === "image" && !!backgroundImageUrl;
  const bg =
    backgroundType === "color" && backgroundImageUrl
      ? backgroundImageUrl
      : isDark ? "#0c0a09" : brandBg;

  const textPrimC = isDark ? "#f5f5f4" : "#1c1917";
  const textSecC  = isDark ? "#a8a29e" : "#78716c";

  useEffect(() => {
    if (!restaurantId) return;
    fetch(`/api/restaurant/${restaurantId}/avg-delivery-time`)
      .then(r => r.json())
      .then(d => { if (d.avgMinutes) setAvgMinutes(d.avgMinutes) })
      .catch(() => {});
  }, [restaurantId]);

  const fetchOrders = useCallback(async () => {
    if (!sessionId) return;
    try {
      let resolvedTableId: string | null = null;
      let resolvedRestaurantId: string | null = null;
      let resolvedTableNumber: string | null = null;

      const { data: qrSession } = await supabase
        .from("qr_sessions").select("restaurant_id, table_number, table_id")
        .eq("id", sessionId).maybeSingle();

      if (qrSession) {
        resolvedRestaurantId = qrSession.restaurant_id;
        if (qrSession.table_id) {
          resolvedTableId = qrSession.table_id;
        }
        if (resolvedTableId) {
          const { data: tableData } = await supabase.from("tables").select("label").eq("id", resolvedTableId).maybeSingle();
          if (tableData?.label) resolvedTableNumber = tableData.label;
        }
        if (!resolvedTableNumber && qrSession.table_number != null && qrSession.table_number !== 0) {
          resolvedTableNumber = String(qrSession.table_number);
        }
      }

      if (!resolvedTableId) {
        const { data: tqr } = await supabase.from("table_qr_sessions").select("id, restaurant_id, table_number").eq("id", sessionId).maybeSingle();
        if (tqr) {
          resolvedRestaurantId = tqr.restaurant_id;
          resolvedTableId = tqr.id;
          resolvedTableNumber = (tqr.table_number != null && tqr.table_number !== 0) ? String(tqr.table_number) : null;
        }
      }

      if (resolvedTableNumber) setTableNumber(resolvedTableNumber);
      if (resolvedTableId) setResolvedTableId(resolvedTableId);

      if (resolvedTableId) {
        const { data: pendingCall } = await supabase
          .from("waiter_calls")
          .select("id, status")
          .eq("table_id", resolvedTableId)
          .eq("type", "payment")
          .in("status", ["pending", "acknowledged"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pendingCall) {
          setPaymentRequested(true);
          setPaymentCallId(pendingCall.id);
        } else {
          setPaymentRequested(false);
          setPaymentCallId(null);
        }
      }

      let ordersData: any[] | null = null;
      let itemsData: any[] | null = null;
      {
        const qs = resolvedTableId ? `?tableId=${encodeURIComponent(resolvedTableId)}` : "";
        const res = await fetch(`/api/session/${sessionId}/active-orders${qs}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || tS.loadOrdersError);
        }
        const json = await res.json();
        ordersData = json.orders ?? [];
        itemsData = json.items ?? [];
      }

      if (!ordersData?.length) { setOrders([]); setLoading(false); return; }

      const orderIds = ordersData.map(o => o.id);
      void orderIds;

      const menuItemIds = [...new Set((itemsData || []).map(i => i.menu_item_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      let imageMap: Record<string, string | null> = {};
      if (menuItemIds.length) {
        const { data: menuItems } = await supabase.from("menu_items").select("id, name, image_url").in("id", menuItemIds);
        (menuItems || []).forEach(m => { nameMap[m.id] = m.name; imageMap[m.id] = (m as any).image_url ?? null; });
      }

      let nextPortataNum: number | null = null;
      let nextPortataStartedAt: string | null = null;
      const formatted: Order[] = ordersData.map(order => {
        const orderItems = (itemsData || []).filter(i => i.order_id === order.id);
        const computedTotalCents = orderItems.reduce((sum, i) => sum + Math.round((i.base_price ?? 0) * 100) * (i.quantity ?? 1), 0);

        let displayStatus = order.status as Order["status"];
        if (displayStatus === "cooking" || displayStatus === "ready") {
          const portateNums = [...new Set(orderItems.map(i => i.portata ?? 1))].sort((a, b) => a - b);
          const activePortata = portateNums.find(p =>
            orderItems.filter(i => (i.portata ?? 1) === p).some(i => !i.picked_up_at)
          );
          const activeItems = activePortata != null
            ? orderItems.filter(i => (i.portata ?? 1) === activePortata)
            : orderItems;
          const anyDelivered = activeItems.some(i => i.portata_delivered);
          const anyCompleted = activeItems.some(i => i.portata_completed);
          if (anyDelivered)      displayStatus = "served";
          else if (anyCompleted) displayStatus = "ready";
          else                   displayStatus = "cooking";
          nextPortataNum = activePortata ?? null;

          if (activePortata != null && activePortata > 1) {
            const prevItems = orderItems.filter(i => (i.portata ?? 1) < activePortata && i.delivered_at);
            const prevDeliveredTimes = prevItems.map(i => new Date(i.delivered_at as string).getTime());
            const lastPrevDelivered = prevDeliveredTimes.length ? Math.max(...prevDeliveredTimes) : null;
            nextPortataStartedAt = lastPrevDelivered != null ? new Date(lastPrevDelivered).toISOString() : (order.confirmed_at ?? null);
          } else {
            nextPortataStartedAt = order.confirmed_at ?? null;
          }
        }

        return {
          ...order,
          status: displayStatus,
          _displayTime: order.confirmed_at || order.updated_at || order.created_at,
          total_cents: (order.total_cents && order.total_cents > 0) ? order.total_cents : computedTotalCents,
          table_number: resolvedTableNumber,
          items: orderItems.map((i): OrderItem => ({
            id:           i.id,
            menu_item_id: i.menu_item_id,
            name:         nameMap[i.menu_item_id] || i.name_snapshot || i.name || "Prodotto",
            quantity:     i.quantity ?? 1,
            note:         i.note ?? "",
            portata:      i.portata ?? 1,
            image_url:    imageMap[i.menu_item_id] ?? null,
            customizations: Array.isArray(i.customizations) ? i.customizations : [],
            picked_up_at: i.picked_up_at ?? null,
            delivered_at: i.delivered_at ?? null,
            portata_delivered: !!(i as any).portata_delivered,
          })),
        };
      });

      setActivePortataNum(nextPortataNum);
      setActivePortataStartedAt(nextPortataStartedAt);

      const newPending = formatted.filter(o => o.status === "confirmed" || o.status === "pending").length;
      const newCooking = formatted.filter(o => o.status === "cooking").length;
      const newReady   = formatted.filter(o => o.status === "ready").length;

      if (!isFirstLoad.current) {
        setBadges(prev => ({
          attesa: activeTabRef.current !== "attesa" && newPending > prevCountsRef.current.attesa ? prev.attesa + (newPending - prevCountsRef.current.attesa) : prev.attesa,
          cucina: activeTabRef.current !== "cucina" && newCooking > prevCountsRef.current.cucina ? prev.cucina + (newCooking - prevCountsRef.current.cucina) : prev.cucina,
          pronti: activeTabRef.current !== "pronti" && newReady   > prevCountsRef.current.pronti ? prev.pronti + (newReady   - prevCountsRef.current.pronti) : prev.pronti,
        }));
        if (newReady > prevCountsRef.current.pronti && activeTabRef.current !== "pronti") {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
      } else {
        isFirstLoad.current = false;
      }

      prevCountsRef.current = { attesa: newPending, cucina: newCooking, pronti: newReady };
      const latestOrder = formatted.length ? formatted[formatted.length - 1] : null;
      setOrders(latestOrder ? [latestOrder] : []);
      allActiveItemsRef.current = formatted.flatMap(o => o.items ?? []);
      if (latestOrder) {
        try {
          const lsKey = `reviewed_dishes_${latestOrder.id}`;
          const stored = localStorage.getItem(lsKey);
          if (stored) {
            const ids: string[] = JSON.parse(stored);
            ids.forEach(id => reviewedDishIdsRef.current.add(id));
          }
          const skippedStored = localStorage.getItem(`skipped_dishes_${latestOrder.id}`);
          if (skippedStored) {
            const ids: string[] = JSON.parse(skippedStored);
            ids.forEach(id => skippedDishIdsRef.current.add(id));
          }
        } catch {}
        const { data: existingReviews } = await supabase
          .from("reviews")
          .select("order_item_id")
          .eq("order_id", latestOrder.id)
          .not("order_item_id", "is", null);
        if (existingReviews) {
          existingReviews.forEach((r: { order_item_id: string }) => {
            reviewedDishIdsRef.current.add(r.order_item_id);
          });
          setReviewedDishIds([...reviewedDishIdsRef.current]);
          try {
            localStorage.setItem(
              `reviewed_dishes_${latestOrder.id}`,
              JSON.stringify([...reviewedDishIdsRef.current])
            );
          } catch {}
        }
      }
      if (latestOrder && (ordersData[ordersData.length - 1] as any)?.payment_method) {
        setPaymentMethod((ordersData[ordersData.length - 1] as any).payment_method);
      }

      const allPaid = ordersData.length > 0 && ordersData.every(o => !!(o as any).paid_at);

      const allItems = (itemsData ?? []) as any[];
      const activeOrderIds = new Set(ordersData.filter(o => o.status === "cooking" || o.status === "ready").map(o => o.id));
      const activeItems = activeOrderIds.size > 0 ? allItems.filter(i => activeOrderIds.has(i.order_id)) : allItems;
      const deliveredItems = activeItems.filter((i) => i.portata_delivered);
      const deliveredCount = deliveredItems.length;
      if (deliveredCountRef.current === -1) {
        deliveredCountRef.current = deliveredCount;
      } else if (deliveredCount > deliveredCountRef.current) {
        const portateNums = [...new Set(deliveredItems.map((i) => i.portata ?? 1))].sort((a: number, b: number) => a - b);
        setLastDeliveredPortata(portateNums[0] ?? null);
        deliveredCountRef.current = deliveredCount;
      }

      const allPortate = [...new Set(allItems.map((i) => i.portata ?? 1))];
      const lastPortataDelivered = allItems.length > 0 && allPortate.every(
        p => allItems.filter(i => (i.portata ?? 1) === p).every(i => i.portata_delivered)
      );
      if (lastPortataDelivered) setIsLastPortata(true);

      // Un item è "recensibile" solo quando il cameriere preme esplicitamente "Ritira"
      // sulla portata (picked_up_at valorizzato in WaiterSection/markPortataPickedUp).
      // La sola consegna (delivered_at/portata_delivered) NON basta: se il cameriere
      // non preme mai "Ritira", la card di recensione semplicemente non compare
      // (scelta intenzionale, vedi conversazione).
      const isItemDone = (i: any) => !!i.picked_up_at;

      // "every", non "some": con più ordini attivi in contemporanea (es. l'utente
      // aggiunge una nuova portata dalla schermata finale dopo che il primo ordine
      // è già "served") basta UN ordine ancora da ritirare per non considerare
      // tutto pronto, altrimenti la nuova portata verrebbe ignorata.
      const allPickedUp = allItems.length > 0 && (
        allItems.every(isItemDone) ||
        ordersData.every(o => o.status === "served" || o.status === "completed")
      );

      // Tracciato per riga di order_item (non per menu_item_id): lo stesso piatto
      // ordinato in portate diverse sono due "volte" distinte, ognuna con una sua
      // recensione (ogni portata può essere stata mangiata da una persona diversa).
      const pickedUpDishIds = allItems.filter(isItemDone).map((i: any) => i.id).filter(Boolean);
      const hasUnreviewed = pickedUpDishIds.some(id => !reviewedDishIdsRef.current.has(id) && !skippedDishIdsRef.current.has(id));
      if (pickedUpCountRef.current === -1) {
        // Prima chiamata: inizializza. Se ci sono già piatti consegnati non recensiti,
        // mostra comunque la card (utile dopo un refresh della pagina).
        pickedUpCountRef.current = pickedUpDishIds.length;
        if (hasUnreviewed && !showReview && pickedUpDishIds.length > 0) {
          setShowReview(true);
          setReviewMinimized(false);
        }
      } else if (pickedUpDishIds.length > pickedUpCountRef.current) {
        if (hasUnreviewed && !showReview) {
          setShowReview(true);
          setReviewMinimized(false);
        }
        pickedUpCountRef.current = pickedUpDishIds.length;
      }

      if (allPickedUp && allPaid) {
        setAllServed(true);
      } else if (allPickedUp && !allPaid && !hasUnreviewed && !showReview) {
        setShowEndScreen(true);
      } else if (!allPickedUp) {
        // Nuova portata inviata dopo la schermata finale (es. dal "Hai ancora
        // spazio?"): torniamo alla vista di stato live finché non è di nuovo
        // tutto ritirato, invece di restare bloccati sulla card di fine ordine.
        setShowEndScreen(false);
        setAllServed(false);
      }
    } catch (err: any) {
      console.error("[StatusPage] fetchOrders:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    fetchOrders();
    const tickInterval = setInterval(() => setTick(t => t + 1), 60_000);
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchOrders();
    }, 5_000);
    const onFocus = () => fetchOrders();
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(tickInterval);
      clearInterval(pollInterval);
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
    };
  }, [sessionId, fetchOrders]);

  useEffect(() => {
    if (!sessionId || !resolvedTableId) return;
    const channel = supabase.channel(`status_realtime_${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `table_id=eq.${resolvedTableId}` },      fetchOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, fetchOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls", filter: `table_id=eq.${resolvedTableId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId && deletedId === paymentCallIdRef.current) {
              setPaymentRequested(false);
              setPaymentCallId(null);
            }
            return;
          }
          const row = payload.new as { type?: string; status?: string; id?: string };
          if (!row || row.type !== "payment") return;
          if (row.status === "closed" || row.status === "done") {
            setPaymentRequested(false);
            setPaymentCallId(null);
            setShowPaidScreen(true);
          } else {
            setPaymentRequested(true);
            setPaymentCallId(row.id ?? null);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, resolvedTableId, fetchOrders]);

  const pending = orders.filter(o => o.status === "confirmed" || o.status === "pending");
  const cooking = orders.filter(o => o.status === "cooking");
  const ready   = orders.filter(o => o.status === "ready");
  const counts  = { attesa: pending.length, cucina: cooking.length, pronti: ready.length };

  const clearBadge = (tab: TabKey) => setBadges(prev => ({ ...prev, [tab]: 0 }));
  const tabOrders: Record<TabKey, Order[]> = { attesa: pending, cucina: cooking, pronti: ready };
  const tabEmpty:  Record<TabKey, string>  = {
    attesa: tS.noWaiting,
    cucina: tS.noCooking,
    pronti: tS.noReady,
  };

  const markDishReviewed = (dishId: string, orderId: string | null) => {
    reviewedDishIdsRef.current.add(dishId);
    setReviewedDishIds([...reviewedDishIdsRef.current]);
    if (orderId) {
      try { localStorage.setItem(`reviewed_dishes_${orderId}`, JSON.stringify([...reviewedDishIdsRef.current])); } catch {}
    }
  };

  const markDishSkipped = (dishId: string, orderId: string | null) => {
    skippedDishIdsRef.current.add(dishId);
    if (orderId) {
      try { localStorage.setItem(`skipped_dishes_${orderId}`, JSON.stringify([...skippedDishIdsRef.current])); } catch {}
    }
  };

  const submitReview = async () => {
    if (!reviewStars || !restaurantId || !reviewDishId) return;
    setReviewSending(true);
    try {
      const orderId = orders[0]?.id ?? null;
      // reviewDishId è l'id della riga order_item selezionata (non il menu_item_id):
      // lo stesso piatto ordinato in due portate diverse produce due righe distinte,
      // ognuna recensibile a sé.
      const rawItemsForSubmit = allActiveItemsRef.current as Array<{ id: string; menu_item_id: string }>;
      const selectedItem = rawItemsForSubmit.find(i => i.id === reviewDishId);
      const menuItemId = selectedItem?.menu_item_id ?? null;

      if (orderId) {
        const { data: existing } = await supabase
          .from("reviews").select("id")
          .eq("order_id", orderId)
          .eq("order_item_id", reviewDishId)
          .maybeSingle();
        if (existing) {
          markDishReviewed(reviewDishId, orderId);
          setReviewStars(0); setReviewText(""); setReviewDishId(null); setReviewDishName(null);
          return;
        }
      }

      const { error } = await supabase.from("reviews").insert({
        restaurant_id: restaurantId,
        stars:         reviewStars,
        text:          reviewText.trim() || null,
        session_id:    sessionId,
        table_number:  tableNumber,
        order_id:      orderId,
        menu_item_id:  menuItemId,
        order_item_id: reviewDishId,
        dish_name:     reviewDishName ?? null,
      });

      if (error && error.code !== "23505" && error) {
        console.error("[ReviewPopup] insert error:", error);
        return;
      }

      markDishReviewed(reviewDishId, orderId);

      const rawItems = allActiveItemsRef.current as Array<{ id: string; menu_item_id: string; picked_up_at?: string | null; delivered_at?: string | null; portata_delivered?: boolean }>;
      const isDone = (i: typeof rawItems[number]) => !!i.picked_up_at;
      const doneItemIds = rawItems.filter(isDone).map(i => i.id).filter(Boolean);
      const remaining = doneItemIds.filter(id => !reviewedDishIdsRef.current.has(id) && !skippedDishIdsRef.current.has(id));

      if (remaining.length === 0) {
        setReviewSent(true);
        setTimeout(() => {
          setShowReview(false);
          setReviewSent(false);
          setReviewStars(0);
          setReviewText("");
          setReviewDishId(null);
          setReviewDishName(null);
          const stillPending = rawItems.some(i => !isDone(i));
          if (!stillPending) setShowEndScreen(true);
        }, 5000);
      } else {
        setReviewSent(true);
        setTimeout(() => {
          setReviewSent(false);
          setReviewStars(0);
          setReviewText("");
          setReviewDishId(null);
          setReviewDishName(null);
        }, 5000);
      }
    } catch (e) {
      console.error("[ReviewPopup] submit:", e);
    } finally {
      setReviewSending(false);
    }
  };

  const skipReview = () => {
    const orderId = orders[0]?.id ?? null;
    const rawItems = allActiveItemsRef.current as Array<{ id: string; menu_item_id: string; picked_up_at?: string | null; delivered_at?: string | null; portata_delivered?: boolean }>;
    const isDone = (i: typeof rawItems[number]) => !!i.picked_up_at;

    if (reviewDishId) {
      markDishSkipped(reviewDishId, orderId);
    } else {
      const doneItemIds = rawItems.filter(isDone).map(i => i.id).filter(Boolean);
      doneItemIds
        .filter(id => !reviewedDishIdsRef.current.has(id) && !skippedDishIdsRef.current.has(id))
        .forEach(id => markDishSkipped(id, orderId));
    }
    window.dispatchEvent(new CustomEvent("review-skipped"));

    const allDoneItemIds = rawItems.filter(isDone).map(i => i.id).filter(Boolean);
    const remaining = allDoneItemIds.filter(id => !reviewedDishIdsRef.current.has(id) && !skippedDishIdsRef.current.has(id));

    setShowReview(false);
    setReviewStars(0);
    setReviewText("");
    setReviewDishId(null);
    setReviewDishName(null);

    if (remaining.length === 0) {
      const stillPending = rawItems.some(i => !isDone(i));
      if (!stillPending) setShowEndScreen(true);
    }
  };

  const servedOrders = orders.filter(o => o.status === "served");
  const servedPortate = servedOrders.length > 0
    ? [...new Set(servedOrders.flatMap(o => o.items.map(i => i.portata)))].sort((a, b) => a - b)
    : [];

  const currentStep = deriveCurrentStep(orders);
  const t = themeTokens(isDark);

  if (loading) {
    return (
      <div style={{ ["--brand" as any]: brandColor }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          .shimmer { animation: shimmerBg 1.6s ease-in-out infinite; background-size: 200% 100%; }
          @keyframes shimmerBg { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        `}</style>
        <LoadingSkeleton brand={effectiveBrand} isDark={isDark} bg={bg} />
      </div>
    );
  }

  if (showPaidScreen) {
    const brand = effectiveBrand || "#3a2f26";
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: isDark ? "#1c1917" : "#fff",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 32px",
          gap: 24,
        }}
      >
        <div aria-hidden style={{
          position: "fixed", top: "-20%", right: "-15%",
          width: 380, height: 380, borderRadius: "50%",
          background: `${brand}14`, filter: "blur(80px)", pointerEvents: "none",
        }} />
        <div aria-hidden style={{
          position: "fixed", bottom: "-15%", left: "-10%",
          width: 280, height: 280, borderRadius: "50%",
          background: `${brand}10`, filter: "blur(60px)", pointerEvents: "none",
        }} />

        <AnimatePresence mode="wait">
          {paidStep === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative", zIndex: 1 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ position: "relative" }}
              >
                <motion.div
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  style={{
                    position: "absolute", inset: -6, borderRadius: "50%",
                    border: `2px solid ${brand}`,
                  }}
                />
                <div style={{
                  width: 76, height: 76, borderRadius: "50%",
                  border: `4px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  borderTop: `4px solid ${brand}`,
                  animation: "spinPay 0.9s linear infinite",
                  boxShadow: `0 8px 32px -4px ${brand}44`,
                }} />
              </motion.div>
              <style>{`@keyframes spinPay { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: 20, fontWeight: 700, color: isDark ? "#f5f5f4" : "#1c1917", margin: 0, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                {tS.paymentInProgress}
              </p>
            </motion.div>
          )}

          {paidStep === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%", position: "relative", zIndex: 1 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                style={{ position: "relative" }}
              >
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.2, delay: 0.3, repeat: Infinity, repeatDelay: 1 }}
                  style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: `2px solid ${brand}`,
                  }}
                />
                <div style={{
                  width: 76, height: 76, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${brand}, ${brand}cc)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 16px 40px -8px ${brand}66`,
                }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>

              <p style={{ fontSize: 20, fontWeight: 700, color: isDark ? "#f5f5f4" : "#1c1917", margin: 0, textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                {tS.paymentSuccessTitle}
              </p>
              <p style={{ fontSize: 14, color: isDark ? "#a8a29e" : "#78716c", margin: 0, textAlign: "center" }}>
                {tS.paymentSuccessThanks(restaurantName || (lang === "en" ? "our restaurant" : "il nostro ristorante"))}
              </p>

              <div style={{
                width: "100%", height: 6, borderRadius: 3,
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                overflow: "hidden", marginTop: 8,
              }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${brand}, ${brand}cc)`,
                  width: `${paidProgress}%`,
                  transition: "width 0.05s linear",
                  boxShadow: `0 0 12px ${brand}66`,
                }} />
              </div>
              <p style={{ fontSize: 12, color: isDark ? "#a8a29e" : "#78716c", margin: 0 }}>
                {tS.returningToMenu}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (orderCompleted) {
    const paymentLabel = paymentMethod === "cash"
      ? "Contanti"
      : paymentMethod === "card"
      ? "Carta / POS"
      : paymentMethod ?? "—";
    const paymentIcon = paymentMethod === "cash" ? "💵" : paymentMethod === "card" ? "💳" : "🧾";
    const paymentNote = paymentMethod === "cash"
      ? "Il cameriere passerà a raccogliere il pagamento al tuo tavolo."
      : paymentMethod === "card"
      ? "Il cameriere porterà il POS al tuo tavolo."
      : "Chiedi il conto al cameriere.";

    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-end"
        style={{ background: bg, ["--brand" as any]: brandColor }}
      >
        {isImageBg && (
          <div
            aria-hidden
            style={{
              position: "fixed", inset: 0, zIndex: 0,
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              transform: "translateZ(0)", WebkitTransform: "translateZ(0)",
              willChange: "transform", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            }}
          />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55))" }} />

        <motion.div
          className="relative z-10 mx-4 mb-8 w-full max-w-sm overflow-hidden rounded-[28px] bg-white"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.28)" }}
        >
          <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}>
            <div aria-hidden style={{
              position: "absolute", top: -30, right: -20,
              width: 120, height: 120, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", filter: "blur(40px)", pointerEvents: "none",
            }} />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-3xl">✅</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
            >
              Ordine completato!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32 }}
              className="mt-1 text-sm text-white/80"
            >
              Grazie per aver cenato con noi
            </motion.p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Metodo di pagamento</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{paymentIcon}</span>
                <div>
                  <p className="font-semibold text-stone-800">{paymentLabel}</p>
                  <p className="text-[12px] text-stone-500">{paymentNote}</p>
                </div>
              </div>
            </motion.div>

            {(instagram || facebook || website || googleReviewUrl || tripadvisorUrl || phone) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="rounded-2xl border border-stone-100 bg-stone-50 p-4"
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Seguici &amp; lascia un voto</p>
                <div className="flex flex-wrap gap-2">
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram.replace(/^@/, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white"
                      style={{ background: "linear-gradient(135deg,#fd5949,#d6249f 60%,#285AEB)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white"
                      style={{ background: "#1877f2" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                  )}
                  {googleReviewUrl && (
                    <a
                      href={googleReviewUrl}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white"
                      style={{ background: "#4285f4" }}
                    >
                      ⭐ Google
                    </a>
                  )}
                  {tripadvisorUrl && (
                    <a
                      href={tripadvisorUrl}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white"
                      style={{ background: "#34e0a1", color: "#fff" }}
                    >
                      🦉 Tripadvisor
                    </a>
                  )}
                  {website && (
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
                      style={{ background: "#f5f5f4", color: "#1c1917" }}
                    >
                      🌐 Sito web
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
                      style={{ background: "#f5f5f4", color: "#1c1917" }}
                    >
                      📞 Chiama
                    </a>
                  )}
                </div>
              </motion.div>
            )}

            <p className="text-center text-[12px] text-stone-400 pb-1">
              {restaurantName ?? "Il ristorante"} ti ringrazia 🙏
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showEndScreen || allServed) {
    const order = orders[0];
    const isPaid = !!(order as any)?.paid_at;
    const payMethod = (order as any)?.payment_method as string | null;
    const payLabel = payMethod === "cash" ? tS.payCash : payMethod === "card" ? tS.payCard : null;

    return (
      <EndScreenExperience
        orders={orders as any}
        restaurantId={restaurantId}
        sessionId={sessionId}
        tableNumber={tableNumber}
        isDark={isDark}
        brand={effectiveBrand}
        supabase={supabase}
        isPaid={isPaid}
        payLabel={payLabel}
        paymentRequested={paymentRequested}
        setPaymentRequested={setPaymentRequested}
        paymentRequestSending={paymentRequestSending}
        setPaymentRequestSending={setPaymentRequestSending}
        paymentCallId={paymentCallId}
        setPaymentCallId={setPaymentCallId}
        upsellItems={translatedUpsellItems as any}
        upsellCategories={upsellCategories as any}
        selectedUpsellCat={selectedUpsellCat}
        setSelectedUpsellCat={setSelectedUpsellCat}
        selectedUpsellDish={selectedUpsellDish as any}
        setSelectedUpsellDish={setSelectedUpsellDish as any}
        tS={tS}
        allLabel={tr.client.order.all}
      />
    );
  }


  return (
    <div
      className="relative flex min-h-screen flex-col pt-16"
      style={{ background: bg, color: textPrimC, ["--brand" as any]: brandColor }}
    >
      {isImageBg && (
        <div
          aria-hidden
          style={{
            position: "fixed", inset: 0, zIndex: 0,
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: "cover", backgroundPosition: "center",
            transform: "translateZ(0)", WebkitTransform: "translateZ(0)",
            willChange: "transform", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          }}
        />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes badgePop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .pulse-ring { animation: pulseRing 2.4s ease-out infinite; }
        @keyframes pulseRing { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden pt-40" aria-hidden>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -left-20 -top-10 h-72 w-72 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${effectiveBrand}, transparent 70%)`, opacity: isDark ? 0.14 : 0.18 }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -right-24 top-1/3 h-80 w-80 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${effectiveBrand}, transparent 70%)`, opacity: isDark ? 0.1 : 0.14 }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${effectiveBrand}, transparent 70%)`, opacity: isDark ? 0.08 : 0.1 }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        {isLastPortata && !showEndScreen && !allServed && orders.length > 0 && (
          <LastCourseBanner
            brand={effectiveBrand}
            isDark={isDark}
            onContinue={() => setShowEndScreen(true)}
          />
        )}
        {orders.length === 0 ? (
          <div className="mx-auto w-full max-w-lg pt-20">
            <EmptyOrderState sessionId={sessionId} brand={effectiveBrand} isDark={isDark} />
          </div>
        ) : (
          <main
            className="mx-auto w-full max-w-lg pb-28 pt-20"
            style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}
          >

            {/* REVIEW POPUP */}
      <AnimatePresence>
        {showReview && (
          <>
            <style>{`body { overflow: hidden !important; touch-action: none; }`}</style>

            <motion.div
              key="review-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: reviewMinimized ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0"
              style={{
                zIndex: 120,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                pointerEvents: reviewMinimized ? "none" : "auto",
              }}
              onClick={() => { skipReview(); setReviewMinimized(false); }}
            />

            <motion.div
              key="review-card"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 flex justify-center"
              style={{ zIndex: 121, pointerEvents: "none" }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="relative w-full"
                style={{
                  maxWidth: 480,
                  pointerEvents: "auto",
                  transform: `translateY(calc(${reviewMinimized ? "100% - 68px" : "0px"} + ${reviewDragY}px))`,
                  transition: reviewDragY !== 0 ? "none" : "transform 0.34s cubic-bezier(0.4,0,0.2,1)",
                  willChange: "transform",
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: "#ffffff",
                    borderRadius: "32px 32px 0 0",
                    boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                    maxHeight: "calc(100vh - 180px)",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{ paddingTop: 14, paddingBottom: 4, cursor: "grab", userSelect: "none", touchAction: "none" }}
                    onPointerDown={e => {
                      dragStartY.current = e.clientY;
                      setReviewDragY(0);
                    }}
                    onPointerMove={e => {
                      if (dragStartY.current === null) return;
                      const delta = e.clientY - dragStartY.current;
                      if (Math.abs(delta) > 8 && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }
                      if (reviewMinimized) {
                        if (delta < -44) {
                          setReviewMinimized(false);
                          dragStartY.current = null;
                          setReviewDragY(0);
                        } else {
                          setReviewDragY(Math.min(0, delta));
                        }
                      } else {
                        if (delta > 140) {
                          dragStartY.current = null;
                          setReviewDragY(0);
                          skipReview();
                          setReviewMinimized(false);
                        } else if (delta > 64) {
                          setReviewMinimized(true);
                          dragStartY.current = null;
                          setReviewDragY(0);
                        } else {
                          setReviewDragY(Math.max(0, delta));
                        }
                      }
                    }}
                    onPointerUp={() => {
                      dragStartY.current = null;
                      setReviewDragY(0);
                    }}
                    onPointerCancel={() => { dragStartY.current = null; setReviewDragY(0); }}
                  >
                    <div style={{ margin: "0 auto", width: 44, height: 5, borderRadius: 99, background: "#d4d0cc" }} />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 24px 14px",
                        cursor: "pointer",
                      }}
                      onClick={() => { if (reviewMinimized) setReviewMinimized(false); }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {tS.reviewTitle}
                      </span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: 22, filter: s <= reviewStars ? "none" : "grayscale(1) opacity(0.25)" }}>⭐</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 24px 12px" }}>


                    {!reviewSent ? (
                      <>
                        <h2
                          className="mb-5 text-center font-bold"
                          style={{
                            color: "#1c1917",
                            fontSize: 24,
                            fontFamily: "'Space Grotesk', sans-serif",
                            letterSpacing: "-0.02em",
                            lineHeight: 1.2,
                          }}
                        >
                          {tS.reviewQuestion}
                        </h2>

                        <div className="mb-5 flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <motion.button
                              key={star}
                              type="button"
                              onClick={() => setReviewStars(star)}
                              whileTap={{ scale: 0.78 }}
                              style={{
                                fontSize: 52,
                                lineHeight: 1,
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                display: "block",
                                filter: star <= reviewStars
                                  ? "drop-shadow(0 3px 8px rgba(234,179,8,0.5))"
                                  : "grayscale(1) opacity(0.28)",
                                transition: "filter 0.15s",
                              }}
                            >
                              ⭐
                            </motion.button>
                          ))}
                        </div>

                        {(() => {
                          const rawItems = allActiveItemsRef.current as Array<{ id: string; menu_item_id: string; name: string; portata?: number; picked_up_at?: string | null; delivered_at?: string | null; portata_delivered?: boolean }>;
                          const pickedUpOnly = rawItems.filter(i => !!i.picked_up_at);
                          if (!pickedUpOnly.length) return null;
                          // Ogni riga (order_item) è una recensione a sé: stesso piatto in
                          // portate diverse = due chip distinte, disambiguate col numero portata
                          // quando il nome si ripete.
                          const nameCounts = pickedUpOnly.reduce<Record<string, number>>((acc, i) => {
                            acc[i.name] = (acc[i.name] ?? 0) + 1;
                            return acc;
                          }, {});
                          return (
                            <div style={{ marginBottom: 16 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: "#a8a29e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                                {tS.reviewSelectDish}
                              </p>
                              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                                {pickedUpOnly.map(dish => {
                                  const done = reviewedDishIds.includes(dish.id);
                                  const selected = reviewDishId === dish.id;
                                  const label = nameCounts[dish.name] > 1
                                    ? `${dish.name} · ${tS.reviewCourseLabel(dish.portata ?? 1)}`
                                    : dish.name;
                                  return (
                                    <button key={dish.id} type="button"
                                      disabled={done}
                                      onClick={() => {
                                        if (done) return;
                                        if (selected) { setReviewDishId(null); setReviewDishName(null); }
                                        else { setReviewDishId(dish.id); setReviewDishName(dish.name); }
                                      }}
                                      style={{
                                        flexShrink: 0, borderRadius: 50, padding: "7px 14px",
                                        fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                                        cursor: done ? "default" : "pointer",
                                        border: done ? "2px solid #d1fae5" : selected ? `2px solid ${effectiveBrand}` : "2px solid #e7e5e4",
                                        background: done ? "#d1fae5" : selected ? `${effectiveBrand}15` : "#fafaf8",
                                        color: done ? "#059669" : selected ? effectiveBrand : "#78716c",
                                        transition: "all 0.15s",
                                        opacity: done ? 0.8 : 1,
                                      }}>
                                      {done ? `✓ ${label}` : label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        <textarea
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          placeholder={tS.reviewPlaceholder}
                          rows={3}
                          className="w-full resize-none outline-none"
                          style={{
                            borderRadius: 14,
                            border: `1.5px solid ${effectiveBrand}55`,
                            padding: "12px 16px",
                            fontSize: 16,
                            color: "#1c1917",
                            background: "#fafaf8",
                            fontFamily: "inherit",
                            lineHeight: 1.55,
                          }}
                        />

                        <motion.button
                          type="button"
                          onClick={submitReview}
                          disabled={!reviewStars || !reviewDishId || reviewSending}
                          whileTap={{ scale: 0.97 }}
                          className="mt-4 flex w-full items-center justify-center gap-2 text-white disabled:opacity-40"
                          style={{
                            background: effectiveBrand,
                            borderRadius: 50,
                            padding: "17px 24px",
                            fontSize: 16,
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                            letterSpacing: "-0.01em",
                            boxShadow: `0 6px 20px ${effectiveBrand}44`,
                          }}
                        >
                          {reviewSending ? tS.reviewSending : (
                            <>
                              {tS.reviewSubmit}
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8" strokeOpacity="0.5"/>
                                <path d="M7.5 12l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </>
                          )}
                        </motion.button>

                        <div style={{ textAlign: "center", marginTop: 14, paddingBottom: 8 }}>
                          <button
                            type="button"
                            onClick={skipReview}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 14,
                              fontStyle: "italic",
                              color: "#78716c",
                              textDecoration: "underline",
                              fontFamily: "inherit",
                            }}
                          >
                            {tS.reviewSkip}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                          className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full"
                          style={{ background: `linear-gradient(135deg, ${effectiveBrand}, ${effectiveBrand}cc)`, boxShadow: `0 12px 32px -6px ${effectiveBrand}66` }}
                        >
                          <motion.div
                            initial={{ scale: 1, opacity: 0.4 }}
                            animate={{ scale: 1.6, opacity: 0 }}
                            transition={{ duration: 1.2, delay: 0.3, repeat: Infinity, repeatDelay: 1 }}
                            style={{
                              position: "absolute", inset: 0, borderRadius: "50%",
                              border: `2px solid ${effectiveBrand}`,
                            }}
                          />
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12l4.5 4.5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </motion.div>

                        <h2 className="mb-1 text-[22px] font-bold" style={{ color: "#1c1917", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
                          {tS.reviewSentTitle}
                        </h2>
                        {reviewText ? (
                          <p className="mb-5 text-sm italic" style={{ color: "#78716c" }}>
                            "{reviewText}"
                          </p>
                        ) : (
                          <p className="mb-5 text-sm" style={{ color: "#78716c" }}>
                            {tS.reviewSentFallback}
                          </p>
                        )}

                        <div style={{ height: 3, borderRadius: 2, background: "#e5e5e5", overflow: "hidden" }}>
                          <motion.div
                            key={reviewDishId ?? "sent"}
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            style={{ height: "100%", background: effectiveBrand, borderRadius: 2 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


            <HeroCard
              currentStep={currentStep}
              orders={orders}
              brand={effectiveBrand}
              isDark={isDark}
              restaurantName={restaurantName}
              avgMinutes={avgMinutes}
              activePortataNum={activePortataNum}
              activePortataStartedAt={activePortataStartedAt}
              tick={tick}
            />

            <ProgressSteps
              currentStep={currentStep}
              orders={orders}
              brand={effectiveBrand}
              isDark={isDark}
            />

            <OrderSummaryCard
              orders={orders}
              brand={effectiveBrand}
              isDark={isDark}
              sessionId={sessionId}
              activePortataNum={activePortataNum}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-4"
            >

              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <TabBar
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      counts={counts}
                      badges={badges}
                      clearBadge={clearBadge}
                      isDark={isDark}
                      brand={effectiveBrand}
                    />

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-4"
                      >
                        {tabOrders[activeTab].length === 0
                          ? <EmptyCol label={tabEmpty[activeTab]} isDark={isDark} />
                          : tabOrders[activeTab].map(order => (
                              <Comanda
                                key={order.id}
                                order={order}
                                tick={tick}
                                isDark={isDark}
                                brand={effectiveBrand}
                                restaurantLogo={restaurantLogo}
                                sessionId={sessionId}
                                onCancelled={fetchOrders}
                              />
                            ))
                        }
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </main>
        )}
      </div>

    </div>
  );
}
