// src/app/admin/dashboard/sections/WaiterSection.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Clock, CheckCircle, Loader2, Wine, UtensilsCrossed,
  ChevronRight, AlertCircle, Bell, StickyNote,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";
import { isNotificationSoundMuted } from "@/lib/notificationSound";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type CartCustomization = {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceName: string;
  priceModifierCents: number;
};

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  note: string;
  customizations: CartCustomization[];
  portata: number;
  portata_completed: boolean;
  is_drink: boolean;
};

type Order = {
  id: string;
  table_id: string | null;
  status: "confirmed" | "pending" | "cooking" | "ready" | "completed" | "served";
  total_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  _displayTime?: string;
  table_number: string | null;
  items: OrderItem[];
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatElapsed = (dateStr: string) => {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "Adesso";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const formatPrice = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");

type TabId = "drinks" | "portate";

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface Props {
  ctx: RestaurantCtx;
  theme: ThemeMode;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function WaiterSection({ ctx, theme }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("drinks");

  const prevOrderIds = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  // ── SUONO NOTIFICA ──────────────────────────────────────────────────────────
  const playNotification = useCallback(() => {
    if (isNotificationSoundMuted()) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ac = audioCtx.current;
      [0, 0.15].forEach((delay) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.frequency.value = 660;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.25, ac.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.12);
        osc.start(ac.currentTime + delay);
        osc.stop(ac.currentTime + delay + 0.12);
      });
    } catch {}
  }, []);

  // ── FETCH ORDINI ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const { data: ordersData, error: ordErr } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", ctx.restaurantId)
        .in("status", ["confirmed", "cooking", "ready"])
        .order("created_at", { ascending: true });
      if (ordErr) throw ordErr;
      if (!ordersData?.length) { setOrders([]); setLoading(false); return; }

      const orderIds = ordersData.map((o) => o.id);
      const newIds = orderIds.filter(id => !prevOrderIds.current.has(id));
      if (newIds.length > 0 && prevOrderIds.current.size > 0) playNotification();
      prevOrderIds.current = new Set(orderIds);

      const { data: itemsData } = await supabase
        .from("order_items").select("*").in("order_id", orderIds);

      const menuItemIds = [...new Set((itemsData || []).map((i) => i.menu_item_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      if (menuItemIds.length) {
        const { data: menuItems } = await supabase
          .from("menu_items").select("id, name").in("id", menuItemIds);
        (menuItems || []).forEach((m) => { nameMap[m.id] = m.name; });
      }

      const tableIds = [...new Set(ordersData.map((o) => o.table_id).filter(Boolean))];
      let tableMap: Record<string, string> = {};
      if (tableIds.length) {
        const { data: tables } = await supabase
          .from("table_qr_sessions").select("id, table_number").in("id", tableIds);
        (tables || []).forEach((t) => { tableMap[t.id] = String(t.table_number ?? "?"); });
      }

      const formatted: Order[] = ordersData.map((order) => {
        const orderItems = (itemsData || []).filter((i) => i.order_id === order.id);
        const computedTotalCents = orderItems.reduce(
          (sum, i) => sum + Math.round((i.base_price ?? 0) * 100) * (i.quantity ?? 1), 0
        );
        return {
          ...order,
          _displayTime: order.confirmed_at || order.updated_at || order.created_at,
          total_cents: computedTotalCents > 0 ? computedTotalCents : (order.total_cents ?? 0),
          table_number: order.table_id ? (tableMap[order.table_id] ?? null) : null,
          items: orderItems.map((i): OrderItem => ({
            id: i.id,
            name: nameMap[i.menu_item_id] || i.name_snapshot || i.name || "Prodotto",
            quantity: i.quantity ?? 1,
            note: i.note ?? "",
            customizations: Array.isArray(i.customizations) ? i.customizations : [],
            portata: i.portata ?? 1,
            portata_completed: i.portata_completed ?? false,
            is_drink: i.is_drink ?? false,
          })),
        };
      });

      setOrders(formatted);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, [ctx.restaurantId, playNotification]);

  // ── REALTIME + TICK ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("waiter_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, fetchOrders)
      .subscribe();
    const tickInterval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(tickInterval); };
  }, [fetchOrders]);

  // ── COMPLETA BIBITA (segna items drink come completati) ─────────────────────
  const completeDrinkItems = async (orderId: string) => {
    setUpdating(orderId);
    const { error: err } = await supabase
      .from("order_items")
      .update({ portata_completed: true })
      .eq("order_id", orderId)
      .eq("is_drink", true)
      .eq("portata_completed", false);
    if (err) setError(`Errore: ${err.message}`);
    await fetchOrders();
    setUpdating(null);
  };

  // ── AVANZA PORTATA (cameriere sblocca la prossima portata) ──────────────────
  const advancePortata = async (orderId: string) => {
    setUpdating(orderId);
    const order = orders.find(o => o.id === orderId);
    if (!order) { setUpdating(null); return; }

    const activeItems = order.items.filter(i => !i.portata_completed && !i.is_drink);
    const currentPortata = Math.min(...activeItems.map(i => i.portata));
    const remainingPortate = [...new Set(activeItems.map(i => i.portata))].filter(p => p > currentPortata);

    // Completa la portata corrente
    const { error: err } = await supabase
      .from("order_items")
      .update({ portata_completed: true })
      .eq("order_id", orderId)
      .eq("portata", currentPortata)
      .eq("is_drink", false);
    if (err) { setError(`Errore: ${err.message}`); setUpdating(null); return; }

    if (remainingPortate.length > 0) {
      // C'è una prossima portata → resetta ordine a confirmed per la cucina
      await supabase.from("orders")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
    } else {
      // Ultima portata → controlla se ci sono ancora drink non completati
      const hasUncompletedDrinks = order.items.some(i => i.is_drink && !i.portata_completed);
      if (!hasUncompletedDrinks) {
        await supabase.from("orders")
          .update({ status: "served", updated_at: new Date().toISOString() })
          .eq("id", orderId);
      }
    }

    await fetchOrders();
    setUpdating(null);
  };

  // ── TEMA ────────────────────────────────────────────────────────────────────
  const isDark = theme === "dark";
  const bg = isDark ? "bg-gray-950" : "bg-gray-50";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecond = isDark ? "text-gray-400" : "text-gray-500";
  const borderColor = isDark ? "border-white/10" : "border-gray-200";

  // ── DATI FILTRATI ───────────────────────────────────────────────────────────

  // TAB BIBITE: ordini che hanno drink non completati
  const drinkOrders = orders
    .filter(o => o.items.some(i => i.is_drink && !i.portata_completed))
    .map(o => ({
      ...o,
      drinkItems: o.items.filter(i => i.is_drink && !i.portata_completed),
    }));

  // TAB PORTATE: ordini con portata ready (il cameriere deve ritirare e sbloccare la prossima)
  const portataOrders = orders
    .filter(o => {
      const foodItems = o.items.filter(i => !i.is_drink && !i.portata_completed);
      if (foodItems.length === 0) return false;
      // Mostra solo ordini con status ready (piatti pronti da ritirare)
      return o.status === "ready";
    })
    .map(o => {
      const foodItems = o.items.filter(i => !i.is_drink && !i.portata_completed);
      const currentPortata = Math.min(...foodItems.map(i => i.portata));
      const allPortateNums = [...new Set(o.items.filter(i => !i.is_drink).map(i => i.portata))].sort((a, b) => a - b);
      const hasMorePortate = foodItems.some(i => i.portata > currentPortata);
      return {
        ...o,
        currentPortata,
        currentItems: foodItems.filter(i => i.portata === currentPortata),
        totalPortate: allPortateNums.length,
        hasMorePortate,
      };
    });

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`flex-1 ${bg} flex items-center justify-center p-12`}>
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto" />
          <p className={`${textSecond} text-sm`}>Caricamento...</p>
        </div>
      </div>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className={`flex-1 flex flex-col ${bg} ${textPrimary}`}>

      {/* HEADER */}
      <div className={`px-4 sm:px-6 py-3 border-b ${borderColor} ${isDark ? "bg-gray-950/95" : "bg-white/95"} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-purple-500/15" : "bg-purple-50"}`}>
            <UtensilsCrossed className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-base font-bold tracking-tight ${textPrimary}`}>Cameriere</h2>
            <p className={`text-[11px] ${textSecond} leading-none mt-0.5`}>Bibite e gestione portate</p>
          </div>
          <button onClick={fetchOrders} title="Aggiorna"
            className={`p-2 rounded-xl transition-all ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
            <Loader2 className="w-4 h-4" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {([
            { id: "drinks" as TabId, label: "Bibite", Icon: Wine, count: drinkOrders.length, color: "purple" },
            { id: "portate" as TabId, label: "Portate", Icon: UtensilsCrossed, count: portataOrders.length, color: "orange" },
          ]).map(tab => {
            const isActive = activeTab === tab.id;
            const activeClass = tab.color === "purple"
              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
              : "bg-orange-500/15 text-orange-400 border-orange-500/30";
            const inactiveClass = isDark
              ? "bg-white/4 border-white/8 text-gray-500"
              : "bg-transparent border-gray-200 text-gray-400";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all
                  ${isActive ? activeClass : inactiveClass}`}
              >
                <tab.Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black px-1
                    ${tab.color === "purple" ? "bg-purple-500 text-white" : "bg-orange-500 text-white"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-2.5 rounded-xl flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB BIBITE
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "drinks" && (
        <div className="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto">
          {drinkOrders.length === 0 ? (
            <div className="text-center py-20">
              <Wine className={`w-10 h-10 mx-auto mb-3 ${textSecond} opacity-20`} />
              <p className={`${textSecond} text-sm font-medium`}>Nessun ordine bibite</p>
            </div>
          ) : drinkOrders.map(order => (
            <div key={order.id}
              className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#111118] border-white/8" : "bg-white border-gray-150"}`}>

              {/* Header */}
              <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${isDark ? "border-white/6 bg-purple-500/5" : "border-gray-100 bg-purple-50/50"}`}>
                <span className={`font-black text-sm px-2.5 py-1 rounded-lg ${isDark ? "bg-white/12 text-white" : "bg-black/8 text-gray-900"}`}>
                  T{order.table_number ?? "—"}
                </span>
                <span className={`flex items-center gap-1 text-xs font-bold tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  <Clock className="w-3 h-3" />
                  {formatElapsed(order._displayTime || order.created_at)}
                </span>
                <span className={`ml-auto text-xs font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  {order.drinkItems.length} {order.drinkItems.length === 1 ? "bibita" : "bibite"}
                </span>
              </div>

              {/* Items */}
              <div className="px-4 py-3 space-y-2">
                {order.drinkItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <Wine className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-purple-400/60" : "text-purple-400"}`} />
                    <span className={`font-black text-sm tabular-nums ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                      {item.quantity}×
                    </span>
                    <span className={`font-semibold text-sm flex-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {item.name}
                    </span>
                    {item.note && (
                      <span className={`text-[10px] italic truncate max-w-[100px] ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                        {item.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={() => completeDrinkItems(order.id)}
                  disabled={updating === order.id}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white shadow-sm shadow-purple-500/20"
                >
                  {updating === order.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  Consegnate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB PORTATE
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "portate" && (
        <div className="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto">
          {portataOrders.length === 0 ? (
            <div className="text-center py-20">
              <UtensilsCrossed className={`w-10 h-10 mx-auto mb-3 ${textSecond} opacity-20`} />
              <p className={`${textSecond} text-sm font-medium`}>Nessuna portata pronta da ritirare</p>
              <p className={`${textSecond} text-[11px] mt-1 opacity-60`}>Le portate appariranno qui quando la cucina le segna come pronte</p>
            </div>
          ) : portataOrders.map(order => (
            <div key={order.id}
              className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#111118] border-white/8" : "bg-white border-gray-150"}`}>

              {/* Header */}
              <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${isDark ? "border-white/6 bg-orange-500/5" : "border-gray-100 bg-orange-50/50"}`}>
                <span className={`font-black text-sm px-2.5 py-1 rounded-lg ${isDark ? "bg-white/12 text-white" : "bg-black/8 text-gray-900"}`}>
                  T{order.table_number ?? "—"}
                </span>

                {order.totalPortate > 1 && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${isDark ? "bg-orange-500/15 text-orange-400 border border-orange-500/25" : "bg-orange-50 text-orange-600 border border-orange-200"}`}>
                    P{order.currentPortata}/{order.totalPortate}
                  </span>
                )}

                <span className={`flex items-center gap-1 text-xs font-bold tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  <Clock className="w-3 h-3" />
                  {formatElapsed(order._displayTime || order.created_at)}
                </span>

                <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-green-500/12 text-green-400 border border-green-500/20`}>
                  <CheckCircle className="w-3 h-3" />
                  Pronto
                </span>
              </div>

              {/* Items della portata corrente */}
              <div className="px-4 py-3">
                <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b ${isDark ? "border-white/6" : "border-gray-100"}`}>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-orange-400" : "text-orange-500"}`}>
                    Portata {order.currentPortata}
                  </span>
                  <span className={`text-[10px] font-medium ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                    {order.currentItems.length} {order.currentItems.length === 1 ? "piatto" : "piatti"}
                  </span>
                </div>
                <div className="space-y-2">
                  {order.currentItems.map(item => (
                    <div key={item.id}>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-black text-sm tabular-nums min-w-[22px] ${isDark ? "text-green-400" : "text-green-600"}`}>
                          {item.quantity}×
                        </span>
                        <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                          {item.name}
                        </span>
                      </div>
                      {item.customizations.length > 0 && (
                        <div className="mt-1 ml-6 flex flex-wrap gap-1">
                          {item.customizations.map((c, i) => (
                            <span key={i} className="text-[11px] bg-orange-500/12 border border-orange-500/20 text-orange-300 px-2 py-0.5 rounded-md font-medium">
                              <span className="opacity-60">{c.optionName}:</span> {c.choiceName}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.note && (
                        <div className="mt-1 ml-6 flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/18 rounded-lg px-2.5 py-1.5 font-medium italic">
                          <StickyNote className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                          {item.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={() => advancePortata(order.id)}
                  disabled={updating === order.id}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm
                    ${order.hasMorePortate
                      ? "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white shadow-orange-500/20"
                      : isDark ? "bg-white/10 hover:bg-white/15 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                >
                  {updating === order.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  {order.hasMorePortate ? (
                    <>
                      Ritirato — Avvia portata {order.currentPortata + 1}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : "Ritirato — Ordine completato"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
