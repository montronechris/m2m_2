// src/app/(client)/confirm/[sessionId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Loader2,
  ShoppingBag,
  CreditCard,
  Banknote,
  ChevronRight,
  ChevronLeft,
  X,
  Tag,
  CheckCircle,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";

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
};

// Riga grezza come torna dalla query Supabase su order_items
type OrderItemRow = {
  id: string;
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
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: "cash" | "card") => void;
  total: number;
  isDark: boolean;
  accent: string;
}) {
  const [selected, setSelected] = useState<"cash" | "card" | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);

  const bg = isDark ? "#161412" : "#ffffff";
  const overlay = isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "#2e2a27" : "#e8e4d8";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  const textSec = isDark ? "#7a7470" : "#78716c";
  const inputBg = isDark ? "#1c1917" : "#faf8f3";

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: overlay,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 520,
          padding: "24px 20px max(28px, env(safe-area-inset-bottom))",
          fontFamily: "'Space Grotesk', sans-serif",
          animation: "slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)",
          border: `1px solid ${border}`,
          borderBottom: "none",
          maxHeight: "88vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: isDark ? "#3a3530" : "#dedad0", margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: textPri, margin: 0, letterSpacing: "-0.01em" }}>
            Come vuoi pagare?
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: textSec }}>
            <X size={20} />
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
          <span style={{ fontSize: 20, fontWeight: 800, color: textPri, letterSpacing: "-0.02em" }}>
            € {formatPrice(total)}
          </span>
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
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Inserisci il codice"
              style={{
                flex: 1,
                background: inputBg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                fontFamily: "'Space Grotesk', sans-serif",
                color: textPri,
                outline: "none",
                letterSpacing: "0.05em",
              }}
            />
            <button
              style={{
                background: accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Applica
            </button>
          </div>
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
            <Banknote size={26} color={selected === "cash" ? accent : textSec} />
            <span style={{ fontSize: 14, fontWeight: 700, color: selected === "cash" ? accent : textPri }}>Contanti</span>
            <span style={{ fontSize: 11, color: textSec, textAlign: "center" }}>Paghi dopo aver mangiato</span>
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
            <CreditCard size={26} color={selected === "card" ? accent : textSec} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: selected === "card" ? accent : textPri }}>
                Paga con carta
              </div>
              <div style={{ fontSize: 11, color: textSec }}>Apple Pay / Carta</div>
            </div>
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 12,
            border: "none",
            background: selected ? accent : isDark ? "#2a2623" : "#e8e4d8",
            color: selected ? "#fff" : isDark ? "#4a4642" : "#b0ac9e",
            fontSize: 15,
            fontWeight: 800,
            cursor: selected ? "pointer" : "not-allowed",
            letterSpacing: "0.01em",
            fontFamily: "'Space Grotesk', sans-serif",
            transition: "all 0.2s",
            boxShadow: selected ? `0 4px 16px ${accent}40` : "none",
          }}
        >
          Conferma ordine →
        </button>
      </div>
    </div>
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
  const cardBg = isDark ? "#161412" : "#ffffff";
  const border = isDark ? "#2e2a27" : "#e8e4d8";
  const textPri = isDark ? "#f2f0ed" : "#18130e";
  const textSec = isDark ? "#7a7470" : "#9c9284";
  const customBg = isDark ? "#221f1c" : "#f7f4e8";
  const customBd = isDark ? "#3a3530" : "#ddd9c4";
  const noteColor = isDark ? "#f59e0b" : "#b45309";
  const qtyColor = accent;
  const dotBorder = isDark ? "#2a2623" : "#e8e4d8";

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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingLeft: 2 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: `${accent}18`,
            border: `1.5px solid ${accent}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: accent,
            flexShrink: 0,
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

      {/* Items card */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ height: 3, background: accent, opacity: 0.6 }} />
        <div style={{ padding: "6px 16px 4px" }}>
          {items.map((item, idx) => (
            <div
              key={item.orderItemId}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                paddingBottom: 12,
                paddingTop: 10,
                borderBottom: idx < items.length - 1 ? `1px dotted ${dotBorder}` : "none",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: qtyColor,
                  minWidth: 28,
                  paddingTop: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.quantity}×
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: textPri, lineHeight: 1.35 }}>{item.name}</div>
                {item.customizations.length > 0 && (
                  <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {item.customizations.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          color: isDark ? "#9a9490" : "#7a7268",
                          background: customBg,
                          border: `1px solid ${customBd}`,
                          borderRadius: 4,
                          padding: "2px 7px",
                        }}
                      >
                        {c.optionName}: {c.choiceName}
                        {c.priceModifierCents > 0 && ` +€${formatPrice(c.priceModifierCents)}`}
                      </span>
                    ))}
                  </div>
                )}
                {item.note && (
                  <div style={{ fontSize: 11, color: noteColor, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>⚑</span>
                    <span style={{ fontStyle: "italic" }}>{item.note}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: textSec, whiteSpace: "nowrap", paddingTop: 2 }}>
                € {formatPrice(item.priceCents * item.quantity)}
              </span>
            </div>
          ))}
        </div>
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

  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string>("#d97706");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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

  // ── Hydration guard ──────────────────────────────────────────────────────
  useEffect(() => {
    // Aspetta il prossimo tick: Zustand ha già reidratato lo store da localStorage
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

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
          supabase
            .from("restaurants")
            .select("brand_color")
            .eq("id", data.restaurant_id)
            .single()
            .then(({ data: r }) => {
              if (r?.brand_color) setBrandColor(r.brand_color);
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
        .select("id, name_snapshot, quantity, base_price, portata, note, customizations")
        .eq("order_id", order.id);

      if (cancelled) return;

      const rows = (items ?? []) as OrderItemRow[];
      const recap: RecapItem[] = rows.map((r) => ({
        orderItemId: r.id,
        name: r.name_snapshot ?? "",
        quantity: r.quantity ?? 1,
        // base_price è in EURO (numeric) nel DB, il resto della pagina lavora in centesimi
        priceCents: Math.round(Number(r.base_price ?? 0) * 100),
        portata: r.portata ?? 1,
        note: r.note ?? undefined,
        customizations: r.customizations ?? [],
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

  const bg = isDark ? "#0c0a09" : brandBg;
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
    async (method: "cash" | "card") => {
      if (!effectiveOrderId) return;
      setLoading(true);
      try {
        // PATCH order → confirmed + metodo di pagamento
        await supabase
          .from("orders")
          .update({
            status: "confirmed",
            payment_method: method,
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
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
    [effectiveOrderId, sessionId, clearCart, router]
  );

  // ── Loading / hydration ──────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');`}</style>
        <Loader2 size={32} color={accent} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────────
  // Prima di dichiarare il carrello vuoto, aspettiamo che il fallback DB
  // abbia finito di controllare se esiste un ordine "pending" per il tavolo
  // (rilevante soprattutto dopo un refresh, quando lo store locale è vuoto).
  const cartEmptyLocally = cartItems.length === 0 && recapItems.length === 0;
  const stillResolvingFallback = cartEmptyLocally && (checkingDbOrder || (!tableId && !dbRecapItems));

  if (cartEmptyLocally && stillResolvingFallback && !confirmed) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');`}</style>
        <Loader2 size={32} color={accent} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
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
    <div style={{ minHeight: "100vh", background: bg, color: textPri, paddingTop: 20, paddingBottom: compact ? 36 : 120 }}>
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
          padding: `24px ${compact ? 56 : 16}px 24px 16px`,
          fontFamily: "'Space Grotesk', sans-serif",
          animation: "fadeUp 0.35s ease",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPri, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Riepilogo ordine
          </h1>
          {tableNumber && (
            <p style={{ fontSize: 13, color: textSec, margin: 0, fontWeight: 500 }}>
              Tavolo {tableNumber} · {recapItems.reduce((s, i) => s + i.quantity, 0)} piatti
            </p>
          )}
        </div>

        {/* Portate */}
        {portateNums.map((n) => (
          <PortataSection key={n} portataNum={n} items={portateGroups[n]} isDark={isDark} accent={accent} />
        ))}

        {/* Totale — solo se c'è spazio a sufficienza, altrimenti vive nella tab laterale */}
        {!compact && (
          <div
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: "14px 18px",
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: textSec }}>Totale</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: textPri, letterSpacing: "-0.02em" }}>
              € {formatPrice(effectiveTotalCents)}
            </span>
          </div>
        )}
      </main>

      {/* ── Bottom CTA bar (solo schermi con spazio a sufficienza) ──────────── */}
      {!compact && (
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
            <button
              onClick={() => setModalOpen(true)}
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
      )}

      {/* ── Tab laterale (schermi con poco spazio verticale) ───────────────── */}
      {compact && <SideTotalTab accent={accent} totalCents={effectiveTotalCents} onOpen={() => setReceiptOpen(true)} />}

      {/* Drawer scontrino */}
      <ReceiptDrawer
        open={compact && receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onConfirm={() => {
          setReceiptOpen(false);
          setModalOpen(true);
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        total={effectiveTotalCents}
        isDark={isDark}
        accent={accent}
      />
    </div>
  );
}