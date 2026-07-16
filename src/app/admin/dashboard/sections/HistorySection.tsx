'use client'

// ─── SEZIONE: STORICO ORDINI ───────────────────────────────────────────────────
//
// Elenco degli ordini passati con filtri e totali.
// Stato: carica lo storico e applica i filtri lato client (useMemo).
// ──────────────────────────────────────────────────────────────────────────────


import { useEffect, useState, useMemo } from 'react'
import { History, CheckCircle2, XCircle, AlertCircle, Filter, TrendingUp } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { getHistoryOrders, type Order } from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

export function HistorySection({ ctx }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.history
  const statusMeta: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    served: { label: t.statusServed, cls: 'bg-tt-success/15 text-tt-success', icon: CheckCircle2 },
    delivered: { label: t.statusDelivered, cls: 'bg-tt-success/15 text-tt-success', icon: CheckCircle2 },
    cancelled: { label: t.statusCancelled, cls: 'bg-tt-danger/15 text-tt-danger', icon: XCircle },
  }
  const filters: { id: string; label: string }[] = [
    { id: 'all', label: t.filterAll },
    { id: 'served', label: t.filterServed },
    { id: 'cancelled', label: t.filterCancelled },
  ]
  const [filter, setFilter] = useState('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getHistoryOrders(ctx.restaurantId)
      .then((data) => {
        if (active) setOrders(data)
      })
      .catch((e) => {
        if (active) setError(e.message ?? t.errorLoad)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  const visible = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'served' || o.status === 'delivered')
    const cancelled = orders.filter((o) => o.status === 'cancelled')
    const revenue = delivered.reduce((s, o) => s + (o.total_cents ?? 0), 0)
    return {
      total: orders.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      revenue: revenue / 100,
    }
  }, [orders])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 tt-skeleton rounded-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tt-card h-20 rounded-2xl border border-tt-line shadow-tt" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tt-card h-16 rounded-2xl border border-tt-line shadow-tt" />
        ))}
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
        <p className="text-xs text-tt-muted">{t.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-tt-pink/15 text-tt-pink">
              <History className="h-4 w-4" />
            </span>
          </div>
          <p className="text-lg font-extrabold text-tt-ink">{stats.total}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{t.statTotal}</p>
        </div>
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-tt-success/15 text-tt-success">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-lg font-extrabold text-tt-ink">{stats.delivered}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{t.statServed}</p>
        </div>
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-tt-danger/15 text-tt-danger">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="text-lg font-extrabold text-tt-ink">{stats.cancelled}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{t.statCancelled}</p>
        </div>
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-tt-success/15 text-tt-success">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-lg font-extrabold text-tt-ink">€{stats.revenue.toFixed(0)}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{t.statRevenue}</p>
        </div>
      </div>

      {/* Filters */}
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

      {/* List */}
      {visible.length === 0 ? (
        <div className="tt-card rounded-2xl border border-tt-line p-8 text-center shadow-tt">
          <Filter className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-40" />
          <p className="text-sm text-tt-muted">{t.empty}</p>
        </div>
      ) : (
        <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
          {visible.map((o, i) => {
            const st = statusMeta[o.status] ?? statusMeta['served']
            const StatusIcon = st.icon
            const total = (o.total_cents / 100).toFixed(2)
            const date = new Date(o.created_at).toLocaleDateString(t.locale, { day: '2-digit', month: 'short' })
            const time = new Date(o.created_at).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })
            const items = (o as any).order_items ?? []
            const kitchenNames = [...new Set([(o as any).cooking_by_name, ...items.map((it: any) => it.prepared_by_name)].filter(Boolean))] as string[]
            const serviceNames = [...new Set(items.flatMap((it: any) => [it.delivered_by_name, it.picked_up_by_name]).filter(Boolean))] as string[]
            const paymentName = (o as any).paid_by_name as string | null
            const staffLines: { label: string; names: string[] }[] = [
              { label: 'Cucina', names: kitchenNames },
              { label: 'Servizio', names: serviceNames },
              ...(paymentName ? [{ label: 'Pagamento', names: [paymentName] }] : []),
            ].filter((s) => s.names.length > 0)
            return (
              <div
                key={o.id}
                className={`flex items-center gap-3 p-3.5 transition-colors hover:bg-tt-surfaceAlt2 ${i > 0 ? 'border-t border-tt-line' : ''}`}
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${st.cls}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-tt-ink">#{o.ordine ?? o.id.slice(-6)}</p>
                    <span className={`tt-pill ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-tt-muted">
                    {date} · {time} · {(o as any).payment_method ?? '—'}

                  </p>
                  {staffLines.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {staffLines.map((s) => (
                        <span key={s.label} className="text-[11px] text-tt-muted">
                          <span className="font-semibold">{s.label}:</span> {s.names.join(', ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-tt-ink">€{total}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
