'use client'

import { motion } from 'framer-motion'
import { Star, BadgeCheck, Quote } from 'lucide-react'
import { Marquee } from './Marquee'
import { useI18n } from '@/components/i18n/I18nProvider'

const rings = [
  'from-brand-amber to-brand-terra',
  'from-brand-emerald to-brand-sky',
  'from-brand-rose to-brand-violet',
  'from-brand-violet to-brand-sky',
  'from-brand-sky to-brand-emerald',
]

// Pill colors cycled per review — match each avatar ring
const pillTints = [
  'bg-brand-amber/15 text-brand-terra ring-brand-amber/20',
  'bg-brand-emerald/15 text-brand-emerald ring-brand-emerald/20',
  'bg-brand-rose/15 text-brand-rose ring-brand-rose/20',
  'bg-brand-violet/15 text-brand-violet ring-brand-violet/20',
  'bg-brand-sky/15 text-brand-sky ring-brand-sky/20',
]

function ReviewCard({
  r,
  ring,
  pill,
}: {
  r: { name: string; role: string; text: string }
  ring: string
  pill: string
}) {
  // Split role into venue · city (data unchanged — visual parsing only)
  const [venue, city] = r.role.split('·').map((s) => s.trim())

  return (
    <div className="card-gradient-border noise-overlay lift-hover group relative w-[330px] shrink-0 rounded-3xl bg-white/85 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:rotate-1">
      {/* Soft tinted wash in the top-right corner */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${ring} opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-30`}
      />

      {/* 5-star rating row */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-0.5 text-brand-amber">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="h-4 w-4 fill-current drop-shadow-[0_1px_2px_oklch(0.72_0.19_60/0.3)] transition-transform duration-300 group-hover:scale-110"
              style={{ transitionDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
        <Quote className="h-5 w-5 text-ink/15 transition-colors duration-300 group-hover:text-brand-amber/40" />
      </div>

      <p className="relative mt-3 text-sm leading-relaxed text-ink/70">
        “{r.text}”
      </p>

      <div className="relative mt-4 flex items-center gap-3">
        <div className="relative">
          {/* Pulsing ring behind avatar */}
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-br ${ring} opacity-30 blur-sm`}
          />
          <span
            className={`relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${ring} text-xs font-bold text-white shadow-md ring-2 ring-white`}
          >
            {r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </span>
          {/* Verified badge */}
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white shadow">
            <BadgeCheck className="h-3.5 w-3.5 fill-brand-emerald/15 text-brand-emerald" strokeWidth={2.5} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{r.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {venue && (
              <span className="truncate text-xs text-ink/50">{venue}</span>
            )}
            {city && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${pill}`}
              >
                {city}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Visual-only summary stats above the marquee (static numbers, not from i18n)
const summaryStats = [
  { value: '4.8', suffix: '/5', label: 'media voti' },
  { value: '48', suffix: '+', label: 'recensioni' },
  { value: '94', suffix: '%', label: 'consiglierebbe' },
]

export function Testimonials() {
  const { tr } = useI18n()
  const t = tr.testimonials

  return (
    <section id="recensioni" className="relative overflow-hidden pb-16 pt-8 scroll-mt-24 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12">
      {/* Giant decorative quote mark in the background */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 select-none font-serif text-[14rem] leading-none text-brand-amber/10 sm:text-[18rem]"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        &ldquo;
      </span>

      {/* Floating decorative orbs */}
      <div aria-hidden className="pointer-events-none absolute -left-12 top-1/3 h-44 w-44 rounded-full bg-brand-rose/10 blur-3xl animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-1/4 h-40 w-40 rounded-full bg-brand-amber/10 blur-3xl animate-blob" />
      <div aria-hidden className="pointer-events-none absolute bottom-10 left-1/3 h-36 w-36 rounded-full bg-brand-violet/10 blur-3xl animate-float-soft" style={{ animationDelay: '2.5s' }} />

      <div className="relative mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-amber/30 bg-brand-amber/10 text-brand-terra">
            {t.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {t.title}{' '}
            <span className="text-gradient-warm">{t.titleHighlight}</span>
          </h2>
        </motion.div>

        {/* Summary stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-8 flex max-w-2xl items-center justify-center divide-x divide-ink/10 rounded-2xl border border-ink/5 bg-white/70 px-2 py-3 shadow-sm backdrop-blur"
        >
          {summaryStats.map((s) => (
            <div key={s.label} className="flex-1 px-4 text-center">
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="tabular font-serif text-2xl font-black text-gradient-warm sm:text-3xl">
                  {s.value}
                </span>
                <span className="tabular text-sm font-bold text-ink/40">{s.suffix}</span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-ink/50">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="relative mt-12 space-y-4">
        <Marquee>
          {t.items.map((r, i) => (
            <ReviewCard key={r.name} r={r} ring={rings[i % rings.length]} pill={pillTints[i % pillTints.length]} />
          ))}
        </Marquee>
        <Marquee reverse>
          {[...t.items].reverse().map((r, i) => (
            <ReviewCard
              key={r.name + '-rev'}
              r={r}
              ring={rings[(i + 2) % rings.length]}
              pill={pillTints[(i + 2) % pillTints.length]}
            />
          ))}
        </Marquee>
      </div>

      <div className="mx-auto mt-16 max-w-6xl px-4">
        <div className="h-px divider-gradient" />
      </div>
    </section>
  )
}
