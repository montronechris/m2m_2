// src/app/(client)/status/[sessionId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Loader2, ChefHat, CheckCircle, Utensils, Bell, ArrowRight,
} from "lucide-react";
import type { Palette } from "@/components/client/order/palette";

import { getTableSession } from "@/lib/table-session";

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

const STATUS_LABEL_IT: Record<string, string> = {
  confirmed: "In attesa",
  pending:   "In attesa",
  cooking:   "In preparazione",
  ready:     "In consegna",
  served:    "In consegna",
  completed: "Completato",
};

const STATUS_ETA: Record<string, string> = {
  confirmed: "15 min",
  pending:   "15 min",
  cooking:   "8 min",
  ready:     "Pronto!",
  completed: "Servito",
};

const STEP_META: {
  idx: StepIdx;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  { idx: 0, label: "Ordine confermato",  desc: "Pagamento confermato",           Icon: CheckCircle },
  { idx: 1, label: "In preparazione",    desc: "Il ristorante sta cucinando",     Icon: ChefHat },
  { idx: 2, label: "In consegna",        desc: "Il cameriere sta arrivando",      Icon: Bell },
  { idx: 3, label: "Consegnato",         desc: "Buon appetito!",                  Icon: Utensils },
];

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
        cardShadow:    "0 1px 3px rgba(0,0,0,0.5)",
        blobOpacity:   0.25,
      }
    : {
        pageBg:        undefined as string | undefined,
        surface:       "#ffffff",
        surfaceAlt:    "#faf8f3",
        surfaceSoft:   "rgba(0,0,0,0.02)",
        ink:           "#1c1917",
        inkMuted:      "#78716c",
        inkSoft:       "#a8a29e",
        border:        "rgba(0,0,0,0.07)",
        borderSoft:    "rgba(0,0,0,0.05)",
        chipBg:        "rgba(0,0,0,0.03)",
        chipBorder:    "rgba(0,0,0,0.08)",
        cardShadow:    "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px -10px rgba(28,25,23,0.10)",
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
  const mostAdvanced = orders.length > 0
    ? [...orders].sort((a, b) => (STATUS_TO_STEP[b.status] ?? 0) - (STATUS_TO_STEP[a.status] ?? 0))[0]
    : null;

  const etaFallback = mostAdvanced ? STATUS_ETA[mostAdvanced.status] : "—";
  // Tempo rimanente stimato per la portata attiva: tempo medio di consegna
  // meno i minuti già trascorsi da quando questa portata è "iniziata"
  // (conferma ordine per la prima portata, consegna della precedente per le altre).
  const remainingMinutes = (() => {
    if (avgMinutes === null || !activePortataStartedAt) return null;
    const elapsed = Math.floor((Date.now() - new Date(activePortataStartedAt).getTime()) / 60000);
    const remaining = avgMinutes - elapsed;
    return remaining > 0 ? remaining : null; // se il tempo è scaduto, niente countdown — fallback sotto
  })();
  const eta = mostAdvanced && mostAdvanced.status !== "completed" && mostAdvanced.status !== "ready"
    ? (remainingMinutes !== null ? `~${remainingMinutes} min` : (avgMinutes !== null ? "Sta arrivando" : etaFallback))
    : etaFallback;
  const statusLabel = mostAdvanced ? STATUS_LABEL_IT[mostAdvanced.status] : "In attesa";
  const isCompleted = currentStep === 3;

  // progress bar width based on step (0–3)
  const barPct = Math.min(100, (currentStep / 3) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-4 mb-5 mt-4 overflow-hidden rounded-[22px]"
      style={{
        background: brand,
        boxShadow: `0 8px 32px -6px ${brand}88`,
      }}
    >
      <div className="px-4 pt-3 pb-4">
        {/* LIVE chip */}
        <div className="mb-2 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#6ee7b7",
                display: "inline-block",
                animation: "livePulse 2s ease-in-out infinite",
              }}
            />
            LIVE
          </span>
          {mostAdvanced && (
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
              {formatTime(mostAdvanced._displayTime || mostAdvanced.created_at)}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div style={{ overflow: "hidden" }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={isCompleted ? "completato" : activePortataNum != null ? `avanzamento-${activePortataNum}` : "stimato"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginBottom: 2 }}
              >
                {isCompleted ? "Completato" : activePortataNum != null ? `Avanzamento · Portata ${activePortataNum}` : "Tempo stimato"}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={eta}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  color: "#fff",
                  fontSize: 32,
                  fontWeight: 800,
                  lineHeight: 1,
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "-0.03em",
                }}
              >
                {eta}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={statusLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 3 }}
              >
                {statusLabel}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Circle icon */}
          <div style={{
            width: 44, height: 44,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.30)",
            background: "rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 15 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {isCompleted
                  ? <CheckCircle style={{ width: 24, height: 24, color: "#fff" }} />
                  : currentStep === 2
                  ? <Bell style={{ width: 24, height: 24, color: "#fff" }} />
                  : currentStep === 1
                  ? <ChefHat style={{ width: 24, height: 24, color: "#fff" }} />
                  : <Clock style={{ width: 24, height: 24, color: "#fff" }} />
                }
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 4-step segmented bar */}
        <div style={{ marginTop: 12, display: "flex", gap: 4 }}>
          {[0, 1, 2, 3].map(step => (
            <motion.div
              key={step}
              initial={false}
              animate={{ background: step <= currentStep ? "#6ee7b7" : "rgba(255,255,255,0.20)" }}
              transition={{ duration: 0.4 }}
              style={{ flex: 1, height: 6, borderRadius: 3 }}
            />
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

  // Map step → timestamp from orders
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="mx-4 mb-3 overflow-hidden rounded-[20px] px-4 pt-3 pb-1"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
      }}
    >
      <p className="mb-3 text-[13px] font-bold" style={{ color: t.inkMuted, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11 }}>
        Avanzamento
      </p>

      <ol>
        {STEP_META.map(({ idx, label, desc, Icon }, i) => {
          const isDone    = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isPending = idx > currentStep;
          const isLast    = i === STEP_META.length - 1;

          const circleColor  = isDone || isCurrent ? brand : isDark ? "#3a3633" : "#e7e5e4";
          const iconColor    = isDone || isCurrent ? "#fff" : t.inkSoft;
          const badgeLabel   = isDone || (isCurrent && isLast) ? "Fatto" : isCurrent ? "In corso" : null;
          const badgeBg      = isDone ? `${brand}1a` : `${brand}15`;
          const badgeText    = isDone || isCurrent ? brand : t.inkSoft;
          const ts           = stepTime[idx];

          return (
            <li key={idx} className="flex gap-3" style={{ position: "relative", paddingBottom: isLast ? 8 : 20 }}>
              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 26,
                    bottom: 0,
                    width: 2,
                    background: isDone ? `${brand}55` : isDark ? "#2a2520" : "#f0ede8",
                    borderRadius: 1,
                  }}
                  aria-hidden
                />
              )}

              {/* Step circle */}
              <div
                style={{
                  width: 26, height: 26,
                  borderRadius: "50%",
                  background: circleColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  zIndex: 1,
                  boxShadow: (isDone || isCurrent) ? `0 4px 12px -3px ${brand}60` : "none",
                  transition: "background 0.3s",
                }}
              >
                {isDone
                  ? <CheckCircle style={{ width: 14, height: 14, color: iconColor }} />
                  : <Icon style={{ width: 13, height: 13, color: iconColor }} />
                }
              </div>

              {/* Text */}
              <div className="flex-1" style={{ paddingTop: 2 }}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isPending ? t.inkSoft : t.ink,
                    }}
                  >
                    {label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {badgeLabel && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: badgeBg,
                          color: badgeText,
                          border: `1px solid ${brand}33`,
                        }}
                      >
                        {badgeLabel}
                      </span>
                    )}
                    {ts && !isPending && (
                      <span style={{ fontSize: 10, color: t.inkSoft }}>
                        {formatTime(ts)}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: t.inkSoft, marginTop: 1 }}>
                  {desc}
                </p>
              </div>
            </li>
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
  const totalItems  = orders.reduce((s, o) => s + o.items.reduce((si, it) => si + it.quantity, 0), 0);
  const totalCents  = orders.reduce((s, o) => s + o.total_cents, 0);

  // Mostra solo gli item della portata attualmente in preparazione
  const visibleItems = activePortataNum != null
    ? orders.flatMap(o => o.items).filter(it => (it.portata ?? 1) === activePortataNum)
    : orders.flatMap(o => o.items);
  const visibleCount = visibleItems.reduce((s, it) => s + it.quantity, 0);

  // Flatten unique items for thumbnails (first 4)
  const thumbItems = visibleItems
    .sort((a, b) => (a.portata ?? 1) - (b.portata ?? 1))
    .slice(0, 4);

  const [expanded, setExpanded] = React.useState(false);

  // Flatten all items across orders, keeping order status for each
  const allItems = orders.flatMap(o => {
    const isPending = o.status === "confirmed" || o.status === "pending";
    const isCooking = o.status === "cooking";
    const accent = isPending ? brand : isCooking ? "#3b82f6" : "#22c55e";
    const statusLabel = isPending ? "In attesa" : isCooking ? "In cucina" : "Pronto";
    return o.items.map(it => ({ ...it, accent, statusLabel, priceCents: o.total_cents / o.items.reduce((s, i) => s + i.quantity, 0) }));
  })
    .filter(it => activePortataNum == null || (it.portata ?? 1) === activePortataNum)
    .sort((a, b) => (a.portata ?? 1) - (b.portata ?? 1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 left-0 right-0 z-30 overflow-hidden rounded-t-[20px]"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: "0 -4px 24px rgba(0,0,0,0.10)" }}
    >
      {/* Header — tap to expand/collapse */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
        style={{ borderBottom: expanded ? `1px solid ${t.borderSoft}` : "none" }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: t.ink }}>Il tuo ordine</span>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: t.inkSoft }}>
            {visibleCount} {visibleCount === 1 ? "articolo" : "articoli"} · € {formatPrice(totalCents)}
          </span>
          <motion.svg
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={t.inkSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </motion.svg>
        </div>
      </button>

      {/* Thumbnails — always visible */}
      <div className="flex items-center gap-2 px-4 py-3">
        {thumbItems.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            style={{
              width: 46, height: 46, borderRadius: 12, overflow: "hidden",
              background: `${brand}1a`, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${brand}22`,
            }}
          >
            {item.image_url
              ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 20 }}>{["🍔","🥗","🍜","🍰","🍕","🥩","🍷","🍮"][i % 8]}</span>
            }
          </div>
        ))}
        {visibleCount > 4 && (
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: t.surfaceSoft, border: `1px solid ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: t.inkMuted,
          }}>
            +{visibleCount - 4}
          </div>
        )}
      </div>

      {/* Expanded item list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="item-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            {allItems.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="flex items-center justify-between px-4 py-2"
                style={{ borderTop: `1px solid ${t.borderSoft}` }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span style={{ fontSize: 12, fontWeight: 500, color: t.ink }} className="truncate">
                    {item.name}
                  </span>
                  <span style={{ fontSize: 11, color: t.inkMuted, flexShrink: 0 }}>×{item.quantity}</span>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 10, fontWeight: 700,
                    background: `${item.accent}18`, color: item.accent,
                    border: `1px solid ${item.accent}30`,
                    borderRadius: 20, padding: "2px 8px",
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: item.accent, display: "inline-block",
                      animation: "livePulse 2s ease-in-out infinite",
                    }} />
                    {item.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── COMANDA CARD (expanded detail, used in tab view) ─────────────────────────

function Comanda({
  order,
  tick,
  isDark,
  brand,
  restaurantLogo,
}: {
  order: Order;
  tick: number;
  isDark: boolean;
  brand: string;
  restaurantLogo?: string | null;
}) {
  const t = themeTokens(isDark);
  const displayTime = order._displayTime || order.created_at;
  const isPending = order.status === "confirmed" || order.status === "pending";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";

  const accent =
    isPending ? "#f59e0b" :
    isCooking ? "#3b82f6" :
                "#22c55e";
  const accentSoft   = `${accent}1a`;
  const accentBorder = `${accent}40`;
  const statusLabel =
    isPending ? "In attesa" :
    isCooking ? "In cucina" :
                "Pronto";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        boxShadow: t.cardShadow,
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${brand} 80%)` }} />

      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${t.borderSoft}` }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-black tracking-wider"
            style={{
              background: accentSoft, color: accent,
              border: `1px solid ${accentBorder}`,
              fontFamily: "'Courier New', monospace",
            }}
          >
            #{shortId(order.id)}
          </span>
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold leading-tight flex items-center gap-1.5" style={{ color: t.ink }}>
              {restaurantLogo ? (
                <span className="inline-block h-5 w-5 shrink-0 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5">
                  <img src={restaurantLogo} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
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
          <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, display: "inline-block", animation: "livePulse 2s ease-in-out infinite" }} />
          {statusLabel}
        </span>
      </div>

      <div className="px-4 py-3">
        {order.items.length === 0 ? (
          <p className="py-3 text-sm italic" style={{ color: t.inkSoft }}>Nessun prodotto</p>
        ) : (
          <ul className="space-y-3">
            {order.items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.26, delay: 0.04 * i, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <span
                  className="mt-0.5 grid h-7 min-w-[28px] shrink-0 place-items-center rounded-lg px-1.5 text-sm font-extrabold tabular-nums"
                  style={{ background: accentSoft, color: accent }}
                >
                  {item.quantity}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug" style={{ color: t.ink }}>{item.name}</p>
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

      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${t.borderSoft}` }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.inkSoft }}>Totale</span>
        <span className="font-serif text-base font-bold" style={{ color: t.ink }}>€ {formatPrice(order.total_cents)}</span>
      </div>
    </motion.article>
  );
}

// ─── EMPTY COL ────────────────────────────────────────────────────────────────

function EmptyCol({ label, isDark }: { label: string; isDark: boolean }) {
  const t = themeTokens(isDark);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-2xl px-4 py-12 text-center"
      style={{ border: `1px dashed ${t.border}`, background: t.surfaceSoft }}
    >
      <Clock className="mx-auto mb-3 h-7 w-7 opacity-40" style={{ color: t.inkSoft }} />
      <p className="text-sm font-medium" style={{ color: t.inkSoft }}>{label}</p>
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
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "attesa", label: "In attesa", icon: <Clock size={16} /> },
    { key: "cucina", label: "In cucina", icon: <ChefHat size={16} /> },
    { key: "pronti", label: "Pronti",    icon: <CheckCircle size={16} /> },
  ];
  const brandText = `color-mix(in srgb, ${brand} 78%, #000)`;

  return (
    <div
      className="mb-5 flex items-stretch gap-1 rounded-2xl p-1.5"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}
    >
      {tabs.map(({ key, label, icon }) => {
        const isActive = activeTab === key;
        const badge = badges[key];
        const count = counts[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => { setActiveTab(key); clearBadge(key); }}
            className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition"
            aria-pressed={isActive}
          >
            {isActive && (
              <motion.div layoutId="status-tab-fill" className="absolute inset-0 rounded-xl"
                style={{ background: `color-mix(in srgb, ${brand} 10%, transparent)` }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {isActive && (
              <motion.div layoutId="status-tab-underline" className="absolute bottom-1 left-1/2 h-[3px] -translate-x-1/2 rounded-full"
                style={{ background: brand, width: 26 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-1.5" style={{ color: isActive ? brandText : t.inkSoft }}>
              <span className="relative">
                {icon}
                {badge > 0 && !isActive && (
                  <span
                    className="absolute -right-2 -top-2 grid min-w-[14px] place-items-center rounded-full px-1 text-[9px] font-black text-white"
                    style={{ background: "#ef4444", height: 14, boxShadow: `0 0 0 2px ${t.surface}`, animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
                  >
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[12px] font-bold tracking-tight">{label}</span>
            </div>
            <span
              className="relative z-10 grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums"
              style={{ background: isActive ? brand : t.chipBg, color: isActive ? "#fff" : t.inkMuted, border: isActive ? "none" : `1px solid ${t.chipBorder}` }}
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
      {/* hero skeleton */}
      <div className="shimmer rounded-[22px] h-36" style={{ background: `${brand}33` }} />
      {/* steps skeleton */}
      <div className="shimmer rounded-[20px] h-48" style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }} />
      {/* order skeleton */}
      <div className="shimmer rounded-[20px] h-28" style={{ background: t.surface, border: `1px solid ${t.border}` }} />
    </div>
  );
}

// ─── EMPTY ORDER STATE ────────────────────────────────────────────────────────

function EmptyOrderState({ sessionId, brand, isDark }: { sessionId: string; brand: string; isDark: boolean }) {
  const t = themeTokens(isDark);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative grid place-items-center"
      >
        <span aria-hidden className="pulse-ring absolute inset-0 rounded-3xl" style={{ background: `color-mix(in srgb, ${brand} 18%, transparent)` }} />
        <div className="grid h-20 w-20 place-items-center rounded-3xl text-white" style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 60%, #000))`, boxShadow: `0 16px 40px -8px color-mix(in srgb, ${brand} 55%, transparent)` }}>
          <Utensils className="h-9 w-9" />
        </div>
      </motion.div>
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-semibold" style={{ color: t.ink }}>Nessun ordine attivo</h2>
        <p className="mx-auto max-w-xs text-sm" style={{ color: t.inkMuted }}>Non hai ancora ordinato nulla per questo tavolo. Scopri il menù e inizia la tua esperienza.</p>
      </div>
      <Link
        href={`/order/${sessionId}`}
        className="group inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 60%, #000))`, boxShadow: `0 12px 28px -6px color-mix(in srgb, ${brand} 55%, transparent)` }}
      >
        Torna al menù
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const params    = useParams();
  const sessionId = params?.sessionId as string;

  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [tick,        setTick]        = useState(0);
  const [activeTab,   setActiveTab]   = useState<TabKey>("attesa");
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

  // Popup recensione
  const [allServed,       setAllServed]       = useState(false);
  const [activePortataNum, setActivePortataNum] = useState<number | null>(null);
  const [activePortataStartedAt, setActivePortataStartedAt] = useState<string | null>(null);
  const [showReview,      setShowReview]      = useState(false);
  const [reviewMinimized, setReviewMinimized] = useState(false);
  const [reviewStars,     setReviewStars]     = useState(0);
  const [reviewText,      setReviewText]      = useState("");
  const [reviewSending,   setReviewSending]   = useState(false);
  const [reviewSent,      setReviewSent]      = useState(false);
  const reviewShownRef  = useRef(false);
  const deliveredCountRef = useRef(0);
  const [lastDeliveredPortata, setLastDeliveredPortata] = useState<number | null>(null);
  const dragStartY      = useRef<number | null>(null);
  const [reviewDragY,   setReviewDragY]      = useState(0);

  // Listener: la stellina nell'header riapre la card
  useEffect(() => {
    const handler = () => {
      setShowReview(true);
      setReviewMinimized(false);
      window.dispatchEvent(new CustomEvent("review-opened"));
    };
    window.addEventListener("open-review", handler);
    return () => window.removeEventListener("open-review", handler);
  }, []);

  // Sezione "dettaglio" espandibile
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

  const bg =
    backgroundType === "image" && backgroundImageUrl
      ? `url(${backgroundImageUrl}) center/cover no-repeat fixed`
      : backgroundType === "color" && backgroundImageUrl
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
        } else if (resolvedRestaurantId) {
          const { data: tbl } = await supabase.from("tables").select("id").eq("restaurant_id", resolvedRestaurantId).maybeSingle();
          if (tbl) resolvedTableId = tbl.id;
        }
        if (resolvedTableId) {
          const { data: tableData } = await supabase.from("tables").select("label").eq("id", resolvedTableId).maybeSingle();
          if (tableData?.label) resolvedTableNumber = tableData.label;
        }
        if (!resolvedTableNumber && qrSession.table_number != null) {
          resolvedTableNumber = String(qrSession.table_number);
        }
      }

      if (!resolvedTableId) {
        const { data: tqr } = await supabase.from("table_qr_sessions").select("id, restaurant_id, table_number").eq("id", sessionId).maybeSingle();
        if (tqr) {
          resolvedRestaurantId = tqr.restaurant_id;
          const { data: tbl } = await supabase.from("tables").select("id, label").eq("restaurant_id", tqr.restaurant_id).maybeSingle();
          if (tbl) {
            resolvedTableId = tbl.id;
            resolvedTableNumber = tbl.label || (tqr.table_number != null ? String(tqr.table_number) : null);
          }
          if (!resolvedTableId) {
            resolvedTableId = tqr.id;
            resolvedTableNumber = tqr.table_number != null ? String(tqr.table_number) : null;
          }
        }
      }

      if (!resolvedTableId) { setOrders([]); setLoading(false); return; }
      if (resolvedTableNumber) setTableNumber(resolvedTableNumber);

      const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: ordersData, error: ordErr } = await supabase
        .from("orders").select("*")
        .eq("table_id", resolvedTableId)
        .in("status", ["confirmed", "cooking", "ready", "served"])
        .not("confirmed_at", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (ordErr) throw ordErr;
      if (!ordersData?.length) { setOrders([]); setLoading(false); return; }

      const orderIds = ordersData.map(o => o.id);
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("id, order_id, menu_item_id, name_snapshot, name, quantity, base_price, portata, note, customizations, portata_completed, portata_delivered, picked_up_at, delivered_at")
        .in("order_id", orderIds);

      const menuItemIds = [...new Set((itemsData || []).map(i => i.menu_item_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      let imageMap: Record<string, string | null> = {};
      if (menuItemIds.length) {
        const { data: menuItems } = await supabase.from("menu_items").select("id, name, image_url").in("id", menuItemIds);
        (menuItems || []).forEach(m => { nameMap[m.id] = m.name; imageMap[m.id] = (m as any).image_url ?? null; });
      }

      const formatted: Order[] = ordersData.map(order => {
        const orderItems = (itemsData || []).filter(i => i.order_id === order.id);
        const computedTotalCents = orderItems.reduce((sum, i) => sum + Math.round((i.base_price ?? 0) * 100) * (i.quantity ?? 1), 0);

        // Calcola displayStatus basandosi sulla portata attiva:
        // la portata con numero più basso non ancora completamente ritirata.
        let displayStatus = order.status as Order["status"];
        if (displayStatus === "cooking" || displayStatus === "ready") {
          // Raggruppa items per portata
          const portateNums = [...new Set(orderItems.map(i => i.portata ?? 1))].sort((a, b) => a - b);
          // La portata attiva è la prima in cui non tutti i piatti sono stati ritirati
          const activePortata = portateNums.find(p =>
            orderItems.filter(i => (i.portata ?? 1) === p).some(i => !i.picked_up_at)
          );
          const activeItems = activePortata != null
            ? orderItems.filter(i => (i.portata ?? 1) === activePortata)
            : orderItems;
          const anyDelivered = activeItems.some(i => i.portata_delivered);
          const anyCompleted = activeItems.some(i => i.portata_completed);
          if (anyDelivered)      displayStatus = "served"; // step 3 — Consegnato
          else if (anyCompleted) displayStatus = "ready";  // step 2 — In consegna
          else                   displayStatus = "cooking"; // step 1 — In preparazione
          setActivePortataNum(activePortata ?? null);

          // Timestamp di "partenza" della portata attiva: per la prima portata
          // è la conferma dell'ordine; per le portate successive è il momento
          // in cui è stata consegnata l'ultima portata precedente.
          if (activePortata != null && activePortata > 1) {
            const prevItems = orderItems.filter(i => (i.portata ?? 1) < activePortata && i.delivered_at);
            const prevDeliveredTimes = prevItems.map(i => new Date(i.delivered_at as string).getTime());
            const lastPrevDelivered = prevDeliveredTimes.length ? Math.max(...prevDeliveredTimes) : null;
            setActivePortataStartedAt(lastPrevDelivered != null ? new Date(lastPrevDelivered).toISOString() : (order.confirmed_at ?? null));
          } else {
            setActivePortataStartedAt(order.confirmed_at ?? null);
          }
        }

        return {
          ...order,
          status: displayStatus,
          _displayTime: order.confirmed_at || order.updated_at || order.created_at,
          total_cents: computedTotalCents > 0 ? computedTotalCents : (order.total_cents ?? 0),
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
          })),
        };
      });

      const newPending = formatted.filter(o => o.status === "confirmed" || o.status === "pending").length;
      const newCooking = formatted.filter(o => o.status === "cooking").length;
      const newReady   = formatted.filter(o => o.status === "ready").length;

      if (!isFirstLoad.current) {
        setBadges(prev => ({
          attesa: activeTab !== "attesa" && newPending > prevCountsRef.current.attesa ? prev.attesa + (newPending - prevCountsRef.current.attesa) : prev.attesa,
          cucina: activeTab !== "cucina" && newCooking > prevCountsRef.current.cucina ? prev.cucina + (newCooking - prevCountsRef.current.cucina) : prev.cucina,
          pronti: activeTab !== "pronti" && newReady   > prevCountsRef.current.pronti ? prev.pronti + (newReady   - prevCountsRef.current.pronti) : prev.pronti,
        }));
        if (newReady > prevCountsRef.current.pronti && activeTab !== "pronti") {
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
      } else {
        isFirstLoad.current = false;
      }

      prevCountsRef.current = { attesa: newPending, cucina: newCooking, pronti: newReady };
      // Mostra solo l'ordine più recente — i nuovi sovrascrivono il precedente
      const latestOrder = formatted.length ? formatted[formatted.length - 1] : null;
      setOrders(latestOrder ? [latestOrder] : []);
      if (latestOrder && (ordersData[ordersData.length - 1] as any)?.payment_method) {
        setPaymentMethod((ordersData[ordersData.length - 1] as any).payment_method);
      }

      // allDone usa lo status reale del DB (non il displayStatus override)
      const allDone = ordersData.length > 0 && ordersData.every(o => o.status === "served" || o.status === "completed");
      if (allDone) {
        setAllServed(true);
        if (!reviewShownRef.current) {
          reviewShownRef.current = true;
          setTimeout(() => { setShowReview(true); setReviewMinimized(false); }, 600);
        }
      } else {
        // Popup recensione ogni volta che una nuova portata viene consegnata
        const allItems = (itemsData ?? []) as any[];
        // Considera solo gli items di ordini ancora attivi (cooking/ready), non quelli già serviti
        const activeOrderIds = new Set(ordersData.filter(o => o.status === "cooking" || o.status === "ready").map(o => o.id));
        const activeItems = activeOrderIds.size > 0 ? allItems.filter(i => activeOrderIds.has(i.order_id)) : allItems;
        const deliveredItems = activeItems.filter((i) => i.portata_delivered);
        const deliveredCount = deliveredItems.length;
        if (!isFirstLoad.current && deliveredCount > deliveredCountRef.current) {
          const portateNums = [...new Set(deliveredItems.map((i) => i.portata ?? 1))].sort((a: number, b: number) => a - b);
          setLastDeliveredPortata(portateNums[0] ?? null);
          // rileva se tutte le portate sono state consegnate
          const allPortate = [...new Set(activeItems.map((i) => i.portata ?? 1))];
          const allDelivered = allPortate.every(p => activeItems.filter(i => (i.portata ?? 1) === p).some(i => i.portata_delivered));
          if (allDelivered) setIsLastPortata(true);
          deliveredCountRef.current = deliveredCount;
          setTimeout(() => { setShowReview(true); setReviewMinimized(false); }, 800);
        } else if (deliveredCount !== deliveredCountRef.current) {
          deliveredCountRef.current = deliveredCount;
        }
      }
    } catch (err: any) {
      console.error("[StatusPage] fetchOrders:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, activeTab]);

  useEffect(() => {
    if (!sessionId) return;
    fetchOrders();
    const channel = supabase.channel(`status_realtime_${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" },      fetchOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, fetchOrders)
      .subscribe();
    const pollInterval = setInterval(fetchOrders, 3_000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(pollInterval); clearInterval(tickInterval); };
  }, [sessionId, fetchOrders]);

  const pending = orders.filter(o => o.status === "confirmed" || o.status === "pending");
  const cooking = orders.filter(o => o.status === "cooking");
  const ready   = orders.filter(o => o.status === "ready");
  const counts  = { attesa: pending.length, cucina: cooking.length, pronti: ready.length };

  const clearBadge = (tab: TabKey) => setBadges(prev => ({ ...prev, [tab]: 0 }));
  const tabOrders: Record<TabKey, Order[]> = { attesa: pending, cucina: cooking, pronti: ready };
  const tabEmpty:  Record<TabKey, string>  = {
    attesa: "Nessun ordine in attesa",
    cucina: "Nessun ordine in cucina",
    pronti: "Nessun ordine pronto",
  };

  const submitReview = async () => {
    if (!reviewStars || !restaurantId) return;
    setReviewSending(true);
    try {
      await supabase.from("reviews").insert({
        restaurant_id: restaurantId,
        stars:         reviewStars,
        text:          reviewText.trim() || null,
        session_id:    sessionId,
        table_number:  tableNumber,
      });
      setReviewSent(true);
    } catch (e) {
      console.error("[ReviewPopup] submit:", e);
    } finally {
      setReviewSending(false);
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

  // ── Tutti gli ordini serviti: mostra solo la schermata di recensione ──────
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
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55))" }} />

        <motion.div
          className="relative z-10 mx-4 mb-8 w-full max-w-sm overflow-hidden rounded-[24px] bg-white"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.22)" }}
        >
          {/* Header */}
          <div className="px-6 pt-7 pb-5 text-center" style={{ background: brandColor }}>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl mx-auto">✅</div>
            <h1 className="text-xl font-bold text-white">Ordine completato!</h1>
            <p className="mt-1 text-sm text-white/75">Grazie per aver cenato con noi</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Pagamento */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Metodo di pagamento</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{paymentIcon}</span>
                <div>
                  <p className="font-semibold text-stone-800">{paymentLabel}</p>
                  <p className="text-[12px] text-stone-500">{paymentNote}</p>
                </div>
              </div>
            </div>

            {/* Social / links */}
            {(instagram || facebook || website || googleReviewUrl || tripadvisorUrl || phone) && (
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
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
              </div>
            )}

            <p className="text-center text-[12px] text-stone-400 pb-1">
              {restaurantName ?? "Il ristorante"} ti ringrazia 🙏
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (allServed) {
    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-end"
        style={{ background: bg, ["--brand" as any]: brandColor }}
      >
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        `}</style>

        {/* Card recensione centrata */}
        <div
          style={{
            position: "relative", zIndex: 1,
            width: "100%", maxWidth: 480,
            background: "#fff",
            borderRadius: "32px 32px 0 0",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            padding: "0 24px max(36px, env(safe-area-inset-bottom))",
            animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Pill handle (non draggable in questa vista) */}
          <div style={{ paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ margin: "0 auto", width: 36, height: 4, borderRadius: 99, background: "#d4d0cc" }} />
          </div>

          {/* Badge utensili */}
          <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 20px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: effectiveBrand,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 24px ${effectiveBrand}55`,
            }}>
              <Utensils size={26} color="#fff" />
            </div>
          </div>

          {!reviewSent ? (
            <>
              <p className="mb-1 text-center text-[14px]" style={{ color: "#78716c" }}>
                {tableNumber ? `Tavolo ${tableNumber}` : "Il tuo ordine"} · tutto servito 🎉
              </p>
              <h2 className="mb-5 text-center font-bold" style={{ color: "#1c1917", fontSize: 24, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Com'è stata l'esperienza?
              </h2>

              <div className="mb-5 flex justify-center gap-1">
                {[1,2,3,4,5].map(star => (
                  <motion.button key={star} type="button" onClick={() => setReviewStars(star)} whileTap={{ scale: 0.78 }}
                    style={{ fontSize: 52, lineHeight: 1, background: "none", border: "none", padding: 0, cursor: "pointer", display: "block",
                      filter: star <= reviewStars ? "drop-shadow(0 3px 8px rgba(234,179,8,0.5))" : "grayscale(1) opacity(0.28)", transition: "filter 0.15s" }}>
                    ⭐
                  </motion.button>
                ))}
              </div>

              <textarea
                value={reviewText} onChange={e => setReviewText(e.target.value)}
                placeholder="Raccontaci la tua esperienza (opzionale)…" rows={3}
                className="w-full resize-none outline-none"
                style={{ borderRadius: 14, border: `1.5px solid ${effectiveBrand}55`, padding: "12px 16px", fontSize: 14, color: "#1c1917", background: "#fafaf8", fontFamily: "inherit", lineHeight: 1.55 }}
              />

              <motion.button type="button" onClick={submitReview} disabled={!reviewStars || reviewSending} whileTap={{ scale: 0.97 }}
                className="mt-4 flex w-full items-center justify-center gap-2 text-white disabled:opacity-40"
                style={{ background: effectiveBrand, borderRadius: 50, padding: "17px 24px", fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer", letterSpacing: "-0.01em", boxShadow: `0 6px 20px ${effectiveBrand}44` }}>
                {reviewSending ? "Invio…" : (<>Invia <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8" strokeOpacity="0.5"/><path d="M7.5 12l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></>)}
              </motion.button>

              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button type="button" onClick={() => setAllServed(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontStyle: "italic", color: "#78716c", textDecoration: "underline", fontFamily: "inherit" }}>
                  Salta
                </button>
              </div>
            </>
          ) : (
            /* Stato inviato */
            <div className="text-center pb-4">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full"
                style={{ background: effectiveBrand, boxShadow: `0 8px 24px -4px ${effectiveBrand}66` }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l4.5 4.5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
              <h2 className="mb-1 text-[22px] font-bold" style={{ color: "#1c1917", fontFamily: "'Space Grotesk', sans-serif" }}>Grazie mille! 🙏</h2>
              <p className="mb-6 text-sm" style={{ color: "#78716c" }}>Buona giornata!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col pt-16"
      style={{ background: bg, color: textPrimC, ["--brand" as any]: brandColor }}
    >
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
        <div className="absolute -left-20 -top-10 h-72 w-72 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${effectiveBrand}, transparent 70%)`, opacity: isDark ? 0.12 : 0.16 }} />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${effectiveBrand}, transparent 70%)`, opacity: isDark ? 0.08 : 0.12 }} />
      </div>

      {/* Navbar ora fornita dal layout condiviso src/app/(client)/layout.tsx:
          resta montata durante la navigazione tra /status e /order, niente reload. */}

      <div className="relative z-10 flex flex-1 flex-col">
        {orders.length === 0 ? (
          <div className="mx-auto w-full max-w-lg pt-20">
            <EmptyOrderState sessionId={sessionId} brand={effectiveBrand} isDark={isDark} />
          </div>
        ) : (
          <main
            className="mx-auto w-full max-w-lg pb-28 pt-20"
            style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}
          >

            {/* ── REVIEW POPUP ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showReview && (
          <>
            {/* Overlay — visibile solo quando espansa */}
            <motion.div
              key="review-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: reviewMinimized ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-50"
              style={{
                background: "rgba(0,0,0,0.38)",
                backdropFilter: "blur(3px)",
                pointerEvents: reviewMinimized ? "none" : "auto",
              }}
              onClick={() => { if (!reviewMinimized) setReviewMinimized(true); }}
            />

            {/* Wrapper di entrata/uscita (framer gestisce solo slide-in/out iniziale) */}
            <motion.div
              key="review-card"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
              style={{ pointerEvents: "none" }}
            >
              {/* Inner div: gestisce minimize/expand + drag in real-time via CSS */}
              <div
                className="relative w-full"
                style={{
                  maxWidth: 480,
                  pointerEvents: "auto",
                  transform: `translateY(calc(${reviewMinimized ? "100% - 68px" : "0px"} + ${reviewDragY}px))`,
                  transition: reviewDragY !== 0 ? "none" : "transform 0.38s cubic-bezier(0.22,1,0.36,1)",
                  willChange: "transform",
                }}
              >
                {/* Card: sempre full-height, il translateY la nasconde parzialmente */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "32px 32px 0 0",
                    boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                  }}
                >
                  {/* ── DRAG HANDLE ── */}
                  <div
                    style={{ paddingTop: 12, cursor: "grab", userSelect: "none", touchAction: "none" }}
                    onPointerDown={e => {
                      dragStartY.current = e.clientY;
                      setReviewDragY(0);
                    }}
                    onPointerMove={e => {
                      if (dragStartY.current === null) return;
                      const delta = e.clientY - dragStartY.current;
                      if (Math.abs(delta) > 6 && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
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
                        if (delta > 64) {
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
                    {/* Pill handle */}
                    <div style={{ margin: "0 auto", width: 36, height: 4, borderRadius: 99, background: "#d4d0cc" }} />

                    {/* Riga minimale — visibile quando la card è abbassata */}
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
                        Recensisci
                      </span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: 22, filter: s <= reviewStars ? "none" : "grayscale(1) opacity(0.25)" }}>⭐</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── CONTENUTO PIENO — sempre nel DOM, nascosto dal translateY ── */}
                  <div style={{ padding: "0 24px 12px" }}>

                    {/* Badge utensili */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          background: effectiveBrand,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 8px 24px ${effectiveBrand}55`,
                        }}
                      >
                        <Utensils size={26} color="#fff" />
                      </div>
                    </div>

                    {!reviewSent ? (
                      <>
                        {/* Sottotitolo portata/tavolo */}
                        <p className="mb-1 text-center text-[14px]" style={{ color: "#78716c" }}>
                          {lastDeliveredPortata != null
                            ? `Portata ${lastDeliveredPortata} in arrivo al tavolo ${tableNumber ?? "—"}`
                            : `Ordine in arrivo al tavolo ${tableNumber ?? "—"}`
                          }
                        </p>

                        {/* Titolo */}
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
                          Com'è stata l'esperienza?
                        </h2>

                        {/* Stelle grandi */}
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

                        {/* Textarea */}
                        <textarea
                          value={reviewText}
                          onChange={e => setReviewText(e.target.value)}
                          placeholder="Raccontaci la tua esperienza (opzionale)…"
                          rows={3}
                          className="w-full resize-none outline-none"
                          style={{
                            borderRadius: 14,
                            border: `1.5px solid ${effectiveBrand}55`,
                            padding: "12px 16px",
                            fontSize: 14,
                            color: "#1c1917",
                            background: "#fafaf8",
                            fontFamily: "inherit",
                            lineHeight: 1.55,
                          }}
                        />

                        {/* Bottone Invia */}
                        <motion.button
                          type="button"
                          onClick={submitReview}
                          disabled={!reviewStars || reviewSending}
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
                          {reviewSending ? "Invio…" : (
                            <>
                              Invia
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8" strokeOpacity="0.5"/>
                                <path d="M7.5 12l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </>
                          )}
                        </motion.button>

                        {/* Salta */}
                        <div style={{ textAlign: "center", marginTop: 14, paddingBottom: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowReview(false);
                              window.dispatchEvent(new CustomEvent("review-skipped"));
                            }}
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
                            Salta
                          </button>
                        </div>
                      </>
                    ) : (
                      /* ── STATO INVIATO ── */
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full"
                          style={{ background: effectiveBrand, boxShadow: `0 8px 24px -4px ${effectiveBrand}66` }}
                        >
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12l4.5 4.5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </motion.div>

                        <h2 className="mb-1 text-[22px] font-bold" style={{ color: "#1c1917", fontFamily: "'Space Grotesk', sans-serif" }}>
                          Grazie mille! 🙏
                        </h2>
                        <p className="mb-6 text-sm" style={{ color: "#78716c" }}>
                          Vuoi condividere la tua opinione anche online?
                        </p>

                        <div className="flex flex-col gap-3">
                          {googleReviewUrl && (
                            <a
                              href={googleReviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2.5 text-[14px] font-semibold transition active:scale-[0.97]"
                              style={{ border: "1.5px solid #e5e5e5", color: "#1c1917", background: "#fafafa", borderRadius: 50, padding: "14px 24px" }}
                            >
                              <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                                <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 15.8 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                                <path fill="#FBBC05" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.9 36 24 36c-5.2 0-9.6-3.2-11.3-7.8l-6.6 5C9.6 39.5 16.3 44 24 44z"/>
                                <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l6.2 5.2C41.4 36.4 44 30.8 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                              </svg>
                              Pubblica su Google
                            </a>
                          )}
                          {tripadvisorUrl && (
                            <a
                              href={tripadvisorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2.5 text-[14px] font-semibold transition active:scale-[0.97]"
                              style={{ border: "1.5px solid #e5e5e5", color: "#1c1917", background: "#fafafa", borderRadius: 50, padding: "14px 24px" }}
                            >
                              <svg width="20" height="14" viewBox="0 0 209 144" fill="none">
                                <ellipse cx="34.5" cy="109.5" rx="34.5" ry="34.5" fill="#34E0A1"/>
                                <ellipse cx="174.5" cy="109.5" rx="34.5" ry="34.5" fill="#34E0A1"/>
                                <ellipse cx="34.5" cy="109.5" rx="18" ry="18" fill="#fff"/>
                                <ellipse cx="174.5" cy="109.5" rx="18" ry="18" fill="#fff"/>
                                <path d="M104.5 0C80.2 0 58 9.4 41.4 24.8L0 20l38 18.4C27.6 49.8 21 64.4 21 80.5c0 46 37.4 63.5 83.5 63.5S188 126.5 188 80.5C188 36.2 150.6 0 104.5 0z" fill="#34E0A1"/>
                                <ellipse cx="104.5" cy="80.5" rx="42" ry="42" fill="#fff"/>
                                <ellipse cx="104.5" cy="80.5" rx="22" ry="22" fill="#34E0A1"/>
                              </svg>
                              Pubblica su TripAdvisor
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowReview(false)}
                            style={{ color: "#a8a29e", background: "none", border: "none", cursor: "pointer", padding: "8px", fontSize: 13 }}
                          >
                            Chiudi
                          </button>
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

            {/* ── PROGRESS STEPS ─────────────────────────────────────── */}
            <ProgressSteps
              currentStep={currentStep}
              orders={orders}
              brand={effectiveBrand}
              isDark={isDark}
            />

            {/* ── ORDER SUMMARY ───────────────────────────────────────── */}
            <OrderSummaryCard
              orders={orders}
              brand={effectiveBrand}
              isDark={isDark}
              sessionId={sessionId}
              activePortataNum={activePortataNum}
            />

            {/* ── DETTAGLIO (espandibile) ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mx-4"
            >

              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    {/* Tab bar */}
                    <TabBar
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      counts={counts}
                      badges={badges}
                      clearBadge={clearBadge}
                      isDark={isDark}
                      brand={effectiveBrand}
                    />

                    {/* Tab content */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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