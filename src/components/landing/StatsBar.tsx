'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Clock, Users, Star, ArrowUpRight, MessageSquareQuote } from 'lucide-react'
import { Counter } from './Counter'
import { useI18n } from '@/components/i18n/I18nProvider'

const iconMap = [TrendingUp, Users, Clock, Star]
const iconClsMap = [
  'bg-brand-emerald/15 text-brand-emerald',
  'bg-brand-violet/15 text-brand-violet',
  'bg-brand-sky/15 text-brand-sky',
  'bg-brand-amber/15 text-brand-amber',
]
const accentMap = ['bg-brand-emerald', 'bg-brand-violet', 'bg-brand-sky', 'bg-brand-amber']

// Sub-labels & trend copy are visual-only metadata (not from i18n keys).
const trendMap = ['+240 / mese', '+5 / mese', '−6 min', '↑ da 4.6']

export function StatsBar() {
  const { tr } = useI18n()
  const stats = tr.stats
  const reviewsLabel = tr.hero.rating.reviews

  return (
    <section className="relative py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="card-gradient-border noise-overlay relative rounded-3xl shadow-xl backdrop-blur"
        >
          {/* Visible top accent stripe for the premium frame */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-3xl bg-gradient-to-r from-brand-emerald via-brand-amber to-brand-rose opacity-70" />
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-ink/5 bg-white/70 p-4 lg:grid-cols-4 lg:gap-4 lg:p-6">
            {stats.map((s, i) => {
              const Icon = iconMap[i]
              const isRating = i === 3
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="lift-hover group relative overflow-hidden rounded-2xl border border-ink/5 bg-white/40 p-3"
                >
                  {/* Corner accent dots */}
                  <span aria-hidden className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-ink/20" />
                  <span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-ink/20" />
                  <span aria-hidden className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-ink/20" />
                  <span aria-hidden className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-ink/20" />

                  {/* Soft radial wash that appears on hover */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${accentMap[i]} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25`}
                  />

                  <div className="relative flex items-center gap-3">
                    <span className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${iconClsMap[i]}`}>
                      <Icon className="h-6 w-6" />
                      <span className={`status-dot absolute -right-0.5 -top-0.5 ${accentMap[i]}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1">
                        <motion.span
                          initial={{ scale: 1 }}
                          whileInView={{ scale: [1, 1.12, 1] }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4 + i * 0.1, duration: 0.45, ease: 'easeOut' }}
                          className="inline-block"
                        >
                          <Counter
                            to={s.value}
                            decimals={s.decimals ?? 0}
                            prefix={s.prefix ?? ''}
                            suffix={s.suffix ?? ''}
                            className="tabular font-serif text-2xl font-black text-ink lg:text-3xl"
                          />
                        </motion.span>
                        {/* Mini trend arrow (visual only) */}
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-brand-emerald/80" />
                      </div>
                      <p className="truncate text-xs font-medium text-ink/50 lg:text-sm">{s.label}</p>

                      {/* Trend sub-label or rating stars */}
                      {isRating ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          <div className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-brand-amber/20 to-brand-rose/20 px-2 py-0.5 shadow-sm ring-1 ring-brand-amber/20">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className="h-3 w-3 fill-brand-amber text-brand-amber" />
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-ink/45">
                            <MessageSquareQuote className="h-3 w-3" />
                            {reviewsLabel}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
                          {trendMap[i]}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
