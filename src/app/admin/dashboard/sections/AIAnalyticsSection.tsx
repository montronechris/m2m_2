// src/app/admin/dashboard/sections/AIAnalyticsSection.tsx
//
// Dashboard di analisi: profitto, tavoli occupati, piatti più ordinati,
// recensioni — dati reali dal database, con un breve insight generato
// dall'AI (se un provider è configurato) sotto ogni grafico.

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Sparkles, TrendingUp, TrendingDown, LayoutGrid, Utensils, Star,
  RefreshCw, Loader2, KeyRound, ArrowRight, Clock, Receipt, Tags, CreditCard,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import type { RestaurantCtx, SectionId, ThemeMode } from "../types";
type AIProvider = "openai" | "anthropic" | "gemini" | string;

interface Props {
  ctx:             RestaurantCtx;
  theme:           ThemeMode;
  onSectionChange?: (s: SectionId) => void;
}

interface AICfg {
  provider: AIProvider;
  apiKey:   string;
}

type RevenuePoint  = { date: string; label: string; eur: number };
type DishPoint     = { name: string; count: number };
type ReviewStats   = { avg: number; total: number; distribution: { stars: number; count: number }[] };
type Occupancy     = { total: number; occupied: number };
type HourPoint     = { hour: number; label: string; count: number };
type CategoryPoint = { name: string; eur: number };
type PaymentPoint  = { name: string; value: number };

type Insights = {
  revenue?:    string;
  occupancy?:  string;
  dishes?:     string;
  reviews?:    string;
  peakHours?:  string;
  avgTicket?:  string;
  categories?: string;
  payments?:   string;
};

const PERIODS = [
  { key: 7,  label: "7 giorni" },
  { key: 30, label: "30 giorni" },
] as const;

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AIAnalyticsSection({ ctx, theme, onSectionChange }: Props) {
  const dark   = theme === "dark";
  const card   = dark ? "bg-tt-dark"    : "bg-white";
  const bord   = dark ? "border-white/8" : "border-tt-line";
  const txt    = dark ? "text-white"    : "text-tt-ink";
  const muted  = dark ? "text-gray-400" : "text-tt-muted";
  const gridStroke = dark ? "rgba(255,255,255,0.08)" : "#E9EAEC";
  const axisColor   = dark ? "#71717a" : "#8A8B91";

  const [period,     setPeriod]     = useState<7 | 30>(7);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [revenue,      setRevenue]      = useState<RevenuePoint[]>([]);
  const [revenueDelta,  setRevenueDelta]  = useState<number | null>(null);
  const [occupancy,    setOccupancy]    = useState<Occupancy>({ total: 0, occupied: 0 });
  const [topDishes,    setTopDishes]    = useState<DishPoint[]>([]);
  const [reviewStats,  setReviewStats]  = useState<ReviewStats>({ avg: 0, total: 0, distribution: [] });
  const [peakHours,    setPeakHours]    = useState<HourPoint[]>([]);
  const [avgTicketSeries, setAvgTicketSeries] = useState<RevenuePoint[]>([]);
  const [avgTicketOverall, setAvgTicketOverall] = useState(0);
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryPoint[]>([]);
  const [paymentMethods,  setPaymentMethods]  = useState<PaymentPoint[]>([]);

  const [aiCfg,      setAiCfg]      = useState<AICfg | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [insights,   setInsights]   = useState<Insights>({});
  const [insightsLoading, setInsightsLoading] = useState(false);

  // ── Config AI (per gli insight) ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("restaurants")
          .select("settings")
          .eq("id", ctx.restaurantId)
          .single();
        const s        = data?.settings ?? {};
        const provider = s.ai_provider as AIProvider | undefined;
        const apiKey   = provider ? (s[`${provider}_api_key`] ?? null) : null;
        setAiCfg(provider && apiKey ? { provider, apiKey } : null);
      } catch {
        setAiCfg(null);
      } finally {
        setCfgLoading(false);
      }
    };
    load();
  }, [ctx.restaurantId]);

  // ── Dati reali dal database ────────────────────────────────────────────────
  const loadData = useCallback(async (days: 7 | 30, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const since      = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const prevSince   = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

      // ── 1. Ordini del periodo (per fatturato + piatti più ordinati) ────────
      const { data: orders, error: ordErr } = await supabase
        .from("orders")
        .select("id, total_cents, created_at, status, payment_method")
        .eq("restaurant_id", ctx.restaurantId)
        .gte("created_at", prevSince.toISOString())
        .not("status", "in", '("cancelled","expired")');
      if (ordErr) throw ordErr;

      const currentOrders  = (orders ?? []).filter(o => new Date(o.created_at) >= since);
      const previousOrders = (orders ?? []).filter(o => new Date(o.created_at) < since);

      // Fatturato + n. ordini per giorno (serve anche per lo scontrino medio)
      const byDay      = new Map<string, number>();
      const byDayCount  = new Map<string, number>();
      for (const o of currentOrders) {
        const d = new Date(o.created_at);
        const key = d.toISOString().slice(0, 10);
        byDay.set(key, (byDay.get(key) ?? 0) + (o.total_cents ?? 0));
        byDayCount.set(key, (byDayCount.get(key) ?? 0) + 1);
      }
      const series: RevenuePoint[] = [];
      const ticketSeries: RevenuePoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
        const dayRevenueCents = byDay.get(key) ?? 0;
        const dayCount        = byDayCount.get(key) ?? 0;
        series.push({ date: key, label, eur: Math.round(dayRevenueCents / 100 * 100) / 100 });
        ticketSeries.push({
          date: key, label,
          eur: dayCount > 0 ? Math.round((dayRevenueCents / dayCount) / 100 * 100) / 100 : 0,
        });
      }
      setRevenue(series);
      setAvgTicketSeries(ticketSeries);

      const currentTotal  = currentOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
      const previousTotal = previousOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
      setRevenueDelta(previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null);
      setAvgTicketOverall(currentOrders.length > 0 ? currentTotal / currentOrders.length / 100 : 0);

      // ── Orari di punta (ordini per ora del giorno, fuso Europe/Rome) ───────
      const hourCounts = new Map<number, number>();
      for (const o of currentOrders) {
        const hour = Number(
          new Intl.DateTimeFormat("it-IT", { hour: "2-digit", hour12: false, timeZone: "Europe/Rome" })
            .format(new Date(o.created_at))
        );
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      }
      setPeakHours(
        Array.from({ length: 24 }, (_, hour) => ({
          hour, label: `${String(hour).padStart(2, "0")}`,
          count: hourCounts.get(hour) ?? 0,
        }))
      );

      // ── Metodo di pagamento ────────────────────────────────────────────────
      const payCounts = { card: 0, cash: 0, none: 0 };
      for (const o of currentOrders) {
        if (o.payment_method === "card") payCounts.card++;
        else if (o.payment_method === "cash") payCounts.cash++;
        else payCounts.none++;
      }
      setPaymentMethods([
        { name: "Carta",            value: payCounts.card },
        { name: "Contanti",         value: payCounts.cash },
        { name: "Non specificato",  value: payCounts.none },
      ].filter(p => p.value > 0));

      // ── 2. Piatti più ordinati + fatturato per categoria ────────────────────
      const orderIds = currentOrders.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("name_snapshot, name, quantity, order_id, menu_item_id, base_price")
          .in("order_id", orderIds);
        if (itemsErr) throw itemsErr;

        const counts = new Map<string, number>();
        for (const it of items ?? []) {
          const label = (it.name_snapshot || it.name || "Sconosciuto").trim();
          counts.set(label, (counts.get(label) ?? 0) + (it.quantity ?? 1));
        }
        const dishes = [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setTopDishes(dishes);

        // Fatturato per categoria: order_items → menu_items → menu_categories
        const menuItemIds = [...new Set((items ?? []).map(i => i.menu_item_id).filter(Boolean))];
        let categoryByItem = new Map<string, string>();
        let categoryNames  = new Map<string, string>();
        if (menuItemIds.length > 0) {
          const { data: menuItemsRows } = await supabase
            .from("menu_items")
            .select("id, category_id")
            .in("id", menuItemIds);
          for (const mi of menuItemsRows ?? []) categoryByItem.set(mi.id, mi.category_id);

          const categoryIds = [...new Set((menuItemsRows ?? []).map(mi => mi.category_id).filter(Boolean))];
          if (categoryIds.length > 0) {
            const { data: catRows } = await supabase
              .from("menu_categories")
              .select("id, name")
              .in("id", categoryIds);
            for (const c of catRows ?? []) categoryNames.set(c.id, c.name);
          }
        }
        const revenueByCategory = new Map<string, number>();
        for (const it of items ?? []) {
          const catId   = it.menu_item_id ? categoryByItem.get(it.menu_item_id) : undefined;
          const catName = catId ? (categoryNames.get(catId) ?? "Altro") : "Altro";
          const cents   = Math.round((it.base_price ?? 0) * 100) * (it.quantity ?? 1);
          revenueByCategory.set(catName, (revenueByCategory.get(catName) ?? 0) + cents);
        }
        setCategoryRevenue(
          [...revenueByCategory.entries()]
            .map(([name, cents]) => ({ name, eur: Math.round(cents / 100 * 100) / 100 }))
            .sort((a, b) => b.eur - a.eur)
            .slice(0, 6)
        );
      } else {
        setTopDishes([]);
        setCategoryRevenue([]);
      }

      // ── 3. Tavoli occupati ora ───────────────────────────────────────────────
      const { count: totalTables } = await supabase
        .from("tables")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", ctx.restaurantId);
      const { count: occupiedTables } = await supabase
        .from("qr_sessions")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", ctx.restaurantId)
        .eq("is_active", true);
      setOccupancy({ total: totalTables ?? 0, occupied: occupiedTables ?? 0 });

      // ── 4. Recensioni ─────────────────────────────────────────────────────
      const { data: reviews, error: revErr } = await supabase
        .from("reviews")
        .select("stars")
        .eq("restaurant_id", ctx.restaurantId);
      if (revErr) throw revErr;

      const total = reviews?.length ?? 0;
      const avg   = total > 0 ? (reviews!.reduce((s, r) => s + (r.stars ?? 0), 0) / total) : 0;
      const distribution = [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: (reviews ?? []).filter(r => r.stars === stars).length,
      }));
      setReviewStats({ avg, total, distribution });

    } catch (err: any) {
      console.error("[AIAnalytics] load error:", err);
      setError("Errore nel caricamento dei dati analitici.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ctx.restaurantId]);

  useEffect(() => { loadData(period); }, [period, loadData]);

  // ── Insight AI (testo breve sotto ogni grafico) ───────────────────────────
  useEffect(() => {
    if (loading || cfgLoading || !aiCfg) return;

    const generate = async () => {
      setInsightsLoading(true);
      try {
        const payload = {
          fatturato_periodo: revenue.map(r => ({ giorno: r.label, euro: r.eur })),
          variazione_percentuale_vs_periodo_precedente: revenueDelta,
          tavoli_totali: occupancy.total,
          tavoli_occupati_ora: occupancy.occupied,
          piatti_piu_ordinati: topDishes,
          recensioni_totali: reviewStats.total,
          media_stelle: reviewStats.avg,
          distribuzione_stelle: reviewStats.distribution,
          ordini_per_ora_del_giorno: peakHours.filter(h => h.count > 0),
          scontrino_medio_periodo: avgTicketOverall,
          scontrino_medio_per_giorno: avgTicketSeries.map(r => ({ giorno: r.label, euro: r.eur })),
          fatturato_per_categoria_menu: categoryRevenue,
          metodi_di_pagamento: paymentMethods,
        };

        const system = `
Sei un analista per un ristorante italiano. Ricevi un JSON con dati reali (fatturato, occupazione tavoli, piatti più ordinati, recensioni, orari di punta, scontrino medio, fatturato per categoria, metodi di pagamento).
Scrivi 8 brevi insight in italiano (max 1 riga ciascuno, con un'emoji), uno per ciascun dato.
Diretto, concreto, evidenzia trend, picchi o numeri interessanti — utile per le decisioni operative del proprietario (es. quando rinforzare il personale, quali piatti spingere). Mai inventare numeri non presenti nel JSON.
Rispondi SOLO con questo JSON, zero testo fuori:
{ "revenue": "...", "occupancy": "...", "dishes": "...", "reviews": "...", "peakHours": "...", "avgTicket": "...", "categories": "...", "payments": "..." }
`.trim();

        const res = await fetch("/api/ai-analytics", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider:   aiCfg.provider,
            apiKey:     aiCfg.apiKey,
            max_tokens: 600,
            system,
            messages: [{ role: "user", content: JSON.stringify(payload) }],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Errore API");
        const text = data?.content?.[0]?.text ?? "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) setInsights(JSON.parse(match[0]));
      } catch {
        setInsights({});
      } finally {
        setInsightsLoading(false);
      }
    };

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cfgLoading, aiCfg, revenue, occupancy, topDishes, reviewStats, peakHours, avgTicketSeries, categoryRevenue, paymentMethods]);

  const occupancyPct = occupancy.total > 0 ? Math.round((occupancy.occupied / occupancy.total) * 100) : 0;
  const occupancyData = [
    { name: "Occupati", value: occupancy.occupied },
    { name: "Liberi",   value: Math.max(0, occupancy.total - occupancy.occupied) },
  ];

  // ── Loading iniziale ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-tt-pink" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-6xl w-full mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 animate-ttFadeUp">
          <div className="w-11 h-11 rounded-2xl bg-tt-gradient flex items-center justify-center shadow-tt shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className={`text-xl font-extrabold tracking-tight ${txt} truncate`}>Analytics AI</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex rounded-2xl border ${bord} overflow-hidden p-1 ${dark ? "bg-white/5" : "bg-tt-surfaceAlt2"}`}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  period === p.key
                    ? "bg-tt-gradient text-white shadow-tt"
                    : `${muted} ${dark ? "hover:bg-white/5" : "hover:bg-white"}`
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadData(period, { silent: true })}
            disabled={refreshing}
            title="Aggiorna"
            className={`p-2.5 rounded-2xl border ${bord} ${muted} transition-all ${dark ? "hover:bg-white/5" : "hover:bg-tt-surfaceAlt2"} disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Nessun provider AI — solo nota informativa, i grafici funzionano comunque */}
      {!cfgLoading && !aiCfg && (
        <div className={`${card} rounded-3xl border ${bord} px-4 py-3.5 flex items-center gap-3 flex-wrap shadow-tt`}>
          <div className="w-9 h-9 rounded-xl bg-tt-pink/15 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 text-tt-pink" />
          </div>
          <p className={`text-xs ${muted} flex-1 min-w-[180px]`}>
            Configura un provider AI nelle Impostazioni per ricevere un breve commento automatico sotto ogni grafico.
          </p>
          {onSectionChange && (
            <button
              onClick={() => onSectionChange("settings")}
              className="flex items-center gap-1.5 text-xs font-bold text-tt-pink hover:text-tt-pinkSoft transition-colors shrink-0"
            >
              Vai alle Impostazioni <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-tt-danger/10 border border-tt-danger/25 text-sm text-tt-danger font-medium">
          {error}
        </div>
      )}

      {/* GRID GRAFICI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── PROFITTO ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-tt-success/15 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-tt-success" />
              </div>
              <p className={`text-sm font-bold ${txt}`}>Profitto</p>
            </div>
            {revenueDelta !== null && (
              <span className={`tt-pill ${revenueDelta >= 0 ? "tt-pill-success" : "tt-pill-danger"}`}>
                {revenueDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(Math.round(revenueDelta))}%
              </span>
            )}
          </div>
          <p className={`text-2xl font-black ${txt} mb-3`}>
            € {formatEur(revenue.reduce((s, r) => s + r.eur * 100, 0))}
          </p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={revenue} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#FE2C55" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FE2C55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={((v: number) => [`€ ${v.toFixed(2)}`, "Fatturato"]) as any}
                  contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="eur" stroke="#FE2C55" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <InsightLine loading={insightsLoading} text={insights.revenue} muted={muted} />
        </div>

        {/* ── TAVOLI OCCUPATI ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-tt-cyan/15 flex items-center justify-center">
              <LayoutGrid className="w-3.5 h-3.5 text-tt-cyan" />
            </div>
            <p className={`text-sm font-bold ${txt}`}>Tavoli occupati</p>
          </div>
          <p className={`text-2xl font-black ${txt} mb-3`}>
            {occupancy.occupied} <span className={`text-base font-semibold ${muted}`}>/ {occupancy.total}</span>
          </p>
          <div className="flex items-center gap-4">
            <div style={{ width: 120, height: 120 }} className="shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={occupancyData}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={58}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#25F4EE" />
                    <Cell fill={dark ? "rgba(255,255,255,0.08)" : "#E9EAEC"} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-3xl font-black text-tt-cyan">{occupancyPct}%</p>
              <p className={`text-xs ${muted}`}>tavoli occupati ora</p>
            </div>
          </div>
          <InsightLine loading={insightsLoading} text={insights.occupancy} muted={muted} />
        </div>

        {/* ── PIATTI PIÙ ORDINATI ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-tt-warning/15 flex items-center justify-center">
              <Utensils className="w-3.5 h-3.5 text-tt-warning" />
            </div>
            <p className={`text-sm font-bold ${txt}`}>Piatti più ordinati</p>
          </div>
          {topDishes.length === 0 ? (
            <p className={`text-sm ${muted} py-8 text-center`}>Nessun ordine nel periodo selezionato.</p>
          ) : (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={topDishes} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category" dataKey="name" width={110}
                    tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    formatter={((v: number) => [v, "Ordinati"]) as any}
                    contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#FFA800" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <InsightLine loading={insightsLoading} text={insights.dishes} muted={muted} />
        </div>

        {/* ── RECENSIONI ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-tt-warning/15 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-tt-warning" />
              </div>
              <p className={`text-sm font-bold ${txt}`}>Recensioni</p>
            </div>
            <span className={`text-xs ${muted}`}>{reviewStats.total} totali</span>
          </div>
          {reviewStats.total === 0 ? (
            <p className={`text-sm ${muted} py-8 text-center`}>Ancora nessuna recensione.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-2xl font-black ${txt}`}>{reviewStats.avg.toFixed(1)}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className="w-4 h-4"
                      style={{
                        fill: i <= Math.round(reviewStats.avg) ? "#FFA800" : "transparent",
                        color: "#FFA800",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <BarChart data={reviewStats.distribution} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="stars" tickFormatter={(v) => `${v}★`} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip
                      formatter={((v: number) => [v, "Recensioni"]) as any}
                      contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#FFA800" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          <InsightLine loading={insightsLoading} text={insights.reviews} muted={muted} />
        </div>

        {/* ── ORARI DI PUNTA ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-tt-pink/15 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-tt-pink" />
            </div>
            <p className={`text-sm font-bold ${txt}`}>Orari di punta</p>
          </div>
          {peakHours.every(h => h.count === 0) ? (
            <p className={`text-sm ${muted} py-8 text-center`}>Nessun ordine nel periodo selezionato.</p>
          ) : (
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={peakHours} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    formatter={((v: number) => [v, "Ordini"]) as any}
                    labelFormatter={(l) => `Ore ${l}:00`}
                    contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#FE2C55" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <InsightLine loading={insightsLoading} text={insights.peakHours} muted={muted} />
        </div>

        {/* ── SCONTRINO MEDIO ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-tt-success/15 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-tt-success" />
            </div>
            <p className={`text-sm font-bold ${txt}`}>Scontrino medio</p>
          </div>
          <p className={`text-2xl font-black ${txt} mb-3`}>€ {avgTicketOverall.toFixed(2)}</p>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={avgTicketSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={((v: number) => [`€ ${v.toFixed(2)}`, "Scontrino medio"]) as any}
                  contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="eur" stroke="#10D78A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <InsightLine loading={insightsLoading} text={insights.avgTicket} muted={muted} />
        </div>

        {/* ── CATEGORIE PIÙ VENDUTE ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-tt-pinkSoft/15 flex items-center justify-center">
              <Tags className="w-3.5 h-3.5 text-tt-pinkSoft" />
            </div>
            <p className={`text-sm font-bold ${txt}`}>Categorie più vendute</p>
          </div>
          {categoryRevenue.length === 0 ? (
            <p className={`text-sm ${muted} py-8 text-center`}>Nessun ordine nel periodo selezionato.</p>
          ) : (
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={categoryRevenue} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="name" width={110}
                    tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    formatter={((v: number) => [`€ ${v.toFixed(2)}`, "Fatturato"]) as any}
                    contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="eur" fill="#FF4081" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <InsightLine loading={insightsLoading} text={insights.categories} muted={muted} />
        </div>

        {/* ── METODO DI PAGAMENTO ── */}
        <div className={`${card} rounded-3xl border ${bord} p-4 sm:p-5 shadow-tt hover:shadow-ttHover transition-all`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-tt-warning/15 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-tt-warning" />
            </div>
            <p className={`text-sm font-bold ${txt}`}>Metodo di pagamento</p>
          </div>
          {paymentMethods.length === 0 ? (
            <p className={`text-sm ${muted} py-8 text-center`}>Nessun ordine nel periodo selezionato.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div style={{ width: 120, height: 120 }} className="shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={paymentMethods} dataKey="value" innerRadius={36} outerRadius={58} stroke="none">
                      {paymentMethods.map((p, i) => (
                        <Cell key={p.name} fill={["#FFA800", "#10D78A", "#8A8B91"][i % 3]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={((v: number, n: string) => [v, n]) as any}
                      contentStyle={{ background: dark ? "#121212" : "#fff", border: `1px solid ${gridStroke}`, borderRadius: 12, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {paymentMethods.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ["#FFA800", "#10D78A", "#8A8B91"][i % 3] }} />
                    <span className={muted}>{p.name}</span>
                    <span className={`font-bold ${txt}`}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <InsightLine loading={insightsLoading} text={insights.payments} muted={muted} />
        </div>

      </div>
    </div>
  );
}

// ─── Sotto-componente: riga insight AI ─────────────────────────────────────────

function InsightLine({ loading, text, muted }: { loading: boolean; text?: string; muted: string }) {
  if (!loading && !text) return null;
  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-tt-pink/15">
      <Sparkles className="w-3.5 h-3.5 text-tt-pink shrink-0" />
      {loading ? (
        <span className={`text-xs ${muted} animate-pulse`}>Genero un insight…</span>
      ) : (
        <span className={`text-xs ${muted}`}>{text}</span>
      )}
    </div>
  );
}
