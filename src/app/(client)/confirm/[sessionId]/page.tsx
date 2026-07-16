// src/app/(client)/confirm/[sessionId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { setEndScreenActive } from "@/lib/end-screen-signal";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  ShoppingBag,
  CreditCard,
  Banknote,
  ChevronRight,
  ChevronLeft,
  X,
  Tag,
  Receipt as ReceiptIcon,
  StickyNote,
  UtensilsCrossed,
  AlertCircle,
  GlassWater,
  ConciergeBell,
  Check,
} from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { updateOrderItemNote } from "@/lib/api-service";
import { useCartRealtime } from "@/hooks/useCartRealtime";
import { useI18n } from "@/components/i18n/I18nProvider";

// ─── CONFIRM CARDS CSS (stile "page.tsx": glass + sheen + lift-hover + ─────────
//   divider-gradient + ombre colorate accent + animazioni entrata/uscita)
//   Iniettato una sola volta via <style> inline nel main render della pagina
//   (NON via useEffect, altrimenti le animazioni di entrata non partono).
const CONFIRM_CARDS_CSS = `
@keyframes confirmFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes confirmScaleIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes confirmSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes confirmSheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes confirmOverlayIn {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes confirmSheenSweep {
  0%   { transform: translateX(-130%) skewX(-18deg); }
  60%  { transform: translateX(230%) skewX(-18deg); }
  100% { transform: translateX(230%) skewX(-18deg); }
}

/* ── Glass card ── */
.confirm-glass {
  position: relative;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset;
}
.confirm-glass-dark {
  background: rgba(28,25,23,0.78);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
}

/* ── Divider gradient (filo decorativo in alto) ── */
.confirm-divider {
  position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.4;
}

/* ── Sheen (gradiente che attraversa la card in hover) ── */
.confirm-sheen { position: relative; overflow: hidden; }
.confirm-sheen::after {
  content: ""; position: absolute; top: 0; left: 0;
  width: 45%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
  transform: translateX(-130%) skewX(-18deg);
  pointer-events: none; z-index: 2;
  transition: none;
}
.confirm-sheen:hover::after {
  animation: confirmSheenSweep 0.9s ease-out;
}

/* ── Lift hover (sollevamento + ombra più forte) ── */
.confirm-lift {
  transition: transform 0.32s cubic-bezier(0.34,1.4,0.64,1),
              box-shadow 0.32s ease,
              border-color 0.32s ease;
  will-change: transform;
}
.confirm-lift:hover {
  transform: translateY(-3px);
}

/* ── Animazioni entrata (stagger) ── */
.confirm-anim-up    { animation: confirmFadeUp 0.45s ease both; }
.confirm-anim-scale { animation: confirmScaleIn 0.4s cubic-bezier(0.34,1.4,0.64,1) both; }
.confirm-anim-down  { animation: confirmSlideDown 0.4s ease both; }

/* ── Modal nota piatto: in/out ── */
@keyframes noteOverlayIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes noteOverlayOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes noteCardIn  { from { opacity: 0; transform: scale(0.92) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes noteCardOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.94) translateY(8px); } }
.note-overlay        { animation: noteOverlayIn 0.22s ease both; }
.note-overlay.is-out  { animation: noteOverlayOut 0.18s ease both; }
.note-card            { animation: noteCardIn 0.32s cubic-bezier(0.34,1.4,0.64,1) both; }
.note-card.is-out     { animation: noteCardOut 0.18s ease both; }

/* ── Banner di stato coupon (valid/invalid/already/one-code-only): in ogni cambio,
   la key React sul <p> lo rimonta e questa animazione riparte da capo. ── */
@keyframes bannerIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.coupon-banner { animation: bannerIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }

/* ── Badge numerico portata (pill glow) ── */
.confirm-badge {
  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
}
.confirm-badge:hover {
  transform: scale(1.12) rotate(-4deg);
}

/* ── Thumbnail piatto (zoom on hover) ── */
.confirm-thumb {
  transition: transform 0.4s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.4s ease;
}
.confirm-thumb:hover {
  transform: scale(1.06);
}

/* ── Chip customization (pop on hover) ── */
.confirm-chip {
  transition: transform 0.2s ease, background 0.2s ease;
}
.confirm-chip:hover {
  transform: translateY(-1px) scale(1.04);
}

/* ── Bottone conferma (press feedback) ── */
.confirm-cta {
  transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, filter 0.2s ease;
}
.confirm-cta:hover { transform: translateY(-2px); filter: brightness(1.05); }
.confirm-cta:active { transform: translateY(0) scale(0.985); }
`;

// ─── MORPH BUTTON ─────────────────────────────────────────────────────────────

const MORPH_CSS = `
@keyframes morphToCircle {
  0%   { border-radius: 14px; width: 100%; }
  100% { border-radius: 50%; width: 56px; }
}
@keyframes morphToBar {
  0%   { border-radius: 50%; width: 56px; }
  100% { border-radius: 14px; width: 100%; }
}
@keyframes tickDraw {
  0%   { stroke-dashoffset: 30; opacity: 0; }
  30%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
.btn-morph { transition: background 0.2s; }
.btn-morph.is-loading { animation: morphToCircle 0.35s cubic-bezier(.4,0,.2,1) forwards; }
.btn-morph.is-done    { animation: none; border-radius: 50%; width: 56px; background: #4ade80; }
.btn-morph.is-reset   { animation: morphToBar 0.35s cubic-bezier(.4,0,.2,1) forwards; }
.morph-tick { stroke-dasharray: 30; stroke-dashoffset: 30; animation: tickDraw 0.4s 0.1s ease forwards; }
`;

function MorphButton({ label, onClick, accent }: { label: string; onClick: () => Promise<void>; accent: string }) {
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const s = document.createElement("style");
    s.textContent = MORPH_CSS;
    document.head.appendChild(s);
  }, []);

  const handleClick = async () => {
    if (phase !== "idle") return;
    setPhase("loading");
    try {
      await onClick();
      setPhase("done");
    } catch {
      setPhase("idle");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <button
        className={`btn-morph${phase === "loading" ? " is-loading" : phase === "done" ? " is-done" : ""}`}
        onClick={handleClick}
        disabled={phase !== "idle"}
        style={{
          height: 56,
          width: "100%",
          background: phase === "done" ? "#4ade80" : accent,
          border: "none",
          borderRadius: 14,
          cursor: phase === "idle" ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {phase === "idle" && (
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>{label}</span>
        )}
        {phase === "loading" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: "spin 0.7s linear infinite" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        )}
        {phase === "done" && (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline className="morph-tick" points="6,14 11,20 22,9" />
          </svg>
        )}
      </button>
    </div>
  );
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── TYPES ────────────────────────────────────────────────────────────────────

type CartCustomization = {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceName: string;
  priceModifierCents: number;
};

type RecapItem = {
  orderItemId: string;
  name: string;
  quantity: number;
  priceCents: number;
  portata: number;
  note?: string;
  customizations: CartCustomization[];
  imageUrl?: string;
};

// Riga grezza come torna dalla query Supabase su order_items
type OrderItemRow = {
  id: string;
  menu_item_id: string | null;
  name_snapshot: string | null;
  quantity: number | null;
  base_price: number | string | null; // numeric -> arriva come string da supabase-js
  portata: number | null;
  note: string | null;
  customizations: CartCustomization[] | null;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatPrice = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const formatDateTime = () => {
  const now = new Date();
  const date = now.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const time = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
};

// Genera un poligono a zig-zag (effetto "carta strappata") da usare come clip-path.
function zigzagPolygon(teeth = 24) {
  const points: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? 0 : 100;
    points.push(`${x}% ${y}%`);
  }
  return `polygon(${points.join(",")})`;
}
const ZIGZAG = zigzagPolygon(24);

function ZigzagEdge({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        height: 9,
        width: "100%",
        background: color,
        clipPath: ZIGZAG,
        transform: flip ? "scaleY(-1)" : undefined,
        flexShrink: 0,
      }}
    />
  );
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────

function PaymentModal({
  open,
  onClose,
  onConfirm,
  total,
  isDark,
  accent,
  restaurantId,
  appliedDiscount,
  onCouponApplied,
  onRemoveCoupon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: "cash" | "card", discountedTotal: number | null, discountCents: number, couponCode: string) => void;
  total: number;
  isDark: boolean;
  accent: string;
  restaurantId?: string | null;
  // Coupon già applicato all'ordine (persistito su DB, sincronizzato tra dispositivi
  // via Realtime dal componente genitore) — il modal lo usa per mostrarsi già "valid"
  // se un altro dispositivo sullo stesso tavolo l'ha applicato nel frattempo.
  appliedDiscount: {
    discountCents: number;
    originalTotalCents: number;
    couponCode: string;
    type?: "percent" | "fixed";
    value?: number;
  } | null;
  onCouponApplied: (
    discountCents: number,
    originalTotalCents: number,
    couponCode: string,
    type: "percent" | "fixed",
    value: number
  ) => void;
  onRemoveCoupon: () => void;
}) {
  const { tr } = useI18n();
  const tC = tr.client.confirm;
  const tCommon = tr.client.common;
  const [selected, setSelected] = useState<"cash" | "card" | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponStatus, setCouponStatus] = useState<"idle" | "valid" | "invalid" | "checking" | "already" | "oneCodeOnly">("idle");
  const [discount, setDiscount] = useState<{ type: "percent" | "fixed"; value: number } | null>(null);
  // true appena QUESTO modal ha validato un coupon in prima persona: da quel momento
  // il tipo/valore mostrato (es. "10%") è quello vero e non va più toccato, anche se
  // più tardi arriva l'eco Realtime della stessa scrittura (o un update dello stesso
  // valore da un altro dispositivo) — altrimenti il messaggio "10%" verrebbe
  // rimpiazzato dall'equivalente in euro ricavato alla cieca da discountCents.
  const appliedLocallyRef = useRef(false);

  // Rispecchia il coupon condiviso (arrivato dal genitore, via DB o Realtime da un
  // altro dispositivo sullo stesso tavolo): se non l'ha ancora applicato QUESTO modal,
  // mostralo già "valid". Il genitore recupera anche il tipo/valore originali del
  // coupon dalla tabella "coupons", così mostriamo "10%" e non solo l'importo in euro.
  useEffect(() => {
    if (!appliedDiscount || appliedLocallyRef.current) return;
    setCoupon(appliedDiscount.couponCode);
    setCouponStatus("valid");
    setCouponOpen(true);
    setDiscount(
      appliedDiscount.type && appliedDiscount.value !== undefined
        ? { type: appliedDiscount.type, value: appliedDiscount.value }
        : { type: "fixed", value: appliedDiscount.discountCents / 100 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedDiscount]);

  const discountedTotal = appliedDiscount
    ? Math.max(0, total - appliedDiscount.discountCents)
    : discount
    ? discount.type === "percent"
      ? Math.round(total * (1 - discount.value / 100))
      : Math.max(0, total - discount.value * 100)
    : null;

  const applyCoupon = async () => {
    if (couponStatus === "checking") return; // evita richieste concorrenti (Enter + click Apply)
    const trimmed = coupon.trim().toUpperCase();
    if (!trimmed) return;
    if (appliedDiscount) {
      // Coupon già applicato (a questo ordine, da questo o da un altro dispositivo
      // sullo stesso tavolo): nessun bisogno di ricontattare il DB, basta segnalarlo.
      if (appliedDiscount.couponCode.toUpperCase() === trimmed) {
        setCouponStatus("already");
        return;
      }
      // Un ordine può avere un solo coupon: un codice diverso non sostituisce quello
      // già applicato.
      setCouponStatus("oneCodeOnly");
      return;
    }
    setCouponStatus("checking");
    try {
      // Mostra lo spinner per almeno 500ms: senza questo minimo, su connessioni
      // veloci la risposta arriva quasi subito e l'utente percepisce uno sfarfallio
      // (o crede di aver visto per un istante "invalid" prima del vero risultato).
      const minDelay = new Promise((resolve) => setTimeout(resolve, 500));
      const [{ data }] = await Promise.all([
        supabase
          .from("coupons")
          .select("discount_type, discount_value")
          .eq("code", trimmed)
          .eq("active", true)
          .or(restaurantId ? `restaurant_id.eq.${restaurantId},restaurant_id.is.null` : "restaurant_id.is.null")
          .maybeSingle(),
        minDelay,
      ]);
      if (data) {
        const type = data.discount_type as "percent" | "fixed";
        appliedLocallyRef.current = true;
        setDiscount({ type, value: data.discount_value });
        setCouponStatus("valid");
        const newDiscountedTotal = type === "percent"
          ? Math.round(total * (1 - data.discount_value / 100))
          : Math.max(0, total - data.discount_value * 100);
        onCouponApplied(total - newDiscountedTotal, total, trimmed, type, data.discount_value);
      } else {
        setDiscount(null);
        setCouponStatus("invalid");
      }
    } catch {
      setDiscount(null);
      setCouponStatus("invalid");
    }
  };

  const removeCoupon = () => {
    appliedLocallyRef.current = false;
    setDiscount(null);
    setCoupon("");
    setCouponStatus("idle");
    onRemoveCoupon();
  };

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Fa partire l'animazione "slideUp" solo quando il modal passa da chiuso ad aperto
  // (transizione open: false → true), non ad ogni render né ogni volta che dragY
  // torna a 0 durante un trascinamento (altrimenti l'animazione di ingresso
  // "riparte" a metà gesto, causando un effetto a scatti). Il componente resta
  // montato per tutta la vita della pagina (rende `null` quando `open` è false),
  // quindi non possiamo usare "solo al primo mount": va tracciata la transizione.
  const wasOpenRef = useRef(open);
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setEntering(true);
      const t = setTimeout(() => setEntering(false), 340);
      wasOpenRef.current = open;
      return () => clearTimeout(t);
    }
    wasOpenRef.current = open;
  }, [open]);

  const triggerClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => { onClose(); closeTimer.current = null; }, 320);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setDragY(0);
      setIsDragging(false);
      dragStartY.current = null;
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    }
  }, [open]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    setIsDragging(true);
    // Non catturare subito: aspetta che ci sia movimento reale per non bloccare i click sui bottoni
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    // Attiva pointer capture solo dopo una soglia di trascinamento
    if (delta > 8 && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setDragY(delta);
  };
  const handlePointerUp = () => {
    if (dragY > 100) {
      triggerClose();
    } else {
      dragStartY.current = null;
      setDragY(0);
    }
    // Disattiva la modalità "drag attivo" DOPO aver deciso l'esito: da qui in poi
    // eventuali transizioni (snap-back a 0, o chiusura) possono essere animate.
    setIsDragging(false);
  };

  const bg = isDark ? "#161412" : "#ffffff";
  const overlay = isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "#2e2a27" : "#e8e4d8";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  const textSec = isDark ? "#7a7470" : "#78716c";
  const inputBg = isDark ? "#1c1917" : "#faf8f3";

  // Pre-calcolo per evitare ternari annidati dentro template literal (SWC-safe)
  const sheetGlassClass = isDark ? "confirm-glass-dark" : "";
  const sheetShadow = "0 -16px 50px -12px " + accent + "35, 0 -2px 12px rgba(0,0,0,0.12)";
  const totalBoxGlassClass = isDark ? "confirm-glass-dark" : "confirm-glass";
  const totalBoxBorder = "1px solid " + accent + "26";
  const totalBoxShadow = "0 4px 16px -8px " + accent + "40";
  const couponBorder = "1px solid " + accent + "26";
  const couponShadow = "0 2px 10px -4px " + accent + "30";
  const payOptBorder = "2px solid " + (selected ? accent : border);
  const payOptShadowSel = "0 8px 24px -8px " + accent + "60, inset 0 1px 0 rgba(255,255,255,0.3)";
  const payOptShadowUnsel = "0 2px 10px -4px rgba(0,0,0,0.1)";

  if (!open) return null;

  return (
    <>
    <style>{`
      @keyframes strikeIn {
        from { transform: translateY(-50%) scaleX(0); }
        to   { transform: translateY(-50%) scaleX(1); }
      }
      @keyframes discountIn {
        from { opacity: 0; transform: translateX(-8px) scale(0.85); }
        to   { opacity: 1; transform: translateX(0) scale(1); }
      }
    `}</style>
    <div
      onClick={triggerClose}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: overlay,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: closing ? 0 : 1,
        transition: "opacity 0.3s ease",
        pointerEvents: closing ? "none" : "auto",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={"confirm-sheen " + sheetGlassClass}
        style={{
          background: bg,
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: 520,
          padding: "24px 20px max(28px, env(safe-area-inset-bottom))",
          fontFamily: "'Space Grotesk', sans-serif",
          animation: entering ? "slideUp 0.32s cubic-bezier(0.34,1.4,0.64,1)" : "none",
          border: `1px solid ${border}`,
          borderBottom: "none",
          maxHeight: "88vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          transform: closing ? "translateY(100%)" : `translateY(${dragY}px)`,
          transition: (closing || !isDragging) ? "transform 0.32s cubic-bezier(0.4,0,0.2,1)" : "none",
          touchAction: "none",
          boxShadow: sheetShadow,
          position: "relative",
          overflow: "hidden",
          color: accent,
        }}
      >
        <span aria-hidden className="confirm-divider" />
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: isDark ? "#3a3530" : "#dedad0", margin: "0 auto 20px", cursor: "grab" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: textPri, margin: 0, letterSpacing: "-0.01em" }}>
            {tC.howToPay}
          </h2>
          <button onClick={triggerClose} className="confirm-lift" style={{ background: "#ef44441a", border: "1px solid #ef444433", cursor: "pointer", padding: 7, borderRadius: 10, color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        {/* Totale — glass + divider */}
        <div
          className={"confirm-sheen " + totalBoxGlassClass}
          style={{
            border: totalBoxBorder,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: totalBoxShadow,
            position: "relative",
            overflow: "hidden",
            color: accent,
          }}
        >
          <span aria-hidden className="confirm-divider" />
          <span style={{ fontSize: 13, color: textSec, fontWeight: 600, letterSpacing: "0.01em" }}>{tC.orderTotal}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {discountedTotal !== null && (
              <span style={{
                fontSize: 20, fontWeight: 800, color: accent, letterSpacing: "-0.02em",
                animation: "discountIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}>
                € {formatPrice(discountedTotal)}
              </span>
            )}
            <span style={{
              fontSize: 20, fontWeight: 800, color: discountedTotal !== null ? textSec : textPri,
              letterSpacing: "-0.02em",
              position: "relative",
              transition: "color 0.3s ease",
            }}>
              {discountedTotal !== null && (
                <span style={{
                  position: "absolute", left: 0, right: 0, top: "50%",
                  height: 2, background: "#ef4444", borderRadius: 1,
                  transform: "translateY(-50%)",
                  animation: "strikeIn 0.35s 0.15s ease forwards",
                  transformOrigin: "left center",
                }} />
              )}
              € {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Coupon — lift hover */}
        <button
          onClick={() => setCouponOpen(!couponOpen)}
          className="confirm-lift"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: isDark ? "rgba(28,25,23,0.5)" : "rgba(255,255,255,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: couponBorder,
            borderRadius: 14,
            padding: "12px 16px",
            cursor: "pointer",
            marginBottom: 16,
            color: textPri,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: couponShadow,
          }}
        >
          <Tag size={16} color={accent} />
          <span style={{ flex: 1, textAlign: "left" }}>{tC.couponPrompt}</span>
          <ChevronRight
            size={16}
            color={textSec}
            style={{ transform: couponOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>

        <div
          style={{
            display: "flex", gap: 8,
            maxHeight: couponOpen ? 60 : 0,
            marginBottom: couponOpen ? 16 : 0,
            opacity: couponOpen ? 1 : 0,
            overflow: "hidden",
            transform: couponOpen ? "translateY(0)" : "translateY(-6px)",
            transition: "max-height 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.24s ease, margin-bottom 0.32s ease, transform 0.28s ease",
          }}
        >
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              value={coupon}
              onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
              placeholder={tC.enterCode}
              onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
              style={{
                flex: 1,
                background: inputBg,
                border: `1px solid ${couponStatus === "valid" ? "#22c55e" : couponStatus === "invalid" ? "#ef4444" : border}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 16,
                fontFamily: "'Space Grotesk', sans-serif",
                color: textPri,
                outline: "none",
                letterSpacing: "0.05em",
              }}
            />
            <button
              onClick={applyCoupon}
              disabled={couponStatus === "checking"}
              style={{
                background: accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: couponStatus === "checking" ? "default" : "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                opacity: couponStatus === "checking" ? 0.7 : 1,
                minWidth: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {couponStatus === "checking" ? (
                <>
                  <style>{`@keyframes couponSpin { to { transform: rotate(360deg); } }`}</style>
                  <span
                    aria-hidden
                    style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      animation: "couponSpin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                </>
              ) : tC.apply}
            </button>
          </div>
        </div>
        {(() => {
          const bannerVisible = couponOpen && couponStatus !== "idle" && couponStatus !== "checking";
          const bannerColor =
            couponStatus === "valid" ? "#22c55e"
            : couponStatus === "already" || couponStatus === "oneCodeOnly" ? "#d97706"
            : "#ef4444";
          const bannerText =
            couponStatus === "valid" && discount
              ? (discount.type === "percent" ? tC.couponAppliedPercent(discount.value) : tC.couponAppliedFixed(discount.value))
            : couponStatus === "already" ? tC.couponAlreadyApplied
            : couponStatus === "oneCodeOnly" ? tC.couponOneCodeOnly
            : tC.couponInvalid;
          return (
            <div style={{
              maxHeight: bannerVisible ? 40 : 0,
              opacity: bannerVisible ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease",
            }}>
              <p key={couponStatus + bannerText} className="coupon-banner" style={{
                fontSize: 12,
                fontWeight: 600,
                color: bannerColor,
                margin: "0 0 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span>{bannerText}</span>
                {(couponStatus === "valid" || couponStatus === "already") && (
                  <button
                    type="button"
                    onClick={removeCoupon}
                    style={{
                      border: "none", background: "none", padding: 0,
                      fontSize: 12, fontWeight: 700, color: bannerColor, textDecoration: "underline",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {tC.removeCoupon}
                  </button>
                )}
              </p>
            </div>
          );
        })()}

        {/* Payment options */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: textSec,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "0 0 10px",
          }}
        >
          Metodo di pagamento
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {/* Contanti — lift + glow when selected */}
          <button
            onClick={() => setSelected("cash")}
            className="confirm-lift confirm-sheen"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "18px 12px",
              borderRadius: 16,
              border: "2px solid " + (selected === "cash" ? accent : border),
              background: selected === "cash" ? (accent + "14") : isDark ? "rgba(26,23,20,0.6)" : "rgba(255,255,255,0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: selected === "cash" ? payOptShadowSel : payOptShadowUnsel,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Banknote size={26} color="#22c55e" />
            <span style={{ fontSize: 14, fontWeight: 700, color: selected === "cash" ? accent : textPri }}>{tC.cash}</span>
          </button>

          {/* Carta — lift + glow when selected */}
          <button
            onClick={() => setSelected("card")}
            className="confirm-lift confirm-sheen"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "18px 12px",
              borderRadius: 16,
              border: "2px solid " + (selected === "card" ? accent : border),
              background: selected === "card" ? (accent + "14") : isDark ? "rgba(26,23,20,0.6)" : "rgba(255,255,255,0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: selected === "card" ? payOptShadowSel : payOptShadowUnsel,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <CreditCard size={26} color="#3b82f6" />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: selected === "card" ? accent : textPri }}>
                {tC.payWithCard}
              </div>
              <div style={{ fontSize: 11, color: textSec }}>{tC.cardSubtitle}</div>
            </div>
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: textSec, margin: "10px 0 0" }}>
          ({tC.payAfterEating})
        </p>

        {/* CTA */}
        {selected ? (
          <MorphButton
            label={tC.confirmOrderArrow}
            accent={accent}
            onClick={async () => { onConfirm(selected, discountedTotal ?? null, discountedTotal !== null ? (total - discountedTotal) : 0, coupon.trim().toUpperCase()); }}
          />
        ) : (
          <button disabled style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: isDark ? "#2a2623" : "#e8e4d8", color: isDark ? "#4a4642" : "#b0ac9e", fontSize: 15, fontWeight: 800, cursor: "not-allowed", fontFamily: "'Space Grotesk', sans-serif" }}>
            {tC.confirmOrderArrow}
          </button>
        )}
      </div>
    </div>
    </>
  );
}

// ─── NOTA PIATTO (troncata + "Leggi nota" solo se davvero non entra) ─────────

function ItemNote({
  note,
  itemName,
  noteColor,
  textPri,
  bgCard,
  accent,
  readNoteLabel,
  closeLabel,
  canEdit,
  onSave,
  editToggleLabel,
  saveLabel,
}: {
  note: string;
  itemName: string;
  noteColor: string;
  textPri: string;
  bgCard: string;
  accent: string;
  readNoteLabel: string;
  closeLabel: string;
  canEdit: boolean;
  onSave: (next: string) => void;
  editToggleLabel: string;
  saveLabel: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth);
  }, [note]);

  const openModal = () => {
    setDraft(note);
    setEditing(false);
    setPhase("in");
    setOpen(true);
  };

  const closeModal = () => {
    setPhase("out");
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setEditing(false);
    }, 180);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== note) onSave(trimmed);
    setEditing(false);
    closeModal();
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, minWidth: 0 }}>
        <StickyNote size={12} color={noteColor} style={{ flexShrink: 0 }} />
        <span
          ref={textRef}
          style={{
            fontSize: 12, color: noteColor, fontStyle: "italic",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            minWidth: 0, flex: "1 1 auto",
          }}
        >
          {note}
        </span>
        {(truncated || canEdit) && (
          <button
            type="button"
            onClick={openModal}
            style={{
              flexShrink: 0, border: "none", background: "none", padding: 0,
              fontSize: 12, fontWeight: 700, color: noteColor, textDecoration: "underline",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {readNoteLabel}
          </button>
        )}
      </div>

      {open && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className={"note-overlay" + (phase === "out" ? " is-out" : "")}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={"note-card" + (phase === "out" ? " is-out" : "")}
            style={{
              background: bgCard, borderRadius: 20, padding: "20px 22px",
              maxWidth: 360, width: "100%", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <StickyNote size={14} color={noteColor} />
              <span style={{ fontSize: 13, fontWeight: 700, color: textPri }}>{itemName}</span>
            </div>

            {editing ? (
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                style={{
                  width: "100%", resize: "vertical", fontSize: 14, color: noteColor,
                  fontStyle: "italic", lineHeight: 1.5, fontFamily: "inherit",
                  border: `1px solid ${noteColor}40`, borderRadius: 10, padding: "8px 10px",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            ) : (
              <p style={{ fontSize: 14, color: noteColor, fontStyle: "italic", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
                {note}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {canEdit && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 12,
                    border: `1px solid ${accent}40`, background: "transparent", color: accent,
                    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {editToggleLabel}
                </button>
              )}
              <button
                type="button"
                onClick={editing ? handleSave : closeModal}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  border: "none", background: accent, color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {editing ? saveLabel : closeLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── PORTATA SECTION (vista normale, a card) ──────────────────────────────────

function PortataSection({
  portataNum,
  items,
  isDark,
  accent,
  canEditNote,
  onNoteSave,
}: {
  portataNum: number;
  items: RecapItem[];
  isDark: boolean;
  accent: string;
  canEditNote: boolean;
  onNoteSave: (orderItemId: string, note: string) => void;
}) {
  const { tr } = useI18n();
  const tC = tr.client.confirm;
  const textSec = isDark ? "#7a7470" : "#9c9284";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  // Stile "card" coerente con /cart: superficie chiara semitrasparente + blur,
  // bordo sinistro colorato, badge pill per le customizations.
  const bgCard = isDark ? "#1a1816" : "#ffffff";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const accentBg = accent + "14";
  const noteColor = "#d97706";

  // Pre-calcolo valori per evitare ternari annidati dentro template literal
  // (alcuni parser SWC/Webpack su Windows hanno problemi con ${cond ? "a":"b"})
  const glassClass = isDark ? "confirm-glass-dark" : "confirm-glass";
  const headerShadow = "0 6px 22px -10px " + accent + "55, 0 1px 8px rgba(0,0,0,0.06)";
  const headerBorder = "1px solid " + accent + "26";
  const badgeBg = "linear-gradient(135deg, " + accent + ", " + accent + "cc)";
  const badgeBorder = "1.5px solid " + accent + "40";
  const badgeShadow = "0 4px 12px " + accent + "55, inset 0 1px 0 rgba(255,255,255,0.3)";
  const dividerBg = "linear-gradient(90deg, " + accent + "40, transparent)";
  const cardShadow = isDark
    ? "0 14px 36px -12px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)"
    : "0 18px 44px -16px " + accent + "40, 0 4px 12px rgba(20,15,10,0.06)";
  const cardBorder = "1px solid " + (isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.7)");
  const thumbBg = "linear-gradient(135deg, " + accent + ", " + accent + ")";
  const thumbShadow = "0 4px 12px " + accent + "40, inset 0 1px 0 rgba(255,255,255,0.25)";

  const portataLabels: Record<number, string> = {
    1: tC.courseFirstFull,
    2: tC.courseSecondFull,
    3: tC.courseThirdFull,
    4: tC.courseFourthFull,
  };
  const label = portataNum === 0 ? tr.client.cart.drinksLabel : (portataLabels[portataNum] ?? (tr.client.cart.courseWord + " " + portataNum));

  const subtotal = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Portata header — glass + divider gradient + anim down */}
      <div
        className={"confirm-anim-down confirm-sheen " + glassClass}
        style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
          borderRadius: 16, padding: "10px 14px",
          boxShadow: headerShadow,
          border: headerBorder,
          color: accent,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span aria-hidden className="confirm-divider" />
        <div
          className="confirm-badge"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: badgeBg,
            border: badgeBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
            boxShadow: badgeShadow,
          }}
        >
          {portataNum === 0 ? <GlassWater size={14} /> : portataNum}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: dividerBg }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: textSec, fontVariantNumeric: "tabular-nums" }}>€ {formatPrice(subtotal)}</span>
      </div>

      {/* Una card per piatto — glass + sheen + lift + anim stagger */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, idx) => {
          const lineTotal = item.priceCents * item.quantity;
          return (
            <div
              key={item.orderItemId}
              className={"confirm-anim-up confirm-sheen confirm-lift " + glassClass}
              style={{
                position: "relative",
                borderRadius: 28,
                padding: "14px 16px 14px 14px",
                boxShadow: cardShadow,
                border: cardBorder,
                animationDelay: String(Math.min(idx, 6) * 0.06) + "s",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {/* Thumbnail: immagine reale dal DB, con fallback all'iniziale — rotonda + zoom hover */}
                <div
                  aria-hidden
                  className="confirm-thumb"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: item.imageUrl
                      ? "transparent"
                      : thumbBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                    boxShadow: thumbShadow,
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                      onError={(e) => {
                        // fallback all'iniziale se l'immagine non carica
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const parent = el.parentElement;
                        if (parent) {
                          parent.style.background = `linear-gradient(135deg, ${accent}, ${accent})`;
                          const span = document.createElement("span");
                          span.textContent = item.name?.charAt(0)?.toUpperCase() || "?";
                          span.style.cssText = "font-size:22px;font-weight:700;color:#fff;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.15);";
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
                      {item.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* Nome, prezzo, quantità, chip, nota */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontWeight: 700,
                          fontSize: 17,
                          margin: "0 0 6px",
                          color: textPri,
                          lineHeight: 1.25,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {item.quantity > 1 && (
                          <span style={{ color: accent, fontWeight: 700 }}>{item.quantity}× </span>
                        )}
                        {item.name}
                      </h3>
                      <span style={{ fontWeight: 700, fontSize: 18, color: textPri, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
                        {formatPrice(lineTotal)} <span style={{ fontSize: 15, fontWeight: 600, color: textSec }}>€</span>
                      </span>
                    </div>
                  </div>

                  {/* Customizations — chip pill con pop hover */}
                  {item.customizations.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {item.customizations.map((c, i) => (
                        <span
                          key={i}
                          className="confirm-chip"
                          style={{
                            background: accentBg,
                            border: `1px solid ${borderSoft}`,
                            borderRadius: 999,
                            padding: "2px 9px",
                            fontSize: 11,
                            color: textSec,
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                          }}
                        >
                          {c.choiceName}
                          {c.priceModifierCents > 0 ? ` · +€${formatPrice(c.priceModifierCents)}` : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Nota — troncata su una riga; se non entra, compare "Leggi nota" per aprirla intera (ed eventualmente modificarla) */}
                  {item.note && (
                    <ItemNote
                      note={item.note}
                      itemName={item.name}
                      noteColor={noteColor}
                      textPri={textPri}
                      bgCard={bgCard}
                      accent={accent}
                      readNoteLabel={tC.readNote}
                      closeLabel={tr.client.common.close}
                      canEdit={canEditNote}
                      onSave={(next) => onNoteSave(item.orderItemId, next)}
                      editToggleLabel={tr.client.cart.edit}
                      saveLabel={tr.client.common.save}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RIGA "SCONTRINO" (usata dentro il receipt drawer) ────────────────────────

function ReceiptLine({ qty, name, priceCents, dim }: { qty: number; name: string; priceCents: number; dim: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "3px 0" }}>
      <span style={{ flexShrink: 0, minWidth: 22 }}>{qty}x</span>
      <span
        style={{
          flexShrink: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      <span style={{ flex: 1, borderBottom: `1px dotted ${dim}`, marginBottom: 3, minWidth: 8 }} />
      <span style={{ flexShrink: 0 }}>{formatPrice(priceCents)}</span>
    </div>
  );
}

// ─── SIDE TOTAL TAB (schermi corti) ────────────────────────────────────────────

function SideTotalTab({ accent, totalCents, onOpen }: { accent: string; totalCents: number; onOpen: () => void }) {
  const { tr } = useI18n();
  const tC = tr.client.confirm;
  return (
    <button
      onClick={onOpen}
      aria-label={tC.openSummary}
      style={{
        position: "fixed",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 60,
        background: accent,
        color: "#fff",
        border: "none",
        borderRadius: "14px 0 0 14px",
        padding: "14px 9px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
        boxShadow: "-4px 0 18px rgba(0,0,0,0.22)",
        fontFamily: "'Space Grotesk', sans-serif",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <ChevronLeft size={13} strokeWidth={2.5} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          writingMode: "vertical-rl",
        }}
      >
        {tC.total}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, writingMode: "vertical-rl", letterSpacing: "0.01em" }}>
        € {formatPrice(totalCents)}
      </span>
    </button>
  );
}

// ─── FLOATING TOTAL PILL (appare quando il totale inline esce dallo schermo) ───

function FloatingTotalPill({
  visible,
  totalCents,
  accent,
  isDark,
  onConfirm,
}: {
  visible: boolean;
  totalCents: number;
  accent: string;
  isDark: boolean;
  onConfirm: () => void;
}) {
  const { tr } = useI18n();
  const tC = tr.client.confirm;
  const bg = isDark ? "rgba(22,20,18,0.92)" : "rgba(255,253,246,0.92)";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  const textSec = isDark ? "#7a7470" : "#78716c";
  const border = isDark ? "#2e2a27" : "#e8e4d8";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        display: "flex",
        justifyContent: "center",
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(-110%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.38s cubic-bezier(0.34,1.1,0.64,1), opacity 0.28s ease",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        style={{
          background: bg,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: `1px solid ${border}`,
          borderTop: "none",
          borderRadius: "0 0 20px 20px",
          padding: "10px 18px 14px",
          maxWidth: 540,
          width: "100%",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5)"
            : "0 8px 32px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: textSec, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 1 }}>
            Totale
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textPri, letterSpacing: "-0.02em" }}>
            € {formatPrice(totalCents)}
          </div>
        </div>
        <button
          onClick={onConfirm}
          style={{
            background: accent,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: `0 4px 16px ${accent}50`,
            display: "flex",
            alignItems: "center",
            gap: 6,
            WebkitTapHighlightColor: "transparent",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Conferma
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── RECEIPT DRAWER (riepilogo in stile scontrino) ─────────────────────────────

function ReceiptDrawer({
  open,
  onClose,
  onConfirm,
  recapItems,
  portateGroups,
  portateNums,
  totalCents,
  tableNumber,
  sessionId,
  isDark,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recapItems: RecapItem[];
  portateGroups: Record<number, RecapItem[]>;
  portateNums: number[];
  totalCents: number;
  tableNumber: string | null;
  sessionId: string;
  isDark: boolean;
  accent: string;
}) {
  const { tr } = useI18n();
  const tC = tr.client.confirm;
  if (!open) return null;

  const paper = isDark ? "#1c1a17" : "#fffdf6";
  const ink = isDark ? "#e8e4da" : "#2a261f";
  const dim = isDark ? "#5a564f" : "#b8b2a0";
  const overlayBg = isDark ? "rgba(0,0,0,0.7)" : "rgba(20,16,10,0.45)";
  const orderCode = sessionId ? sessionId.replace(/-/g, "").slice(0, 8).toUpperCase() : "------";
  const totalItems = recapItems.reduce((s, i) => s + i.quantity, 0);

  const portataLabels: Record<number, string> = {
    1: "PRIMA PORTATA",
    2: "SECONDA PORTATA",
    3: "TERZA PORTATA",
    4: "QUARTA PORTATA",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 210,
        background: overlayBg,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 92vw)",
          height: "100%",
          background: isDark ? "#0c0a09" : "#f1ede0",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.26s cubic-bezier(0.34,1,0.64,1)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.25)",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "max(16px, env(safe-area-inset-top)) 16px 12px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: ink, fontFamily: "'Space Grotesk', sans-serif" }}>
            <ReceiptIcon size={16} color={accent} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>{tC.summary}</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: dim }}
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable receipt area */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 16px 16px", overscrollBehavior: "contain" }}>
          <div
            style={{
              background: paper,
              boxShadow: isDark ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 14px rgba(0,0,0,0.12)",
              fontFamily: "'Courier New', monospace",
              color: ink,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <ZigzagEdge color={paper} />

            <div style={{ padding: "4px 18px 14px" }}>
              {/* Header scontrino */}
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em" }}>{tC.summary.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: dim, marginTop: 4 }}>
                  {tableNumber ? `${tr.client.common.table} ${tableNumber}` : tC.takeaway} · {totalItems} {tC.dishesShort}
                </div>
                <div style={{ fontSize: 11, color: dim }}>
                  N. {orderCode} · {formatDateTime()}
                </div>
              </div>

              <div style={{ borderTop: `1px dashed ${dim}`, margin: "10px 0" }} />

              {/* Portate */}
              {portateNums.map((n, idx) => (
                <div key={n} style={{ marginBottom: idx < portateNums.length - 1 ? 12 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: accent, marginBottom: 4 }}>
                    {n === 0 ? tr.client.cart.drinksLabel.toUpperCase() : (portataLabels[n] ?? `PORTATA ${n}`)}
                  </div>
                  {portateGroups[n].map((item) => (
                    <div key={item.orderItemId}>
                      <ReceiptLine qty={item.quantity} name={item.name} priceCents={item.priceCents * item.quantity} dim={dim} />
                      {item.customizations.map((c, i) => (
                        <div key={i} style={{ fontSize: 11, color: dim, paddingLeft: 28 }}>
                          › {c.optionName}: {c.choiceName}
                          {c.priceModifierCents > 0 && ` (+${formatPrice(c.priceModifierCents)})`}
                        </div>
                      ))}
                      {item.note && (
                        <div style={{ fontSize: 11, color: dim, fontStyle: "italic", paddingLeft: 28 }}>* {item.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ borderTop: `1px dashed ${dim}`, margin: "12px 0 8px" }} />

              {/* Totale */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderTop: `3px double ${ink}`,
                  paddingTop: 8,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                <span>TOTALE</span>
                <span>€ {formatPrice(totalCents)}</span>
              </div>

              <div style={{ textAlign: "center", fontSize: 11, color: dim, marginTop: 16 }}>{tC.thanks}</div>
            </div>

            <ZigzagEdge color={paper} flip />
          </div>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            flexShrink: 0,
            padding: "12px 16px max(16px, env(safe-area-inset-bottom))",
            background: isDark ? "#0c0a09" : "#f1ede0",
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 14,
              border: "none",
              background: accent,
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              letterSpacing: "0.01em",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: `0 6px 20px ${accent}45`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {tC.confirmOrder}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRMED SCREEN (card "Grazie mille" con animazioni IN/OUT) ─────────────
//
// Sezione che appare dopo la conferma dell'ordine. Mostra una card "Grazie mille!"
// con:
//   • animazione di ENTRATA a cascata (icona → titolo → sottotitolo → barra progresso)
//   • barra di progresso che si riempie in 3s, poi triggera l'uscita in automatico
//     (nessuna azione richiesta all'utente)
//   • animazione di USCITA (card slide-up + fade, overlay fade) prima di
//     navigare verso /status/{sessionId}
//
// Nessuna chiamata backend: la navigazione è delegata al parent via onNavigate.

const GRAZIE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

/* ── Overlay ── */
@keyframes grazieOverlayIn  { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }
@keyframes grazieOverlayOut { from { opacity: 1; } to { opacity: 0; } }

/* ── Card entrance / exit ── */
@keyframes grazieCardIn {
  0%   { opacity: 0; transform: translateY(60px) scale(0.82) rotate(-2deg); }
  50%  { opacity: 1; transform: translateY(-12px) scale(1.05) rotate(1deg); }
  75%  { transform: translateY(4px) scale(0.98) rotate(-0.3deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
}
@keyframes grazieCardOut {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-80px) scale(0.86) rotate(3deg); }
}

/* ── Icon ── */
@keyframes grazieIconPop {
  0%   { transform: scale(0.2) rotate(-30deg); opacity: 0; }
  50%  { transform: scale(1.18) rotate(8deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes grazieIconBounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
@keyframes grazieCheckDraw {
  0%   { stroke-dashoffset: 60; opacity: 0; }
  25%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes grazieRing {
  0%   { transform: scale(0.7); opacity: 0.6; }
  100% { transform: scale(2.8); opacity: 0; }
}
@keyframes grazieProgressFill {
  from { width: 0%; }
  to   { width: 100%; }
}

/* ── Fade up a cascata ── */
@keyframes grazieFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes grazieFadeUpSoft {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Shine che attraversa la card ── */
@keyframes grazieShine {
  0%   { transform: translateX(-130%) skewX(-18deg); }
  55%  { transform: translateX(230%) skewX(-18deg); }
  100% { transform: translateX(230%) skewX(-18deg); }
}

/* ── Glow pulsante dietro la card ── */
@keyframes grazieGlow {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50%      { opacity: 0.6; transform: scale(1.08); }
}

/* ── Particelle di sfondo (pallini che salgono) ── */
@keyframes grazieParticle {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.5; }
  100% { transform: translateY(-120vh) scale(1.2); opacity: 0; }
}

/* ── Confetti ── */
@keyframes grazieConfetti {
  0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--cx), var(--cy)) rotate(var(--cr)); opacity: 0; }
}

.grazie-overlay        { animation: grazieOverlayIn 0.45s ease forwards; }
.grazie-overlay.is-out { animation: grazieOverlayOut 0.42s ease forwards; }

.grazie-card           { animation: grazieCardIn 0.75s cubic-bezier(0.34,1.56,0.64,1) forwards; }
.grazie-card.is-out    { animation: grazieCardOut 0.5s cubic-bezier(0.4,0,1,1) forwards; }

.grazie-icon           { animation: grazieIconPop 0.6s 0.08s cubic-bezier(0.34,1.56,0.64,1) backwards; }
.grazie-icon-bounce    { animation: grazieIconBounce 2.6s 0.7s ease-in-out infinite; }
.grazie-check          { stroke-dasharray: 60; stroke-dashoffset: 60; animation: grazieCheckDraw 0.6s 0.26s ease forwards; }
.grazie-ring           { animation: grazieRing 1.6s 0.25s ease-out infinite; }
.grazie-ring-2         { animation: grazieRing 1.6s 0.6s ease-out infinite; }
.grazie-ring-3         { animation: grazieRing 1.6s 0.95s ease-out infinite; }

.grazie-glow           { animation: grazieGlow 3s 0.3s ease-in-out infinite; }

.grazie-title  { opacity: 0; animation: grazieFadeUp 0.55s 0.38s ease forwards; }
.grazie-sub    { opacity: 0; animation: grazieFadeUp 0.55s 0.54s ease forwards; }
.grazie-action { opacity: 0; animation: grazieFadeUpSoft 0.55s 0.7s ease forwards; }

.grazie-shine {
  position: absolute; top: 0; left: 0; width: 45%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
  animation: grazieShine 2.8s 0.9s ease-in-out infinite;
  pointer-events: none; z-index: 2;
}

.grazie-particle {
  position: absolute; bottom: -10px; border-radius: 50%;
  animation: grazieParticle linear infinite;
  pointer-events: none;
}

.grazie-confetti {
  position: absolute; top: 30%; left: 50%;
  width: 8px; height: 12px; border-radius: 2px;
  animation: grazieConfetti 1.4s 0.15s ease-out forwards;
  pointer-events: none;
}
`;

function ConfirmedScreen({
  isDark,
  accent,
  bg,
  textPri,
  textSec,
  onNavigate,
  tC,
  restaurantName,
}: {
  isDark: boolean;
  accent: string;
  bg: string;
  textPri: string;
  textSec: string;
  onNavigate: () => void;
  tC: any;
  restaurantName?: string | null;
}) {
  const [phase, setPhase] = useState<"in" | "out">("in");
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⚠️ NOTA: il CSS (GRAZIE_CSS) è iniettato come <style> inline nel JSX
  // sottostante, NON via useEffect. Questo è cruciale: useEffect gira DOPO il
  // primo paint del browser, quindi se iniettassimo il CSS lì le animazioni di
  // entrata (grazieCardIn, grazieFadeUp, …) non partirebbero — l'elemento sarebbe
  // già renderizzato nello stato finale prima che le regole @keyframes esistano.
  // Con <style> inline nel JSX, il CSS è presente nel primo render → le
  // animazioni partono correttamente al mount.

  const triggerExit = useCallback(() => {
    if (phase === "out") return;
    setPhase("out");
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => onNavigate(), 460);
  }, [phase, onNavigate]);

  // Auto-navigate a /status dopo 3s: nessuna azione richiesta, la barra di
  // progresso sotto (durata CSS 3s, vedi grazieProgressFill) è puramente
  // visiva e deve restare sincronizzata con questo timeout.
  useEffect(() => {
    const t = setTimeout(triggerExit, 3000);
    return () => clearTimeout(t);
  }, [triggerExit]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Pre-genera particelle e confetti una sola volta (memoizzati) per non
  // cambiare ad ogni render. Usiamo indici deterministici per evitare shimmer.
  const particles = useMemo(() => {
    const colors = [accent, "#22c55e", "#f59e0b", "#ec4899", "#3b82f6"];
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.round((i * 7.3) % 100),
      size: 6 + ((i * 13) % 10),
      color: colors[i % colors.length],
      duration: 6 + ((i * 17) % 7),
      delay: (i * 0.9) % 6,
    }));
  }, [accent]);

  const confetti = useMemo(() => {
    const colors = [accent, "#22c55e", "#f59e0b", "#ec4899", "#3b82f6", "#a855f7"];
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const dist = 90 + ((i * 37) % 80);
      return {
        id: i,
        cx: `${Math.round(Math.cos(angle) * dist)}px`,
        cy: `${Math.round(Math.sin(angle) * dist + 40)}px`,
        cr: `${((i * 53) % 720) - 360}deg`,
        color: colors[i % colors.length],
        delay: `${0.1 + (i % 5) * 0.05}s`,
      };
    });
  }, [accent]);

  return (
    <div
      className={`grazie-overlay${phase === "out" ? " is-out" : ""}`}
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'Space Grotesk', sans-serif",
        padding: 32,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ⚠️ CSS inline: presente nel primo render, così le animazioni di
          entrata partono subito (non è più iniettato via useEffect). */}
      <style>{GRAZIE_CSS}</style>

      {/* Particelle colorate che salgono dal basso (sfondo animato) */}
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden
          className="grazie-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: 0.55,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Glow pulsante dietro la card */}
      <div
        aria-hidden
        className="grazie-glow"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
          filter: "blur(30px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Alone colorato morbido dietro la card */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}22 0%, transparent 65%)`,
          filter: "blur(20px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 400,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className={`grazie-card${phase === "out" ? " is-out" : ""}`}
          style={{
            background: isDark ? "#161412" : "#ffffff",
            borderRadius: 28,
            padding: "44px 28px 30px",
            boxShadow: isDark
              ? "0 24px 64px -14px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)"
              : "0 24px 64px -14px rgba(20,15,10,0.22), 0 2px 8px rgba(20,15,10,0.06)",
            border: `1px solid ${isDark ? "#2e2a27" : "#f0ece0"}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            width: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Effetto shine che attraversa la card */}
          <div className="grazie-shine" aria-hidden />

          {/* Confetti che esplodono dall'alto della card */}
          {confetti.map((c) => (
            <span
              key={c.id}
              aria-hidden
              className="grazie-confetti"
              style={{
                background: c.color,
                // variabili CSS usate da @keyframes grazieConfetti
                ["--cx" as any]: c.cx,
                ["--cy" as any]: c.cy,
                ["--cr" as any]: c.cr,
                animationDelay: c.delay,
              }}
            />
          ))}

          {/* Icona con anelli pulsanti (3 anelli sfalsati) + bounce */}
          <div style={{ position: "relative", width: 92, height: 92, marginBottom: 4 }}>
            <span
              aria-hidden
              className="grazie-ring"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `${accent}33` }}
            />
            <span
              aria-hidden
              className="grazie-ring-2"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `${accent}1f` }}
            />
            <span
              aria-hidden
              className="grazie-ring-3"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `${accent}14` }}
            />
            <div
              className="grazie-icon grazie-icon-bounce"
              style={{
                position: "relative",
                width: 92,
                height: 92,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 10px 28px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
            >
              <svg
                width="46"
                height="46"
                viewBox="0 0 44 44"
                fill="none"
                stroke="#fff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline className="grazie-check" points="12,22 19,30 33,14" />
              </svg>
            </div>
          </div>

          {/* Titolo */}
          <h2
            className="grazie-title"
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: textPri,
              margin: 0,
              letterSpacing: "-0.025em",
            }}
          >
            {tC.orderConfirmed}
          </h2>

          {/* Sottotitolo */}
          <div className="grazie-sub" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 14, color: textSec, margin: 0, lineHeight: 1.55 }}>
              {tC.thanksLine(restaurantName || tC.ourRestaurantFallback)}
            </p>
          </div>

          {/* Barra di progresso: naviga automaticamente a /status dopo 3s (vedi
              useEffect con triggerExit), nessuna azione richiesta all'utente. */}
          <div className="grazie-action" style={{ width: "100%", marginTop: 18 }}>
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: 999,
                overflow: "hidden",
                background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: accent,
                  animation: "grazieProgressFill 3s linear forwards",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const COMPACT_HEIGHT = 680;

export default function ConfirmPage() {
  const { tr } = useI18n();
  const tC = tr.client.confirm;
  const tCart = tr.client.cart;
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const cartItems = useCartStore((s) => s.items);
  const totalCents = useCartStore((s) => s.totalCents);
  const clearCart = useCartStore((s) => s.clearCart);
  const orderId = useCartStore((s) => s.orderId);

  useCartRealtime();

  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string>(() => {
    if (typeof window === "undefined") return "#d97706";
    try {
      // Fast path: brand color cached by sessionId (available synchronously)
      const sid = (typeof window !== "undefined")
        ? window.location.pathname.split("/").pop()
        : null;
      if (sid) { const v = localStorage.getItem(`brand_color_session_${sid}`); if (v) return v; }
    } catch {}
    return "#d97706";
  });
  const [backgroundType, setBackgroundType] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("bg_type_"));
      if (keys.length === 1) return localStorage.getItem(keys[0]);
      const sess = JSON.parse(localStorage.getItem("tableSession") || "null");
      if (sess?.restaurantId) return localStorage.getItem(`bg_type_${sess.restaurantId}`);
    } catch {}
    return null;
  });
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("bg_url_"));
      if (keys.length === 1) return localStorage.getItem(keys[0]);
      const sess = JSON.parse(localStorage.getItem("tableSession") || "null");
      if (sess?.restaurantId) return localStorage.getItem(`bg_url_${sess.restaurantId}`);
    } catch {}
    return null;
  });
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const openPaymentModal = () => {
    setConfirmError(null);
    setModalOpen(false);
    setTimeout(() => { setModalKey(k => k + 1); setModalOpen(true); }, 0);
  };

  // Modalità "con cameriere": invece di inviare l'ordine in cucina, notifica il
  // cameriere (waiter_calls type='order'). Il carrello resta salvato: sarà il
  // cameriere a prendere l'ordinazione al tavolo.
  const callWaiterToOrder = async () => {
    if (waiterCalling || waiterCalled) return;
    setConfirmError(null);
    setWaiterCalling(true);
    try {
      const res = await fetch("/api/waiter-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type: "order" }),
      });
      if (!res.ok) throw new Error("waiter-call failed");
      setWaiterCalled(true);
    } catch (err) {
      console.error("[ConfirmPage] callWaiterToOrder:", err);
      setConfirmError(tC.waiterCallError);
    } finally {
      setWaiterCalling(false);
    }
  };
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [activeOrderBlocked, setActiveOrderBlocked] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [compact, setCompact] = useState(false);
  const [showFloatingTotal, setShowFloatingTotal] = useState(false);
  const totalSectionRef = useRef<HTMLDivElement>(null);

  // ── Fallback: ordine recuperato dal DB quando il carrello locale è vuoto
  // (tipicamente dopo un refresh in cui Zustand non ha ancora/non ha potuto
  // reidratarsi da localStorage). Se questo è popolato, ha la precedenza
  // sui dati del cart store.
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const [dbRecapItems, setDbRecapItems] = useState<RecapItem[] | null>(null);
  const [dbTotalCents, setDbTotalCents] = useState<number>(0);
  const [checkingDbOrder, setCheckingDbOrder] = useState(false);
  const [tableId, setTableId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [avgMinutes, setAvgMinutes] = useState<number | null>(null);
  // Modalità di servizio "con cameriere": il cliente chiama il cameriere per
  // ordinare invece di inviare l'ordine direttamente in cucina.
  const [waiterMode, setWaiterMode] = useState(false);
  const [waiterCalling, setWaiterCalling] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);

  // Mappa menuItemId → imageUrl per i piatti del carrello locale
  const [cartImageMap, setCartImageMap] = useState<Record<string, string>>({});

  // ── Tempo medio consegna portata ─────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    fetch(`/api/restaurant/${restaurantId}/avg-delivery-time`)
      .then(r => r.json())
      .then(d => { if (d.avgMinutes) setAvgMinutes(d.avgMinutes) })
      .catch(() => {});
  }, [restaurantId]);

  // ── Hydration guard ──────────────────────────────────────────────────────
  useEffect(() => {
    // Aspetta il prossimo tick: Zustand ha già reidratato lo store da localStorage
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  // ── Carica immagini per i piatti del carrello locale ─────────────────────
  useEffect(() => {
    if (cartItems.length === 0) return;
    const ids = cartItems.map((i) => i.menuItemId).filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase
      .from("menu_items")
      .select("id, image_url")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((m) => { if (m.image_url) map[m.id] = m.image_url; });
        setCartImageMap(map);
      });
  }, [cartItems]);

  // ── Theme & brand ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("client-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  // ── Rileva poco spazio verticale (es. landscape su mobile) ─────────────────
  useEffect(() => {
    const check = () => setCompact(window.innerHeight < COMPACT_HEIGHT);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    supabase
      .from("qr_sessions")
      .select("restaurant_id, table_number, table_id")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.restaurant_id) {
          setRestaurantId(data.restaurant_id);
          supabase
            .from("restaurants")
            .select("name, brand_color, background_type, background_image_url, auto_order_flow")
            .eq("id", data.restaurant_id)
            .single()
            .then(({ data: r }) => {
              if (r?.name) setRestaurantName(r.name);
              // Modalità "con cameriere": auto_order_flow === false → il cliente
              // non invia in cucina ma chiama il cameriere per ordinare.
              setWaiterMode((r as any)?.auto_order_flow === false);
              if (r?.brand_color) {
                setBrandColor(r.brand_color);
                if (data.restaurant_id) try { localStorage.setItem(`brand_color_${data.restaurant_id}`, r.brand_color); } catch {}
                try { localStorage.setItem(`brand_color_session_${sessionId}`, r.brand_color); } catch {}
              }
              if (r?.background_type) {
                setBackgroundType(r.background_type);
                if (data.restaurant_id) try { localStorage.setItem(`bg_type_${data.restaurant_id}`, r.background_type); } catch {}
              }
              if (r?.background_image_url) {
                setBackgroundImageUrl(r.background_image_url);
                if (data.restaurant_id) try { localStorage.setItem(`bg_url_${data.restaurant_id}`, r.background_image_url); } catch {}
              }
            });
        }
        // Risolve numero tavolo
        const resolveTable = async () => {
          let tblId = data.table_id;
          if (!tblId && data.restaurant_id) {
            const { data: t } = await supabase
              .from("tables")
              .select("id,label")
              .eq("restaurant_id", data.restaurant_id)
              .maybeSingle();
            if (t) {
              tblId = t.id;
              setTableNumber(t.label);
              setTableId(t.id);
              return;
            }
          }
          if (tblId) {
            setTableId(tblId);
            const { data: t } = await supabase.from("tables").select("label").eq("id", tblId).maybeSingle();
            if (t?.label) setTableNumber(t.label);
          } else if (data.table_number != null) {
            setTableNumber(String(data.table_number));
          }
        };
        resolveTable();
      });
  }, [sessionId]);

  // ── Blocco ordine attivo: controlla se c'è già un ordine confermato per questo tavolo ──
  useEffect(() => {
    if (!tableId) return;
    // Stessa definizione di "ordine attivo" usata da /status: finestra 24h su
    // confirmed_at e paid_at nullo, così un vecchio ordine mai chiuso/pagato
    // non blocca il tavolo indefinitamente.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase.from("orders").select("id")
      .eq("table_id", tableId)
      .in("status", ["confirmed", "cooking", "ready"])
      .not("confirmed_at", "is", null)
      .is("paid_at", null)
      .gte("confirmed_at", since)
      .limit(1)
      .then(({ data }) => { if (data && data.length > 0) setActiveOrderBlocked(true); });
  }, [tableId]);

  // ── Fallback DB: se dopo l'hydration il carrello locale è vuoto, prova a
  // recuperare l'ordine "pending" più recente per questo tavolo, invece di
  // mostrare subito "carrello vuoto". Risolve il caso del refresh (F5): lo
  // store Zustand riparte vuoto, ma l'ordine esiste ancora nel DB.
  useEffect(() => {
    if (!hydrated) return;
    if (cartItems.length > 0) return; // il carrello locale c'è già, niente da fare
    if (!tableId) return; // aspettiamo che il tavolo sia risolto
    if (dbRecapItems) return; // già recuperato

    let cancelled = false;
    setCheckingDbOrder(true);

    (async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("id, total_cents, discount_cents")
        .eq("table_id", tableId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (!order) {
        setCheckingDbOrder(false);
        return; // nessun ordine attivo: è davvero vuoto
      }

      const { data: items } = await supabase
        .from("order_items")
        .select("id, menu_item_id, name_snapshot, quantity, base_price, portata, note, customizations")
        .eq("order_id", order.id);

      if (cancelled) return;

      const rows = (items ?? []) as OrderItemRow[];

      // Recupera immagini da menu_items per tutti gli item che hanno un menu_item_id
      const menuItemIds = rows.map((r) => r.menu_item_id).filter(Boolean) as string[];
      let imageMap: Record<string, string> = {};
      if (menuItemIds.length > 0) {
        const { data: menuItems } = await supabase
          .from("menu_items")
          .select("id, image_url")
          .in("id", menuItemIds);
        if (menuItems) {
          imageMap = Object.fromEntries(
            menuItems.filter((m) => m.image_url).map((m) => [m.id, m.image_url])
          );
        }
      }

      const recap: RecapItem[] = rows.map((r) => ({
        orderItemId: r.id,
        name: r.name_snapshot ?? "",
        quantity: r.quantity ?? 1,
        // base_price è in EURO (numeric) nel DB, il resto della pagina lavora in centesimi
        priceCents: Math.round(Number(r.base_price ?? 0) * 100),
        portata: r.portata ?? 1,
        note: r.note ?? undefined,
        customizations: r.customizations ?? [],
        imageUrl: r.menu_item_id ? imageMap[r.menu_item_id] : undefined,
      }));

      setDbOrderId(order.id);
      setDbRecapItems(recap);
      setDbTotalCents(
        order.total_cents ?? recap.reduce((s, i) => s + i.priceCents * i.quantity, 0)
      );
      setCheckingDbOrder(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, cartItems.length, tableId, dbRecapItems]);

  const isDark = theme === "dark";
  const accent = brandColor === "#ffffff" ? "#d97706" : brandColor;
  const brandBg = (() => {
    try {
      const hex = accent.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
      return `rgb(${Math.round(r + (255 - r) * 0.91)},${Math.round(g + (255 - g) * 0.91)},${Math.round(b + (255 - b) * 0.91)})`;
    } catch {
      return "#faf8f3";
    }
  })();

  const bg =
    backgroundType === "image" && backgroundImageUrl
      ? `url(${backgroundImageUrl}) center/cover no-repeat fixed`
      : backgroundType === "color" && backgroundImageUrl
      ? backgroundImageUrl
      : isDark ? "#0c0a09" : brandBg;
  const textPri = isDark ? "#f5f5f4" : "#1c1917";
  const textSec = isDark ? "#a8a29e" : "#78716c";
  const cardBg = isDark ? "#161412" : "#ffffff";
  const border = isDark ? "#2e2a27" : "#e8e4d8";

  // Pre-calcolo per evitare ternari annidati dentro template literal (SWC-safe)
  const mainGlassClass = isDark ? "confirm-glass-dark" : "confirm-glass";
  const headerCardBorder = "1px solid " + accent + "26";
  const headerCardShadow = "0 14px 40px -16px " + accent + "45, 0 2px 12px rgba(0,0,0,0.05)";
  const ctaBarBorder = "1px solid " + (isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)");
  const ctaBarShadow = isDark
    ? "0 -8px 40px rgba(0,0,0,0.55), 0 4px 18px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset"
    : "0 -8px 44px -8px " + accent + "30, 0 4px 18px rgba(20,15,10,0.08), 0 1px 0 rgba(255,255,255,0.8) inset";
  const ctaDividerBorder = "1px solid " + (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)");
  const ctaBtnBg = "linear-gradient(135deg, " + accent + ", " + accent + "dd)";
  const ctaBtnShadow = "0 8px 28px " + accent + "55, inset 0 1px 0 rgba(255,255,255,0.3)";

  // ── Raggruppa items per portata ──────────────────────────────────────────
  // Se abbiamo recuperato un ordine dal DB (fallback dopo refresh), ha la
  // precedenza sui dati del carrello locale.
  const usingDbFallback = dbRecapItems !== null;
  const recapItems: RecapItem[] = usingDbFallback
    ? dbRecapItems!
    : cartItems.map((i) => ({
        orderItemId: i.orderItemId ?? i.menuItemId,
        name: i.name,
        quantity: i.quantity,
        priceCents: i.priceCents,
        portata: i.portata,
        note: i.note,
        customizations: i.customizations,
        imageUrl: i.menuItemId ? cartImageMap[i.menuItemId] : undefined,
      }));

  const effectiveOrderId = usingDbFallback ? dbOrderId : orderId;
  const effectiveTotalCents = usingDbFallback ? dbTotalCents : totalCents();

  // ── Coupon applicato all'ordine (persistito su DB, sincronizzato via Realtime) ──
  // Salvarlo sulla riga "orders" invece che solo in localStorage permette a tutti i
  // dispositivi collegati allo stesso tavolo di vedere lo sconto non appena viene
  // applicato da uno qualsiasi di essi, e fa sopravvivere il refresh/back.
  const [appliedDiscount, setAppliedDiscount] = useState<{
    discountCents: number;
    originalTotalCents: number;
    couponCode: string;
    // Tipo/valore originali del coupon (percent/fixed): non sono salvati su "orders"
    // (solo il risultato in centesimi), quindi quando lo sconto arriva da una fonte
    // che non li conosce già (fetch iniziale, Realtime da un altro dispositivo) li
    // recuperiamo con una query separata sulla tabella "coupons", per poter mostrare
    // "10%" invece del solo importo in euro anche dopo un refresh o su un altro device.
    type?: "percent" | "fixed";
    value?: number;
  } | null>(null);

  const lookupCouponType = useCallback(async (couponCode: string) => {
    const { data } = await supabase
      .from("coupons")
      .select("discount_type, discount_value")
      .eq("code", couponCode)
      .maybeSingle();
    return data ? { type: data.discount_type as "percent" | "fixed", value: data.discount_value } : null;
  }, []);

  useEffect(() => {
    if (!effectiveOrderId) return;
    let cancelled = false;
    supabase
      .from("orders")
      .select("discount_cents, original_total_cents, coupon_code")
      .eq("id", effectiveOrderId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled || !data) return;
        if (data.discount_cents && data.original_total_cents && data.coupon_code) {
          const typeInfo = await lookupCouponType(data.coupon_code);
          if (cancelled) return;
          setAppliedDiscount({
            discountCents: data.discount_cents,
            originalTotalCents: data.original_total_cents,
            couponCode: data.coupon_code,
            ...typeInfo,
          });
        }
      });
    return () => { cancelled = true; };
  }, [effectiveOrderId, lookupCouponType]);

  useEffect(() => {
    if (!effectiveOrderId) return;
    const channel = supabase
      .channel(`order-coupon-${effectiveOrderId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${effectiveOrderId}` },
        (payload: any) => {
          const row = payload.new;
          if (row.discount_cents && row.original_total_cents && row.coupon_code) {
            lookupCouponType(row.coupon_code).then((typeInfo) => {
              setAppliedDiscount({
                discountCents: row.discount_cents,
                originalTotalCents: row.original_total_cents,
                couponCode: row.coupon_code,
                ...(typeInfo ?? undefined),
              });
            });
          } else {
            setAppliedDiscount(null);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [effectiveOrderId, lookupCouponType]);

  // Persistita sull'ordine non appena un dispositivo applica un coupon valido,
  // così gli altri dispositivi sullo stesso tavolo lo ricevono via Realtime.
  // type/value sono già noti a chi applica (li ha appena letti da "coupons"),
  // così mostriamo subito "10%" invece dell'equivalente in euro.
  const handleCouponApplied = useCallback((
    discountCents: number,
    originalTotalCents: number,
    couponCode: string,
    type: "percent" | "fixed",
    value: number
  ) => {
    setAppliedDiscount({ discountCents, originalTotalCents, couponCode, type, value });
    if (!effectiveOrderId) return;
    fetch(`/api/orders/${effectiveOrderId}/coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountCents, originalTotalCents, couponCode }),
    }).catch((err) => console.error("[ConfirmPage] salvataggio coupon fallito:", err));
  }, [effectiveOrderId]);

  // Rimuove il coupon applicato: azzera i campi sull'ordine (il codice torna
  // utilizzabile, "non consumato") e sincronizza tutti i dispositivi via Realtime.
  const handleRemoveCoupon = useCallback(() => {
    setAppliedDiscount(null);
    if (!effectiveOrderId) return;
    fetch(`/api/orders/${effectiveOrderId}/coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountCents: null, originalTotalCents: null, couponCode: null }),
    }).catch((err) => console.error("[ConfirmPage] rimozione coupon fallita:", err));
  }, [effectiveOrderId]);

  const displayedDiscountedTotal = appliedDiscount
    ? Math.max(0, appliedDiscount.originalTotalCents - appliedDiscount.discountCents)
    : null;

  // Salva la nota modificata. NB: non usiamo lo useCartStore.updateNote qui perché
  // usa get().sessionId, che resta null quando il carrello locale è vuoto e la
  // pagina mostra il recap recuperato dal DB (usingDbFallback) — la PATCH partirebbe
  // senza x-session-token e la RLS la scarterebbe silenziosamente (0 righe, nessun
  // errore). Usiamo invece il sessionId della route, sempre valido in questa pagina.
  const handleNoteSave = (orderItemId: string, note: string) => {
    useCartStore.setState((s) => ({
      items: s.items.map((i) => (i.orderItemId === orderItemId ? { ...i, note } : i)),
    }));
    if (usingDbFallback) {
      setDbRecapItems((prev) =>
        prev ? prev.map((i) => (i.orderItemId === orderItemId ? { ...i, note } : i)) : prev
      );
    }
    updateOrderItemNote(orderItemId, note, sessionId).catch((err) => {
      console.error("[ConfirmPage] updateOrderItemNote failed:", err);
    });
  };

  // Nasconde la navbar/tab bar del layout quando è mostrata la card "carrello vuoto"
  useEffect(() => {
    const cartEmpty = cartItems.length === 0 && recapItems.length === 0;
    const stillResolving = cartEmpty && (checkingDbOrder || (!tableId && !dbRecapItems));
    const showingEmptyCard = cartEmpty && !stillResolving && !confirmed;
    setEndScreenActive(showingEmptyCard);
    return () => setEndScreenActive(false);
  }, [cartItems.length, recapItems.length, checkingDbOrder, tableId, dbRecapItems, confirmed]);

  const portateGroups = recapItems.reduce<Record<number, RecapItem[]>>((acc, item) => {
    const p = item.portata ?? 1;
    if (!acc[p]) acc[p] = [];
    acc[p].push(item);
    return acc;
  }, {});
  const portateNums = Object.keys(portateGroups)
    .map(Number)
    .sort((a, b) => a - b);

  // ── Confirm handler ──────────────────────────────────────────────────────
  const handleConfirm = useCallback(
    async (method: "cash" | "card", discountedTotal: number | null, discountCents: number, couponCode: string) => {
      if (!effectiveOrderId) return;
      setLoading(true);
      try {
        // Verifica che non ci sia già un ordine attivo per questo tavolo
        // (stessa finestra temporale usata da /status, per evitare che un
        // vecchio ordine mai chiuso blocchi il tavolo indefinitamente)
        if (tableId) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: activeOrders } = await supabase
            .from("orders")
            .select("id")
            .eq("table_id", tableId)
            .in("status", ["confirmed", "cooking", "ready"])
            .not("confirmed_at", "is", null)
            .is("paid_at", null)
            .gte("confirmed_at", since)
            .limit(1);
          if (activeOrders && activeOrders.length > 0) {
            setActiveOrderBlocked(true);
            setLoading(false);
            return;
          }
        }

        // PATCH order → confirmed + metodo di pagamento + sconto (via server API, service role)
        const confirmRes = await fetch(`/api/orders/${effectiveOrderId}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: method,
            sessionId,
            discountedTotal,
            originalTotalCents: discountedTotal !== null ? effectiveTotalCents : null,
            discountCents: discountedTotal !== null ? discountCents : null,
            couponCode: discountedTotal !== null ? (couponCode || null) : null,
          }),
        });
        if (!confirmRes.ok) {
          const errBody = await confirmRes.json().catch(() => ({}));
          throw new Error(errBody.error || "Errore conferma ordine");
        }

        clearCart();
        setModalOpen(false);
        setConfirmed(true);

        // La navigazione a /status/{sessionId} è ora gestita dalla
        // ConfirmedScreen (card "Grazie mille"): aspetta l'animazione OUT
        // prima di reindirizzare, così l'utente vede il feedback visivo.
      } catch (err) {
        console.error("[ConfirmPage] handleConfirm:", err);
        const msg = err instanceof Error ? err.message : "";
        setConfirmError(
          msg === "Ordine non trovato" || msg === "Ordine già confermato o non confermabile"
            ? "Il tuo ordine non è più disponibile: potrebbe essere stato chiuso dallo staff. Ricarica la pagina."
            : "Non è stato possibile confermare l'ordine. Riprova."
        );
      } finally {
        setLoading(false);
      }
    },
    [effectiveOrderId, sessionId, clearCart, tableId]
  );

  // ── Loading / hydration ──────────────────────────────────────────────────
  const ConfirmSkeleton = () => (
    <div style={{ minHeight: "100vh", background: bg, paddingTop: 145, paddingBottom: 200 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes skPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .sk { animation: skPulse 1.5s ease-in-out infinite; border-radius: 8px; background: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}; }
      `}</style>
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "24px 16px", fontFamily: "'Space Grotesk', sans-serif", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Heading */}
        <div className="sk" style={{ width: 180, height: 28, borderRadius: 10 }} />

        {/* Portata 1 header */}
        <div style={{ background: isDark ? "#1a1816" : "#fff", borderRadius: 12, padding: "8px 12px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sk" style={{ width: 24, height: 24, borderRadius: "50%" }} />
          <div className="sk" style={{ width: 120, height: 12 }} />
          <div style={{ flex: 1 }} />
          <div className="sk" style={{ width: 50, height: 12 }} />
        </div>

        {/* Piatto 1 */}
        {[0, 1].map(i => (
          <div key={i} style={{ background: isDark ? "#1a1816" : "#fff", borderRadius: 20, borderLeft: `3px solid ${accent}30`, padding: "14px 14px", display: "flex", gap: 12, alignItems: "center", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, animationDelay: `${i * 0.1}s` }}>
            <div className="sk" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="sk" style={{ width: "60%", height: 14 }} />
              <div className="sk" style={{ width: "35%", height: 12 }} />
            </div>
            <div className="sk" style={{ width: 56, height: 14, borderRadius: 8 }} />
          </div>
        ))}

        {/* Portata 2 header */}
        <div style={{ background: isDark ? "#1a1816" : "#fff", borderRadius: 12, padding: "8px 12px", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sk" style={{ width: 24, height: 24, borderRadius: "50%" }} />
          <div className="sk" style={{ width: 140, height: 12 }} />
          <div style={{ flex: 1 }} />
          <div className="sk" style={{ width: 50, height: 12 }} />
        </div>

        {/* Piatto portata 2 */}
        <div style={{ background: isDark ? "#1a1816" : "#fff", borderRadius: 20, borderLeft: `3px solid ${accent}30`, padding: "14px 14px", display: "flex", gap: 12, alignItems: "center", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}>
          <div className="sk" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="sk" style={{ width: "55%", height: 14 }} />
            <div className="sk" style={{ width: "30%", height: 12 }} />
          </div>
          <div className="sk" style={{ width: 56, height: 14, borderRadius: 8 }} />
        </div>
      </div>

      {/* Bottom bar skeleton */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: isDark ? "#0c0a09" : bg, padding: "20px 20px max(28px, env(safe-area-inset-bottom))", zIndex: 50 }}>
        <div style={{ maxWidth: 540, margin: "0 auto", background: isDark ? "#1c1917" : "#fff", borderRadius: 20, border: `1px solid ${isDark ? "#2e2a27" : "#e8e4d8"}`, padding: "18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="sk" style={{ width: 50, height: 11 }} />
            <div className="sk" style={{ width: 90, height: 22 }} />
          </div>
          <div className="sk" style={{ width: 160, height: 48, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );

  if (!hydrated) return <ConfirmSkeleton />;

  // ── Empty cart ───────────────────────────────────────────────────────────
  // Prima di dichiarare il carrello vuoto, aspettiamo che il fallback DB
  // abbia finito di controllare se esiste un ordine "pending" per il tavolo
  // (rilevante soprattutto dopo un refresh, quando lo store locale è vuoto).
  const cartEmptyLocally = cartItems.length === 0 && recapItems.length === 0;
  const stillResolvingFallback = cartEmptyLocally && (checkingDbOrder || (!tableId && !dbRecapItems));

  if (cartEmptyLocally && stillResolvingFallback && !confirmed) {
    return <ConfirmSkeleton />;
  }

  if (cartEmptyLocally && !stillResolvingFallback && !confirmed) {
    const emptyAccentBg = accent + "14";
    const emptyBtnBg = "linear-gradient(135deg, " + accent + ", " + accent + "dd)";
    const emptyBtnShadow = "0 6px 24px " + accent + "55";
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
          @keyframes confirmEmptyFadeIn {
            from { opacity: 0; transform: scale(0.92) translateY(16px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);    }
          }
          @keyframes confirmEmptyFloat {
            0%, 100% { transform: translateY(0) rotate(-3deg); }
            50%      { transform: translateY(-6px) rotate(2deg); }
          }
          @keyframes confirmEmptyRingPulse {
            0%   { transform: scale(0.8); opacity: 0.55; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .confirm-empty-ring {
            position: absolute; inset: 0; border-radius: 50%;
            border: 2px solid ${accent};
            animation: confirmEmptyRingPulse 2.2s ease-out infinite;
          }
        `}</style>

        {/* Blob decorativi */}
        <div aria-hidden style={{ position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: emptyAccentBg, filter: "blur(40px)", pointerEvents: "none", zIndex: 0 }} />
        <div aria-hidden style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: emptyAccentBg, filter: "blur(50px)", opacity: 0.7, pointerEvents: "none", zIndex: 0 }} />

        <div
          style={{
            position: "relative", zIndex: 1,
            background: cardBg, border: `1px solid ${border}`, borderRadius: 32,
            padding: "44px 28px 36px", maxWidth: 360, width: "100%", textAlign: "center",
            backdropFilter: "blur(14px)",
            boxShadow: `0 24px 60px -20px ${border}`,
            animation: "confirmEmptyFadeIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 22px" }}>
            <div className="confirm-empty-ring" style={{ animationDelay: "0.4s" }} />
            <div
              style={{
                position: "relative", width: 88, height: 88, borderRadius: "50%",
                background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 16px 40px -8px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
                animation: "confirmEmptyFloat 3.6s ease-in-out infinite",
              }}
            >
              <ShoppingBag size={36} color="#fff" strokeWidth={1.8} />
            </div>
          </div>
          <p style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 6px" }}>
            {tCart.emptyEyebrow}
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: textPri, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            {tCart.empty}
          </h2>
          <p style={{ color: textSec, fontSize: 14, lineHeight: 1.55, marginBottom: 28, padding: "0 8px" }}>
            {tCart.emptyLong}
          </p>
          <button
            onClick={() => router.push(`/order/${sessionId}`)}
            aria-label={tCart.browseMenu}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 14,
              background: emptyBtnBg, border: "none", color: "#fff",
              fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em",
              cursor: "pointer",
              boxShadow: emptyBtnShadow,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <UtensilsCrossed size={16} />
            {tCart.browseMenu}
            <ChevronRight size={16} strokeWidth={2.5} style={{ marginLeft: -2 }} />
          </button>
        </div>
      </div>
    );
  }

  // ── Blocco: ordine già attivo per questo tavolo ─────────────────────────
  if (activeOrderBlocked) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", paddingTop: 110, fontFamily: "'Space Grotesk', sans-serif" }}>
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, background: bg, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 360, background: "#fff", borderRadius: 28, padding: "36px 28px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 4px 16px ${accent}30` }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1c1917", marginBottom: 8, letterSpacing: "-0.01em" }}>
            {tC.orderInProgress}
          </h2>
          <p style={{ fontSize: 15, color: "#78716c", lineHeight: 1.6, marginBottom: 28 }}>
            {tC.orderInProgressBody}
          </p>
          <button
            onClick={() => router.push(`/status/${sessionId}`)}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 50, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 20px ${accent}44` }}
          >
            {tC.goToOrderStatus}
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen (card "Grazie mille" con animazioni IN/OUT) ─────────────
  if (confirmed) {
    return (
      <ConfirmedScreen
        isDark={isDark}
        accent={accent}
        bg={bg}
        textPri={textPri}
        textSec={textSec}
        onNavigate={() => router.push(`/status/${sessionId}`)}
        tC={tC}
        restaurantName={restaurantName}
      />
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", color: textPri, fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Sfondo fisso alla viewport: non scrolla mai insieme al contenuto */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, background: bg, pointerEvents: "none" }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        html, body { overscroll-behavior-y: none; }
      `}</style>

      {/* CSS globale per le card del confirm (glass/sheen/lift/animazioni) */}
      <style>{CONFIRM_CARDS_CSS}</style>

      {/* Area scrollabile — unica parte del documento che scrolla */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "none",
          paddingTop: 145,
          paddingBottom: 200,
        }}
      >
      <main
        style={{
          maxWidth: 540,
          margin: "0 auto",
          padding: "24px 16px 24px 16px",
          fontFamily: "'Space Grotesk', sans-serif",
          animation: "fadeUp 0.35s ease",
        }}
      >
        {/* Etichetta "RIEPILOGO ORDINE" — glass card con divider + sheen */}
        <div
          className={"confirm-anim-down confirm-sheen " + mainGlassClass}
          style={{
            margin: "0 0 20px",
            border: headerCardBorder,
            borderRadius: 24,
            padding: "18px 20px",
            boxShadow: headerCardShadow,
            position: "relative",
            overflow: "hidden",
            color: accent,
          }}
        >
          <span aria-hidden className="confirm-divider" />
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: textPri,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {tC.summary}
          </h2>
          <p style={{ fontSize: 12, fontWeight: 700, color: accent, margin: "4px 0 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {tr.client.common.table} {tableNumber ?? "—"}
          </p>
          <span
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/cart/${sessionId}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") router.push(`/cart/${sessionId}`);
            }}
            style={{
              position: "absolute",
              bottom: 14,
              right: 18,
              fontSize: 16,
              fontWeight: 700,
              color: accent,
              textDecoration: "underline",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {tr.client.cart.edit}
          </span>
        </div>

        {/* Portate — la nota è editabile qui a prescindere dalla provenienza (carrello locale o
            recupero DB dopo refresh): in entrambi i casi l'ordine è ancora "pending", non confermato
            in cucina — un ordine già confermato non arriva mai a renderizzare questa card. */}
        {portateNums.map((n) => (
          <PortataSection key={n} portataNum={n} items={portateGroups[n]} isDark={isDark} accent={accent} canEditNote={true} onNoteSave={handleNoteSave} />
        ))}
      </main>
      </div>

      {/* ── Bottom CTA bar ──────────────────────────────────────────────────── */}
      <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: isDark
              ? "linear-gradient(0deg, #0c0a09 70%, rgba(12,10,9,0) 100%)"
              : `linear-gradient(0deg, ${brandBg} 70%, rgba(255,255,255,0) 100%)`,
            padding: "20px 20px max(28px, env(safe-area-inset-bottom))",
            zIndex: 50,
          }}
        >
          <div style={{ maxWidth: 540, margin: "0 auto" }}>
            <div
              className={"confirm-sheen confirm-anim-up " + mainGlassClass}
              style={{
                borderRadius: 28,
                border: ctaBarBorder,
                boxShadow: ctaBarShadow,
                borderBottom: ctaDividerBorder,
                fontFamily: "'Space Grotesk', sans-serif",
                position: "relative",
                overflow: "hidden",
                color: accent,
                padding: "18px 20px 20px",
              }}
            >
              <span aria-hidden className="confirm-divider" />
              {/* Totale fisso sopra il bottone */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: ctaDividerBorder,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: textSec, letterSpacing: "0.01em" }}>{tC.total}</span>
                  {avgMinutes !== null && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: accent, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {tC.estimatedTimeShort}: ~{avgMinutes} min
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {displayedDiscountedTotal !== null && (
                    <span style={{ fontSize: 30, fontWeight: 800, color: accent, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
                      € {formatPrice(displayedDiscountedTotal)}
                    </span>
                  )}
                  <span style={{
                    fontSize: displayedDiscountedTotal !== null ? 16 : 30,
                    fontWeight: 800,
                    color: displayedDiscountedTotal !== null ? textSec : textPri,
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                    position: "relative",
                    textDecoration: displayedDiscountedTotal !== null ? "line-through" : "none",
                  }}>
                    € {formatPrice(displayedDiscountedTotal !== null ? appliedDiscount!.originalTotalCents : effectiveTotalCents)}
                  </span>
                </div>
              </div>
              <button
                onClick={waiterMode ? callWaiterToOrder : openPaymentModal}
                disabled={waiterMode && (waiterCalling || waiterCalled)}
                className="confirm-cta"
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 16,
                  border: "none",
                  background: waiterMode && waiterCalled ? "#16a34a" : ctaBtnBg,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: waiterMode && (waiterCalling || waiterCalled) ? "default" : "pointer",
                  letterSpacing: "0.01em",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: ctaBtnShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  WebkitTapHighlightColor: "transparent",
                  opacity: waiterMode && waiterCalling ? 0.7 : 1,
                }}
              >
                {waiterMode ? (
                  waiterCalled ? (
                    <>
                      {tC.waiterCalled}
                      <Check size={20} />
                    </>
                  ) : waiterCalling ? (
                    <>{tC.waiterCalling}</>
                  ) : (
                    <>
                      {tC.callWaiterToOrder}
                      <ConciergeBell size={20} />
                    </>
                  )
                ) : (
                  <>
                    {tC.confirmOrder}
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
              {waiterMode && waiterCalled && (
                <p style={{ marginTop: 10, textAlign: "center", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                  {tC.waiterCalledHint}
                </p>
              )}
            </div>
          </div>
        </div>

      {/* Toast errore conferma ordine (es. ordine chiuso dallo staff durante il checkout) */}
      {confirmError && (
        <div
          key={confirmError}
          className="coupon-banner"
          style={{
            position: "fixed",
            bottom: 110,
            left: 0,
            right: 0,
            width: "100%",
            zIndex: 300,
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              maxWidth: 480,
              background: "rgba(28,25,23,0.96)",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
              justifyContent: "center",
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
            {confirmError}
          </div>
        </div>
      )}

      {/* Drawer scontrino */}
      <ReceiptDrawer
        open={compact && receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onConfirm={() => {
          setReceiptOpen(false);
          if (waiterMode) {
            callWaiterToOrder();
          } else {
            openPaymentModal();
          }
        }}
        recapItems={recapItems}
        portateGroups={portateGroups}
        portateNums={portateNums}
        totalCents={effectiveTotalCents}
        tableNumber={tableNumber}
        sessionId={sessionId}
        isDark={isDark}
        accent={accent}
      />

      {/* Modal pagamento */}
      <PaymentModal
        key={modalKey}
        open={modalOpen}
        restaurantId={restaurantId}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        total={effectiveTotalCents}
        isDark={isDark}
        accent={accent}
        appliedDiscount={appliedDiscount}
        onCouponApplied={handleCouponApplied}
        onRemoveCoupon={handleRemoveCoupon}
      />
    </div>
  );
}