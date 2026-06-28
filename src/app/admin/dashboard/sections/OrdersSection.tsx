'use client'

import { useEffect, useRef, useState } from 'react'
import { ShoppingCart, Clock, CheckCircle2, ChefHat, Filter, AlertCircle, History, X, Loader2, Pin } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import {
  getOrders,
  getHistoryOrders,
  markPortataReady,
  updateOrderStatus,
  getPortataState,
  type Order,
  type OrderItem,
  type PortataState,
} from '@/lib/admin-service'
import { playNotificationSound } from '@/lib/notificationSound'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

// Map DB status → UI meta (usata solo per la cronologia, ormai a livello ordine).
const statusMeta: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'In attesa', cls: 'bg-tt-muted/15 text-tt-muted', icon: Clock },
  confirmed: { label: 'Confermato', cls: 'bg-tt-cyan/15 text-tt-cyan', icon: CheckCircle2 },
  preparing: { label: 'In preparazione', cls: 'bg-tt-warning/15 text-tt-warning', icon: ChefHat },
  cooking: { label: 'In cottura', cls: 'bg-tt-pink/15 text-tt-pink', icon: ChefHat },
  ready: { label: 'Pronto', cls: 'bg-tt-success/15 text-tt-success', icon: CheckCircle2 },
  served: { label: 'Servito', cls: 'bg-tt-muted/15 text-tt-muted', icon: CheckCircle2 },
  delivered: { label: 'Servito', cls: 'bg-tt-muted/15 text-tt-muted', icon: CheckCircle2 },
  cancelled: { label: 'Annullato', cls: 'bg-tt-danger/15 text-tt-danger', icon: AlertCircle },
}

const portataLabels: Record<number, string> = { 1: 'Prima portata', 2: 'Seconda portata', 3: 'Terza portata', 4: 'Quarta portata' }

type ExtendedPortataState = PortataState | 'in_arrivo'

const portataStateMeta: Record<ExtendedPortataState, { label: string; cls: string; icon: typeof Clock }> = {
  in_arrivo:       { label: 'In arrivo',          cls: 'bg-tt-cyan/15 text-tt-cyan',      icon: Clock },
  in_preparazione: { label: 'In preparazione',    cls: 'bg-tt-warning/15 text-tt-warning', icon: ChefHat },
  pronta:          { label: 'Pronta',             cls: 'bg-tt-success/15 text-tt-success', icon: CheckCircle2 },
  consegnata:      { label: 'Consegnata',         cls: 'bg-tt-muted/15 text-tt-muted',    icon: CheckCircle2 },
  ritirata:        { label: 'Ritirata',           cls: 'bg-tt-muted/15 text-tt-muted',    icon: CheckCircle2 },
}

const filters: { id: string; label: string }[] = [
  { id: 'all', label: 'Tutti' },
  { id: 'preparing', label: 'In preparazione' },
  { id: 'ready', label: 'Pronti' },
]

/** Raggruppa gli item per portata (numero crescente). */
function groupByPortata(items: OrderItem[]): { portata: number; items: OrderItem[] }[] {
  const map = new Map<number, OrderItem[]>()
  for (const it of items) {
    const p = it.portata ?? 1
    if (!map.has(p)) map.set(p, [])
    map.get(p)!.push(it)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([portata, items]) => ({ portata, items }))
}

/** La portata attiva in cucina: la più bassa non ancora ritirata. */
function getActivePortataGroup(items: OrderItem[]) {
  const groups = groupByPortata(items)
  return groups.find((g) => getPortataState(g.items) !== 'ritirata') ?? null
}

export function OrdersSection({ ctx }: Props) {
  const [filter, setFilter] = useState<string>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Order[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const seenOrderIdsRef = useRef<Set<string> | null>(null)

  const pinnedStorageKey = `tt-orders-pinned-${ctx.restaurantId}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(pinnedStorageKey)
      setPinnedIds(raw ? JSON.parse(raw) : [])
    } catch {
      setPinnedIds([])
    }
  }, [pinnedStorageKey])

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem(pinnedStorageKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  async function openHistory() {
    setShowHistory(true)
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await getHistoryOrders(ctx.restaurantId)
      setHistory(data)
    } catch (e: any) {
      setHistoryError(e.message ?? 'Errore nel caricamento cronologia')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Load from DATABASE via admin-service, then keep in sync via realtime
  useEffect(() => {
    let active = true

    function refresh() {
      getOrders(ctx.restaurantId)
        .then((data) => {
          if (active) {
            const kitchenOrders = data.filter(
              (o) =>
                // 'pending' = il cliente ha ancora il carrello aperto e non ha
                // confermato l'ordine: non deve arrivare in cucina, a prescindere
                // dal fatto che abbia già piatti dentro o no.
                o.status !== 'pending' &&
                o.status !== 'served' &&
                o.status !== 'delivered' &&
                o.status !== 'cancelled'
            )
            const currentIds = new Set(kitchenOrders.map((o) => o.id))
            if (seenOrderIdsRef.current) {
              const hasNew = kitchenOrders.some((o) => !seenOrderIdsRef.current!.has(o.id))
              if (hasNew) playNotificationSound()
            }
            seenOrderIdsRef.current = currentIds
            setOrders(kitchenOrders)
            setLoading(false)
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message ?? 'Errore nel caricamento ordini')
            setLoading(false)
          }
        })
    }

    refresh()

    const channel = supabase
      .channel(`orders-section-${ctx.restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${ctx.restaurantId}` },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => refresh()
      )
      .subscribe()

    // Fallback di sicurezza: se il canale realtime non si connette (es. timing
    // della sessione), questo polling garantisce comunque l'aggiornamento.
    const poll = setInterval(refresh, 5000)

    return () => {
      active = false
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [ctx.restaurantId])

  function activeGroupState(o: Order): PortataState | null {
    const group = getActivePortataGroup(o.order_items ?? [])
    return group ? getPortataState(group.items) : null
  }

  const filtered =
    filter === 'all'
      ? orders
      : orders.filter((o) =>
          filter === 'preparing' ? activeGroupState(o) === 'in_preparazione' : ['pronta', 'consegnata'].includes(activeGroupState(o) ?? '')
        )

  const visible = [...filtered].sort((a, b) => {
    const pa = pinnedIds.includes(a.id) ? 1 : 0
    const pb = pinnedIds.includes(b.id) ? 1 : 0
    if (pa !== pb) return pb - pa
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  async function markReady(o: Order, portata: number) {
    // optimistic update
    setOrders((prev) =>
      prev.map((x) =>
        x.id !== o.id
          ? x
          : { ...x, order_items: (x.order_items ?? []).map((it) => (it.portata === portata ? { ...it, portata_completed: true } : it)) }
      )
    )
    try {
      await markPortataReady(o.id, portata)
    } catch (e: any) {
      setOrders((prev) =>
        prev.map((x) =>
          x.id !== o.id
            ? x
            : { ...x, order_items: (x.order_items ?? []).map((it) => (it.portata === portata ? { ...it, portata_completed: false } : it)) }
        )
      )
      setError(e.message ?? 'Errore aggiornamento portata')
    }
  }

  if (loading) return <OrdersSkeleton />
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">Ordini</h2>
          <p className="text-xs text-tt-muted">
            {visible.length} ordini · {orders.length} attivi
          </p>
        </div>
        <button
          onClick={openHistory}
          className="flex items-center gap-1.5 rounded-full border border-tt-line bg-white px-4 py-2 text-sm font-bold text-tt-ink transition hover:bg-tt-surfaceAlt2"
        >
          <History className="h-4 w-4" /> Cronologia
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.id
                ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber'
                : 'border border-tt-line bg-white text-tt-muted hover:text-tt-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((o) => {
          const total = (o.total_cents / 100).toFixed(2)
          const time = new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          const items = o.order_items ?? []
          const totalPortate = groupByPortata(items).length
          const activeGroup = getActivePortataGroup(items)
          const rawState = activeGroup ? getPortataState(activeGroup.items) : null
          const state: ExtendedPortataState | null = rawState === 'in_preparazione' && (o.status === 'confirmed' || o.status === 'pending')
            ? 'in_arrivo'
            : rawState
          const st = state ? portataStateMeta[state] : statusMeta['pending']
          const StatusIcon = st.icon
          const pinned = pinnedIds.includes(o.id)
          return (
            <div key={o.id} className={`tt-card overflow-hidden rounded-2xl shadow-tt ${pinned ? 'ring-2 ring-brand-amber' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 border-b border-tt-line bg-tt-surfaceAlt/60 px-4 py-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-tt-surfaceAlt2 text-tt-ink">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-tt-ink">
                    {o.ordine ? `#${o.ordine}` : (o.table_code ?? `#${o.id.slice(-6)}`)}
                  </p>
                  {o.table_code && o.ordine && (
                    <p className="shrink-0 text-xs text-tt-muted">· Tavolo {o.table_code}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-tt-muted">{time}</span>
                <span className={`tt-pill shrink-0 ${st.cls}`}>
                  <StatusIcon className="h-3 w-3" /> {st.label}
                </span>
                <button
                  onClick={() => togglePin(o.id)}
                  title={pinned ? 'Sblocca ordine' : 'Fissa in alto'}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${
                    pinned ? 'bg-brand-amber text-white' : 'bg-white text-tt-muted hover:text-tt-ink'
                  }`}
                >
                  <Pin className={`h-3.5 w-3.5 ${pinned ? 'fill-current' : ''}`} />
                </button>
              </div>
              <div className="px-4 py-3">
                {activeGroup ? (
                  <>
                    <p className="mb-1.5 text-xs font-bold text-tt-muted">
                      {portataLabels[activeGroup.portata] ?? `${activeGroup.portata}ª portata`}
                      {totalPortate > 1 ? ` (${activeGroup.portata}/${totalPortate})` : ''}
                    </p>
                    <div className="space-y-1">
                      {activeGroup.items.map((it, i) => (
                        <div key={it.id ?? i} className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-tt-pink/10 text-[10px] font-bold text-tt-pink">
                            {it.quantity}×
                          </span>
                          <span className="truncate text-tt-ink">{it.menu_items?.name ?? 'Piatto'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-tt-muted">Nessun dettaglio disponibile</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-tt-line bg-tt-surfaceAlt/60 px-4 py-2.5">
                <p className="text-sm font-bold text-tt-ink">€{total}</p>
                {activeGroup && state === 'in_arrivo' && (
                  <button
                    onClick={async () => {
                      await updateOrderStatus(o.id, 'cooking')
                    }}
                    className="rounded-full bg-gradient-to-r from-tt-cyan to-blue-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-105"
                  >
                    Inizia preparazione
                  </button>
                )}
                {activeGroup && state === 'in_preparazione' && (
                  <button
                    onClick={() => markReady(o, activeGroup.portata)}
                    className="rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-1.5 text-xs font-bold text-white shadow-glow-amber shadow-sm transition hover:scale-105"
                  >
                    Segna pronta
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div className="py-12 text-center text-sm text-tt-muted">
            <Filter className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nessun ordine in questa categoria.
          </div>
        )}
      </div>

      <HistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        loading={historyLoading}
        error={historyError}
      />
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-32 tt-skeleton rounded-full" />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 tt-skeleton rounded-full" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-8 w-8 tt-skeleton rounded-lg" />
            <div className="h-4 w-20 tt-skeleton rounded-full" />
            <div className="ml-auto h-5 w-24 tt-skeleton rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 tt-skeleton rounded-full" />
            <div className="h-3 w-1/2 tt-skeleton rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryModal({
  open,
  onClose,
  history,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  history: Order[]
  loading: boolean
  error: string | null
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-tt-line bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h3 className="font-serif text-lg font-extrabold">Cronologia ordini</h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/20 transition hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-tt-pink" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-tt-danger" />
              <p className="text-sm text-tt-muted">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <History className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
              <p className="text-sm text-tt-muted">Nessun ordine nello storico</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((o) => {
                const st = statusMeta[o.status] ?? statusMeta['served']
                const StatusIcon = st.icon
                const total = (o.total_cents / 100).toFixed(2)
                const date = new Date(o.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                const time = new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={o.id} className="flex items-center gap-3 rounded-xl border border-tt-line p-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${st.cls}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-tt-ink">
                          {o.ordine ? `#${o.ordine}` : (o.table_code ?? `#${o.id.slice(-6)}`)}
                        </p>
                        <span className={`tt-pill ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-tt-muted">
                        {date} · {time}{o.table_code && o.ordine ? ` · Tavolo ${o.table_code}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-tt-ink">€{total}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
