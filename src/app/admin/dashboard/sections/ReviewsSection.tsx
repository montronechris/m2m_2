'use client'

// ─── SEZIONE: RECENSIONI ───────────────────────────────────────────────────────
//
// Recensioni dei clienti con traduzione e gestione.
// Stato: carica le recensioni e ne mostra dettaglio/traduzione su richiesta.
// ──────────────────────────────────────────────────────────────────────────────


import { useEffect, useRef, useState } from 'react'
import {
  Star,
  RefreshCw,
  AlertCircle,
  Crown,
  Medal,
  Award,
  MessageSquareText,
  Trophy,
  Utensils,
  Sparkles,
  Languages,
  Loader2,
  Search,
  ChevronDown,
  X,
} from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  getReviewStats,
  type ReviewStats,
  type DishReviewStat,
  type ReviewEntry,
} from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

type Period = 7 | 30 | 0
type Tab = 'podium' | 'written'
type RankSort = 'avg' | 'count'

const COPY = {
  it: {
    title: 'Recensioni',
    week: 'Ultimi 7 giorni',
    month: 'Ultimi 30 giorni',
    all: 'Sempre',
    p7: '7g',
    p30: '30g',
    pAll: 'Tutte',
    refresh: 'Aggiorna',
    tabPodium: 'Podio',
    tabWritten: 'Scritte',
    kpiTotal: 'Recensioni',
    kpiAvg: 'Media voti',
    kpiDishes: 'Piatti recensiti',
    kpiWritten: 'Con testo',
    podiumTitle: 'Podio della settimana',
    podiumSub: 'I piatti più apprezzati',
    ranking: 'Classifica completa',
    sortAvg: 'Voto',
    sortCount: 'Numero',
    reviewsN: (n: number) => `${n} ${n === 1 ? 'recensione' : 'recensioni'}`,
    writtenTitle: 'Recensioni scritte',
    noWritten: 'Nessuna recensione con testo nel periodo',
    noData: 'Ancora nessuna recensione nel periodo',
    error: 'Impossibile caricare le recensioni',
    table: 'Tavolo',
    translate: 'Traduci',
    translating: 'Traduzione…',
    showOriginal: 'Mostra originale',
    translateError: 'Traduzione non riuscita',
    filterDish: 'Cerca piatto…',
    filterAll: 'Tutti i piatti',
    filterNone: 'Nessun piatto',
    filterClear: 'Rimuovi filtro',
    noForDish: 'Nessuna recensione per questo piatto',
  },
  en: {
    title: 'Reviews',
    week: 'Last 7 days',
    month: 'Last 30 days',
    all: 'All time',
    p7: '7d',
    p30: '30d',
    pAll: 'All',
    refresh: 'Refresh',
    tabPodium: 'Podium',
    tabWritten: 'Written',
    kpiTotal: 'Reviews',
    kpiAvg: 'Average',
    kpiDishes: 'Dishes rated',
    kpiWritten: 'With text',
    podiumTitle: 'Podium of the week',
    podiumSub: 'Most loved dishes',
    ranking: 'Full ranking',
    sortAvg: 'Rating',
    sortCount: 'Count',
    reviewsN: (n: number) => `${n} ${n === 1 ? 'review' : 'reviews'}`,
    writtenTitle: 'Written reviews',
    noWritten: 'No reviews with text in this period',
    noData: 'No reviews yet in this period',
    error: 'Unable to load reviews',
    table: 'Table',
    translate: 'Translate',
    translating: 'Translating…',
    showOriginal: 'Show original',
    translateError: 'Translation failed',
    filterDish: 'Search dish…',
    filterAll: 'All dishes',
    filterNone: 'No dishes',
    filterClear: 'Clear filter',
    noForDish: 'No reviews for this dish',
  },
}

/** Riga di 5 stelle con riempimento in base al valore. */
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i <= rounded
              ? 'fill-tt-warning text-tt-warning'
              : 'fill-transparent text-tt-line'
          }
        />
      ))}
    </span>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  cls,
}: {
  icon: typeof Star
  label: string
  value: string
  cls: string
}) {
  return (
    <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
      <div className="mb-2 flex items-center justify-between">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${cls}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-lg font-extrabold text-tt-ink">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{label}</p>
    </div>
  )
}

// Configurazione visiva del podio per posizione (1,2,3)
const PODIUM_META: Record<
  number,
  { icon: typeof Crown; bar: string; ring: string; h: string; order: string }
> = {
  1: {
    icon: Crown,
    bar: 'from-brand-amber to-brand-terra',
    ring: 'ring-brand-amber/50',
    h: 'h-24',
    order: 'order-2',
  },
  2: {
    icon: Medal,
    bar: 'from-tt-muted/70 to-tt-muted/40',
    ring: 'ring-tt-muted/40',
    h: 'h-16',
    order: 'order-1',
  },
  3: {
    icon: Award,
    bar: 'from-brand-terra/70 to-brand-terra/40',
    ring: 'ring-brand-terra/40',
    h: 'h-12',
    order: 'order-3',
  },
}

function PodiumStep({ pos, dish, t }: { pos: number; dish: DishReviewStat; t: typeof COPY.it }) {
  const meta = PODIUM_META[pos]
  const Icon = meta.icon
  return (
    <div className={`flex flex-1 flex-col items-center ${meta.order}`}>
      <span
        className={`mb-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${meta.bar} text-white shadow-tt ring-2 ${meta.ring}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mb-0.5 line-clamp-2 text-center text-xs font-bold text-tt-ink">{dish.name}</p>
      <Stars value={dish.avg} size={12} />
      <p className="mt-0.5 text-[11px] font-extrabold text-tt-ink">{dish.avg.toFixed(1)}</p>
      <p className="text-[10px] text-tt-muted">{t.reviewsN(dish.count)}</p>
      <div
        className={`mt-2 flex w-full ${meta.h} items-start justify-center rounded-t-xl bg-gradient-to-b ${meta.bar} pt-1 text-sm font-black text-white/90`}
      >
        {pos}
      </div>
    </div>
  )
}

export function ReviewsSection({ ctx }: Props) {
  const { lang } = useI18n()
  const t = COPY[lang === 'en' ? 'en' : 'it']

  const [period, setPeriod] = useState<Period>(7)
  const [tab, setTab] = useState<Tab>('podium')
  const [rankSort, setRankSort] = useState<RankSort>('avg')
  const [writtenDish, setWrittenDish] = useState<string | null>(null)
  const [data, setData] = useState<ReviewStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = () => {
    return getReviewStats(ctx.restaurantId, period)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => setError(e?.message ?? t.error))
  }

  useEffect(() => {
    let active = true
    setWrittenDish(null)
    getReviewStats(ctx.restaurantId, period)
      .then((d) => active && (setData(d), setError(null)))
      .catch((e) => active && setError(e?.message ?? t.error))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.restaurantId, period])

  const handleRefresh = () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    load().finally(() => setTimeout(() => setIsRefreshing(false), 800))
  }

  const periodLabel = period === 7 ? t.week : period === 30 ? t.month : t.all

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">{t.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  if (!data) return <ReviewsSkeleton />

  const ranking = [...data.ranking].sort((a, b) =>
    rankSort === 'avg'
      ? b.avg - a.avg || b.count - a.count
      : b.count - a.count || b.avg - a.avg
  )

  // Elenco piatti (unici) con testo, per il filtro della tab "Scritte".
  const writtenDishes = Array.from(
    new Set(data.written.map((r) => r.dishName))
  ).sort((a, b) => a.localeCompare(b))
  const writtenList = writtenDish
    ? data.written.filter((r) => r.dishName === writtenDish)
    : data.written

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
            <Star className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
            <p className="text-xs text-tt-muted">{periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 rounded-full border border-tt-line bg-white p-1">
            {([
              [7, t.p7],
              [30, t.p30],
              [0, t.pAll],
            ] as const).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p as Period)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  period === p
                    ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white'
                    : 'text-tt-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="grid h-8 w-8 place-items-center rounded-full border border-tt-line bg-white text-tt-muted transition hover:text-tt-ink disabled:opacity-70"
            title={t.refresh}
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform duration-1000 ease-in-out ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={MessageSquareText} label={t.kpiTotal} value={String(data.total)} cls="bg-tt-pink/15 text-tt-pink" />
        <StatCard icon={Star} label={t.kpiAvg} value={data.total > 0 ? data.avg.toFixed(1) : '–'} cls="bg-tt-warning/15 text-tt-warning" />
        <StatCard icon={Utensils} label={t.kpiDishes} value={String(data.dishesRated)} cls="bg-tt-success/15 text-tt-success" />
        <StatCard icon={MessageSquareText} label={t.kpiWritten} value={String(data.withText)} cls="bg-tt-pinkSoft/15 text-tt-pinkSoft" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-full border border-tt-line bg-tt-surfaceAlt p-1">
        {([
          ['podium', t.tabPodium],
          ['written', t.tabWritten],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              tab === key
                ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white'
                : 'text-tt-muted hover:text-tt-ink'
            }`}
          >
            {label}
            {key === 'written' && data.withText > 0 && (
              <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                {data.withText}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        key={tab}
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out"
      >
      {tab === 'podium' ? (
        data.total === 0 ? (
          <EmptyState label={t.noData} />
        ) : (
          <>
            {/* Podio 3-2-1 */}
            <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-tt-warning" />
                <div>
                  <p className="text-sm font-bold text-tt-ink">{t.podiumTitle}</p>
                  <p className="text-[11px] text-tt-muted">{t.podiumSub}</p>
                </div>
              </div>
              <div className="flex items-end gap-2 sm:gap-4">
                {data.podium.map((dish, i) => (
                  <PodiumStep key={dish.menuItemId ?? dish.name} pos={i + 1} dish={dish} t={t} />
                ))}
              </div>
            </div>

            {/* Classifica completa */}
            <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-tt-ink">{t.ranking}</p>
                <div className="flex gap-1 rounded-full border border-tt-line bg-tt-surfaceAlt p-0.5">
                  {([
                    ['avg', t.sortAvg],
                    ['count', t.sortCount],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setRankSort(key as RankSort)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        rankSort === key
                          ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white'
                          : 'text-tt-muted hover:text-tt-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-tt-line/60">
                {ranking.map((dish, i) => (
                  <li
                    key={dish.menuItemId ?? dish.name}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tt-surfaceAlt text-[11px] font-extrabold text-tt-muted">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tt-ink">
                      {dish.name}
                    </span>
                    <Stars value={dish.avg} size={13} />
                    <span className="w-8 text-right text-sm font-extrabold text-tt-ink">
                      {dish.avg.toFixed(1)}
                    </span>
                    <span className="tt-pill shrink-0">{dish.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )
      ) : (
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-tt-pink" />
              <p className="text-sm font-bold text-tt-ink">{t.writtenTitle}</p>
            </div>
            {writtenDishes.length > 1 && (
              <DishFilter
                dishes={writtenDishes}
                value={writtenDish}
                onChange={setWrittenDish}
                t={t}
              />
            )}
          </div>
          {data.written.length === 0 ? (
            <EmptyState label={t.noWritten} />
          ) : writtenList.length === 0 ? (
            <EmptyState label={t.noForDish} />
          ) : (
            <ul className="space-y-3">
              {writtenList.map((r) => (
                <WrittenReview key={r.id} r={r} t={t} lang={lang} />
              ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

/** Filtro combinato ricerca + menu a tendina per selezionare un piatto. */
function DishFilter({
  dishes,
  value,
  onChange,
  t,
}: {
  dishes: string[]
  value: string | null
  onChange: (dish: string | null) => void
  t: typeof COPY.it
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Tiene l'input allineato al piatto selezionato (anche su reset esterni).
  useEffect(() => {
    setQuery(value ?? '')
  }, [value])

  // Chiude la tendina al click fuori, scartando la digitazione non confermata.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(value ?? '')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [value])

  const filtered = dishes.filter((d) =>
    d.toLowerCase().includes(query.trim().toLowerCase())
  )

  const pick = (dish: string | null) => {
    onChange(dish)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-full sm:w-64">
      <div className="flex items-center gap-2 rounded-full border border-tt-line bg-white px-3 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-tt-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={t.filterDish}
          className="min-w-0 flex-1 bg-transparent text-xs text-tt-ink outline-none placeholder:text-tt-muted"
        />
        {value ? (
          <button
            type="button"
            onClick={() => pick(null)}
            className="shrink-0 text-tt-muted transition hover:text-tt-ink"
            title={t.filterClear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-tt-muted transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-tt-line bg-white p-1 shadow-tt animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <button
            type="button"
            onClick={() => pick(null)}
            className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
              value === null
                ? 'bg-tt-pinkSoft text-tt-pink'
                : 'text-tt-ink hover:bg-tt-surfaceAlt'
            }`}
          >
            {t.filterAll}
          </button>
          {filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-[11px] text-tt-muted">{t.filterNone}</p>
          ) : (
            filtered.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pick(d)}
                className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  value === d
                    ? 'bg-tt-pinkSoft font-bold text-tt-pink'
                    : 'text-tt-ink hover:bg-tt-surfaceAlt'
                }`}
              >
                <span className="truncate">{d}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function WrittenReview({
  r,
  t,
  lang,
}: {
  r: ReviewEntry
  t: typeof COPY.it
  lang: string
}) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [showing, setShowing] = useState<'original' | 'translated'>('original')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const date = new Date(r.createdAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const showingTranslated = showing === 'translated' && translated !== null

  const handleTranslate = async () => {
    // Traduzione già disponibile: alterniamo senza richiamare l'API.
    if (translated !== null) {
      setShowing((s) => (s === 'translated' ? 'original' : 'translated'))
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/translate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: r.text, target: lang }),
      })
      if (!res.ok) throw new Error('failed')
      const data = (await res.json()) as { text?: string }
      const text = (data.text ?? '').trim()
      if (!text) throw new Error('empty')
      setTranslated(text)
      setShowing('translated')
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <li className="rounded-xl border border-tt-line/70 bg-tt-surfaceAlt/40 p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stars value={r.stars} size={13} />
          <span className="text-xs font-bold text-tt-ink">{r.dishName}</span>
        </div>
        <span className="text-[11px] text-tt-muted">
          {r.tableNumber ? `${t.table} ${r.tableNumber} · ` : ''}
          {date}
        </span>
      </div>
      <p className="text-sm text-tt-ink/90">{showingTranslated ? translated : r.text}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={handleTranslate}
          disabled={status === 'loading'}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-tt-pink transition-colors hover:bg-tt-pinkSoft disabled:opacity-60"
        >
          {status === 'loading' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Languages className="h-3 w-3" />
          )}
          {status === 'loading'
            ? t.translating
            : showingTranslated
              ? t.showOriginal
              : t.translate}
        </button>
        {status === 'error' && (
          <span className="text-[11px] text-tt-danger">{t.translateError}</span>
        )}
      </div>
    </li>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid place-items-center gap-2 py-10 text-center">
      <Sparkles className="h-8 w-8 text-tt-line" />
      <p className="max-w-xs text-xs text-tt-muted">{label}</p>
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-2xl bg-tt-surfaceAlt tt-skeleton" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded bg-tt-surfaceAlt tt-skeleton" />
          <div className="h-3 w-20 rounded bg-tt-surfaceAlt tt-skeleton" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-tt-surfaceAlt tt-skeleton" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-tt-surfaceAlt tt-skeleton" />
    </div>
  )
}
