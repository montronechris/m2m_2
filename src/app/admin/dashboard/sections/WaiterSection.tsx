'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ShoppingCart, CheckCircle2, Bell, AlertCircle, UtensilsCrossed,
  Clock, CreditCard, PackageCheck,
} from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import {
  getReadyOrders, markPortataDelivered, markPortataPickedUp,
  getPortataState, type Order, type OrderItem,
} from '@/lib/admin-service'
import { playNotificationSound } from '@/lib/notificationSound'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props { ctx: RestaurantCtx; theme: ThemeMode }

type Tab = 'consegne' | 'pagamenti' | 'richieste'

type WaiterCall = {
  id: string
  table_id: string | null
  order_id: string | null
  type: string
  status: string
  created_at: string
  table_label?: string | null
  order_total?: number | null
  payment_method?: string | null
}

function groupByPortata(items: OrderItem[]) {
  const map = new Map<number, OrderItem[]>()
  for (const it of items) {
    const p = it.portata ?? 1
    if (!map.has(p)) map.set(p, [])
    map.get(p)!.push(it)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([portata, items]) => ({ portata, items }))
}

export function WaiterSection({ ctx }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.waiter
  const [tab, setTab] = useState<Tab>('consegne')
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<WaiterCall[]>([])
  const [helpCalls, setHelpCalls] = useState<WaiterCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const seenRef = useRef<Set<string> | null>(null)

  const loadCalls = async (type: 'payment' | 'call') => {
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('waiter_calls')
      .select('id, table_id, order_id, type, status, created_at')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('type', type)
      .eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const items: WaiterCall[] = data ?? []
    return Promise.all(
      items.map(async (r) => {
        let table_label: string | null = null
        let order_total: number | null = null
        let payment_method: string | null = null
        if (r.table_id) {
          const { data: t } = await supabase.from('tables').select('label').eq('id', r.table_id).maybeSingle()
          table_label = t?.label ?? null
        }
        if (r.order_id) {
          const { data: o } = await supabase.from('orders').select('total_cents, payment_method').eq('id', r.order_id).maybeSingle()
          order_total = o?.total_cents ?? null
          payment_method = o?.payment_method ?? null
        }
        return { ...r, table_label, order_total, payment_method }
      })
    )
  }

  const load = async () => {
    try {
      const [ready, pays, helps] = await Promise.all([
        getReadyOrders(ctx.restaurantId),
        loadCalls('payment'),
        loadCalls('call'),
      ])

      const ids = new Set([
        ...ready.flatMap((o) => (o.order_items ?? []).map((it) => it.id)),
        ...pays.map((r) => r.id),
        ...helps.map((r) => r.id),
      ])
      if (seenRef.current) {
        const hasNew = [...ids].some((id) => !seenRef.current!.has(id))
        if (hasNew) playNotificationSound()
      }
      seenRef.current = ids

      setReadyOrders(ready)
      setPayments(pays)
      setHelpCalls(helps)
    } catch (e: any) {
      setError(e.message ?? t.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`waiter-section-${ctx.restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${ctx.restaurantId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => load())
      // Nessun filtro server sulla tabella waiter_calls: con REPLICA IDENTITY di default
      // Postgres può non includere restaurant_id nel payload di UPDATE/DELETE, facendo
      // sparire l'evento filtrato lato realtime (stesso problema già risolto in
      // CallWaiterButton). Il filtro per ristorante resta comunque applicato da `load()`.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, () => load())
      .subscribe()
    const poll = setInterval(load, 5000)
    return () => { clearInterval(poll); supabase.removeChannel(channel) }
  }, [ctx.restaurantId])

  async function deliverPortata(order: Order, portata: number) {
    const key = `${order.id}-${portata}-deliver`
    if (busyKey) return
    setBusyKey(key)
    setReadyOrders((prev) => prev.map((o) => o.id !== order.id ? o : {
      ...o, order_items: (o.order_items ?? []).map((it) => it.portata === portata ? { ...it, portata_delivered: true } : it),
    }))
    try { await markPortataDelivered(order.id, portata, ctx.userId) }
    catch (e: any) { setError(e.message ?? t.error); load() }
    finally {
      // Tieni il lock ~700ms per evitare il ghost-click su mobile: il bottone
      // cambia da "Consegna" a "Ritira" nella stessa posizione e il click
      // ritardato del touch atterrerebbe sul pickup.
      setTimeout(() => setBusyKey(null), 700)
    }
  }

  async function pickUpPortata(order: Order, portata: number) {
    const key = `${order.id}-${portata}-pickup`
    if (busyKey) return
    setBusyKey(key)
    const items = order.order_items ?? []
    const orderDone = items.every((it) => it.portata === portata || it.picked_up_at)
    setReadyOrders((prev) => orderDone
      ? prev.filter((o) => o.id !== order.id)
      : prev.map((o) => o.id !== order.id ? o : { ...o, order_items: (o.order_items ?? []).filter((it) => it.portata !== portata) })
    )
    try { await markPortataPickedUp(order.id, portata, ctx.userId) }
    catch (e: any) { setError(e.message ?? t.error); load() }
    finally { setBusyKey(null) }
  }

  async function dismissCall(id: string, setter: React.Dispatch<React.SetStateAction<WaiterCall[]>>, orderId?: string | null, tableId?: string | null) {
    setter((prev) => prev.filter((r) => r.id !== id))
    try {
      await supabase.from('waiter_calls').update({ status: 'done' }).eq('id', id)
      if (orderId) {
        const paidAt = new Date().toISOString()
        // "Pagamento gestito" chiude l'intero conto del tavolo: potrebbero
        // esserci più ordini serviti e non ancora pagati (es. piatti extra
        // ordinati durante il servizio), non solo quello legato a questa
        // specifica chiamata cameriere.
        // Nota: 'completed' non è un valore valido dell'enum order_status
        // del DB (i valori ammessi sono pending/confirmed/cooking/ready/
        // served/cancelled/expired) — impostiamo solo paid_at, che è ciò
        // che il resto dell'app usa per considerare un ordine saldato.
        if (tableId) {
          await supabase
            .from('orders')
            .update({ paid_at: paidAt })
            .eq('table_id', tableId)
            .in('status', ['confirmed', 'cooking', 'ready', 'served'])
            .is('paid_at', null)
        } else {
          await supabase.from('orders').update({ paid_at: paidAt }).eq('id', orderId)
        }
        // Il pagamento chiude il conto del tavolo: il carrello ancora "pending"
        // (piatti aggiunti dal cliente e non ancora inviati in cucina) va svuotato.
        // NB: annulliamo (status: 'cancelled') invece di fare DELETE sulla riga
        // "orders" — un cliente potrebbe trovarsi in quello stesso istante sulla
        // pagina /confirm a confermare proprio quell'ordine "pending"; una DELETE
        // fisica gli farebbe ricevere un 404 "Ordine non trovato" a metà checkout.
        // Con lo status 'cancelled' la sua richiesta di conferma fallisce invece
        // con un errore coerente ("Ordine già confermato o non confermabile").
        if (tableId) {
          const { data: pendingOrders } = await supabase
            .from('orders').select('id').eq('table_id', tableId).eq('status', 'pending')
          const pendingIds = (pendingOrders ?? []).map((o) => o.id)
          if (pendingIds.length) {
            await supabase.from('order_items').delete().in('order_id', pendingIds)
            await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).in('id', pendingIds)
          }
        }
      }
    }
    catch { load() }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-6 w-24 tt-skeleton rounded-full" />
          <div className="h-3 w-40 tt-skeleton rounded-full" />
        </div>
        <div className="tt-card flex gap-1 rounded-2xl border border-tt-line p-1.5 shadow-tt">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 px-1">
              <div className="h-4 w-16 tt-skeleton rounded-full" />
              <div className="h-4 w-6 tt-skeleton rounded-full" />
            </div>
          ))}
        </div>
        <div className="tt-card h-24 rounded-2xl border border-tt-line shadow-tt" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">{t.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; count: number; Icon: React.ElementType; color: string }[] = [
    { id: 'consegne',  label: t.tabs.deliveries, count: readyOrders.length, Icon: CheckCircle2, color: 'text-tt-success' },
    { id: 'pagamenti', label: t.tabs.payments,   count: payments.length,    Icon: CreditCard,   color: 'text-tt-warning' },
    { id: 'richieste', label: t.tabs.requests,   count: helpCalls.length,   Icon: Bell,         color: 'text-tt-pink'    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
        <p className="text-xs text-tt-muted">
          {t.countF(readyOrders.length, payments.length, helpCalls.length)}
        </p>
      </div>

      {/* Tab bar */}
      <div className="tt-card flex gap-1 rounded-2xl border border-tt-line p-1.5 shadow-tt">
        {tabs.map(({ id, label, count, Icon, color }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-xs font-bold transition ${
                active ? 'bg-tt-surface shadow-sm text-tt-ink' : 'text-tt-muted hover:text-tt-ink'
              }`}
            >
              <span className={`flex items-center gap-1 ${active ? color : ''}`}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </span>
              <span className="grid min-w-[20px] place-items-center rounded-full bg-tt-surfaceAlt px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums text-tt-muted">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── TAB: CONSEGNE ─────────────────────────────────────────── */}
      {tab === 'consegne' && (
        readyOrders.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-12 text-center shadow-tt">
            <UtensilsCrossed className="mx-auto mb-3 h-9 w-9 text-tt-muted opacity-40" />
            <p className="text-sm text-tt-muted">{t.emptyDeliveries}</p>
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
                        <p className="text-xs text-tt-muted">{t.table} {o.table_code ?? '—'}</p>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs text-tt-muted">
                      <Clock className="h-3 w-3" /> {time}
                    </span>
                  </div>
                  <div className="divide-y divide-tt-line/60">
                    {groups.map(({ portata, items }) => {
                      const state = getPortataState(items)
                      const label = t.portataFallback(portata)
                      const busyDeliver = busyKey === `${o.id}-${portata}-deliver`
                      // Anti ghost-click: se il deliver è in corso/cooldown, blocca anche il pickup
                      const busyPickup  = busyKey === `${o.id}-${portata}-pickup` || busyKey === `${o.id}-${portata}-deliver`
                      return (
                        <div key={portata} className="px-4 py-3">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-md bg-tt-pink/10 text-[11px] font-bold text-tt-pink">{portata}</span>
                            <p className="text-xs font-bold text-tt-ink">{label}</p>
                            <span className={`tt-pill ml-auto ${state === 'pronta' ? 'bg-tt-success/15 text-tt-success' : 'bg-tt-cyan/15 text-tt-cyan'}`}>
                              {state === 'pronta' ? t.toDeliver : t.toPickup}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {items.map((it, i) => (
                              <div key={it.id ?? i} className="flex items-center gap-2 text-sm">
                                <span className="grid h-5 w-5 place-items-center rounded-md bg-tt-pink/10 text-[10px] font-bold text-tt-pink">{it.quantity}×</span>
                                <span className="text-tt-ink">{it.menu_items?.name ?? t.dish}</span>
                              </div>
                            ))}
                          </div>
                          {state === 'pronta' ? (
                            <button key={`${portata}-deliver`} onClick={() => deliverPortata(o, portata)} disabled={busyDeliver}
                              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky px-4 py-1.5 text-xs font-bold text-white shadow-glow-emerald transition hover:scale-105 disabled:opacity-60">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t.deliverCourse}
                            </button>
                          ) : (
                            <button key={`${portata}-pickup`} onClick={() => pickUpPortata(o, portata)} disabled={busyPickup}
                              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-1.5 text-xs font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60">
                              <PackageCheck className="h-3.5 w-3.5" /> {t.pickupCourse}
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
        )
      )}

      {/* ── TAB: PAGAMENTI ────────────────────────────────────────── */}
      {tab === 'pagamenti' && (
        payments.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-12 text-center shadow-tt">
            <CreditCard className="mx-auto mb-3 h-9 w-9 text-tt-muted opacity-40" />
            <p className="text-sm text-tt-muted">{t.emptyPayments}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {payments.map((r) => {
              const time = new Date(r.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              const total = r.order_total != null ? (r.order_total / 100).toFixed(2) : null
              const payIcon = r.payment_method === 'card' ? '💳' : '💵'
              const payLabel = r.payment_method === 'card' ? t.card : t.cash
              return (
                <div key={r.id} className="tt-card overflow-hidden rounded-2xl border-2 border-tt-warning/40 bg-tt-warning/5 shadow-tt">
                  <div className="flex items-center gap-3 border-b border-tt-line/60 bg-tt-surfaceAlt/60 px-4 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-warning/15 text-tt-warning">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-tt-ink">{r.table_label ? `${t.table} ${r.table_label}` : t.tableDash}</p>
                      <div className="flex items-center gap-2">
                        {total && <p className="text-xs text-tt-muted">€{total}</p>}
                        {r.payment_method && (
                          <span className="text-xs font-semibold text-tt-muted">{payIcon} {payLabel}</span>
                        )}
                      </div>
                    </div>
                    <span className="ml-auto flex items-center gap-1 text-xs text-tt-muted">
                      <Clock className="h-3 w-3" /> {time}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-tt-warning">
                      <Bell className="h-3 w-3 animate-pulse" /> {t.readyToPay}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => dismissCall(r.id, setPayments, r.order_id, r.table_id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky py-1.5 text-xs font-bold text-white shadow-glow-emerald transition hover:scale-105">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t.paymentHandled}
                      </button>
                      <button onClick={async () => {
                        setPayments((prev) => prev.filter((x) => x.id !== r.id))
                        await supabase.from('waiter_calls').delete().eq('id', r.id)
                      }}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-100">
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── TAB: RICHIESTE AIUTO ──────────────────────────────────── */}
      {tab === 'richieste' && (
        helpCalls.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-12 text-center shadow-tt">
            <Bell className="mx-auto mb-3 h-9 w-9 text-tt-muted opacity-40" />
            <p className="text-sm text-tt-muted">{t.emptyRequests}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {helpCalls.map((r) => {
              const time = new Date(r.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={r.id} className="tt-card overflow-hidden rounded-2xl border-2 border-tt-pink/40 bg-tt-pink/5 shadow-tt">
                  <div className="flex items-center gap-3 border-b border-tt-line/60 bg-tt-surfaceAlt/60 px-4 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-pink/15 text-tt-pink">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-tt-ink">{r.table_label ? `${t.table} ${r.table_label}` : t.tableDash}</p>
                      <p className="text-xs text-tt-muted">{t.assistanceRequest}</p>
                    </div>
                    <span className="ml-auto flex items-center gap-1 text-xs text-tt-muted">
                      <Clock className="h-3 w-3" /> {time}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-tt-pink">
                      <Bell className="h-3 w-3 animate-pulse" /> {t.needsAssistance}
                    </p>
                    <button onClick={() => dismissCall(r.id, setHelpCalls)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky py-1.5 text-xs font-bold text-white shadow-glow-emerald transition hover:scale-105">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t.requestHandled}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
