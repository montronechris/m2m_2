// src/app/(client)/status/[sessionId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Clock, Loader2, ChefHat, CheckCircle, Utensils } from "lucide-react";
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
  const isPending = order.status === "confirmed";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";

  // palette card
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

  // status accent
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
      {/* Accent bar top */}
      <div style={{ height: 3, background: accent }} />

      {/* Header: tavolo + status + ora */}
      <div style={{
        padding: "12px 16px 10px",
        borderBottom: `1px solid ${divider}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", color: nameColor,
        }}>
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

      {/* Righe piatti */}
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
                      fontSize: 11,
                      color: customColor,
                      background: customBg,
                      border: `1px solid ${customBorder}`,
                      borderRadius: 4,
                      padding: "2px 7px",
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
          <div style={{
            fontSize: 12, color: noteColor, fontStyle: "italic",
            marginBottom: 8, display: "flex", gap: 5,
          }}>
            <span>⚑</span><span>{order.notes}</span>
          </div>
        )}
      </div>

      {/* Footer: id + totale */}
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

// ─── SECTION LABEL ────────────────────────────────────────────────────────────

function SectionLabel({ icon, label, count, color, isDark }: {
  icon: React.ReactNode; label: string; count: number; color: string; isDark: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      fontFamily: "'Space Grotesk', sans-serif",
      marginBottom: 14,
      paddingBottom: 12,
      borderBottom: `2px solid ${color}`,
    }}>
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: isDark ? "#c0bbb0" : "#6b6560",
        flex: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 800,
        width: 24, height: 24,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {count}
      </span>
    </div>
  );
}

// ─── EMPTY COLUMN ─────────────────────────────────────────────────────────────

function EmptyCol({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <div style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 12,
      color: isDark ? "#3a3632" : "#c8c4b8",
      letterSpacing: "0.05em",
      textAlign: "center",
      padding: "28px 16px",
      border: `1px dashed ${isDark ? "#262320" : "#dedad0"}`,
      borderRadius: 8,
    }}>
      {label}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

// Builds a minimal Palette object from a brand hex for Navbar/Footer
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

export default function StatusPage() {
  const params    = useParams();
  const sessionId = params?.sessionId as string;

  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [tick,        setTick]        = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("client-theme") as "dark" | "light") || "light";
  });
  const [brandColor, setBrandColor] = useState<string>("#ffffff");

  useEffect(() => {
    const saved = localStorage.getItem("client-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  // Aggiorna brandColor dal fetch della sessione — usa SOLO sessionId dall'URL
  useEffect(() => {
    if (!sessionId) return;
    // Controlla prima la cache specifica per questa sessione
    const cacheKey = `brand_color_session_${sessionId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setBrandColor(cached); return; }
    } catch {}
    supabase.from("qr_sessions").select("restaurant_id").eq("id", sessionId).maybeSingle()
      .then(({ data }) => {
        if (data?.restaurant_id) {
          supabase.from("restaurants").select("brand_color").eq("id", data.restaurant_id).single()
            .then(({ data: r }) => {
              if (r?.brand_color) {
                setBrandColor(r.brand_color);
                try { localStorage.setItem(cacheKey, r.brand_color); } catch {}
              }
            });
        }
      });
  }, [sessionId]);

  const isDark = theme === "dark";

  // Mix brand col bianco per il background (stessa formula di buildPalette)
  const brandBg = (() => {
    try {
      const hex = brandColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgb(${Math.round(r + (255 - r) * 0.88)},${Math.round(g + (255 - g) * 0.88)},${Math.round(b + (255 - b) * 0.88)})`;
    } catch { return "#f5f3ec"; }
  })();

  const bg       = isDark ? "#0c0a09" : brandBg;
  const textPrim = isDark ? "#f5f5f4" : "#1c1917";
  const textSec  = isDark ? "#a8a29e" : "#78716c";
  const textPrimC = textPrim;
  const textSecC  = textSec;


  const fetchOrders = useCallback(async () => {
    if (!sessionId) return;
    try {
      // Usa la stessa API route di /order — usa service role key, legge label correttamente
      const sessionRes = await fetch(`/api/session/${sessionId}`);
      if (!sessionRes.ok) { setOrders([]); setLoading(false); return; }
      const sessionData = await sessionRes.json();

      const resolvedTableId: string | null = sessionData.tableId ?? null;
      const resolvedTableNumber: string | null = sessionData.tableNumber ?? null;

      if (!resolvedTableId) { setOrders([]); setLoading(false); return; }
      if (resolvedTableNumber) setTableNumber(resolvedTableNumber);

      const { data: ordersData, error: ordErr } = await supabase
        .from("orders").select("*")
        .eq("table_id", resolvedTableId)
        .in("status", ["confirmed", "cooking", "ready"])
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
          table_number: tableNumber,
          items: orderItems.map((i): OrderItem => ({
            id:       i.id,
            name:     nameMap[i.menu_item_id] || i.name_snapshot || i.name || "Prodotto",
            quantity: i.quantity ?? 1,
            note:     i.note ?? "",
            customizations: Array.isArray(i.customizations) ? i.customizations : [],
          })),
        };
      });

      setOrders(formatted);
    } catch (err: any) {
      console.error("[StatusPage] fetchOrders:", err?.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, tableNumber]);

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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: isDark ? "#0e0d0b" : "#faf8f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
          <Loader2 style={{ width: 40, height: 40, color: brandColor, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: isDark ? "#7c7872" : "#9c9484", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Caricamento…</p>
        </div>
      </div>
    );
  }

  const pending = orders.filter(o => o.status === "confirmed");
  const cooking = orders.filter(o => o.status === "cooking");
  const ready   = orders.filter(o => o.status === "ready");

  return (
    <div style={{ minHeight: "100vh", background: bg, color: textPrimC, paddingTop: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Navbar tableNumber={tableNumber} sessionId={sessionId} palette={makePalette(brandColor)} />

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
            <p style={{ fontSize: 18, fontWeight: 700, color: textPrimC, margin: "0 0 6px" }}>
              Nessun ordine attivo
            </p>
            <p style={{ fontSize: 13, color: textSecC, margin: 0 }}>
              Non hai ancora ordinato nulla per questo tavolo.
            </p>
          </div>
          <Link
            href={`/order/${sessionId}`}
            style={{
              fontSize: 13, fontWeight: 700, color: "#fff",
              padding: "11px 26px", borderRadius: 8,
              background: brandColor,
              letterSpacing: "0.03em",
              textDecoration: "none",
            }}
          >
            Vai al menu →
          </Link>
        </div>
      ) : (
        <main style={{
          padding: "24px 20px 60px",
          maxWidth: 1200,
          margin: "0 auto",
          fontFamily: "'Space Grotesk', 'Inter', sans-serif",
          animation: "fadeUp 0.4s ease forwards",
        }}>
          {/* Page title */}
          <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimC, margin: "0 0 3px", letterSpacing: "-0.01em" }}>
                Il tuo ordine
              </h1>
              {tableNumber && (
                <p style={{ fontSize: 12, color: textSecC, margin: 0, fontWeight: 500 }}>
                  Tavolo {tableNumber} · aggiornamento in tempo reale
                </p>
              )}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "#16a34a", fontWeight: 700,
              background: isDark ? "rgba(22,163,74,0.1)" : "rgba(22,163,74,0.07)",
              border: "1px solid rgba(22,163,74,0.2)",
              borderRadius: 6, padding: "5px 12px",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
              Live
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            alignItems: "start",
          }}>
            {/* IN ATTESA */}
            <section>
              <SectionLabel icon={<Clock style={{ width: 14, height: 14 }} />} label="In attesa" count={pending.length} color="#f59e0b" isDark={isDark} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.length === 0
                  ? <EmptyCol label="Nessun ordine in attesa" isDark={isDark} />
                  : pending.map(o => <Comanda key={o.id} order={o} tick={tick} isDark={isDark} />)
                }
              </div>
            </section>

            {/* IN CUCINA */}
            <section>
              <SectionLabel icon={<ChefHat style={{ width: 14, height: 14 }} />} label="In cucina" count={cooking.length} color="#3b82f6" isDark={isDark} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cooking.length === 0
                  ? <EmptyCol label="Nessun ordine in cucina" isDark={isDark} />
                  : cooking.map(o => <Comanda key={o.id} order={o} tick={tick} isDark={isDark} />)
                }
              </div>
            </section>

            {/* PRONTI */}
            <section>
              <SectionLabel icon={<CheckCircle style={{ width: 14, height: 14 }} />} label="Pronti" count={ready.length} color="#22c55e" isDark={isDark} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ready.length === 0
                  ? <EmptyCol label="Nessun ordine pronto" isDark={isDark} />
                  : ready.map(o => <Comanda key={o.id} order={o} tick={tick} isDark={isDark} />)
                }
              </div>
            </section>
          </div>
        </main>
      )}
      <Footer palette={makePalette(brandColor)} />
    </div>
  );
}