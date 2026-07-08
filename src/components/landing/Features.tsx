'use client'

import { motion } from 'framer-motion'
import {
  QrCode,
  Smartphone,
  ChefHat,
  BarChart3,
  Star,
  CreditCard,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'
import Link from 'next/link'

const icons: LucideIcon[] = [Smartphone, QrCode, ChefHat, BarChart3, Star, CreditCard]

const themes = [
  {
    ring: 'hover:border-brand-emerald/40',
    iconWrap: 'bg-brand-emerald/15 text-brand-emerald',
    glow: 'group-hover:shadow-glow-emerald',
    accent: 'text-brand-emerald',
    span: 'lg:col-span-2',
    cornerOrb: 'bg-brand-emerald',
  },
  {
    ring: 'hover:border-brand-rose/40',
    iconWrap: 'bg-brand-rose/15 text-brand-rose',
    glow: 'group-hover:shadow-glow-rose',
    accent: 'text-brand-rose',
    cornerOrb: 'bg-brand-rose',
  },
  {
    ring: 'hover:border-brand-amber/40',
    iconWrap: 'bg-brand-amber/15 text-brand-amber',
    glow: 'group-hover:shadow-glow-amber',
    accent: 'text-brand-amber',
    span: 'lg:col-span-2',
    cornerOrb: 'bg-brand-amber',
  },
  {
    ring: 'hover:border-brand-violet/40',
    iconWrap: 'bg-brand-violet/15 text-brand-violet',
    glow: 'group-hover:shadow-glow-violet',
    accent: 'text-brand-violet',
    cornerOrb: 'bg-brand-violet',
  },
  {
    ring: 'hover:border-brand-sky/40',
    iconWrap: 'bg-brand-sky/15 text-brand-sky',
    glow: 'group-hover:shadow-glow-emerald',
    accent: 'text-brand-sky',
    span: 'lg:col-span-2',
    cornerOrb: 'bg-brand-sky',
  },
  {
    ring: 'hover:border-brand-terra/40',
    iconWrap: 'bg-brand-terra/15 text-brand-terra',
    glow: 'group-hover:shadow-glow-amber',
    accent: 'text-brand-terra',
    cornerOrb: 'bg-brand-terra',
  },
]

export function Features() {
  const { tr } = useI18n()
  const f = tr.features

  return (
    <section id="funzioni" className="relative pb-16 pt-14 scroll-mt-24 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      {/* Floating decorative orbs in the section background */}
      <div aria-hidden className="pointer-events-none absolute -left-10 top-32 h-44 w-44 rounded-full bg-brand-violet/10 blur-3xl animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-1/3 h-40 w-40 rounded-full bg-brand-amber/10 blur-3xl animate-blob" />
      <div aria-hidden className="pointer-events-none absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-brand-rose/10 blur-3xl animate-float-soft" style={{ animationDelay: '2s' }} />

      <div className="mx-auto max-w-6xl px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-violet/30 bg-brand-violet/10 text-brand-violet">
            {f.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {f.title}{' '}
            <span className="text-gradient-vivid">{f.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{f.subtitle}</p>
        </motion.div>

        {/* Grid of vibrant cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {f.items.map((it, i) => {
            const Icon = icons[i]
            const t = themes[i]
            const num = String(i + 1).padStart(2, '0')
            return (
              <motion.article
                key={it.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.55 }}
                className={`lift-hover noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur transition-all duration-300 ${t.ring} ${t.glow} ${t.span ?? ''}`}
              >
                {/* Gradient top border that appears on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-brand-amber via-brand-rose to-brand-violet opacity-0 transition-all duration-500 group-hover:scale-x-100 group-hover:opacity-100"
                />
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-white to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-brand-amber/5 blur-2xl" />

                {/* Big faint serif number in the corner */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute right-3 top-1 font-serif text-7xl font-black leading-none ${t.accent} opacity-10 transition-opacity duration-300 group-hover:opacity-20`}
                >
                  {num}
                </span>

                <div className="relative">
                  <div className="relative inline-block">
                    {/* Colored glow halo behind the icon */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 rounded-2xl ${t.cornerOrb} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30`}
                    />
                    <span className={`relative grid h-14 w-14 place-items-center rounded-2xl ${t.iconWrap} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                      <Icon className="h-7 w-7" />
                    </span>
                  </div>

                  <h3 className="mt-5 font-serif text-xl font-bold tracking-tight text-ink sm:text-2xl">
                    {it.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{it.desc}</p>

<Link
  href="/funzioni"
  className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${t.accent} opacity-100 transition-all duration-300 lg:opacity-0 lg:group-hover:opacity-100`}
>
  {f.more}
  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
</Link>
                </div>
              </motion.article>
            )
          })}
        </div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
