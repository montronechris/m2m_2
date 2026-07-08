'use client'

import { motion } from 'framer-motion'
import { ChefHat, Star, TrendingUp, CheckCircle2, Clock3 } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

const kitchenOrders = [
  { table: 'Tavolo 7', dish: 'Tagliata · media', time: '3 min', ready: false, tone: 'border-brand-rose/40 bg-brand-rose/5' },
  { table: 'Tavolo 2', dish: 'Tartare', time: '5 min', ready: false, tone: 'border-brand-amber/40 bg-brand-amber/5' },
  { table: 'Tavolo 9', dish: '2x Carbonara', time: '7 min', ready: false, tone: 'border-brand-violet/40 bg-brand-violet/5' },
  { table: 'Tavolo 4', dish: 'Burrata', time: '✓', ready: true, tone: 'border-brand-emerald/40 bg-brand-emerald/5' },
]
const bars = [40, 65, 50, 80, 55, 95, 70]

export function ProductShowcase() {
  const { tr } = useI18n()
  const s = tr.showcase
  const week = [s.week.lun, s.week.mar, s.week.mer, s.week.gio, s.week.ven, s.week.sab, s.week.dom]

  return (
    <section className="relative pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-rose/30 bg-brand-rose/10 text-brand-rose">
            {s.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {s.title}{' '}
            <span className="text-gradient-vivid">{s.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{s.subtitle}</p>
        </motion.div>

        {/* Bento grid */}
        <div className="mt-12 grid gap-4 md:grid-cols-6 md:grid-rows-2">
          {/* Analytics chart — large */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="noise-overlay lift-hover relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-violet to-brand-sky p-6 text-white shadow-glow-violet md:col-span-4 md:row-span-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70">{s.revenue}</p>
                <p className="tabular font-serif text-3xl font-black">€ 18.420</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
                <TrendingUp className="h-3.5 w-3.5" /> +24%
              </span>
            </div>
            <div className="mt-6 flex h-28 items-end gap-2">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className="flex-1 rounded-t-lg bg-white/30"
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-medium text-white/90">
              {week.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </motion.div>

          {/* Kitchen display */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lift-hover relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-5 shadow-sm backdrop-blur md:col-span-2 md:row-span-2"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-amber/15 text-brand-amber">
                <ChefHat className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{s.kitchen.title}</p>
                <p className="text-[11px] text-ink/50">{s.kitchen.sub}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {kitchenOrders.map((o, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  className={`flex items-center justify-between rounded-xl border p-2.5 ${o.tone}`}
                >
                  <div>
                    <p className="text-xs font-bold text-ink">{o.table}</p>
                    <p className="text-[10px] text-ink/50">{o.dish}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink/60">
                    {o.ready ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-emerald" />
                    ) : (
                      <Clock3 className="h-3.5 w-3.5" />
                    )}
                    {o.time}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="noise-overlay lift-hover relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-rose to-brand-terra p-5 text-white shadow-glow-rose md:col-span-4"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                <Star className="h-5 w-5 fill-current" />
              </span>
              <p className="text-sm font-bold">{s.reviews.title}</p>
            </div>
            <p className="tabular mt-4 font-serif text-4xl font-black">4.9</p>
            <div className="mt-1 flex items-center gap-0.5 text-white/90">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="mt-2 text-xs text-white/70">{s.reviews.sub}</p>
            <p className="mt-3 text-[10px] italic text-white/50">{s.reviews.disclaimer}</p>
          </motion.div>
        </div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
