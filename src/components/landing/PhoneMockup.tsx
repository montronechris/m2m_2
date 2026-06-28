'use client'

import { motion } from 'framer-motion'
import { Star, ShoppingBag, Plus, UtensilsCrossed } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

const tagStyles: Record<string, string> = {
  veg: 'bg-brand-emerald/15 text-brand-emerald',
  chef: 'bg-brand-violet/15 text-brand-violet',
  top: 'bg-brand-rose/15 text-brand-rose',
}

/**
 * Realistic phone mockup showing a live restaurant menu — the visual
 * centerpiece of the hero, echoing the reference screenshot.
 */
export function PhoneMockup() {
  const { tr } = useI18n()
  const p = tr.hero.phone
  const n = tr.hero.notif
  const r = tr.hero.rating

  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px]">
      {/* Glow halo */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-tr from-brand-amber/40 via-brand-rose/30 to-brand-violet/30 blur-2xl animate-gradient-pan shadow-glow-amber" />
      <div aria-hidden className="pointer-events-none absolute -right-6 top-12 h-2 w-2 rounded-full bg-brand-amber animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute -left-4 bottom-20 h-1.5 w-1.5 rounded-full bg-brand-rose animate-float-soft" style={{ animationDelay: '1.4s' }} />

      {/* Phone body */}
      <motion.div
        initial={{ y: 24, opacity: 0, rotate: -4 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="animate-float-soft relative rounded-[2.6rem] border-[10px] border-ink/90 bg-ink p-1.5 shadow-2xl shadow-glow-amber"
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-1.5 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-ink" />

        {/* Screen */}
        <div className="relative h-[560px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-white to-oklch(0.98 0.015 60)">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-medium text-ink/60">
            <span className="tabular">9:41</span>
            <span className="flex items-center gap-1">
              <span className="status-dot bg-brand-emerald" /> {p.online}
            </span>
          </div>

          {/* Restaurant header */}
          <div className="px-5 pt-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-brand-terra">
              <UtensilsCrossed className="h-3 w-3" /> {p.restaurant}
            </div>
            <h3 className="mt-1 font-serif text-xl font-bold leading-tight text-ink">
              {p.menuTitle.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-gradient-warm">{p.menuTitle.split(' ').slice(-1)}</span>
            </h3>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto px-5 scrollbar-none">
            {p.categories.map((c, i) => (
              <span
                key={c}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold ${
                  i === 0 ? 'bg-brand-amber text-white' : 'bg-ink/5 text-ink/60'
                }`}
              >
                {c}
              </span>
            ))}
          </div>

          {/* Dishes */}
          <div className="mt-3 space-y-2 px-5">
            {p.dishes.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.18, duration: 0.5 }}
                className="lift-hover flex items-center gap-3 rounded-2xl border border-ink/5 bg-white p-2.5 shadow-sm"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-amber/20 to-brand-rose/20 text-sm font-bold text-brand-terra">
                  <span className="tabular">{d.price}€</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-ink">{d.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${tagStyles[d.tag]}`}>
                      {d.tag}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-ink/50">{d.desc}</p>
                </div>
                <button className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-amber text-white shadow-glow-amber transition hover:scale-110">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Live order bar */}
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="noise-overlay absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-2xl bg-ink p-2.5 text-white shadow-xl"
          >
            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-amber">
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-rose text-[9px] font-bold">
                <span className="tabular">3</span>
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-wide text-white/50">{p.cart}</p>
              <p className="tabular text-xs font-bold">48€ · {p.table}</p>
            </div>
            <div className="rounded-lg bg-brand-amber px-2.5 py-1.5 text-[10px] font-bold">
              {p.order}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating notification card */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="lift-hover noise-overlay absolute -left-10 top-24 hidden w-44 rotate-[-6deg] rounded-2xl border border-ink/5 bg-white/90 p-3 shadow-xl backdrop-blur sm:block"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-emerald/15 text-brand-emerald">
            <ShoppingBag className="h-3.5 w-3.5" />
          </div>
          <span className="text-[9px] text-ink/40">{n.time}</span>
        </div>
        <p className="mt-1.5 text-[10px] font-semibold leading-tight text-ink">{n.text}</p>
        <div className="mt-1 flex items-center gap-0.5 text-brand-amber">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-2.5 w-2.5 fill-current" />
          ))}
        </div>
      </motion.div>

      {/* Floating rating chip */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="lift-hover absolute -right-6 bottom-28 hidden rotate-[6deg] items-center gap-2 rounded-2xl border border-ink/5 bg-white/90 px-3 py-2 shadow-xl backdrop-blur sm:flex"
      >
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-violet/15 text-brand-violet">
          <Star className="h-4 w-4 fill-current" />
        </div>
        <div>
          <p className="tabular text-sm font-bold text-ink">{r.value}</p>
          <p className="text-[9px] text-ink/40">{r.reviews}</p>
        </div>
      </motion.div>
    </div>
  )
}
