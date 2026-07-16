'use client'

// ─── CRONOLOGIA OPERAZIONI ─────────────────────────────────────────────────────
//
// Modal riusabile che mostra lo storico delle operazioni gestite dallo staff,
// con il nome di chi le ha eseguite.
//   variant="waiter"  → assistenze, pagamenti e piatti consegnati (sala)
//   variant="kitchen" → preparazioni avviate e portate pronte (cucina)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import {
  History, X, AlertCircle, Loader2, Bell, CreditCard,
  PackageCheck, ChefHat, CheckCircle2, UserRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/components/i18n/I18nProvider'

type Variant = 'waiter' | 'kitchen'
type OpKind = 'help' | 'payment' | 'deliver' | 'cooking' | 'ready'

type OpEvent = {
  id: string
  kind: OpKind
  who: string | null
  at: string
  table: string | null
  portata: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  restaurantId: string
  variant: Variant
}

export function OperationsHistoryModal({ open, onClose, restaurantId, variant }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.opsHistory
  const [events, setEvents] = useState<OpEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const evts =
          variant === 'waiter'
            ? await loadWaiterEvents(restaurantId)
            : await loadKitchenEvents(restaurantId)
        if (!cancelled) setEvents(evts)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t.loadError)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, restaurantId, variant])

  if (!open) return null

  const title = variant === 'waiter' ? t.waiterTitle : t.kitchenTitle
  const subtitle = variant === 'waiter' ? t.waiterSubtitle : t.kitchenSubtitle

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5" />
            <div>
              <h3 className="font-serif text-lg font-extrabold leading-tight">{title}</h3>
              <p className="text-xs text-white/80">{subtitle}</p>
            </div>
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
            <div className="grid place-items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-tt-pink" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-tt-danger" />
              <p className="text-sm text-tt-muted">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center">
              <History className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
              <p className="text-sm text-tt-muted">{t.empty}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <EventRow key={ev.id} ev={ev} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const KIND_META: Record<OpKind, { Icon: React.ElementType; cls: string; labelKey: 'kindHelp' | 'kindPayment' | 'kindDeliver' | 'kindCooking' | 'kindReady' }> = {
  help:    { Icon: Bell,         cls: 'bg-tt-pink/15 text-tt-pink',       labelKey: 'kindHelp' },
  payment: { Icon: CreditCard,   cls: 'bg-tt-warning/15 text-tt-warning', labelKey: 'kindPayment' },
  deliver: { Icon: PackageCheck, cls: 'bg-tt-success/15 text-tt-success', labelKey: 'kindDeliver' },
  cooking: { Icon: ChefHat,      cls: 'bg-tt-cyan/15 text-tt-cyan',       labelKey: 'kindCooking' },
  ready:   { Icon: CheckCircle2, cls: 'bg-tt-success/15 text-tt-success', labelKey: 'kindReady' },
}

function EventRow({ ev, t }: { ev: OpEvent; t: ReturnType<typeof useI18n>['tr']['admin']['opsHistory'] }) {
  const meta = KIND_META[ev.kind]
  const Icon = meta.Icon
  const date = new Date(ev.at)
  const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const course =
    ev.kind === 'deliver' || ev.kind === 'ready'
      ? ev.portata === 0
        ? t.drinks
        : t.course(ev.portata ?? 1)
      : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-tt-line p-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-bold text-tt-ink">{t[meta.labelKey]}</p>
          {ev.table && (
            <span className="tt-pill bg-tt-surfaceAlt2 text-tt-muted">
              {t.table} {ev.table}
            </span>
          )}
          {course && <span className="text-xs text-tt-muted">· {course}</span>}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-tt-muted">
          <UserRound className="h-3 w-3" />
          <span className="font-semibold text-tt-ink">{ev.who || t.unknown}</span>
          <span>· {dateStr} {timeStr}</span>
        </p>
      </div>
    </div>
  )
}

// ─── Data loaders ──────────────────────────────────────────────────────────────

async function loadWaiterEvents(restaurantId: string): Promise<OpEvent[]> {
  const [tablesRes, ordersRes, callsRes] = await Promise.all([
    supabase.from('tables').select('id, label').eq('restaurant_id', restaurantId),
    supabase
      .from('orders')
      .select('id, table_id, table_code, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('waiter_calls')
      .select('id, table_id, type, handled_by_name, handled_at')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'done')
      .not('handled_at', 'is', null)
      .order('handled_at', { ascending: false })
      .limit(200),
  ])

  const tableMap = new Map<string, string>((tablesRes.data ?? []).map((r: any) => [r.id, r.label]))
  const orders = (ordersRes.data ?? []) as any[]
  const orderMap = new Map<string, any>(orders.map((o) => [o.id, o]))
  const orderIds = orders.map((o) => o.id)

  const events: OpEvent[] = []

  for (const c of (callsRes.data ?? []) as any[]) {
    if (!c.handled_at) continue
    events.push({
      id: `call-${c.id}`,
      kind: c.type === 'payment' ? 'payment' : 'help',
      who: c.handled_by_name ?? null,
      at: c.handled_at,
      table: c.table_id ? tableMap.get(c.table_id) ?? null : null,
      portata: null,
    })
  }

  if (orderIds.length) {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, order_id, portata, delivered_at, delivered_by_name')
      .in('order_id', orderIds)
      .not('delivered_at', 'is', null)
      .order('delivered_at', { ascending: false })
      .limit(400)
    const seen = new Set<string>()
    for (const it of (items ?? []) as any[]) {
      // Una consegna avviene per portata: tutti gli item della stessa portata
      // condividono delivered_at. Raggruppiamo per non duplicare la riga.
      const key = `${it.order_id}|${it.portata ?? 1}|${it.delivered_at}`
      if (seen.has(key)) continue
      seen.add(key)
      const ord = orderMap.get(it.order_id)
      const table = ord
        ? (ord.table_id ? tableMap.get(ord.table_id) : null) ?? ord.table_code ?? null
        : null
      events.push({
        id: `deliver-${it.id}`,
        kind: 'deliver',
        who: it.delivered_by_name ?? null,
        at: it.delivered_at,
        table,
        portata: it.portata ?? null,
      })
    }
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1))
  return events.slice(0, 200)
}

async function loadKitchenEvents(restaurantId: string): Promise<OpEvent[]> {
  const [tablesRes, ordersRes] = await Promise.all([
    supabase.from('tables').select('id, label').eq('restaurant_id', restaurantId),
    supabase
      .from('orders')
      .select('id, table_id, table_code, cooking_by_name, cooking_at, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const tableMap = new Map<string, string>((tablesRes.data ?? []).map((r: any) => [r.id, r.label]))
  const orders = (ordersRes.data ?? []) as any[]
  const orderMap = new Map<string, any>(orders.map((o) => [o.id, o]))
  const orderIds = orders.map((o) => o.id)

  const events: OpEvent[] = []

  for (const o of orders) {
    if (o.cooking_at && o.cooking_by_name) {
      events.push({
        id: `cooking-${o.id}`,
        kind: 'cooking',
        who: o.cooking_by_name,
        at: o.cooking_at,
        table: o.table_id ? tableMap.get(o.table_id) ?? o.table_code ?? null : o.table_code ?? null,
        portata: null,
      })
    }
  }

  if (orderIds.length) {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, order_id, portata, prepared_at, prepared_by_name')
      .in('order_id', orderIds)
      .not('prepared_at', 'is', null)
      .order('prepared_at', { ascending: false })
      .limit(400)
    const seen = new Set<string>()
    for (const it of (items ?? []) as any[]) {
      const key = `${it.order_id}|${it.portata ?? 1}|${it.prepared_at}`
      if (seen.has(key)) continue
      seen.add(key)
      const ord = orderMap.get(it.order_id)
      const table = ord
        ? (ord.table_id ? tableMap.get(ord.table_id) : null) ?? ord.table_code ?? null
        : null
      events.push({
        id: `ready-${it.id}`,
        kind: 'ready',
        who: it.prepared_by_name ?? null,
        at: it.prepared_at,
        table,
        portata: it.portata ?? null,
      })
    }
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1))
  return events.slice(0, 200)
}
