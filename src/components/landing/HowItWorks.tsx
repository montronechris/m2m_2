'use client'

import { motion } from 'framer-motion'
import { QrCode, LayoutDashboard, BarChart3, Clock, Check, Sparkles, Star } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

const stepIcons = [QrCode, LayoutDashboard, BarChart3]
const stepColors = [
  'from-brand-emerald to-brand-sky',
  'from-brand-amber to-brand-terra',
  'from-brand-rose to-brand-violet',
]
const stepChips = [
  'bg-brand-emerald/15 text-brand-emerald',
  'bg-brand-amber/15 text-brand-amber',
  'bg-brand-rose/15 text-brand-rose',
]
const stepNumGradient = [
  'text-gradient-vivid',
  'text-gradient-warm',
  'text-gradient-warm',
]
// Visual-only time badges (no i18n change). Using existing keys would force new dictionary entries.
const stepTime = ['1 sec', '2 min', '1 click']

export function HowItWorks() {
  const { tr } = useI18n()
  const h = tr.how

  return (
    <section id="come-funziona" className="relative py-16 scroll-mt-24 sm:py-20 lg:py-24">
      {/* Subtle background grid texture */}
      <div aria-hidden className="bg-grid-soft pointer-events-none absolute inset-0 opacity-60" />
      {/* Soft gradient mesh for warmth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.72_0.19_60/0.10),transparent_70%),radial-gradient(40%_40%_at_85%_30%,oklch(0.62_0.22_18/0.07),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-sky/30 bg-brand-sky/10 text-brand-sky">
            {h.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {h.title} <span className="text-gradient-warm">{h.titleHighlight}</span>
          </h2>
        </motion.div>

        <div className="relative mt-14">
          {/* Animated dashed connector (desktop) */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-9 hidden lg:block"
            viewBox="0 0 1200 24"
            fill="none"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 80 12 L 1120 12"
              stroke="oklch(0.55 0.21 55 / 0.35)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="2 8"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
            />
            <motion.path
              d="M 80 12 L 1120 12"
              stroke="oklch(0.72 0.19 60)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="2 8"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
            />
          </svg>

          <div className="grid gap-8 lg:grid-cols-3">
            {h.steps.map((s, i) => {
              const Icon = stepIcons[i]
              const isMid = i === 1
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className="lift-hover relative text-center lg:text-left"
                >
                  <div className="card-gradient-border noise-overlay relative overflow-hidden rounded-3xl bg-white/80 p-6 backdrop-blur">
                    {/* Soft tinted wash per step */}
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stepColors[i]} opacity-15 blur-2xl`}
                    />

                    <div className="relative flex flex-col items-center lg:items-start">
                      <div className="relative">
                        {/* Rotating gradient ring around the middle step icon */}
                        {isMid && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-brand-amber/50 animate-sparkle-spin"
                          />
                        )}
                        <span className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${stepColors[i]} text-white shadow-lg ${isMid ? 'animate-float-soft' : ''}`}>
                          <Icon className="h-7 w-7" />
                        </span>
                      </div>

                      {/* Big gradient step number */}
                      <span
                        aria-hidden
                        className={`mt-4 font-serif text-5xl font-black leading-none ${stepNumGradient[i]}`}
                      >
                        {`0${i + 1}`}
                      </span>

                      <h3 className="mt-2 font-serif text-xl font-bold tracking-tight text-ink">{s.title}</h3>
                      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink/60">{s.desc}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stepChips[i]}`}>
                          {s.chip}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white/60 px-2.5 py-1 text-xs font-semibold text-ink/60">
                          <Clock className="h-3 w-3 text-brand-amber" />
                          {stepTime[i]}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Final "Result" element after step 3 — graphical mini celebration */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mx-auto mt-10 flex w-fit items-center gap-2.5 rounded-full border border-brand-emerald/30 bg-gradient-to-r from-brand-emerald/10 via-brand-amber/10 to-brand-rose/10 px-5 py-2 shadow-glow-emerald"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-emerald to-brand-sky text-white shadow">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="h-3 w-3 fill-brand-amber text-brand-amber" />
              ))}
            </div>
            <Sparkles className="h-4 w-4 animate-sparkle-spin text-brand-amber" />
            <span className="status-dot bg-brand-emerald" />
          </motion.div>
        </div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
