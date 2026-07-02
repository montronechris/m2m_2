// src/app/(client)/confirm/[sessionId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  CheckCircle,
  Receipt as ReceiptIcon,
  StickyNote,
} from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useCartRealtime } from "@/hooks/useCartRealtime";

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
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: "cash" | "card", discountedTotal: number | null, discountCents: number, couponCode: string) => void;
  total: number;
  isDark: boolean;
  accent: string;
  restaurantId?: string | null;
}) {
  const [selected, setSelected] = useState<"cash" | "card" | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponStatus, setCouponStatus] = useState<"idle" | "valid" | "invalid" | "checking">("idle");
  const [discount, setDiscount] = useState<{ type: "percent" | "fixed"; value: number } | null>(null);

  const discountedTotal = discount
    ? discount.type === "percent"
      ? Math.round(total * (1 - discount.value / 100))
      : Math.max(0, total - discount.value * 100)
    : null;

  const applyCoupon = async () => {
    const trimmed = coupon.trim().toUpperCase();
    if (!trimmed) return;
    setCouponStatus("checking");
    try {
      const { data } = await supabase
        .from("coupons")
        .select("discount_type, discount_value")
        .eq("code", trimmed)
        .eq("active", true)
        .or(restaurantId ? `restaurant_id.eq.${restaurantId},restaurant_id.is.null` : "restaurant_id.is.null")
        .maybeSingle();
      if (data) {
        setDiscount({ type: data.discount_type as "percent" | "fixed", value: data.discount_value });
        setCouponStatus("valid");
      } else {
        setDiscount(null);
        setCouponStatus("invalid");
      }
    } catch {
      setDiscount(null);
      setCouponStatus("invalid");
    }
  };

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);

  const triggerClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => { onClose(); closeTimer.current = null; }, 320);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setClosing(false);
      setDragY(0);
      dragStartY.current = null;
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    }
  }, [open]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
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
    if (dragY > 100) { triggerClose(); }
    else { dragStartY.current = null; setDragY(0); }
  };

  const bg = isDark ? "#161412" : "#ffffff";
  const overlay = isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "#2e2a27" : "#e8e4d8";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  const textSec = isDark ? "#7a7470" : "#78716c";
  const inputBg = isDark ? "#1c1917" : "#faf8f3";

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
        style={{
          background: bg,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 520,
          padding: "24px 20px max(28px, env(safe-area-inset-bottom))",
          fontFamily: "'Space Grotesk', sans-serif",
          animation: dragY === 0 ? "slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)" : "none",
          border: `1px solid ${border}`,
          borderBottom: "none",
          maxHeight: "88vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          transform: closing ? "translateY(100%)" : `translateY(${dragY}px)`,
          transition: (closing || dragY === 0) ? "transform 0.32s cubic-bezier(0.4,0,0.2,1)" : "none",
          touchAction: "none",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: isDark ? "#3a3530" : "#dedad0", margin: "0 auto 20px", cursor: "grab" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: textPri, margin: 0, letterSpacing: "-0.01em" }}>
            Come vuoi pagare?
          </h2>
          <button onClick={triggerClose} style={{ background: "#ef44441a", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        {/* Totale */}
        <div
          style={{
            background: isDark ? "#1c1917" : "#faf8f3",
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: textSec, fontWeight: 500 }}>Totale ordine</span>
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

        {/* Coupon */}
        <button
          onClick={() => setCouponOpen(!couponOpen)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: "12px 16px",
            cursor: "pointer",
            marginBottom: 16,
            color: textPri,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <Tag size={16} color={accent} />
          <span style={{ flex: 1, textAlign: "left" }}>Hai un codice coupon?</span>
          <ChevronRight
            size={16}
            color={textSec}
            style={{ transform: couponOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>

        {couponOpen && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, animation: "fadeIn 0.18s ease" }}>
            <input
              value={coupon}
              onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
              placeholder="Inserisci il codice"
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
              }}
            >
              {couponStatus === "checking" ? "…" : "Applica"}
            </button>
          </div>
        )}
        {couponOpen && couponStatus !== "idle" && (
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: couponStatus === "valid" ? "#22c55e" : "#ef4444",
            margin: "-8px 0 12px",
          }}>
            {couponStatus === "valid" && discount
            ? discount.type === "percent"
              ? `✓ Sconto del ${discount.value}% applicato`
              : `✓ Sconto di €${discount.value} applicato`
            : "✗ Coupon non valido"}
          </p>
        )}

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
          {/* Contanti */}
          <button
            onClick={() => setSelected("cash")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "18px 12px",
              borderRadius: 12,
              border: `2px solid ${selected === "cash" ? accent : border}`,
              background: selected === "cash" ? `${accent}12` : isDark ? "#1a1714" : "#faf8f3",
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <Banknote size={26} color="#22c55e" />
            <span style={{ fontSize: 14, fontWeight: 700, color: selected === "cash" ? accent : textPri }}>Contanti</span>
          </button>

          {/* Carta */}
          <button
            onClick={() => setSelected("card")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "18px 12px",
              borderRadius: 12,
              border: `2px solid ${selected === "card" ? accent : border}`,
              background: selected === "card" ? `${accent}12` : isDark ? "#1a1714" : "#faf8f3",
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <CreditCard size={26} color="#3b82f6" />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: selected === "card" ? accent : textPri }}>
                Paga con carta
              </div>
              <div style={{ fontSize: 11, color: textSec }}>Apple Pay / Carta</div>
            </div>
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: textSec, margin: "10px 0 0" }}>
          (Paghi dopo aver mangiato)
        </p>

        {/* CTA */}
        {selected ? (
          <MorphButton
            label="Conferma ordine →"
            accent={accent}
            onClick={async () => { onConfirm(selected, discountedTotal ?? null, discountedTotal !== null ? (total - discountedTotal) : 0, coupon.trim().toUpperCase()); }}
          />
        ) : (
          <button disabled style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: isDark ? "#2a2623" : "#e8e4d8", color: isDark ? "#4a4642" : "#b0ac9e", fontSize: 15, fontWeight: 800, cursor: "not-allowed", fontFamily: "'Space Grotesk', sans-serif" }}>
            Conferma ordine →
          </button>
        )}
      </div>
    </div>
    </>
  );
}

// ─── PORTATA SECTION (vista normale, a card) ──────────────────────────────────

function PortataSection({
  portataNum,
  items,
  isDark,
  accent,
}: {
  portataNum: number;
  items: RecapItem[];
  isDark: boolean;
  accent: string;
}) {
  const textSec = isDark ? "#7a7470" : "#9c9284";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  // Stile "card" coerente con /cart: superficie chiara semitrasparente + blur,
  // bordo sinistro colorato, badge pill per le customizations.
  const bgCard = isDark ? "#1a1816" : "#ffffff";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const accentBg = `${accent}14`;
  const noteColor = "#d97706";

  const portataLabels: Record<number, string> = {
    1: "Prima portata",
    2: "Seconda portata",
    3: "Terza portata",
    4: "Quarta portata",
  };
  const label = portataLabels[portataNum] ?? `Portata ${portataNum}`;

  const subtotal = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Portata header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
        background: "#fff", borderRadius: 12, padding: "8px 12px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)", border: `1px solid ${accent}20`,
      }}>
        <div
          style={{
            width: 24, height: 24, borderRadius: "50%",
            background: `${accent}18`, border: `1.5px solid ${accent}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: accent, flexShrink: 0,
          }}
        >
          {portataNum}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: `${accent}20` }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: textSec }}>€ {formatPrice(subtotal)}</span>
      </div>

      {/* Una card per piatto, stile /cart */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => {
          const lineTotal = item.priceCents * item.quantity;
          return (
            <div
              key={item.orderItemId}
              style={{
                position: "relative",
                background: bgCard,
                border: `1px solid ${borderSoft}`,
                borderRadius: 20,
                borderLeft: `3px solid ${accent}`,
                padding: "14px 14px 12px",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: `0 2px 14px ${borderSoft}`,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Thumbnail: immagine reale dal DB, con fallback all'iniziale */}
                <div
                  aria-hidden
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: item.imageUrl
                      ? "transparent"
                      : `linear-gradient(135deg, ${accent}, ${accent})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 4px 14px ${accent}30`,
                    overflow: "hidden",
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
                        borderRadius: 14,
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
                          span.style.cssText = "font-size:24px;font-weight:700;color:#fff;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.15);";
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
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
                          fontSize: 16,
                          margin: "0 0 4px",
                          color: textPri,
                          lineHeight: 1.3,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {item.quantity > 1 && (
                          <span style={{ color: accent, fontWeight: 800 }}>{item.quantity}× </span>
                        )}
                        {item.name}
                      </h3>
                      <span style={{ fontWeight: 800, fontSize: 17, color: textPri, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                        {formatPrice(lineTotal)} <span style={{ fontSize: 14, fontWeight: 700, color: textSec }}>€</span>
                      </span>
                    </div>
                  </div>

                  {/* Customizations — chip pill */}
                  {item.customizations.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {item.customizations.map((c, i) => (
                        <span
                          key={i}
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

                  {/* Nota */}
                  {item.note && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                      <StickyNote size={12} color={noteColor} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: noteColor, fontStyle: "italic" }}>{item.note}</span>
                    </div>
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
  return (
    <button
      onClick={onOpen}
      aria-label="Apri riepilogo ordine"
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
        Totale
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
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>Riepilogo ordine</span>
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
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em" }}>RIEPILOGO ORDINE</div>
                <div style={{ fontSize: 11, color: dim, marginTop: 4 }}>
                  {tableNumber ? `Tavolo ${tableNumber}` : "Asporto"} · {totalItems} piatti
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
                    {portataLabels[n] ?? `PORTATA ${n}`}
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

              <div style={{ textAlign: "center", fontSize: 11, color: dim, marginTop: 16 }}>Grazie e buon appetito!</div>
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
            Conferma ordine
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const COMPACT_HEIGHT = 680;

export default function ConfirmPage() {
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
    setModalOpen(false);
    setTimeout(() => { setModalKey(k => k + 1); setModalOpen(true); }, 0);
  };
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [activeOrderBlocked, setActiveOrderBlocked] = useState(false);
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
  const [avgMinutes, setAvgMinutes] = useState<number | null>(null);

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
            .select("brand_color, background_type, background_image_url")
            .eq("id", data.restaurant_id)
            .single()
            .then(({ data: r }) => {
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
    supabase.from("orders").select("id")
      .eq("table_id", tableId)
      .in("status", ["confirmed", "cooking", "ready"])
      .not("confirmed_at", "is", null)
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
            .gte("confirmed_at", since)
            .limit(1);
          if (activeOrders && activeOrders.length > 0) {
            setActiveOrderBlocked(true);
            setLoading(false);
            return;
          }
        }

        // PATCH order → confirmed + metodo di pagamento + sconto
        const updatePayload: Record<string, unknown> = {
          status: "confirmed",
          payment_method: method,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          session_id: sessionId,
        };
        if (discountedTotal !== null) {
          updatePayload.original_total_cents = effectiveTotalCents;
          updatePayload.total_cents          = discountedTotal;
          updatePayload.discount_cents       = discountCents;
          updatePayload.coupon_code          = couponCode || null;
        }
        await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", effectiveOrderId);

        clearCart();
        setModalOpen(false);
        setConfirmed(true);

        // Redirige alla pagina status dopo 2s
        setTimeout(() => router.push(`/status/${sessionId}`), 2000);
      } catch (err) {
        console.error("[ConfirmPage] handleConfirm:", err);
      } finally {
        setLoading(false);
      }
    },
    [effectiveOrderId, sessionId, clearCart, router, tableId]
  );

  // ── Loading / hydration ──────────────────────────────────────────────────
  const ConfirmSkeleton = () => (
    <div style={{ minHeight: "100vh", background: bg, paddingTop: 140, paddingBottom: 200 }}>
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
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 20,
          fontFamily: "'Space Grotesk', sans-serif",
          padding: 32,
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');`}</style>
        <ShoppingBag size={48} color={isDark ? "#3a3632" : "#d8d4c8"} />
        <p style={{ fontSize: 17, fontWeight: 700, color: textPri, margin: 0 }}>Il carrello è vuoto</p>
        <button
          onClick={() => router.push(`/order/${sessionId}`)}
          style={{
            background: accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Vai al menu →
        </button>
      </div>
    );
  }

  // ── Blocco: ordine già attivo per questo tavolo ─────────────────────────
  if (activeOrderBlocked) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", fontFamily: "'Space Grotesk', sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 360, background: "#fff", borderRadius: 28, padding: "36px 28px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
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
            Ordine già in corso
          </h2>
          <p style={{ fontSize: 15, color: "#78716c", lineHeight: 1.6, marginBottom: 28 }}>
            C'è già un ordine attivo per questo tavolo. Non è possibile inviarne un altro finché quello in corso non viene completato.
          </p>
          <button
            onClick={() => router.push(`/status/${sessionId}`)}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 50, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 20px ${accent}44` }}
          >
            Vai allo stato dell'ordine
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div
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
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
          @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
        <div style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <CheckCircle size={64} color="#22c55e" />
        </div>
        <div style={{ animation: "fadeUp 0.4s ease 0.15s both" }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: textPri, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Ordine confermato!
          </p>
          <p style={{ fontSize: 14, color: textSec, margin: 0 }}>Stiamo portando il tuo ordine in cucina…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: textPri, paddingTop: 140, paddingBottom: 200 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      <main
        style={{
          maxWidth: 540,
          margin: "0 auto",
          padding: "24px 16px 24px 16px",
          fontFamily: "'Space Grotesk', sans-serif",
          animation: "fadeUp 0.35s ease",
        }}
      >
        {/* Etichetta "RIEPILOGO ORDINE" — sopra le card dei piatti */}
        <div style={{ margin: "0 0 20px" }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: textPri,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Riepilogo ordine
          </h2>
        </div>

        {/* Portate */}
        {portateNums.map((n) => (
          <PortataSection key={n} portataNum={n} items={portateGroups[n]} isDark={isDark} accent={accent} />
        ))}
      </main>

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
              style={{
                background: isDark ? "#1c1917" : "#ffffff",
                borderRadius: 20,
                border: `1px solid ${isDark ? "#2e2a27" : "#e8e4d8"}`,
                boxShadow: isDark
                  ? "0 -4px 32px rgba(0,0,0,0.5), 0 2px 16px rgba(0,0,0,0.3)"
                  : "0 -4px 32px rgba(0,0,0,0.08), 0 2px 16px rgba(0,0,0,0.06)",
                padding: "18px 18px 18px",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {/* Totale fisso sopra il bottone */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${isDark ? "#2e2a27" : "#f0ece0"}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: textSec }}>Totale</span>
                  {avgMinutes !== null && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: textSec }}>
                      ⏱ Tempo stimato: ~{avgMinutes} min
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, color: textPri, letterSpacing: "-0.03em" }}>
                  € {formatPrice(effectiveTotalCents)}
                </span>
              </div>
              <button
                onClick={openPaymentModal}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 14,
                  border: "none",
                  background: accent,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: `0 6px 24px ${accent}50`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                Conferma ordine
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

      {/* Drawer scontrino */}
      <ReceiptDrawer
        open={compact && receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onConfirm={() => {
          setReceiptOpen(false);
          openPaymentModal();
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
      />
    </div>
  );
}