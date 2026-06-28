'use client'

import { useEffect, useRef, useState } from 'react'
import { ShoppingCart, CheckCircle2, Bell, AlertCircle, UtensilsCrossed, Clock, Receipt, PackageCheck } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import {
  getReadyOrders,
  markPortataDelivered,
  markPortataPickedUp,
  getPortataState,
  type Order,
  type OrderItem,
  type Table,
} from '@/lib/admin-service'
import { playNotificationSound } from '@/lib/notificationSound'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

const portataLabels: Record<number, string> = { 1: '1ª Portata', 2: '2ª Portata', 3: '3ª Portata', 4: '4ª Portata' }

function groupByPortata(items: OrderItem[]): { portata: number; items: OrderItem[] }[] {
  const map = new Map<number, OrderItem[]>()
  for (const it of items) {
    const p = it.portata ?? 1
    if (!map.has(p)) map.set(p, [])
    map.get(p)!.push(it)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([portata, items]) => ({ portata, items }))
}

export function WaiterSection({ ctx }: Props) {
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [billTables, setBillTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const seenReadyItemIdsRef = useRef<Set<string> | null>(null)

  const load = async () => {
    try {
      const [ready, { data: bills }] = await Promise.all([
        getReadyOrders(ctx.restaurantId),
        supabase
          .from('tables')
          .select('*')
          .eq('restaurant_id', ctx.restaurantId)
          .eq('status', 'bill-requested')
          .order('table_number', { ascending: true }),
      ])
      const readyItemIds = new Set(ready.flatMap((o) => (o.order_items ?? []).map((it) => it.id)))
      if (seenReadyItemIdsRef.current) {
        const hasNew = [...readyItemIds].some((id) => !seenReadyItemIdsRef.current!.has(id))
        if (hasNew) playNotificationSound()
      }
      seenReadyItemIdsRef.current = readyItemIds
      setReadyOrders(ready)
      setBillTables((bills as Table[]) ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`waiter-section-${ctx.restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${ctx.restaurantId}` },
        () => load()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => load())
      .subscribe()

    // Fallback di sicurezza nel caso il canale realtime non si connetta.
    const poll = setInterval(load, 5000)

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [ctx.restaurantId])

  async function deliverPortata(order: Order, portata: number) {
    const key = `${order.id}-${portata}-deliver`
    if (busyKey) return
    setBusyKey(key)
    // optimistic
    setReadyOrders((prev) =>
      prev.map((o) =>
        o.id !== order.id
          ? o
          : { ...o, order_items: (o.order_items ?? []).map((it) => (it.portata === portata ? { ...it, portata_delivered: true } : it)) }
      )
    )
    try {
      await markPortataDelivered(order.id, portata, ctx.userId)
    } catch (e: any) {
      setError(e.message ?? 'Errore')
      load()
    } finally {
      setBusyKey(null)
    }
  }

  async function pickUpPortata(order: Order, portata: number) {
    const key = `${order.id}-${portata}-pickup`
    if (busyKey) return
    setBusyKey(key)
    const items = order.order_items ?? []
    const orderDoneAfter = items.every((it) => it.portata === portata || it.picked_up_at)
    // optimistic
    setReadyOrders((prev) =>
      orderDoneAfter
        ? prev.filter((o) => o.id !== order.id)
        : prev.map((o) =>
            o.id !== order.id
              ? o
              : { ...o, order_items: (o.order_items ?? []).filter((it) => it.portata !== portata) }
          )
    )
    try {
      await markPortataPickedUp(order.id, portata, ctx.userId)
    } catch (e: any) {
      setError(e.message ?? 'Errore')
      load()
    } finally {
      setBusyKey(null)
    }
  }

  async function clearBill(table: Table) {
    setBillTables((prev) => prev.filter((t) => t.id !== table.id))
    try {
      await supabase.from('tables').update({ status: 'free' }).eq('id', table.id)
    } catch {
      load()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 tt-skeleton rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="tt-card h-24 rounded-2xl border border-tt-line shadow-tt" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">Errore</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-extrabold text-tt-ink">Cameriere</h2>
        <p className="text-xs text-tt-muted">
          {readyOrders.length} ordini pronti · {billTables.length} conti richiesti
        </p>
      </div>

      {/* Ready orders */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-tt-success/15 text-tt-success">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-tt-ink">Pronti da consegnare</p>
        </div>
        {readyOrders.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-8 text-center shadow-tt">
            <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
            <p className="text-sm text-tt-muted">Nessun ordine pronto da consegnare.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {readyOrders.map((o) => {
              const time = new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              const groups = groupByPortata(o.order_items ?? [])
              return (
                <div key={o.id} className="tt-card overflow-hidden rounded-2xl border border-tt-success/30 bg-tt-success/5 shadow-tt">
                  <div className="flex items-center gap-3 border-b border-tt-line/60 bg-tt-surfaceAlt/60 px-4 py-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-tt-success/15 text-tt-success">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-tt-ink">
                      {o.ordine ? `#${o.ordine}` : (o.table_code ?? `#${o.id.slice(-6)}`)}
                    </p>
                    {o.ordine && (
                      <>
                        <span className="text-xs text-tt-muted">·</span>
                        <p className="text-xs text-tt-muted">Tavolo {o.table_code ?? '—'}</p>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs text-tt-muted">
                      <Clock className="h-3 w-3" /> {time}
                    </span>
                  </div>
                  <div className="divide-y divide-tt-line/60">
                    {groups.map(({ portata, items }) => {
                      const state = getPortataState(items)
                      const label = portataLabels[portata] ?? `${portata}ª Portata`
                      const busyDeliver = busyKey === `${o.id}-${portata}-deliver`
                      const busyPickup = busyKey === `${o.id}-${portata}-pickup`
                      return (
                        <div key={portata} className="px-4 py-3">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-md bg-tt-pink/10 text-[11px] font-bold text-tt-pink">
                              {portata}
                            </span>
                            <p className="text-xs font-bold text-tt-ink">{label}</p>
                            <span
                              className={`tt-pill ml-auto ${
                                state === 'pronta' ? 'bg-tt-success/15 text-tt-success' : 'bg-tt-cyan/15 text-tt-cyan'
                              }`}
                            >
                              {state === 'pronta' ? 'Da consegnare' : 'Da ritirare'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {items.map((it, i) => (
                              <div key={it.id ?? i} className="flex w-full items-center gap-2 text-sm">
                                <span className="grid h-5 w-5 place-items-center rounded-md bg-tt-pink/10 text-[10px] font-bold text-tt-pink">
                                  {it.quantity}×
                                </span>
                                <span className="text-tt-ink">{it.menu_items?.name ?? 'Piatto'}</span>
                              </div>
                            ))}
                          </div>
                          {state === 'pronta' ? (
                            <button
                              onClick={() => deliverPortata(o, portata)}
                              disabled={busyDeliver}
                              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky px-4 py-1.5 text-xs font-bold text-white shadow-glow-emerald transition hover:scale-105 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Consegna portata
                            </button>
                          ) : (
                            <button
                              onClick={() => pickUpPortata(o, portata)}
                              disabled={busyPickup}
                              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-1.5 text-xs font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              Ritira piatti
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bill requested tables */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-tt-warning/15 text-tt-warning">
            <Receipt className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-tt-ink">Conto richiesto</p>
        </div>
        {billTables.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-8 text-center shadow-tt">
            <Bell className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
            <p className="text-sm text-tt-muted">Nessun tavolo ha richiesto il conto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {billTables.map((t) => (
              <div key={t.id} className="tt-card rounded-2xl border-2 border-tt-warning/30 bg-tt-warning/5 p-4 shadow-tt">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-tt-ink">Tavolo {t.label}</p>
                    <p className="flex items-center gap-1 text-[11px] text-tt-warning">
                      <Bell className="h-3 w-3" /> Conto richiesto
                    </p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-warning/15 text-tt-warning">
                    <Receipt className="h-4 w-4" />
                  </span>
                </div>
                <button
                  onClick={() => clearBill(t)}
                  className="mt-3 w-full rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-1.5 text-xs font-bold text-white shadow-glow-amber transition hover:scale-105"
                >
                  Libera tavolo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
