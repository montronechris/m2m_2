// src/app/admin/dashboard/sections/AnalyticsSection.tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  TrendingUp, Users, ShoppingBag, Star,
  Clock, ChefHat, MessageSquare, Loader2,
  Sun, Sunset, Moon, Calendar,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";

interface Props { ctx: RestaurantCtx; theme: ThemeMode; }

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface Stats {
  ordersThisWeek:   number;
  ordersLastWeek:   number;
  revenueThisWeek:  number;
  revenueLastWeek:  number;
  avgOrderValue:    number;
  topItems:         { name: string; count: number }[];
  hourlyOrders:     { hour: number; count: number }[];
  dailyOrders:      { day: string; count: number }[];
  reviews:          { id: string; stars: number; text: string | null; created_at: string }[];
  avgStars:         number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function pct(a: number, b: number) {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 100);
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function Stars({ n, color }: { n: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
          fill={i <= n ? color : "none"}
          stroke={i <= n ? color : "#d4c5b0"}
          strokeWidth={1.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

// ─── Componenti card ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, trend, color = "green", cardCls, bordCls, txtCls, mutedCls, dark,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  trend?: number; color?: string; cardCls: string; bordCls: string;
  txtCls: string; mutedCls: string; dark: boolean;
}) {
  const up = trend !== undefined && trend >= 0;
  return (
    <div className={`${cardCls} rounded-2xl border ${bordCls} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl bg-${color}-500/15 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            up
              ? "bg-green-500/15 text-green-400"
              : "bg-red-500/15 text-red-400"
          }`}>
            {up ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${txtCls} mb-0.5`}>{value}</p>
      <p className={`text-xs font-semibold uppercase tracking-wide ${mutedCls}`}>{label}</p>
      {sub && <p className={`text-xs ${mutedCls} mt-1`}>{sub}</p>}
    </div>
  );
}

// ─── AnalyticsSection ─────────────────────────────────────────────────────────

export function AnalyticsSection({ ctx, theme }: Props) {
  const dark  = theme === "dark";
  const card  = dark ? "bg-[#13131e]"   : "bg-white";
  const bord  = dark ? "border-white/8" : "border-gray-200";
  const txt   = dark ? "text-white"     : "text-gray-900";
  const muted = dark ? "text-gray-400"  : "text-gray-500";
  const input = dark ? "bg-[#0e0d0b]"  : "bg-gray-50";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [period,  setPeriod]  = useState<"week" | "month">("week");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rid = ctx.restaurantId;
        const now = new Date();

        // Finestre temporali
        const startThisWeek  = new Date(now); startThisWeek.setDate(now.getDate() - 7);
        const startLastWeek  = new Date(now); startLastWeek.setDate(now.getDate() - 14);
        const startThisMonth = new Date(now); startThisMonth.setDate(now.getDate() - 30);

        const periodStart = period === "week" ? startThisWeek : startThisMonth;

        // 1. Ordini periodo corrente
        const { data: ordersNow } = await supabase
          .from("orders")
          .select("id, total_cents, created_at")
          .eq("restaurant_id", rid)
          .gte("created_at", periodStart.toISOString());

        // 2. Ordini settimana scorsa (per trend)
        const { data: ordersLast } = await supabase
          .from("orders")
          .select("id, total_cents")
          .eq("restaurant_id", rid)
          .gte("created_at", startLastWeek.toISOString())
          .lt("created_at", startThisWeek.toISOString());

        // 3. Order items per piatti più richiesti
        const orderIds = (ordersNow ?? []).map((o: any) => o.id);
        let topItems: { name: string; count: number }[] = [];
        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from("order_items")
            .select("name_snapshot, name, quantity")
            .in("order_id", orderIds);

          const counts: Record<string, number> = {};
          (items ?? []).forEach((i: any) => {
            const n = i.name_snapshot || i.name || "Sconosciuto";
            counts[n] = (counts[n] || 0) + (i.quantity || 1);
          });
          topItems = Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
        }

        // 4. Distribuzione oraria
        const hourlyMap: Record<number, number> = {};
        (ordersNow ?? []).forEach((o: any) => {
          const h = new Date(o.created_at).getHours();
          hourlyMap[h] = (hourlyMap[h] || 0) + 1;
        });
        const hourlyOrders = Array.from({ length: 24 }, (_, h) => ({
          hour: h, count: hourlyMap[h] || 0,
        }));

        // 5. Distribuzione giornaliera (ultimi 7 giorni)
        const dailyMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          dailyMap[d.toDateString()] = 0;
        }
        (ordersNow ?? []).forEach((o: any) => {
          const d = new Date(o.created_at).toDateString();
          if (d in dailyMap) dailyMap[d] = (dailyMap[d] || 0) + 1;
        });
        const dailyOrders = Object.entries(dailyMap).map(([day, count]) => ({
          day: DAYS[new Date(day).getDay()],
          count,
        }));

        // 6. Recensioni
        const { data: reviews } = await supabase
          .from("reviews")
          .select("id, stars, text, created_at")
          .eq("restaurant_id", rid)
          .order("created_at", { ascending: false })
          .limit(20);

        const revList = reviews ?? [];
        const avgStars = revList.length > 0
          ? revList.reduce((s: number, r: any) => s + r.stars, 0) / revList.length
          : 0;

        // Calcola stats aggregate
        const revenueNow  = (ordersNow  ?? []).reduce((s: number, o: any) => s + (o.total_cents || 0), 0);
        const revenueLast = (ordersLast ?? []).reduce((s: number, o: any) => s + (o.total_cents || 0), 0);
        const avgOrder    = (ordersNow ?? []).length > 0 ? revenueNow / (ordersNow ?? []).length : 0;

        setStats({
          ordersThisWeek:  (ordersNow  ?? []).length,
          ordersLastWeek:  (ordersLast ?? []).length,
          revenueThisWeek: revenueNow,
          revenueLastWeek: revenueLast,
          avgOrderValue:   avgOrder,
          topItems,
          hourlyOrders,
          dailyOrders,
          reviews:         revList,
          avgStars,
        });
      } catch (e: any) {
        setError(e.message || "Errore nel caricamento analytics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ctx.restaurantId, period]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-32">
      <p className={`text-sm ${muted}`}>{error}</p>
    </div>
  );

  if (!stats) return null;

  const maxHourly = Math.max(...stats.hourlyOrders.map(h => h.count), 1);
  const maxDaily  = Math.max(...stats.dailyOrders.map(d => d.count),  1);

  // Raggruppa ore in slot pranzo/cena/altro
  const lunch  = stats.hourlyOrders.filter(h => h.hour >= 11 && h.hour <= 15).reduce((s, h) => s + h.count, 0);
  const dinner = stats.hourlyOrders.filter(h => h.hour >= 18 && h.hour <= 23).reduce((s, h) => s + h.count, 0);
  const other  = stats.ordersThisWeek - lunch - dinner;

  const orderTrend   = pct(stats.ordersThisWeek,  stats.ordersLastWeek);
  const revenueTrend = pct(stats.revenueThisWeek, stats.revenueLastWeek);

  return (
    <div className="p-6 space-y-6 max-w-5xl w-full mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${txt}`}>Analytics</h2>
            <p className={`text-xs ${muted}`}>Dati in tempo reale dal database</p>
          </div>
        </div>

        {/* Toggle periodo */}
        <div className={`flex rounded-xl border ${bord} overflow-hidden`}>
          {(["week", "month"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${
                period === p
                  ? "bg-blue-500 text-white"
                  : `${dark ? "bg-transparent text-gray-400 hover:bg-white/5" : "bg-transparent text-gray-500 hover:bg-gray-50"}`
              }`}>
              {p === "week" ? "7 giorni" : "30 giorni"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={ShoppingBag} label="Ordini" value={String(stats.ordersThisWeek)}
          sub={`vs ${stats.ordersLastWeek} sett. scorsa`} trend={orderTrend}
          color="blue" cardCls={card} bordCls={bord} txtCls={txt} mutedCls={muted} dark={dark} />
        <KpiCard icon={TrendingUp} label="Incasso" value={fmtEur(stats.revenueThisWeek)}
          sub={`vs ${fmtEur(stats.revenueLastWeek)}`} trend={revenueTrend}
          color="green" cardCls={card} bordCls={bord} txtCls={txt} mutedCls={muted} dark={dark} />
        <KpiCard icon={Users} label="Scontrino medio" value={fmtEur(stats.avgOrderValue)}
          color="purple" cardCls={card} bordCls={bord} txtCls={txt} mutedCls={muted} dark={dark} />
        <KpiCard icon={Star} label="Media recensioni"
          value={stats.avgStars > 0 ? stats.avgStars.toFixed(1) + " ★" : "—"}
          sub={`${stats.reviews.length} recensioni`}
          color="yellow" cardCls={card} bordCls={bord} txtCls={txt} mutedCls={muted} dark={dark} />
      </div>

      {/* FASCE ORARIE */}
      <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${bord}`}>
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className={`font-semibold text-sm ${txt}`}>Distribuzione oraria</h3>
        </div>
        <div className="px-6 py-5">
          {/* Riepilogo pranzo/cena */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Sun,    label: "Pranzo",  sub: "11:00 – 15:00", val: lunch,  color: "#f59e0b" },
              { icon: Sunset, label: "Cena",    sub: "18:00 – 23:00", val: dinner, color: "#6366f1" },
              { icon: Moon,   label: "Altro",   sub: "Restante",      val: other,  color: "#94a3b8" },
            ].map(({ icon: Icon, label, sub, val, color }) => (
              <div key={label} className={`rounded-xl border ${bord} p-4 text-center`}>
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
                <p className={`text-xl font-bold ${txt}`}>{val}</p>
                <p className={`text-xs font-semibold ${muted}`}>{label}</p>
                <p className={`text-xs ${muted} mt-0.5`}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Grafico a barre orario */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
            {stats.hourlyOrders.map(({ hour, count }) => {
              const isLunch  = hour >= 11 && hour <= 15;
              const isDinner = hour >= 18 && hour <= 23;
              const barColor = isLunch ? "#f59e0b" : isDinner ? "#6366f1" : (dark ? "#334155" : "#e2e8f0");
              const heightPct = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
              return (
                <div key={hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%`, background: barColor, borderRadius: 4, minHeight: count > 0 ? 4 : 1, transition: "height 0.3s" }} title={`${hour}:00 — ${count} ordini`} />
                  {hour % 6 === 0 && (
                    <span style={{ fontSize: 9, color: dark ? "#64748b" : "#94a3b8", whiteSpace: "nowrap" }}>{hour}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ANDAMENTO GIORNALIERO + TOP PIATTI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Andamento 7 giorni */}
        <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>
          <div className={`flex items-center gap-3 px-6 py-4 border-b ${bord}`}>
            <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-400" />
            </div>
            <h3 className={`font-semibold text-sm ${txt}`}>Ultimi 7 giorni</h3>
          </div>
          <div className="px-6 py-5">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
              {stats.dailyOrders.map(({ day, count }) => (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: "100%",
                    height: `${maxDaily > 0 ? Math.max((count / maxDaily) * 100, count > 0 ? 8 : 2) : 2}%`,
                    background: count > 0 ? "linear-gradient(to top, #22c55e, #4ade80)" : (dark ? "#1e293b" : "#f1f5f9"),
                    borderRadius: 6,
                    minHeight: count > 0 ? 6 : 2,
                    boxShadow: count > 0 ? "0 2px 8px rgba(34,197,94,0.3)" : "none",
                    transition: "height 0.3s",
                  }} title={`${day}: ${count} ordini`} />
                  <span style={{ fontSize: 10, color: dark ? "#64748b" : "#94a3b8", fontWeight: 600 }}>{day}</span>
                </div>
              ))}
            </div>
            {stats.ordersThisWeek === 0 && (
              <p className={`text-center text-xs ${muted} mt-4`}>Nessun ordine in questo periodo</p>
            )}
          </div>
        </div>

        {/* Top piatti */}
        <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>
          <div className={`flex items-center gap-3 px-6 py-4 border-b ${bord}`}>
            <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-red-400" />
            </div>
            <h3 className={`font-semibold text-sm ${txt}`}>Piatti più richiesti</h3>
          </div>
          <div className="px-6 py-5 space-y-3">
            {stats.topItems.length === 0 ? (
              <p className={`text-xs ${muted}`}>Nessun dato disponibile</p>
            ) : (
              stats.topItems.map(({ name, count }, i) => {
                const maxCount = stats.topItems[0]?.count || 1;
                const pctBar   = (count / maxCount) * 100;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs font-bold w-4 text-center ${i === 0 ? "text-yellow-400" : muted}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}
                        </span>
                        <span className={`text-sm font-medium ${txt} truncate`}>{name}</span>
                      </div>
                      <span className={`text-xs font-bold ${muted} shrink-0 ml-2`}>{count}×</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-orange-400 transition-all duration-500"
                        style={{ width: `${pctBar}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RECENSIONI */}
      <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${bord}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
            </div>
            <h3 className={`font-semibold text-sm ${txt}`}>Recensioni clienti</h3>
          </div>
          {stats.avgStars > 0 && (
            <div className="flex items-center gap-2">
              <Stars n={Math.round(stats.avgStars)} color="#f59e0b" />
              <span className={`text-sm font-bold ${txt}`}>{stats.avgStars.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div className="divide-y divide-white/5">
          {stats.reviews.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Star className={`w-8 h-8 mx-auto mb-3 ${muted} opacity-30`} />
              <p className={`text-sm ${muted}`}>Nessuna recensione ancora</p>
              <p className={`text-xs ${muted} mt-1`}>Apparirà qui non appena un cliente lascerà una valutazione</p>
            </div>
          ) : (
            stats.reviews.map(r => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Stars n={r.stars} color="#f59e0b" />
                      <span className={`text-xs ${muted}`}>
                        {new Date(r.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {r.text ? (
                      <p className={`text-sm ${txt} leading-relaxed`}>{r.text}</p>
                    ) : (
                      <p className={`text-xs ${muted} italic`}>Solo valutazione, nessun commento</p>
                    )}
                  </div>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    r.stars >= 4 ? "bg-green-500/15 text-green-400" :
                    r.stars === 3 ? "bg-yellow-500/15 text-yellow-400" :
                    "bg-red-500/15 text-red-400"
                  }`}>
                    {r.stars}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
