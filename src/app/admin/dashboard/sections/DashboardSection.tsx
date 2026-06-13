// src/app/admin/dashboard/sections/DashboardSection.tsx
//
// ─── SEZIONE: DASHBOARD (panoramica) ─────────────────────────────────────────
//
// Mostra le statistiche generali del ristorante:
//   - Benvenuto utente
//   - Stato abbonamento
//   - Slot staff
//   - KPI cards (ordini, fatturato, piatti, staff)
//   - Lista ordini attivi recenti
//
// Props ricevute dal page.tsx orchestratore:
//   - ctx:             dati ristorante e utente (già caricati)
//   - theme:           "dark" | "light"
//   - onSectionChange: per navigare ad altra sezione (es. "staff")
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  ShoppingCart, Utensils, BarChart3, Users,
  TrendingUp, Clock, CheckCircle2, AlertCircle,
  ArrowRight, Zap, CalendarDays, ShieldCheck,
} from "lucide-react";
import type { RestaurantCtx, SectionId, ThemeMode } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending" | "confirmed" | "preparing"
  | "cooking" | "ready" | "served" | "cancelled";

interface ActiveOrder {
  id:           string;
  status:       OrderStatus;
  total_cents:  number;
  created_at:   string;
  table_number: number | null;
  items_preview: string;
}

interface SectionData {
  ordersToday:   number;
  activeOrders:  number;
  revenueToday:  number;
  activePiatti:  number;
  staffCount:    number;
  recentOrders:  ActiveOrder[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatEuro(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: "In attesa",  color: "text-yellow-400", bg: "bg-yellow-500/15" },
  confirmed: { label: "Confermato", color: "text-blue-400",   bg: "bg-blue-500/15"   },
  preparing: { label: "In prep.",   color: "text-orange-400", bg: "bg-orange-500/15" },
  cooking:   { label: "In cucina",  color: "text-orange-400", bg: "bg-orange-500/15" },
  ready:     { label: "Pronto",     color: "text-green-400",  bg: "bg-green-500/15"  },
  served:    { label: "Servito",    color: "text-gray-400",   bg: "bg-gray-500/15"   },
  cancelled: { label: "Annullato",  color: "text-red-400",    bg: "bg-red-500/15"    },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  ctx:             RestaurantCtx;
  theme:           ThemeMode;
  onSectionChange: (s: SectionId) => void;
}

export function DashboardSection({ ctx, theme, onSectionChange }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isLoading, setIsLoading] = useState(true);
  const [sectionData, setSectionData] = useState<SectionData>({
    ordersToday:  0,
    activeOrders: 0,
    revenueToday: 0,
    activePiatti: 0,
    staffCount:   0,
    recentOrders: [],
  });

  // ── Caricamento dati specifici di questa sezione ───────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const rid = ctx.restaurantId;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Ordini di oggi
        const { data: ordersToday } = await supabase
          .from("orders")
          .select("id, total_cents")
          .eq("restaurant_id", rid)
          .gte("created_at", todayStart.toISOString());

        const revenueToday = (ordersToday ?? []).reduce(
          (s, o) => s + (o.total_cents ?? 0), 0
        );

        // Ordini attivi recenti
        const { data: activeOrdersRaw } = await supabase
          .from("orders")
          .select("id, status, total_cents, created_at, ordine")
          .eq("restaurant_id", rid)
          .in("status", ["pending", "confirmed", "preparing", "cooking", "ready"])
          .order("created_at", { ascending: false })
          .limit(6);

        // Piatti attivi
        const { data: cats } = await supabase
          .from("menu_categories")
          .select("id")
          .eq("restaurant_id", rid);

        let activePiatti = 0;
        if (cats?.length) {
          const { count } = await supabase
            .from("menu_items")
            .select("*", { count: "exact", head: true })
            .in("category_id", cats.map(c => c.id))
            .eq("is_available", true);
          activePiatti = count ?? 0;
        }

        // Staff count
        const { count: staffCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", rid)
          .in("role", ["staff", "manager"]);

        const recentOrders: ActiveOrder[] = (activeOrdersRaw ?? []).map(o => ({
          id:            o.id,
          status:        o.status as OrderStatus,
          total_cents:   o.total_cents ?? 0,
          created_at:    o.created_at,
          table_number:  null,
          items_preview: o.ordine ?? "—",
        }));

        setSectionData({
          ordersToday:  (ordersToday ?? []).length,
          activeOrders: recentOrders.length,
          revenueToday,
          activePiatti,
          staffCount:   staffCount ?? 0,
          recentOrders,
        });
      } catch (err) {
        console.error("Errore DashboardSection:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [ctx.restaurantId]);

  // ── Token tema ──────────────────────────────────────────────────────────────
  const dark  = theme === "dark";
  const card  = dark ? "bg-[#13131e]"   : "bg-white";
  const bord  = dark ? "border-white/8" : "border-gray-200";
  const txt   = dark ? "text-white"     : "text-gray-900";
  const muted = dark ? "text-gray-400"  : "text-gray-500";
  const hover = dark ? "hover:bg-white/5" : "hover:bg-gray-100";

  // ── Computed ────────────────────────────────────────────────────────────────
  const days        = daysLeft(ctx.accessExpiresAt);
  const now         = new Date();
  const hour        = now.getHours();
  const greeting    = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const firstName   = ctx.userFirstName || ctx.restaurantName;
  const initials    = ctx.restaurantName.slice(0, 2).toUpperCase();
  const staffPct    = ctx.maxStaff
    ? Math.round((sectionData.staffCount / ctx.maxStaff) * 100)
    : 0;
  const staffBarColor =
    staffPct >= 90 ? "bg-red-500"    :
    staffPct >= 70 ? "bg-yellow-500" :
                     "bg-green-500";
  const daysColor =
    days === null ? "text-gray-400"  :
    days <= 3     ? "text-red-400"   :
    days <= 7     ? "text-yellow-400":
                    "text-green-400";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl w-full mx-auto">

      {/* ── ALERT SCADENZA ──────────────────────────────────────────────── */}
      {ctx.plan && days !== null && days <= 7 && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Abbonamento in scadenza</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              Il piano {ctx.plan} scade tra {days} {days === 1 ? "giorno" : "giorni"} (
              {formatDate(ctx.accessExpiresAt!)}).
              Contatta l&apos;amministratore per rinnovare l&apos;accesso.
            </p>
          </div>
        </div>
      )}

      {/* ── RIGA TOP: BENVENUTO + ABBONAMENTO + STAFF ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Benvenuto */}
        <div className={`${card} rounded-2xl border ${bord} px-6 py-5 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className={`text-xs ${muted}`}>{greeting} 👋</p>
            <p className={`text-lg font-bold ${txt} truncate`}>{firstName}</p>
            <p className={`text-xs ${muted} truncate`}>{ctx.userEmail}</p>
          </div>
        </div>

        {/* Abbonamento */}
        <div className={`${card} rounded-2xl border ${bord} px-6 py-5`}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <p className={`text-xs font-semibold ${muted} uppercase tracking-wide`}>
              Abbonamento
            </p>
          </div>
          {ctx.plan ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold">
                  <Zap className="w-3 h-3" /> Piano {ctx.plan}
                </span>
                {days !== null && (
                  <span className={`text-xs font-semibold ${daysColor}`}>
                    {days} gg rimanenti
                  </span>
                )}
              </div>
              {ctx.accessExpiresAt && (
                <p className={`text-xs ${muted}`}>
                  Scade il{" "}
                  <span className={`font-medium ${txt}`}>
                    {formatDate(ctx.accessExpiresAt)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className={`text-sm font-semibold ${txt}`}>Nessun piano attivo</p>
              <p className={`text-xs ${muted}`}>
                Usa un codice invito per attivare l&apos;accesso
              </p>
            </div>
          )}
        </div>

        {/* Account Staff */}
        <div className={`${card} rounded-2xl border ${bord} px-6 py-5`}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <p className={`text-xs font-semibold ${muted} uppercase tracking-wide`}>
              Account staff
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-2xl font-bold ${txt}`}>
                  {sectionData.staffCount}
                  {ctx.maxStaff && (
                    <span className={`text-base font-normal ${muted}`}>
                      {" "}/ {ctx.maxStaff}
                    </span>
                  )}
                </p>
                <p className={`text-xs ${muted}`}>
                  {ctx.maxStaff
                    ? `${ctx.maxStaff - sectionData.staffCount} slot disponibili`
                    : "account attivi"}
                </p>
              </div>
              {/* Naviga alla sezione Staff senza ricaricare la pagina */}
              <button
                onClick={() => onSectionChange("staff")}
                className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
              >
                Gestisci <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {ctx.maxStaff && (
              <div>
                <div className={`w-full h-1.5 rounded-full ${dark ? "bg-white/10" : "bg-gray-200"}`}>
                  <div
                    className={`h-1.5 rounded-full transition-all ${staffBarColor}`}
                    style={{ width: `${Math.min(staffPct, 100)}%` }}
                  />
                </div>
                <p className={`text-xs ${muted} mt-1`}>{staffPct}% degli slot usati</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Ordini oggi",
            value: sectionData.ordersToday,
            icon:  ShoppingCart,
            color: "green",
            sub:   `${sectionData.activeOrders} attivi ora`,
          },
          {
            label: "Fatturato oggi",
            value: formatEuro(sectionData.revenueToday),
            icon:  TrendingUp,
            color: "blue",
            sub:   "aggiornato ora",
          },
          {
            label: "Piatti attivi",
            value: sectionData.activePiatti,
            icon:  Utensils,
            color: "orange",
            sub:   "nel menu",
          },
          {
            label: "Staff attivi",
            value: sectionData.staffCount,
            icon:  Users,
            color: "purple",
            sub:   ctx.maxStaff
              ? `max ${ctx.maxStaff} dal piano`
              : "account totali",
          },
        ].map((s, i) => (
          <div key={i} className={`${card} rounded-2xl border ${bord} p-5`}>
            <div className={`w-9 h-9 rounded-xl bg-${s.color}-500/15 flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 text-${s.color}-400`} />
            </div>
            <p className={`text-2xl font-bold ${txt}`}>{s.value}</p>
            <p className={`text-xs font-medium ${txt} mt-0.5`}>{s.label}</p>
            <p className={`text-xs ${muted} mt-0.5`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ORDINI ATTIVI ───────────────────────────────────────────────── */}
      <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${bord}`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <h3 className={`font-semibold text-sm ${txt}`}>Ordini attivi</h3>
            {sectionData.activeOrders > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-xs font-medium">
                {sectionData.activeOrders}
              </span>
            )}
          </div>
          <button
            onClick={() => onSectionChange("orders")}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            Vedi tutti <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {sectionData.recentOrders.length === 0 ? (
            <div className={`px-5 py-8 text-center ${muted}`}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/40" />
              <p className="text-sm">Nessun ordine attivo</p>
            </div>
          ) : (
            sectionData.recentOrders.map(order => {
              const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              return (
                <div
                  key={order.id}
                  className={`flex items-center justify-between px-5 py-3.5 ${hover} transition-all`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.color.replace("text-", "bg-")}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${txt} truncate`}>
                        #{order.id.slice(0, 8).toUpperCase()}
                        {order.table_number && (
                          <span className={`ml-2 text-xs ${muted}`}>
                            Tavolo {order.table_number}
                          </span>
                        )}
                      </p>
                      <p className={`text-xs ${muted} truncate`}>{order.items_preview}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${s.bg} ${s.color}`}>
                      {s.label}
                    </span>
                    <span className={`text-xs font-medium ${txt}`}>
                      {formatEuro(order.total_cents)}
                    </span>
                    <span className={`text-xs ${muted}`}>
                      {formatTime(order.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
