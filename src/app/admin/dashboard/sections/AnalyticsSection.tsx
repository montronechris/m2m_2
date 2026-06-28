'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { TrendingUp, Sparkles, RefreshCw, Utensils, Star, CreditCard, Clock, AlertCircle } from 'lucide-react'
import type { RestaurantCtx, SectionId, ThemeMode } from '../types'
import { getAnalytics, getTopDishes, type AnalyticsData } from '@/lib/admin-service'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
  onSectionChange: (s: SectionId) => void
}

export function AnalyticsSection({ ctx }: Props) {
  const [period, setPeriod] = useState<'7' | '30'>('7')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [topRange, setTopRange] = useState<'1h' | '3h' | '1d' | '3d' | '7d' | '30d'>('7d')
  const [topDishes, setTopDishes] = useState<{ name: string; v: number }[]>([])
  const [topLoading, setTopLoading] = useState(true)

  // Load from DATABASE via admin-service
  useEffect(() => {
    let active = true
    getAnalytics(ctx.restaurantId, period as unknown as 7 | 30)
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e.message ?? 'Errore nel caricamento analytics')
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId, period])

  // Load top dishes with dedicated time filter
  useEffect(() => {
    let active = true
    setTopLoading(true)
    getTopDishes(ctx.restaurantId, topRange)
      .then((d) => {
        if (active) setTopDishes(d)
      })
      .catch(() => {
        if (active) setTopDishes([])
      })
      .finally(() => {
        if (active) setTopLoading(false)
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId, topRange])

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">Errore</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  if (!data) return <AnalyticsSkeleton />

  const kpis = [
    { icon: TrendingUp, label: 'Incasso', value: data.kpis.revenue.value, trend: data.kpis.revenue.trend, cls: 'bg-tt-success/15 text-tt-success' },
    { icon: Utensils, label: 'Ordini', value: data.kpis.orders.value, trend: data.kpis.orders.trend, cls: 'bg-tt-pink/15 text-tt-pink' },
    { icon: CreditCard, label: 'Scontrino medio', value: data.kpis.avgTicket.value, trend: data.kpis.avgTicket.trend, cls: 'bg-tt-pinkSoft/15 text-tt-pinkSoft' },
    { icon: Star, label: 'Recensioni', value: data.kpis.reviews.value, trend: data.kpis.reviews.trend, cls: 'bg-tt-warning/15 text-tt-warning' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-extrabold text-tt-ink">Analytics</h2>
            <p className="text-xs text-tt-muted">Ultimi {period} giorni</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 rounded-full border border-tt-line bg-white p-1">
            {(['7', '30'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${period === p ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white' : 'text-tt-muted'}`}
              >
                {p}g
              </button>
            ))}
          </div>
          <button className="grid h-8 w-8 place-items-center rounded-full border border-tt-line bg-white text-tt-muted transition hover:text-tt-ink" title="Aggiorna">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
              <div className="mb-2 flex items-center justify-between">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${k.cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {k.trend && <span className="tt-pill tt-pill-success">{k.trend}</span>}
              </div>
              <p className="text-lg font-extrabold text-tt-ink">{k.value}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{k.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-tt-ink">Incassi giornalieri</p>
            {data.kpis.revenue.trend && <span className="tt-pill tt-pill-success">{data.kpis.revenue.trend}</span>}
          </div>
          {data.revenueByDay.some((d) => d.v > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.revenueByDay} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.19 60)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.19 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 60)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0.01 60)', fontSize: 12 }} formatter={(v: number) => [`€${v}`, 'Incasso']} />
                <Area type="monotone" dataKey="v" stroke="oklch(0.55 0.21 55)" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Nessun incasso nel periodo selezionato" />
          )}
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-tt-pink/10 px-3 py-1.5 text-xs text-tt-pink">
            <Sparkles className="h-3 w-3" /> {data.insights.revenue}
          </div>
        </div>

        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-tt-ink">Orari di punta</p>
            <Clock className="h-4 w-4 text-tt-muted" />
          </div>
          {data.hourly.some((d) => d.v > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.hourly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 60)" vertical={false} />
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0.01 60)', fontSize: 12 }} formatter={(v: number) => [`${v} ordini`, '']} />
                <Bar dataKey="v" fill="oklch(0.64 0.21 38)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Nessun ordine nel periodo selezionato" />
          )}
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-tt-pink/10 px-3 py-1.5 text-xs text-tt-pink">
            <Sparkles className="h-3 w-3" /> {data.insights.hourly}
          </div>
        </div>

        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-tt-ink">Piatti più ordinati</p>
            <div className="flex flex-wrap gap-1 rounded-full border border-tt-line bg-tt-surfaceAlt p-0.5">
              {([
                ['1h', '1h'],
                ['3h', '3h'],
                ['1d', '1g'],
                ['3d', '3g'],
                ['7d', '7g'],
                ['30d', '30g'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTopRange(key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    topRange === key ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white' : 'text-tt-muted hover:text-tt-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {topLoading ? (
            <div className="grid h-[180px] place-items-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-tt-pink/30 border-t-tt-pink" />
            </div>
          ) : topDishes.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topDishes} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0.01 60)', fontSize: 12 }} formatter={(v: number) => [`${v} ordini`, '']} />
                <Bar dataKey="v" fill="oklch(0.62 0.22 18)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Nessun piatto ordinato nel periodo selezionato" />
          )}
        </div>

        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <p className="mb-3 text-sm font-bold text-tt-ink">Metodi di pagamento</p>
          {data.payments.length > 0 ? (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={data.payments} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {data.payments.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0.01 60)', fontSize: 12 }} formatter={(v: number) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.payments.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="flex-1 text-tt-ink">{p.name}</span>
                    <span className="font-bold text-tt-ink">{p.v}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart label="Nessun pagamento registrato" />
          )}
        </div>
      </div>

      <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
        <p className="mb-3 text-sm font-bold text-tt-ink">Scontrino medio (€)</p>
        {data.avgTicketByDay.some((d) => d.v > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.avgTicketByDay} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 60)" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'oklch(0.52 0.02 50)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0.01 60)', fontSize: 12 }} formatter={(v: number) => [`€${v}`, '']} />
              <Line type="monotone" dataKey="v" stroke="oklch(0.62 0.15 160)" strokeWidth={2.5} dot={{ fill: 'oklch(0.62 0.15 160)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="Nessuno scontrino nel periodo" />
        )}
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-[180px] place-items-center text-center text-xs text-tt-muted">
      {label}
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 tt-skeleton rounded-2xl" />
        <div className="space-y-2">
          <div className="h-5 w-24 tt-skeleton rounded-full" />
          <div className="h-3 w-20 tt-skeleton rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
            <div className="mb-3 flex justify-between">
              <div className="h-8 w-8 tt-skeleton rounded-lg" />
              <div className="h-5 w-12 tt-skeleton rounded-full" />
            </div>
            <div className="h-5 w-16 tt-skeleton rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tt-card h-56 rounded-2xl border border-tt-line p-4 shadow-tt">
            <div className="mb-3 h-4 w-32 tt-skeleton rounded-full" />
            <div className="h-32 w-full tt-skeleton rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
