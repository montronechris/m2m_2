// src/app/admin/dashboard/sections/OrdersSection.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Clock, ChefHat, CheckCircle, AlertCircle,
  Loader2, Trash2, StickyNote, Utensils, Bell,
  Filter, LayoutGrid, AlertTriangle, Printer, History, X,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";
import { isNotificationSoundMuted } from "@/lib/notificationSound";

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
  portata:        number;
  portata_completed: boolean;
};

type Order = {
  id:            string;
  table_id:      string | null;
  status:        "confirmed" | "pending" | "cooking" | "ready" | "completed" | "served";
  total_cents:   number;
  notes:         string | null;
  created_at:    string;
  updated_at:    string;
  confirmed_at:  string | null;
  _displayTime?: string;
  table_number:  string | null;
  items:         OrderItem[];
};

type AggregatedDish = {
  name: string;
  totalQty: number;
  tables: { table: string; qty: number; note: string; customizations: CartCustomization[] }[];
};

type ViewMode = "kanban" | "aggregated" | "urgent";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatElapsed = (dateStr: string) => {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1)  return "Adesso";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const formatElapsedNum = (dateStr: string) =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);

const formatPrice = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ─── PRINT ────────────────────────────────────────────────────────────────────

function printOrder(order: Order) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Comanda #${order.id.slice(0, 8)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 14px; padding: 24px; color: #000; }
        h1 { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
        .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
        .divider { border-top: 2px dashed #000; margin: 12px 0; }
        .item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
        .item-name { font-weight: bold; font-size: 15px; }
        .item-qty { font-size: 18px; font-weight: bold; color: #222; min-width: 32px; }
        .custom { font-size: 12px; color: #555; margin-top: 3px; }
        .note { font-size: 12px; color: #c00; font-style: italic; margin-top: 3px; }
        .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 16px; }
        .footer { margin-top: 24px; font-size: 12px; color: #888; text-align: center; }
        @media print { body { padding: 12px; } }
      </style>
    </head>
    <body>
      <h1>🍽 Comanda — ${order.table_number ? `Tavolo ${order.table_number}` : "Tavolo —"}</h1>
      <div class="meta">
        Orario: ${formatTime(order._displayTime || order.created_at)} &nbsp;|&nbsp;
        Stato: ${order.status} &nbsp;|&nbsp;
        ID: #${order.id.slice(0, 8)}
      </div>
      <div class="divider"></div>
      ${order.items.map(item => `
        <div class="item">
          <div>
            <div style="display:flex;align-items:baseline;gap:8px">
              <span class="item-qty">${item.quantity}×</span>
              <span class="item-name">${item.name}</span>
            </div>
            ${item.customizations.length > 0 ? `<div class="custom">${item.customizations.map(c => `${c.optionName}: ${c.choiceName}`).join(" | ")}</div>` : ""}
            ${item.note ? `<div class="note">📝 ${item.note}</div>` : ""}
          </div>
        </div>
      `).join("")}
      <div class="divider"></div>
      ${order.notes ? `<div style="font-size:13px;color:#333;margin-bottom:8px">📌 Note: ${order.notes}</div>` : ""}
      <div class="total">Totale: €${formatPrice(order.total_cents)}</div>
      <div class="footer">Stampato il ${new Date().toLocaleString("it-IT")}</div>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body>
    </html>
  `;
  win.document.write(html);
  win.document.close();
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface Props {
  ctx:   RestaurantCtx;
  theme: ThemeMode;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function OrdersSection({ ctx, theme }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [orders,        setOrders]       = useState<Order[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [updating,      setUpdating]     = useState<string | null>(null);
  const [error,         setError]        = useState<string | null>(null);
  const [tick,          setTick]         = useState(0);
  const [viewMode,      setViewMode]     = useState<ViewMode>("kanban");
  const [tableFilter,   setTableFilter]  = useState<string | null>(null);
  const [portataFilter, setPortataFilter] = useState<number | null>(null);

  // ── CRONOLOGIA ──────────────────────────────────────────────────────────────
  const [showHistory,        setShowHistory]        = useState(false);
  const [historyOrders,      setHistoryOrders]      = useState<Order[]>([]);
  const [cancelledOrders,    setCancelledOrders]    = useState<Order[]>([]);
  const [historyLoading,     setHistoryLoading]     = useState(false);
  const [historyDateFilter,  setHistoryDateFilter]  = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const prevOrderIds = useRef<Set<string>>(new Set());
  const audioCtx     = useRef<AudioContext | null>(null);

  // ── SUONO NOTIFICA ──────────────────────────────────────────────────────────
  const playNotification = useCallback(() => {
    if (isNotificationSoundMuted()) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ac = audioCtx.current;
      [0, 0.2, 0.4].forEach((delay) => {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ac.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.15);
        osc.start(ac.currentTime + delay);
        osc.stop(ac.currentTime + delay + 0.15);
      });
    } catch (e) {
      console.warn("Audio non disponibile:", e);
    }
  }, []);

  // ── FETCH ORDINI ATTIVI ──────────────────────────────────────────────────────
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
            id:       i.id,
            name:     nameMap[i.menu_item_id] || i.name_snapshot || i.name || "Prodotto",
            quantity: i.quantity ?? 1,
            note:     i.note ?? "",
            customizations: Array.isArray(i.customizations) ? i.customizations : [],
            portata:  i.portata ?? 1,
            portata_completed: i.portata_completed ?? false,
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

  // ── FETCH CRONOLOGIA ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (dateStr: string) => {
    setHistoryLoading(true);
    try {
      const from = `${dateStr}T00:00:00`;
      const to   = `${dateStr}T23:59:59`;

      // Fetch served e cancelled in parallelo
      const [{ data: servedData }, { data: cancelledData }] = await Promise.all([
        supabase.from("orders").select("*")
          .eq("restaurant_id", ctx.restaurantId)
          .eq("status", "served")
          .gte("updated_at", from).lte("updated_at", to)
          .order("updated_at", { ascending: false }),
        supabase.from("orders").select("*")
          .eq("restaurant_id", ctx.restaurantId)
          .eq("status", "cancelled")
          .gte("updated_at", from).lte("updated_at", to)
          .order("updated_at", { ascending: false }),
      ]);

      const allOrders = [...(servedData || []), ...(cancelledData || [])];

      // Costruisce nameMap e tableMap una volta sola per entrambi i set
      const buildFormatted = async (ordersData: typeof allOrders) => {
        if (!ordersData.length) return [];
        const orderIds = ordersData.map((o) => o.id);
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

        return ordersData.map((order) => {
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
              id:       i.id,
              name:     nameMap[i.menu_item_id] || i.name_snapshot || i.name || "Prodotto",
              quantity: i.quantity ?? 1,
              note:     i.note ?? "",
              customizations: Array.isArray(i.customizations) ? i.customizations : [],
              portata:  i.portata ?? 1,
              portata_completed: i.portata_completed ?? false,
            })),
          };
        });
      };

      const [formattedServed, formattedCancelled] = await Promise.all([
        buildFormatted(servedData || []),
        buildFormatted(cancelledData || []),
      ]);

      setHistoryOrders(formattedServed);
      setCancelledOrders(formattedCancelled);
    } catch (err: any) {
      console.error("Errore cronologia:", err?.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [ctx.restaurantId]);

  // ── REALTIME + TICK ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("kitchen_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" },      fetchOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, fetchOrders)
      .subscribe();
    const tickInterval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(tickInterval); };
  }, [fetchOrders]);

  // Carica cronologia quando si apre il pannello o cambia data
  useEffect(() => {
    if (showHistory) fetchHistory(historyDateFilter);
  }, [showHistory, historyDateFilter, fetchHistory]);

  // ── STATUS UPDATE ───────────────────────────────────────────────────────────
  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) setError(`Aggiornamento fallito: ${error.message}`);
    setUpdating(null);
  };

  // ── DELETE ──────────────────────────────────────────────────────────────────
  const deleteOrder = async (orderId: string) => {
    if (!confirm("Eliminare questo ordine?")) return;
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(`Errore: ${data.error}`);
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // ── COMPLETA PORTATA CORRENTE E AVANZA ───────────────────────────────────────
  const completeCurrentPortata = async (orderId: string) => {
    setUpdating(orderId);
    const order = orders.find(o => o.id === orderId);
    if (!order) { setUpdating(null); return; }

    const activeItems = order.items.filter(i => !i.portata_completed);
    const currentPortata = Math.min(...activeItems.map(i => i.portata));
    const remainingPortate = [...new Set(activeItems.map(i => i.portata))].filter(p => p > currentPortata);

    const { error: err } = await supabase
      .from("order_items")
      .update({ portata_completed: true })
      .eq("order_id", orderId)
      .eq("portata", currentPortata);
    if (err) {
      setError(`Errore completamento portata: ${err.message}`);
      setUpdating(null);
      return;
    }

    if (remainingPortate.length > 0) {
      await supabase.from("orders")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
    } else {
      await supabase.from("orders")
        .update({ status: "served", updated_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    await fetchOrders();
    setUpdating(null);
  };

  // ── AUTO-COMPLETE PORTATA DOPO 5 MIN READY ────────────────────────────────
  useEffect(() => {
    const autoComplete = async () => {
      const readyOrders = orders.filter(o => o.status === "ready");
      for (const order of readyOrders) {
        const readyMinutes = formatElapsedNum(order.updated_at);
        if (readyMinutes >= 5) {
          await completeCurrentPortata(order.id);
        }
      }
    };
    autoComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, orders]);

  // ── TEMA ────────────────────────────────────────────────────────────────────
  const isDark      = theme === "dark";
  const bg          = isDark ? "bg-gray-950"     : "bg-gray-50";
  const bgCard      = isDark ? "bg-gray-900"     : "bg-white";
  const borderColor = isDark ? "border-white/10" : "border-gray-200";
  const textPrimary = isDark ? "text-white"      : "text-gray-900";
  const textSecond  = isDark ? "text-gray-400"   : "text-gray-500";

  // ── FILTRI ──────────────────────────────────────────────────────────────────
  const allTableNumbers = [...new Set(orders.map(o => o.table_number).filter(Boolean) as string[])].sort();

  // Per ogni ordine, calcola la portata corrente (la più bassa non completata)
  const getCurrentPortata = (order: Order) => {
    const active = order.items.filter(i => !i.portata_completed);
    if (active.length === 0) return null;
    return Math.min(...active.map(i => i.portata));
  };

  // Portate correnti attive per i pallini rossi del filtro
  const activePortate = new Set<number>();
  orders.forEach(o => {
    const cp = getCurrentPortata(o);
    if (cp !== null) activePortate.add(cp);
  });

  const visibleOrders = orders.filter(o => {
    if (tableFilter && o.table_number !== tableFilter) return false;
    const cp = getCurrentPortata(o);
    if (portataFilter && cp !== portataFilter) return false;
    if (viewMode === "urgent") return formatElapsedNum(o._displayTime || o.created_at) >= 10;
    return true;
  });

  const pending = visibleOrders.filter(o => o.status === "confirmed");
  const cooking = visibleOrders.filter(o => o.status === "cooking");
  const ready   = visibleOrders.filter(o => o.status === "ready");

  // ── VISTA AGGREGATA ─────────────────────────────────────────────────────────
  const aggregatedDishes: AggregatedDish[] = (() => {
    const map: Record<string, AggregatedDish> = {};
    visibleOrders.forEach(order => {
      const cp = getCurrentPortata(order);
      order.items.filter(i => !i.portata_completed && i.portata === cp).forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, totalQty: 0, tables: [] };
        map[item.name].totalQty += item.quantity;
        map[item.name].tables.push({
          table: order.table_number ?? "—",
          qty: item.quantity,
          note: item.note,
          customizations: item.customizations,
        });
      });
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  })();

  // Totale cronologia del giorno
  const historyTotal   = historyOrders.reduce((sum, o) => sum + o.total_cents, 0);
  const cancelledTotal = cancelledOrders.reduce((sum, o) => sum + o.total_cents, 0);

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`flex-1 ${bg} flex items-center justify-center p-12`}>
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-green-400 mx-auto" />
          <p className={`${textSecond} text-sm`}>Caricamento cucina...</p>
        </div>
      </div>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className={`flex-1 flex flex-col ${bg} ${textPrimary}`}>

      {/* HEADER */}
      <div className={`px-6 py-4 border-b ${borderColor} ${isDark ? "bg-gray-950/95" : "bg-white/95"} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-green-500/15" : "bg-green-50"}`}>
              <ChefHat className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${textPrimary}`}>Cucina Live</h2>
              <p className={`text-[11px] ${textSecond} leading-none mt-0.5`}>Ordini più vecchi in cima</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <StatPill color="yellow" count={orders.filter(o => o.status === "confirmed").length} label="Attesa" />
            <StatPill color="blue"   count={orders.filter(o => o.status === "cooking").length}   label="Cucina" />
            <StatPill color="green"  count={orders.filter(o => o.status === "ready").length}     label="Pronti" />

            <div className={`hidden sm:block w-px h-5 ${isDark ? "bg-white/10" : "bg-gray-200"} mx-1`} />

            <button
              onClick={() => setShowHistory(h => !h)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                ${showHistory
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/25"
                  : isDark ? "bg-white/5 border-white/8 text-gray-400 hover:bg-white/10 hover:text-gray-300" : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"}`}
            >
              <History className="w-3.5 h-3.5" />
              Cronologia
            </button>
            <button onClick={fetchOrders} title="Aggiorna"
              className={`p-2 rounded-xl transition-all ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
              <Loader2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOOLBAR FILTRI */}
        {!showHistory && (
          <div className={`flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t ${isDark ? "border-white/6" : "border-gray-100"}`}>
            {/* Viste */}
            {(["kanban", "aggregated", "urgent"] as const).map(mode => {
              const cfg = {
                kanban:     { label: "Kanban",    Icon: LayoutGrid,    active: "bg-green-500/15 text-green-400 border-green-500/25" },
                aggregated: { label: "Per piatto", Icon: Utensils,     active: "bg-purple-500/15 text-purple-400 border-purple-500/25" },
                urgent:     { label: "Urgenti",   Icon: AlertTriangle, active: "bg-red-500/15 text-red-400 border-red-500/25" },
              }[mode];
              const urgentCount = orders.filter(o => formatElapsedNum(o._displayTime || o.created_at) >= 10).length;
              const isActive = viewMode === mode || (mode === "urgent" && viewMode === "urgent");
              return (
                <button key={mode}
                  onClick={() => setViewMode(viewMode === mode && mode === "urgent" ? "kanban" : mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                    ${isActive ? cfg.active : isDark ? "bg-white/4 border-white/8 text-gray-500 hover:bg-white/8 hover:text-gray-300" : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}>
                  <cfg.Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                  {mode === "urgent" && urgentCount > 0 && (
                    <span className="bg-red-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center text-[10px] font-black px-1">
                      {urgentCount}
                    </span>
                  )}
                </button>
              );
            })}

            <div className={`w-px h-4 ${isDark ? "bg-white/10" : "bg-gray-200"} mx-0.5`} />

            {/* Filtro tavolo */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-gray-500" />
              <button onClick={() => setTableFilter(null)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all
                  ${tableFilter === null
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                    : isDark ? "bg-white/4 border-white/8 text-gray-500 hover:bg-white/8" : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                Tutti
              </button>
              {allTableNumbers.map(tn => (
                <button key={tn} onClick={() => setTableFilter(tableFilter === tn ? null : tn)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all
                    ${tableFilter === tn
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                      : isDark ? "bg-white/4 border-white/8 text-gray-500 hover:bg-white/8" : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                  {tn}
                </button>
              ))}
            </div>

            <div className={`w-px h-4 ${isDark ? "bg-white/10" : "bg-gray-200"} mx-0.5`} />

            {/* Filtro portata */}
            <div className="flex items-center gap-1.5">
              <Utensils className="w-3 h-3 text-gray-500" />
              <button onClick={() => setPortataFilter(null)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all
                  ${portataFilter === null
                    ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                    : isDark ? "bg-white/4 border-white/8 text-gray-500 hover:bg-white/8" : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                Tutte
              </button>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPortataFilter(portataFilter === n ? null : n)}
                  className={`relative px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all
                    ${portataFilter === n
                      ? "bg-orange-500/15 text-orange-400 border-orange-500/25"
                      : isDark ? "bg-white/4 border-white/8 text-gray-500 hover:bg-white/8" : "bg-transparent border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                  P{n}
                  {activePortate.has(n) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PANNELLO CRONOLOGIA
          ════════════════════════════════════════════════════════════════ */}
      {showHistory ? (
        <div className="flex-1 p-6">

          {/* Barra filtro data + totale */}
          <div className={`flex flex-wrap items-center gap-3 mb-5 pb-5 border-b ${borderColor}`}>
            <div className="flex items-center gap-2">
              <label className={`text-xs font-bold uppercase tracking-wide ${textSecond}`}>Data</label>
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => setHistoryDateFilter(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all
                  ${isDark ? "bg-white/5 border-white/8 text-white" : "bg-white border-gray-200 text-gray-900"}`}
              />
            </div>
            {!historyLoading && (historyOrders.length > 0 || cancelledOrders.length > 0) && (
              <div className="flex items-center gap-3 ml-auto">
                {historyOrders.length > 0 && (
                  <span className={`text-xs ${textSecond}`}>
                    <span className="font-black text-purple-400 text-base">{historyOrders.length}</span>
                    <span className="ml-1">serviti</span>
                    <span className="font-black text-green-400 ml-2 tabular-nums">€{formatPrice(historyTotal)}</span>
                  </span>
                )}
                {cancelledOrders.length > 0 && (
                  <span className={`text-xs ${textSecond}`}>
                    <span className="font-black text-red-400 text-base">{cancelledOrders.length}</span>
                    <span className="ml-1">eliminati</span>
                    <span className={`font-black ml-2 tabular-nums line-through ${textSecond}`}>€{formatPrice(cancelledTotal)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
            </div>
          ) : historyOrders.length === 0 && cancelledOrders.length === 0 ? (
            <div className="text-center py-20">
              <History className={`w-10 h-10 mx-auto mb-3 ${textSecond} opacity-20`} />
              <p className={`${textSecond} text-sm font-medium`}>Nessun ordine in questa data</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Serviti ── */}
              {historyOrders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-green-400">Serviti</span>
                    <span className={`text-xs ${textSecond}`}>({historyOrders.length})</span>
                  </div>
                  <div className="space-y-2">
                    {historyOrders.map(order => (
                      <div key={order.id} className={`${bgCard} border ${borderColor} rounded-2xl overflow-hidden`}>
                        <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? "border-white/6 bg-green-500/5" : "border-gray-100 bg-green-50/40"}`}>
                          <span className={`font-black text-sm px-2.5 py-1 rounded-lg ${isDark ? "bg-white/10 text-white" : "bg-black/8 text-gray-800"}`}>
                            {order.table_number ? `T${order.table_number}` : "T—"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/12 border border-green-500/20 px-2 py-0.5 rounded-lg">
                            <CheckCircle className="w-3 h-3" />
                            Servito
                          </span>
                          <span className={`text-xs ${textSecond}`}>{formatDateTime(order.updated_at)}</span>
                          <div className="ml-auto flex items-center gap-3">
                            <span className="font-black text-sm text-green-400 tabular-nums">€{formatPrice(order.total_cents)}</span>
                            <button onClick={() => printOrder(order)} title="Stampa comanda"
                              className={`p-1.5 rounded-lg transition-all ${isDark ? "text-gray-600 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                          {order.items.length === 0 ? (
                            <p className={`text-xs italic ${textSecond}`}>Nessun prodotto</p>
                          ) : order.items.map(item => (
                            <div key={item.id} className="flex items-baseline gap-2">
                              <span className={`font-black text-sm tabular-nums min-w-[22px] ${isDark ? "text-green-400" : "text-green-600"}`}>{item.quantity}×</span>
                              <span className={`text-sm font-medium ${textPrimary}`}>{item.name}</span>
                              {item.customizations.length > 0 && (
                                <span className={`text-xs ${textSecond} truncate`}>
                                  ({item.customizations.map(c => `${c.optionName}: ${c.choiceName}`).join(", ")})
                                </span>
                              )}
                            </div>
                          ))}
                          {order.notes && (
                            <div className={`flex items-start gap-1.5 text-xs mt-1 ${textSecond}`}>
                              <Bell className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
                              <span className="italic">{order.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Eliminati ── */}
              {cancelledOrders.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-3 pb-3 border-t ${isDark ? "border-white/6 pt-5" : "border-gray-100 pt-5"}`}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-red-400">Eliminati</span>
                    <span className={`text-xs ${textSecond}`}>({cancelledOrders.length})</span>
                  </div>
                  <div className="space-y-2">
                    {cancelledOrders.map(order => (
                      <div key={order.id} className={`${bgCard} border rounded-2xl overflow-hidden opacity-75 ${isDark ? "border-red-500/15" : "border-red-100"}`}>
                        <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? "border-red-500/10 bg-red-500/5" : "border-red-50 bg-red-50/60"}`}>
                          <span className={`font-black text-sm px-2.5 py-1 rounded-lg ${isDark ? "bg-white/8 text-gray-300" : "bg-black/5 text-gray-600"}`}>
                            {order.table_number ? `T${order.table_number}` : "T—"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/12 border border-red-500/20 px-2 py-0.5 rounded-lg">
                            <Trash2 className="w-3 h-3" />
                            Eliminato
                          </span>
                          <span className={`text-xs ${textSecond}`}>{formatDateTime(order.updated_at)}</span>
                          <div className="ml-auto">
                            <span className={`font-black text-sm tabular-nums line-through ${textSecond}`}>€{formatPrice(order.total_cents)}</span>
                          </div>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                          {order.items.length === 0 ? (
                            <p className={`text-xs italic ${textSecond}`}>Nessun prodotto</p>
                          ) : order.items.map(item => (
                            <div key={item.id} className="flex items-baseline gap-2">
                              <span className={`font-black text-sm tabular-nums min-w-[22px] ${textSecond}`}>{item.quantity}×</span>
                              <span className={`text-sm font-medium line-through ${textSecond}`}>{item.name}</span>
                            </div>
                          ))}
                          {order.notes && (
                            <div className={`flex items-start gap-1.5 text-xs mt-1 ${textSecond}`}>
                              <Bell className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
                              <span className="italic">{order.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      ) : (
        <>
          {/* VISTA AGGREGATA */}
          {viewMode === "aggregated" ? (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aggregatedDishes.length === 0 ? (
                  <div className="col-span-3 text-center py-20 text-gray-600">
                    <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Nessun piatto in preparazione</p>
                  </div>
                ) : aggregatedDishes.map(dish => (
                  <div key={dish.name} className={`${bgCard} border ${borderColor} rounded-2xl overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                      <span className="font-bold text-sm">{dish.name}</span>
                      <span className="text-2xl font-black text-green-400 tabular-nums">×{dish.totalQty}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {dish.tables.map((t, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"}`}>
                            TAV {t.table}
                          </span>
                          <div className="flex-1">
                            <span className="text-xs text-gray-400">×{t.qty}</span>
                            {t.customizations.length > 0 && (
                              <div className="text-xs text-orange-400 mt-0.5">
                                {t.customizations.map(c => `${c.optionName}: ${c.choiceName}`).join(" | ")}
                              </div>
                            )}
                            {t.note && <div className="text-xs text-amber-400 italic mt-0.5">📝 {t.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : (
            /* VISTA KANBAN / URGENTI */
            <div className={`grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x ${isDark ? "divide-white/6" : "divide-gray-100"}`}>
              <Column title="In Attesa" count={pending.length} colorClass="text-yellow-400"
                icon={<Clock className="w-3.5 h-3.5" />} emptyText="Nessun ordine in attesa"
                bgAccent="border-yellow-500/25 bg-yellow-500/10" accentBg={isDark ? "bg-yellow-500/5" : "bg-yellow-50/60"}>
                {pending.map(o => (
                  <OrderCard key={o.id} order={o} isUpdating={updating === o.id}
                    onUpdate={updateStatus} onDelete={deleteOrder} onPrint={printOrder} onCompletePortata={completeCurrentPortata} tick={tick} isDark={isDark} />
                ))}
              </Column>
              <Column title="In Cucina" count={cooking.length} colorClass="text-blue-400"
                icon={<ChefHat className="w-3.5 h-3.5" />} emptyText="Nessun ordine in preparazione"
                bgAccent="border-blue-500/25 bg-blue-500/10" accentBg={isDark ? "bg-blue-500/5" : "bg-blue-50/60"}>
                {cooking.map(o => (
                  <OrderCard key={o.id} order={o} isUpdating={updating === o.id}
                    onUpdate={updateStatus} onDelete={deleteOrder} onPrint={printOrder} onCompletePortata={completeCurrentPortata} tick={tick} isDark={isDark} />
                ))}
              </Column>
              <Column title="Pronti" count={ready.length} colorClass="text-green-400"
                icon={<CheckCircle className="w-3.5 h-3.5" />} emptyText="Nessun ordine pronto"
                bgAccent="border-green-500/25 bg-green-500/10" accentBg={isDark ? "bg-green-500/5" : "bg-green-50/60"}>
                {ready.map(o => (
                  <OrderCard key={o.id} order={o} isUpdating={updating === o.id}
                    onUpdate={updateStatus} onDelete={deleteOrder} onPrint={printOrder} onCompletePortata={completeCurrentPortata} tick={tick} isDark={isDark} />
                ))}
              </Column>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatPill({ color, count, label }: { color: "yellow" | "blue" | "green"; count: number; label: string }) {
  const colors = {
    yellow: "bg-yellow-500/12 text-yellow-400 border-yellow-500/25",
    blue:   "bg-blue-500/12   text-blue-400   border-blue-500/25",
    green:  "bg-green-500/12  text-green-400  border-green-500/25",
  };
  return (
    <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${colors[color]}`}>
      <span className="text-lg font-black tabular-nums leading-none">{count}</span>
      <span className="opacity-60 font-medium">{label}</span>
    </div>
  );
}

function Column({ title, count, colorClass, icon, emptyText, bgAccent, accentBg, children }: {
  title: string; count: number; colorClass: string; icon: React.ReactNode;
  emptyText: string; bgAccent: string; accentBg: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={`px-5 py-3.5 flex items-center gap-2.5 ${accentBg} border-b border-white/8`}>
        <span className={colorClass}>{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-widest ${colorClass}`}>{title}</span>
        <span className={`ml-auto min-w-[24px] h-6 flex items-center justify-center text-xs font-black rounded-lg border ${bgAccent} ${colorClass}`}>
          {count}
        </span>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {count === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Utensils className="w-7 h-7 mx-auto mb-2.5 opacity-20" />
            <p className="text-xs font-medium opacity-50">{emptyText}</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

function OrderCard({ order, isUpdating, onUpdate, onDelete, onPrint, onCompletePortata, tick, isDark }: {
  order: Order; isUpdating: boolean;
  onUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onPrint:  (order: Order) => void;
  onCompletePortata: (orderId: string) => void;
  tick: number;
  isDark: boolean;
}) {
  const displayTime = order._displayTime || order.created_at;
  const elapsed     = formatElapsedNum(displayTime);
  const isUrgent    = elapsed >= 10;

  const cardBg     = isDark ? "bg-[#111118]" : "bg-white";
  const cardBorder = isUrgent
    ? "border-red-500/40"
    : isDark ? "border-white/8" : "border-gray-150";
  const headerBg =
    order.status === "confirmed" || order.status === "pending"
      ? isDark ? "bg-yellow-500/8" : "bg-yellow-50/80"
      : order.status === "cooking"
      ? isDark ? "bg-blue-500/8"   : "bg-blue-50/80"
      : isDark ? "bg-green-500/8"  : "bg-green-50/80";

  // Solo la portata corrente (la più bassa non completata)
  const activeItems = order.items.filter(i => !i.portata_completed);
  const currentPortata = activeItems.length > 0 ? Math.min(...activeItems.map(i => i.portata)) : null;
  const currentItems = activeItems.filter(i => i.portata === currentPortata);
  const allPortateNums = [...new Set(order.items.map(i => i.portata))].sort((a, b) => a - b);
  const totalPortate = allPortateNums.length;
  const hasMorePortate = activeItems.some(i => i.portata !== currentPortata);

  return (
    <div className={`rounded-2xl border overflow-hidden transition-shadow ${cardBg} ${cardBorder} ${isUrgent ? "shadow-lg shadow-red-500/10" : ""}`}>

      {/* ── Card header ── */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${headerBg} border-b ${isDark ? "border-white/6" : "border-black/5"}`}>
        <span className={`font-black text-sm tracking-tight px-2.5 py-1 rounded-lg ${isDark ? "bg-white/12 text-white" : "bg-black/8 text-gray-900"}`}>
          {order.table_number ? `T${order.table_number}` : "T—"}
        </span>

        {/* Badge portata corrente */}
        {currentPortata !== null && totalPortate > 1 && (
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${isDark ? "bg-orange-500/15 text-orange-400 border border-orange-500/25" : "bg-orange-50 text-orange-600 border border-orange-200"}`}>
            P{currentPortata}/{totalPortate}
          </span>
        )}

        <span className={`flex items-center gap-1 text-xs font-bold tabular-nums ${isUrgent ? "text-red-400" : isDark ? "text-gray-500" : "text-gray-400"}`}>
          <Clock className="w-3 h-3" />
          {formatElapsed(displayTime)}
          {isUrgent && <span className="ml-0.5 text-[10px] font-black text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-md">URGENTE</span>}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${isDark ? "text-white/60" : "text-gray-600"}`}>
            €{formatPrice(order.total_cents)}
          </span>
          <button onClick={() => onPrint(order)} title="Stampa comanda"
            className={`p-1.5 rounded-lg transition-all ${isDark ? "text-gray-600 hover:text-gray-300 hover:bg-white/8" : "text-gray-400 hover:text-gray-600 hover:bg-black/5"}`}>
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Items della portata corrente ── */}
      <div className="px-4 pt-3 pb-2">
        {currentItems.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">Nessun prodotto</p>
        ) : (
          <>
            {/* Intestazione portata */}
            <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b ${isDark ? "border-white/6" : "border-gray-100"}`}>
              <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-orange-400" : "text-orange-500"}`}>
                Portata {currentPortata}
              </span>
              <span className={`text-[10px] font-medium ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                {currentItems.length} {currentItems.length === 1 ? "piatto" : "piatti"}
              </span>
              {hasMorePortate && (
                <span className={`ml-auto text-[10px] font-medium ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                  +{[...new Set(activeItems.filter(i => i.portata !== currentPortata).map(i => i.portata))].length} portate in attesa
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {currentItems.map(item => (
                <div key={item.id}>
                  <div className="flex items-baseline gap-2">
                    <span className={`font-black text-sm tabular-nums min-w-[22px] ${isDark ? "text-green-400" : "text-green-600"}`}>
                      {item.quantity}×
                    </span>
                    <span className={`font-semibold text-sm leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                      {item.name}
                    </span>
                  </div>
                  {item.customizations.length > 0 && (
                    <div className="mt-1.5 ml-6 flex flex-wrap gap-1">
                      {item.customizations.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-orange-500/12 border border-orange-500/20 text-orange-300 px-2 py-0.5 rounded-md font-medium">
                          <span className="opacity-60">{c.optionName}:</span> {c.choiceName}
                          {c.priceModifierCents > 0 && <span className="opacity-60 ml-0.5">+€{formatPrice(c.priceModifierCents)}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <div className="mt-1.5 ml-6 flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/18 rounded-lg px-2.5 py-1.5 font-medium italic">
                      <StickyNote className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
                      {item.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {order.notes && (
          <div className={`flex items-start gap-1.5 text-[11px] rounded-xl px-3 py-2 border mt-2 ${isDark ? "text-gray-400 bg-white/4 border-white/8" : "text-gray-500 bg-gray-50 border-gray-100"}`}>
            <Bell className="w-3 h-3 shrink-0 mt-0.5 opacity-60" />
            <span className="italic">{order.notes}</span>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="px-4 pb-4 pt-2 flex gap-2">
        {(order.status === "confirmed" || order.status === "pending") && (
          <>
            <button onClick={() => onUpdate(order.id, "cooking")} disabled={isUpdating}
              className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5" />}
              Inizia cottura
            </button>
            <button onClick={() => onDelete(order.id)}
              className={`px-3 py-2.5 rounded-xl transition-all ${isDark ? "bg-white/6 hover:bg-red-500/18 text-gray-500 hover:text-red-400" : "bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500"}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {order.status === "cooking" && (
          <>
            <button onClick={() => onUpdate(order.id, "ready")} disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-green-500/20">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Pronto
            </button>
            <button onClick={() => onDelete(order.id)}
              className={`px-3 py-2.5 rounded-xl transition-all ${isDark ? "bg-white/6 hover:bg-red-500/18 text-gray-500 hover:text-red-400" : "bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500"}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {order.status === "ready" && (
          <button onClick={() => onCompletePortata(order.id)} disabled={isUpdating}
            className={`flex-1 disabled:opacity-40 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5
              ${hasMorePortate
                ? isDark ? "bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/25" : "bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200"
                : isDark ? "bg-white/8 hover:bg-white/14 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}>
            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {hasMorePortate ? `Completa portata ${currentPortata}` : "Consegnato"}
          </button>
        )}
      </div>

      {/* ── Auto-complete countdown ── */}
      {order.status === "ready" && (() => {
        const readyMins = formatElapsedNum(order.updated_at);
        const remaining = 5 - readyMins;
        if (remaining > 0) return (
          <div className={`px-4 pb-3 -mt-1`}>
            <p className={`text-[10px] text-center font-medium ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              Auto-completamento in {remaining} min
            </p>
          </div>
        );
        return null;
      })()}
    </div>
  );
}