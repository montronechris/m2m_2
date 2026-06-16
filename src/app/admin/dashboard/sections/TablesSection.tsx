// src/app/admin/dashboard/sections/TablesSection.tsx
//
// ─── SEZIONE: TAVOLI ──────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutGrid, Plus, Trash2, QrCode,
  Download, RefreshCw, CheckCircle2,
  Coffee, Loader2, AlertCircle, Copy,
  Info, Wifi, WifiOff, ShoppingCart, CreditCard, Banknote, X,
} from "lucide-react";
import QRCode from "qrcode";
import type { RestaurantCtx, ThemeMode } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Table {
  id:         string;
  label:      string;
  code:       string;
  is_active:  boolean;
  created_at: string;
}

interface TableInfo {
  session:  { id: string; is_active: boolean; created_at: string } | null;
  order:    {
    id: string;
    status: string;
    total_cents: number;
    payment_method: string | null;
    discount_cents: number;
    coupon_code: string | null;
    confirmed_at: string | null;
    created_at: string;
    items_count: number;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(label: string): string {
  const prefix = label
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

function qrUrl(code: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  return `${base}/scan/${code}`;
}

async function renderQR(code: string): Promise<string> {
  return QRCode.toDataURL(qrUrl(code), {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

function formatEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Sub-component: Info Modal ────────────────────────────────────────────────

function InfoModal({
  table,
  onClose,
  theme,
  supabase,
}: {
  table: Table;
  onClose: () => void;
  theme: ThemeMode;
  supabase: ReturnType<typeof createBrowserClient>;
}) {
  const dark   = theme === "dark";
  const bg     = dark ? "#0e0d0b" : "#faf8f3";
  const card   = dark ? "#13131e" : "#ffffff";
  const txt    = dark ? "#f5f5f4" : "#1c1917";
  const muted  = dark ? "#a8a29e" : "#78716c";
  const border = dark ? "rgba(255,255,255,0.08)" : "#e7e5e4";

  const [info,    setInfo]    = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      try {
        // 1. Sessione attiva
        const { data: sessions } = await supabase
          .from("qr_sessions")
          .select("id, is_active, created_at")
          .eq("table_id", table.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        const session = sessions?.[0] ?? null;

        // 2. Ordine pending/confirmed più recente per questo tavolo
        const { data: orders } = await supabase
          .from("orders")
          .select("id, status, total_cents, payment_method, discount_cents, coupon_code, confirmed_at, created_at")
          .eq("table_id", table.id)
          .in("status", ["pending", "confirmed"])
          .order("created_at", { ascending: false })
          .limit(1);

        const order = orders?.[0] ?? null;

        // 3. Conta items se c'è un ordine
        let items_count = 0;
        if (order) {
          const { count } = await supabase
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", order.id);
          items_count = count ?? 0;
        }

        setInfo({
          session,
          order: order ? { ...order, items_count } : null,
        });
      } catch {
        setInfo({ session: null, order: null });
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [table.id]);

  const statusColor = (status: string) => {
    if (status === "confirmed") return "#4ade80";
    if (status === "pending")   return "#facc15";
    return muted;
  };

  const statusLabel = (status: string) => {
    if (status === "confirmed") return "Confermato";
    if (status === "pending")   return "In attesa";
    if (status === "cancelled") return "Annullato";
    return status;
  };

  const paymentIcon = (method: string | null) => {
    if (method === "card") return <CreditCard style={{ width: 14, height: 14 }} />;
    if (method === "cash") return <Banknote style={{ width: 14, height: 14 }} />;
    return <AlertCircle style={{ width: 14, height: 14, color: muted }} />;
  };

  const paymentLabel = (method: string | null) => {
    if (method === "card") return "Carta / Apple Pay";
    if (method === "cash") return "Contanti";
    return "Non ancora assegnata";
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Info style={{ width: 18, height: 18, color: "#818cf8" }} />
            </div>
            <div>
              <p style={{ color: txt, fontWeight: 700, fontSize: 15, margin: 0 }}>{table.label}</p>
              <p style={{ color: muted, fontSize: 12, margin: 0, fontFamily: "monospace" }}>{table.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: muted, padding: 4, display: "flex" }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Loader2 style={{ width: 28, height: 28, color: muted, animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Sessione */}
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "14px 16px" }}>
              <p style={{ color: muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Sessione
              </p>
              {info?.session ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                  <div>
                    <p style={{ color: txt, fontSize: 13, fontWeight: 600, margin: 0 }}>Sessione attiva</p>
                    <p style={{ color: muted, fontSize: 11, margin: 0 }}>Avviata il {formatDate(info.session.created_at)}</p>
                  </div>
                  <Wifi style={{ width: 16, height: 16, color: "#4ade80", marginLeft: "auto" }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: muted }} />
                  <p style={{ color: muted, fontSize: 13, fontWeight: 500, margin: 0 }}>Nessuna sessione attiva</p>
                  <WifiOff style={{ width: 16, height: 16, color: muted, marginLeft: "auto" }} />
                </div>
              )}
            </div>

            {/* Ordine */}
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "14px 16px" }}>
              <p style={{ color: muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Ordine
              </p>
              {info?.order ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ShoppingCart style={{ width: 14, height: 14, color: statusColor(info.order.status) }} />
                      <span style={{ color: txt, fontSize: 13, fontWeight: 600 }}>
                        {statusLabel(info.order.status)}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                      background: `${statusColor(info.order.status)}20`,
                      color: statusColor(info.order.status),
                    }}>
                      {info.order.items_count} {info.order.items_count === 1 ? "piatto" : "piatti"}
                    </span>
                  </div>

                  {/* Divisore */}
                  <div style={{ height: 1, background: border }} />

                  {/* Totale */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: muted, fontSize: 12 }}>Totale</span>
                    <span style={{ color: txt, fontSize: 14, fontWeight: 800 }}>
                      {formatEur(info.order.total_cents)}
                    </span>
                  </div>

                  {/* Sconto */}
                  {(info.order.discount_cents ?? 0) > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: muted, fontSize: 12 }}>
                        Sconto {info.order.coupon_code ? `(${info.order.coupon_code})` : ""}
                      </span>
                      <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>
                        -{formatEur(info.order.discount_cents)}
                      </span>
                    </div>
                  )}

                  {/* Pagamento */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: muted, fontSize: 12 }}>Pagamento</span>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                      color: info.order.payment_method ? txt : muted,
                      fontStyle: info.order.payment_method ? "normal" : "italic",
                    }}>
                      {paymentIcon(info.order.payment_method)}
                      {paymentLabel(info.order.payment_method)}
                    </div>
                  </div>

                  {/* Data */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: muted, fontSize: 12 }}>Creato</span>
                    <span style={{ color: muted, fontSize: 11 }}>{formatDate(info.order.created_at)}</span>
                  </div>

                  {info.order.confirmed_at && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: muted, fontSize: 12 }}>Confermato</span>
                      <span style={{ color: muted, fontSize: 11 }}>{formatDate(info.order.confirmed_at)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: muted, fontSize: 13, margin: 0 }}>Nessun ordine attivo</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: QR Modal ──────────────────────────────────────────────────

function QrModal({
  table,
  onClose,
  theme,
}: {
  table: Table;
  onClose: () => void;
  theme: ThemeMode;
}) {
  const dark   = theme === "dark";
  const bg     = dark ? "#0e0d0b" : "#faf8f3";
  const card   = dark ? "#13131e" : "#ffffff";
  const txt    = dark ? "#f5f5f4" : "#1c1917";
  const muted  = dark ? "#a8a29e" : "#78716c";
  const border = dark ? "rgba(255,255,255,0.08)" : "#e7e5e4";

  const [qrSrc,   setQrSrc]   = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    renderQR(table.code).then(setQrSrc);
  }, [table.code]);

  const url = qrUrl(table.code);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `qr-${table.code}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-3xl shadow-2xl p-7 w-full max-w-sm space-y-5"
        style={{ background: card, border: `1px solid ${border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-bold" style={{ color: txt }}>
            QR Code — {table.label}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: muted }}>
            Scansiona per accedere al menu
          </p>
        </div>

        <div className="flex justify-center">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR ${table.code}`}
              className="rounded-2xl"
              style={{ width: 200, height: 200 }}
            />
          ) : (
            <div
              className="w-[200px] h-[200px] rounded-2xl flex items-center justify-center"
              style={{ background: bg }}
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: muted }} />
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: bg, border: `1px solid ${border}` }}
        >
          <span className="text-xs truncate flex-1 font-mono" style={{ color: muted }}>
            {url}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 transition-colors"
            style={{ color: copied ? "#4ade80" : muted }}
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
            {table.code}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
            >
              <Download className="w-3.5 h-3.5" /> Scarica PNG
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: border, color: muted }}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component principale ─────────────────────────────────────────────────────

interface Props {
  ctx:   RestaurantCtx;
  theme: ThemeMode;
}

export function TablesSection({ ctx, theme }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tables,    setTables]    = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [newLabel,  setNewLabel]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [qrTable,   setQrTable]   = useState<Table | null>(null);
  const [infoTable, setInfoTable] = useState<Table | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  // ── Tema ──────────────────────────────────────────────────────────────────
  const dark  = theme === "dark";
  const card  = dark ? "bg-[#13131e]"   : "bg-white";
  const bord  = dark ? "border-white/8" : "border-gray-200";
  const txt   = dark ? "text-white"     : "text-gray-900";
  const muted = dark ? "text-gray-400"  : "text-gray-500";
  const input = dark
    ? "bg-[#0e0d0b] border-white/10 text-white placeholder-gray-600 focus:border-green-500"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-500";

  // ── Carica tavoli ─────────────────────────────────────────────────────────
  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("id, label, code, is_active, created_at")
        .eq("restaurant_id", ctx.restaurantId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTables(data ?? []);
    } catch (err: any) {
      setError("Errore nel caricamento dei tavoli.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [ctx.restaurantId]);

  // ── Aggiunta tavolo ───────────────────────────────────────────────────────
  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setSaving(true);
    setError(null);
    try {
      const code = generateCode(label);
      const { error } = await supabase
        .from("tables")
        .insert({
          restaurant_id: ctx.restaurantId,
          label,
          code,
          is_active: true,
        });
      if (error) throw error;
      setNewLabel("");
      setAdding(false);
      await load();
    } catch (err: any) {
      setError(err.message || "Errore nell'aggiunta del tavolo.");
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminazione tavolo ───────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setTables(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError("Errore nell'eliminazione del tavolo.");
    } finally {
      setDeleting(null);
    }
  };

  // ── Rigenera codice ───────────────────────────────────────────────────────
  const handleRegen = async (table: Table) => {
    const newCode = generateCode(table.label);
    try {
      const { error } = await supabase
        .from("tables")
        .update({ code: newCode })
        .eq("id", table.id);
      if (error) throw error;
      setTables(prev =>
        prev.map(t => t.id === table.id ? { ...t, code: newCode } : t)
      );
    } catch {
      setError("Errore nella rigenerazione del codice.");
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl w-full mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-500/15 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${txt}`}>Tavoli</h2>
            <p className={`text-xs ${muted}`}>
              {tables.length} {tables.length === 1 ? "tavolo" : "tavoli"} configurati
            </p>
          </div>
        </div>
        <button
          onClick={() => { setAdding(true); setNewLabel(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition-all shadow-lg shadow-green-500/20"
        >
          <Plus className="w-4 h-4" />
          Aggiungi tavolo
        </button>
      </div>

      {/* ── ERRORE ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── FORM AGGIUNTA ───────────────────────────────────────────────── */}
      {adding && (
        <div className={`${card} rounded-2xl border ${bord} px-6 py-5`}>
          <p className={`text-sm font-semibold ${txt} mb-3`}>Nuovo tavolo</p>
          <div className="flex gap-3">
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              placeholder="es. Tavolo 5, Terrazza A, Bancone..."
              className={`flex-1 px-4 py-2.5 border-2 rounded-xl text-sm outline-none transition-colors ${input}`}
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newLabel.trim()}
              className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crea
            </button>
            <button
              onClick={() => setAdding(false)}
              className={`px-4 py-2.5 rounded-xl border ${bord} text-sm font-medium ${muted} transition-all hover:opacity-70`}
            >
              Annulla
            </button>
          </div>
          <p className={`text-xs ${muted} mt-2`}>
            Il codice QR univoco verrà generato automaticamente.
          </p>
        </div>
      )}

      {/* ── LISTA TAVOLI ────────────────────────────────────────────────── */}
      {tables.length === 0 ? (
        <div className={`${card} rounded-2xl border ${bord} px-6 py-16 text-center`}>
          <Coffee className={`w-10 h-10 mx-auto mb-3 ${muted} opacity-40`} />
          <p className={`text-base font-semibold ${txt}`}>Nessun tavolo configurato</p>
          <p className={`text-sm ${muted} mt-1`}>
            Aggiungi il primo tavolo per generare i QR code.
          </p>
        </div>
      ) : (
        <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>
          {/* Intestazione colonne */}
          <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b ${bord}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Tavolo</p>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted} text-center w-28`}>Codice QR</p>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted} text-center w-20`}>QR</p>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted} text-center w-10`}>Info</p>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted} text-center w-16`}>Azioni</p>
          </div>

          <div className={`divide-y ${dark ? "divide-white/5" : "divide-gray-100"}`}>
            {tables.map(table => (
              <div
                key={table.id}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 transition-all ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}`}
              >
                {/* Label + stato */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${txt} truncate`}>{table.label}</p>
                    <p className={`text-xs ${muted}`}>
                      /scan/{table.code}
                    </p>
                  </div>
                </div>

                {/* Badge codice */}
                <div className="flex items-center gap-2 w-28 justify-center">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg font-semibold bg-green-500/12 text-green-400">
                    {table.code}
                  </span>
                </div>

                {/* Pulsante QR */}
                <div className="w-20 flex justify-center">
                  <button
                    onClick={() => setQrTable(table)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all bg-blue-500/12 text-blue-400 hover:bg-blue-500/20"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Mostra
                  </button>
                </div>

                {/* Pulsante Info */}
                <div className="w-10 flex justify-center">
                  <button
                    onClick={() => setInfoTable(table)}
                    title="Info sessione e ordine"
                    className={`p-1.5 rounded-lg transition-all ${dark ? "hover:bg-indigo-500/15 text-gray-400 hover:text-indigo-400" : "hover:bg-indigo-50 text-gray-400 hover:text-indigo-500"}`}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                {/* Azioni: rigenera + elimina */}
                <div className="w-16 flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleRegen(table)}
                    title="Rigenera codice"
                    className={`p-1.5 rounded-lg transition-all ${dark ? "hover:bg-white/8 text-gray-400 hover:text-yellow-400" : "hover:bg-gray-100 text-gray-400 hover:text-yellow-600"}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    disabled={deleting === table.id}
                    title="Elimina tavolo"
                    className={`p-1.5 rounded-lg transition-all ${dark ? "hover:bg-red-500/15 text-gray-400 hover:text-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-500"}`}
                  >
                    {deleting === table.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INFO BOX ────────────────────────────────────────────────────── */}
      <div className={`${card} rounded-2xl border ${bord} px-6 py-5`}>
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-semibold ${txt}`}>Come funzionano i QR code</p>
            <p className={`text-xs ${muted} mt-1 leading-relaxed`}>
              Ogni tavolo ha un codice univoco (es. <span className="font-mono text-green-400">TAV1-X9Z2</span>).
              Il QR reindirizza il cliente a <span className="font-mono">/scan/&lt;codice&gt;</span> dove
              verrà identificato il tavolo e mostrato il menu. Se perdi il QR stampato,
              puoi rigenerare un nuovo codice con{" "}
              <RefreshCw className="w-3 h-3 inline-block" /> — il vecchio QR diventerà invalido.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL QR ────────────────────────────────────────────────────── */}
      {qrTable && (
        <QrModal
          table={qrTable}
          theme={theme}
          onClose={() => setQrTable(null)}
        />
      )}

      {/* ── MODAL INFO ──────────────────────────────────────────────────── */}
      {infoTable && (
        <InfoModal
          table={infoTable}
          theme={theme}
          supabase={supabase}
          onClose={() => setInfoTable(null)}
        />
      )}

    </div>
  );
}