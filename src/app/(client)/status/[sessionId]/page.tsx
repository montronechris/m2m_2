// src/app/(client)/status/[sessionId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Clock, Loader2, ChefHat, CheckCircle, Utensils, Bell } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import type { Palette } from "@/components/client/order/CategoryFilter";

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
  name:           string;
  quantity:       number;
  note:           string;
  customizations: CartCustomization[];
};

type Order = {
  id:            string;
  table_id:      string | null;
  status:        "confirmed" | "pending" | "cooking" | "ready" | "completed";
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

const formatPrice = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");

const shortId = (id: string) => id.slice(-4).toUpperCase();

// ─── COMANDA CARD ─────────────────────────────────────────────────────────────

function Comanda({ order, tick, isDark }: { order: Order; tick: number; isDark: boolean }) {
  const displayTime = order._displayTime || order.created_at;
  const isPending = order.status === "confirmed" || order.status === "pending";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";

  const cardBg     = isDark ? "#161412" : "#ffffff";
  const cardBorder = isDark ? "#2e2a27" : "#e8e4d8";
  const divider    = isDark ? "#2a2623" : "#ede9da";
  const nameColor  = isDark ? "#f2f0ed" : "#18130e";
  const timeColor  = isDark ? "#7a7470" : "#9c9284";
  const idColor    = isDark ? "#4a4642" : "#c0bbb0";
  const totalColor = isDark ? "#f2f0ed" : "#18130e";
  const customColor  = isDark ? "#9a9490" : "#7a7268";
  const customBg     = isDark ? "#221f1c" : "#f7f4e8";
  const customBorder = isDark ? "#3a3530" : "#ddd9c4";
  const noteColor    = isDark ? "#f59e0b" : "#b45309";
  const rowDot       = isDark ? "#2a2623" : "#e8e4d8";

  const accent =
    isPending ? "#f59e0b" :
    isCooking ? "#3b82f6" :
                "#22c55e";

  const statusLabel =
    isPending ? "In attesa" :
    isCooking ? "In cucina" :
                "Pronto";

  const statusIcon =
    isPending ? "⏳" :
    isCooking ? "🍳" :
                "✓";

  const qtyColor =
    isPending ? (isDark ? "#f59e0b" : "#d97706") :
    isCooking ? (isDark ? "#60a5fa" : "#2563eb") :
                (isDark ? "#4ade80" : "#16a34a");

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 8,
      fontFamily: "'Space Grotesk', sans-serif",
      overflow: "hidden",
      boxShadow: isDark
        ? "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)"
        : "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)",
    }}>
      <div style={{ height: 3, background: accent }} />

      <div style={{
        padding: "12px 16px 10px",
        borderBottom: `1px solid ${divider}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: nameColor }}>
          Tavolo {order.table_number ?? "—"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}30`,
            borderRadius: 5,
            padding: "3px 9px",
          }}>
            {statusIcon} {statusLabel}
          </span>
          <span style={{ fontSize: 12, color: timeColor, whiteSpace: "nowrap" }}>
            {formatElapsed(displayTime)}
          </span>
        </div>
      </div>

      <div style={{ padding: "10px 16px 4px" }}>
        {order.items.length === 0 ? (
          <p style={{ fontSize: 13, color: timeColor, fontStyle: "italic", margin: "8px 0" }}>Nessun prodotto</p>
        ) : order.items.map((item) => (
          <div key={item.id} style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            paddingBottom: 10,
            marginBottom: 8,
            borderBottom: `1px dotted ${rowDot}`,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 800, color: qtyColor,
              minWidth: 28, paddingTop: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {item.quantity}×
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: nameColor, lineHeight: 1.35 }}>
                {item.name}
              </div>
              {item.customizations.length > 0 && (
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {item.customizations.map((c, i) => (
                    <span key={i} style={{
                      fontSize: 11, color: customColor,
                      background: customBg, border: `1px solid ${customBorder}`,
                      borderRadius: 4, padding: "2px 7px",
                    }}>
                      {c.optionName}: {c.choiceName}
                      {c.priceModifierCents > 0 && ` +€${formatPrice(c.priceModifierCents)}`}
                    </span>
                  ))}
                </div>
              )}
              {item.note && (
                <div style={{
                  fontSize: 11, color: noteColor, marginTop: 4,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>⚑</span>
                  <span style={{ fontStyle: "italic" }}>{item.note}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div style={{ fontSize: 12, color: noteColor, fontStyle: "italic", marginBottom: 8, display: "flex", gap: 5 }}>
            <span>⚑</span><span>{order.notes}</span>
          </div>
        )}
      </div>

      <div style={{
        padding: "8px 16px 12px",
        borderTop: `1px solid ${divider}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: idColor, fontFamily: "'Courier New', monospace" }}>
          #{shortId(order.id)}
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: totalColor, letterSpacing: "-0.01em" }}>
          € {formatPrice(order.total_cents)}
        </span>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyCol({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <div style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 13,
      color: isDark ? "#3a3632" : "#c8c4b8",
      letterSpacing: "0.05em",
      textAlign: "center",
      padding: "48px 16px",
      border: `1px dashed ${isDark ? "#262320" : "#dedad0"}`,
      borderRadius: 8,
    }}>
      {label}
    </div>
  );
}

// ─── TAB BAR ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab, setActiveTab, counts, badges, clearBadge, isDark,
}: {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  counts: { attesa: number; cucina: number; pronti: number };
  badges: { attesa: number; cucina: number; pronti: number };
  clearBadge: (t: TabKey) => void;
  isDark: boolean;
}) {
  const tabs: { key: TabKey; label: string; color: string; icon: React.ReactNode }[] = [
    { key: "attesa",  label: "In attesa", color: "#f59e0b", icon: <Clock size={16} /> },
    { key: "cucina",  label: "In cucina", color: "#3b82f6", icon: <ChefHat size={16} /> },
    { key: "pronti",  label: "Pronti",    color: "#22c55e", icon: <CheckCircle size={16} /> },
  ];

  const barBg     = isDark ? "#161412" : "#ffffff";
  const barBorder = isDark ? "#2a2623" : "#e8e4d8";
  const inactiveColor = isDark ? "#5a5652" : "#a09890";

  return (
    <div style={{
      display: "flex",
      background: barBg,
      border: `1px solid ${barBorder}`,
      borderRadius: 12,
      padding: 4,
      gap: 4,
      marginBottom: 20,
    }}>
      {tabs.map(({ key, label, color, icon }) => {
        const isActive = activeTab === key;
        const badge = badges[key];
        const count = counts[key];

        return (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              clearBadge(key);
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 6px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: isActive ? `${color}18` : "transparent",
              position: "relative",
              transition: "background 0.18s",
            }}
          >
            {/* Badge notifica */}
            {badge > 0 && !isActive && (
              <div style={{
                position: "absolute",
                top: 6,
                right: "calc(50% - 18px)",
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: color,
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                boxShadow: `0 0 0 2px ${barBg}`,
                animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}>
                {badge}
              </div>
            )}

            {/* Icona */}
            <div style={{ color: isActive ? color : inactiveColor, display: "flex", position: "relative" }}>
              {icon}
            </div>

            {/* Label */}
            <span style={{
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? color : inactiveColor,
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}>
              {label}
            </span>

            {/* Conteggio */}
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: isActive ? color : (isDark ? "#2a2623" : "#ede9da"),
              color: isActive ? "#fff" : inactiveColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.18s, color 0.18s",
            }}>
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
  const dark500 = mix(brand,"#000000",0.45);
  const dark300 = mix(brand,"#000000",0.20);
  const light100 = mix(brand,"#ffffff",0.88);
  const light200 = mix(brand,"#ffffff",0.78);
  return {
    brand, bg: light100,
    bgGradient: `linear-gradient(160deg, #ffffff 0%, ${light100} 100%)`,
    text: dark500, textMuted: dark300, textSoft: dark300,
    border: alpha(0.20), borderMid: alpha(0.30), borderStrong: alpha(0.50),
    bgCard: "rgba(255,255,255,0.88)", grid: alpha(0.08),
    light100, light200, light300: mix(brand,"#ffffff",0.60),
    blob1: "", blob2: "", blob3: "", blob4: "",
    btnBg: `linear-gradient(135deg, ${brand}, ${dark300})`,
    btnShadow: `0 6px 24px ${alpha(0.35)}`,
    chipBg: alpha(0.10), chipBgActive: alpha(0.12),
    glowRing: "", flyDot: "", flyGlow: "",
  } as Palette;
}

// ─── FLOATING ORDER BUTTON ────────────────────────────────────────────────────

function FloatingOrderBtn({ sessionId, isDark, brandColor }: { sessionId: string; isDark: boolean; brandColor: string }) {
  const router = useRouter();
  const [visible, setVisible] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Chiudi il panel se si clicca fuori
  React.useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#fab-ordina")) setExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler as any);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler as any);
    };
  }, [expanded]);

  const btnBg  = isDark ? "#1c1917" : "#ffffff";
  const btnText = isDark ? "#f5f3f0" : "#18130e";
  const accent  = brandColor === "#ffffff" ? "#0d9488" : brandColor;
  const shadow  = isDark
    ? "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)"
    : "0 8px 28px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)";

  const handleClick = () => {
    if (expanded) {
      // Secondo tap → naviga al menu
      router.push(`/order/${sessionId}`);
    } else {
      // Primo tap → apre il panel
      setExpanded(true);
    }
  };

  return (
    <div
      id="fab-ordina"
      style={{
        position: "fixed",
        left: 0,
        top: "15%",
        zIndex: 100,
        animation: visible ? "slideInLeft 0.7s cubic-bezier(0.34,1.3,0.64,1) forwards" : "none",
        opacity: visible ? 1 : 0,
        ...(visible ? {
          animationName: "slideInLeft, floatY",
          animationDuration: "0.7s, 4s",
          animationDelay: "0s, 0.7s",
          animationTimingFunction: "cubic-bezier(0.34,1.3,0.64,1), ease-in-out",
          animationIterationCount: "1, infinite",
          animationFillMode: "forwards, none",
        } : {}),
      }}
    >
      {/* Ripple */}
      {visible && (
        <>
          <div style={{
            position: "absolute",
            left: "0%", top: "0%",
            transform: "translate(-50%, -50%)",
            width: 56, height: 56,
            borderRadius: "50%",
            background: accent,
            opacity: 0,
            animation: "ripple 2.4s ease-out 1.2s infinite",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            left: "0%", top: "0%",
            transform: "translate(-50%, -50%)",
            width: 56, height: 56,
            borderRadius: "50%",
            background: accent,
            opacity: 0,
            animation: "ripple 2.4s ease-out 2.2s infinite",
            pointerEvents: "none",
          }} />
        </>
      )}

      <button
        className="fab-btn"
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: btnBg,
          borderRadius: "0 28px 28px 0",
          boxShadow: shadow,
          border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
          borderLeft: "none",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.2s",
          position: "relative",
          padding: 0,
        }}
      >
        {/* Icona */}
        <div style={{
          width: 56, height: 56,
          borderRadius: "0 24px 24px 0",
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.5s ease-in-out 1.5s infinite",
            pointerEvents: "none",
          }} />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>

        {/* Panel espandibile */}
        <div style={{
          maxWidth: expanded ? 180 : 0,
          overflow: "hidden",
          transition: "max-width 0.38s cubic-bezier(0.34,1.2,0.64,1)",
          whiteSpace: "nowrap",
        }}>
          <div style={{ padding: "0 18px 0 12px", display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: btnText, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" }}>
              Ordina altro
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: accent, letterSpacing: "0.01em" }}>
              Tocca ancora → menu
            </span>
          </div>
        </div>
      </button>
    </div>
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

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("client-theme") as "dark" | "light") || "light";
  });
  const [brandColor, setBrandColor] = useState<string>(() => {
    if (typeof window === "undefined") return "#ffffff";
    try {
      const { getTableSession } = require("@/lib/table-session");
      const sess = getTableSession();
      if (sess?.restaurantId) {
        const cached = localStorage.getItem(`brand_color_${sess.restaurantId}`);
        if (cached) return cached;
      }
      const pathParts = window.location.pathname.split("/");
      const urlSessionId = pathParts[pathParts.length - 1];
      if (urlSessionId) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("brand_color_"));
        if (keys.length === 1) return localStorage.getItem(keys[0]) || "#ffffff";
      }
      return "#ffffff";
    } catch { return "#ffffff"; }
  });

  useEffect(() => {
    const saved = localStorage.getItem("client-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    supabase.from("qr_sessions").select("restaurant_id").eq("id", sessionId).maybeSingle()
      .then(({ data }) => {
        if (data?.restaurant_id) {
          supabase.from("restaurants").select("brand_color").eq("id", data.restaurant_id).single()
            .then(({ data: r }) => {
              if (r?.brand_color) {
                setBrandColor(r.brand_color);
                try { localStorage.setItem(`brand_color_${data.restaurant_id}`, r.brand_color); } catch {}
              }
            });
        }
      });
  }, [sessionId]);

  const isDark = theme === "dark";

  const brandBg = (() => {
    try {
      const hex = brandColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgb(${Math.round(r + (255 - r) * 0.88)},${Math.round(g + (255 - g) * 0.88)},${Math.round(b + (255 - b) * 0.88)})`;
    } catch { return "#f5f3ec"; }
  })();

  const bg        = isDark ? "#0c0a09" : brandBg;
  const textPrimC = isDark ? "#f5f5f4" : "#1c1917";
  const textSecC  = isDark ? "#a8a29e" : "#78716c";

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
          const { data: tbl } = await supabase
            .from("tables").select("id")
            .eq("restaurant_id", resolvedRestaurantId)
            .maybeSingle();
          if (tbl) resolvedTableId = tbl.id;
        }
        if (resolvedTableId) {
          const { data: tableData } = await supabase
            .from("tables").select("label")
            .eq("id", resolvedTableId).maybeSingle();
          if (tableData?.label) resolvedTableNumber = tableData.label;
        }
        if (!resolvedTableNumber && qrSession.table_number != null) {
          resolvedTableNumber = String(qrSession.table_number);
        }
      }

      if (!resolvedTableId) {
        const { data: tqr } = await supabase
          .from("table_qr_sessions").select("id, restaurant_id, table_number")
          .eq("id", sessionId).maybeSingle();
        if (tqr) {
          resolvedRestaurantId = tqr.restaurant_id;
          const { data: tbl } = await supabase
            .from("tables").select("id, label")
            .eq("restaurant_id", tqr.restaurant_id)
            .maybeSingle();
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

      const { data: ordersData, error: ordErr } = await supabase
        .from("orders").select("*")
        .eq("table_id", resolvedTableId)
        .in("status", ["confirmed", "pending", "cooking", "ready"])
        .order("created_at", { ascending: true });
      if (ordErr) throw ordErr;
      if (!ordersData?.length) { setOrders([]); setLoading(false); return; }

      const orderIds = ordersData.map(o => o.id);
      const { data: itemsData } = await supabase
        .from("order_items").select("*").in("order_id", orderIds);

      const menuItemIds = [...new Set((itemsData || []).map(i => i.menu_item_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (menuItemIds.length) {
        const { data: menuItems } = await supabase
          .from("menu_items").select("id, name").in("id", menuItemIds);
        (menuItems || []).forEach(m => { nameMap[m.id] = m.name; });
      }

      const formatted: Order[] = ordersData.map(order => {
        const orderItems = (itemsData || []).filter(i => i.order_id === order.id);
        const computedTotalCents = orderItems.reduce(
          (sum, i) => sum + Math.round((i.base_price ?? 0) * 100) * (i.quantity ?? 1), 0
        );
        return {
          ...order,
          _displayTime: order.confirmed_at || order.updated_at || order.created_at,
          total_cents: computedTotalCents > 0 ? computedTotalCents : (order.total_cents ?? 0),
          table_number: resolvedTableNumber,
          items: orderItems.map((i): OrderItem => ({
            id:       i.id,
            name:     nameMap[i.menu_item_id] || i.name_snapshot || i.name || "Prodotto",
            quantity: i.quantity ?? 1,
            note:     i.note ?? "",
            customizations: Array.isArray(i.customizations) ? i.customizations : [],
          })),
        };
      });

      // Calcola badge per tab non attivi quando arrivano aggiornamenti
      const newPending = formatted.filter(o => o.status === "confirmed" || o.status === "pending").length;
      const newCooking = formatted.filter(o => o.status === "cooking").length;
      const newReady   = formatted.filter(o => o.status === "ready").length;

      if (!isFirstLoad.current) {
        setBadges(prev => ({
          attesa: activeTab !== "attesa" && newPending > prevCountsRef.current.attesa
            ? prev.attesa + (newPending - prevCountsRef.current.attesa) : prev.attesa,
          cucina: activeTab !== "cucina" && newCooking > prevCountsRef.current.cucina
            ? prev.cucina + (newCooking - prevCountsRef.current.cucina) : prev.cucina,
          pronti: activeTab !== "pronti" && newReady > prevCountsRef.current.pronti
            ? prev.pronti + (newReady - prevCountsRef.current.pronti) : prev.pronti,
        }));

        // Se arrivano nuovi pronti e non siamo sul tab pronti → switch automatico + badge visivo
        if (newReady > prevCountsRef.current.pronti && activeTab !== "pronti") {
          // Vibra se supportato
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      } else {
        isFirstLoad.current = false;
      }

      prevCountsRef.current = { attesa: newPending, cucina: newCooking, pronti: newReady };
      setOrders(formatted);
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
    const tickInterval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(tickInterval); };
  }, [sessionId, fetchOrders]);

  const pending = orders.filter(o => o.status === "confirmed" || o.status === "pending");
  const cooking = orders.filter(o => o.status === "cooking");
  const ready   = orders.filter(o => o.status === "ready");
  const counts  = { attesa: pending.length, cucina: cooking.length, pronti: ready.length };

  const clearBadge = (tab: TabKey) => {
    setBadges(prev => ({ ...prev, [tab]: 0 }));
  };

  const tabOrders: Record<TabKey, Order[]> = { attesa: pending, cucina: cooking, pronti: ready };
  const tabEmpty: Record<TabKey, string> = {
    attesa: "Nessun ordine in attesa",
    cucina: "Nessun ordine in cucina",
    pronti: "Nessun ordine pronto",
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: isDark ? "#0e0d0b" : "#faf8f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
          <Loader2 style={{ width: 40, height: 40, color: "#0d9488", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: isDark ? "#7c7872" : "#9c9484", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Caricamento…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: textPrimC, paddingTop: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes badgePop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes tabSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInLeft {
          0%   { transform: translateX(-140%) rotate(-6deg); opacity: 0; }
          55%  { transform: translateX(8%)    rotate(2deg);  opacity: 1; }
          75%  { transform: translateX(-4%)   rotate(-1deg); opacity: 1; }
          100% { transform: translateX(0)     rotate(0deg);  opacity: 1; }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px)  rotate(0deg);    }
          35%      { transform: translateY(-7px)  rotate(1.2deg);  }
          65%      { transform: translateY(-3px)  rotate(-0.6deg); }
        }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .fab-btn:active { transform: scale(0.93) !important; transition: transform 0.1s !important; }
      `}</style>

<Navbar tableNumber={tableNumber} sessionId={sessionId} brandColor={brandColor} />
      {orders.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "65vh", gap: 20,
          fontFamily: "'Space Grotesk', sans-serif", textAlign: "center", padding: 32,
          animation: "fadeUp 0.5s ease forwards",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Utensils style={{ width: 28, height: 28, color: textSecC, opacity: 0.4 }} />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: textPrimC, margin: "0 0 6px" }}>Nessun ordine attivo</p>
            <p style={{ fontSize: 13, color: textSecC, margin: 0 }}>Non hai ancora ordinato nulla per questo tavolo.</p>
          </div>
          <Link href={`/order/${sessionId}`} style={{
            fontSize: 13, fontWeight: 700, color: "#fff",
            padding: "11px 26px", borderRadius: 8,
            background: "#0d9488", letterSpacing: "0.03em", textDecoration: "none",
          }}>
            Vai al menu →
          </Link>
        </div>
      ) : (
        <main style={{
          padding: "20px 16px 80px",
          maxWidth: 600,
          margin: "0 auto",
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          animation: "fadeUp 0.4s ease forwards",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: textPrimC, margin: "0 0 2px", letterSpacing: "-0.01em" }}>
                Il tuo ordine
              </h1>
              {tableNumber && (
                <p style={{ fontSize: 12, color: textSecC, margin: 0, fontWeight: 500 }}>
                  Tavolo {tableNumber} · in tempo reale
                </p>
              )}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "#16a34a", fontWeight: 700,
              background: isDark ? "rgba(22,163,74,0.1)" : "rgba(22,163,74,0.07)",
              border: "1px solid rgba(22,163,74,0.2)",
              borderRadius: 6, padding: "5px 10px",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
              Live
            </div>
          </div>

          {/* Tab bar */}
          <TabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            counts={counts}
            badges={badges}
            clearBadge={clearBadge}
            isDark={isDark}
          />

          {/* Contenuto tab attivo */}
          <div key={activeTab} style={{ animation: "tabSlide 0.22s ease forwards" }}>
            {tabOrders[activeTab].length === 0
              ? <EmptyCol label={tabEmpty[activeTab]} isDark={isDark} />
              : tabOrders[activeTab].map(o => (
                  <div key={o.id} style={{ marginBottom: 12 }}>
                    <Comanda order={o} tick={tick} isDark={isDark} />
                  </div>
                ))
            }
          </div>
        </main>
      )}

      {/* ── FAB: Ordina altro ──────────────────────────────────────────────── */}
      <FloatingOrderBtn sessionId={sessionId} isDark={isDark} brandColor={brandColor} />

      <Footer palette={makePalette(brandColor)} />
    </div>
  );
}