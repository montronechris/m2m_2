'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Leaf,
  Sun,
  FileX,
  Code2,
  TreePine,
  RefreshCw,
  BrainCircuit,
  Receipt,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Sprout,
  Recycle,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/landing/PageShell'
import { Counter } from '@/components/landing/Counter'
import { useI18n } from '@/components/i18n/I18nProvider'
import { ContactSection } from '@/components/landing/ContactSection'

const pledgeIcons = [Sun, FileX, Code2, TreePine]
const helpIcons = [RefreshCw, BrainCircuit, Receipt, BarChart3]
const pledgeThemes = [
  { wrap: 'bg-brand-amber/15 text-brand-amber', ring: 'group-hover:ring-brand-amber/30', glow: 'group-hover:shadow-glow-amber' },
  { wrap: 'bg-brand-emerald/15 text-brand-emerald', ring: 'group-hover:ring-brand-emerald/30', glow: 'group-hover:shadow-glow-emerald' },
  { wrap: 'bg-brand-sky/15 text-brand-sky', ring: 'group-hover:ring-brand-sky/30', glow: 'group-hover:shadow-[0_18px_40px_-16px_oklch(0.6_0.15_235_/_0.35)]' },
  { wrap: 'bg-brand-violet/15 text-brand-violet', ring: 'group-hover:ring-brand-violet/30', glow: 'group-hover:shadow-glow-violet' },
]
const helpThemes = [
  { wrap: 'bg-brand-emerald/15 text-brand-emerald', ring: 'group-hover:ring-brand-emerald/30', glow: 'group-hover:shadow-glow-emerald' },
  { wrap: 'bg-brand-rose/15 text-brand-rose', ring: 'group-hover:ring-brand-rose/30', glow: 'group-hover:shadow-glow-rose' },
  { wrap: 'bg-brand-sky/15 text-brand-sky', ring: 'group-hover:ring-brand-sky/30', glow: 'group-hover:shadow-[0_18px_40px_-16px_oklch(0.6_0.15_235_/_0.35)]' },
  { wrap: 'bg-brand-amber/15 text-brand-amber', ring: 'group-hover:ring-brand-amber/30', glow: 'group-hover:shadow-glow-amber' },
]

const heroFloatIcons = [
  { Icon: Leaf, className: 'left-[6%] top-28 h-14 w-14 text-brand-emerald/25', delay: '0s' },
  { Icon: Sprout, className: 'right-[8%] top-36 h-16 w-16 text-brand-amber/25', delay: '1.2s' },
  { Icon: Recycle, className: 'left-[14%] bottom-16 h-12 w-12 text-brand-sky/25', delay: '2s' },
  { Icon: TreePine, className: 'right-[12%] bottom-24 h-16 w-16 text-brand-emerald/20', delay: '2.6s' },
]

export default function GreenPage() {
  const { tr } = useI18n()
  const g = tr.green
  const p = tr.pages.green

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-44 pb-12 sm:pt-52 lg:pt-56 sm:pb-16">
        {/* Decorative floating orbs + icons */}
        <div aria-hidden className="pointer-events-none absolute -left-20 top-32 h-44 w-44 rounded-full bg-brand-emerald/20 blur-3xl animate-float-soft" />
        <div aria-hidden className="pointer-events-none absolute right-0 top-24 h-40 w-40 rounded-full bg-brand-amber/15 blur-3xl animate-blob" />
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-10 h-48 w-48 rounded-full bg-brand-sky/15 blur-3xl animate-float-soft" style={{ animationDelay: '1.5s' }} />

        {heroFloatIcons.map(({ Icon, className, delay }, i) => (
          <motion.div
            key={i}
            aria-hidden
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.8 }}
            className={`pointer-events-none absolute hidden blur-[1px] md:block ${className}`}
          >
            <Icon className="h-full w-full animate-float-soft" strokeWidth={1.4} style={{ animationDelay: delay }} />
          </motion.div>
        ))}

        {/* Soft top divider gradient */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px divider-gradient opacity-80" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald"
          >
            <Leaf className="h-3.5 w-3.5" /> {p.badge}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 font-serif text-4xl font-black tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            {g.title}{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(110deg, oklch(0.45 0.16 162), oklch(0.45 0.16 235))' }}
            >
              {g.titleHighlight}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/70"
          >
            {p.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild className="sheen group gap-2 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky font-semibold text-white shadow-glow-emerald">
              <Link href="/#prezzi">
                {tr.cta.primary} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="lift-hover gap-2 rounded-full">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" /> {tr.common.backHome}
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Our pledge */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-emerald to-brand-sky text-white shadow-glow-emerald">
              <Leaf className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{p.pledgeTitle}</h2>
              <p className="text-sm text-ink/55">{g.subtitle}</p>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.pledge.map((it, i) => {
              const Icon = pledgeIcons[i]
              const t = pledgeThemes[i]
              return (
                <motion.article
                  key={it.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className={`card-gradient-border lift-hover noise-overlay group relative rounded-3xl bg-white/85 p-6 shadow-sm backdrop-blur ring-1 ring-inset ring-ink/5 transition-all duration-300 ${t.ring} ${t.glow}`}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t.wrap} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-bold text-ink">{it.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{it.desc}</p>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div className="divider-gradient" aria-hidden />
      </div>

      {/* How we help */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-rose to-brand-amber text-white shadow-glow-rose">
              <RefreshCw className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink sm:text-3xl">{p.helpTitle}</h2>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {g.help.map((it, i) => {
              const Icon = helpIcons[i]
              const t = helpThemes[i]
              return (
                <motion.article
                  key={it.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className={`card-gradient-border lift-hover noise-overlay group relative rounded-3xl bg-white/85 p-6 shadow-sm backdrop-blur ring-1 ring-inset ring-ink/5 transition-all duration-300 ${t.ring} ${t.glow}`}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t.wrap} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-bold text-ink">{it.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{it.desc}</p>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="noise-overlay relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-emerald via-brand-emerald to-brand-sky p-8 text-white shadow-glow-emerald sm:p-14"
          >
            <div aria-hidden className="absolute inset-0 bg-grid-soft opacity-20" />
            {/* floating decorative dots */}
            <div aria-hidden className="pointer-events-none absolute left-8 top-8 h-3 w-3 rounded-full bg-white/40 animate-float-soft" />
            <div aria-hidden className="pointer-events-none absolute right-10 bottom-10 h-4 w-4 rounded-full bg-white/30 animate-float-soft" style={{ animationDelay: '1s' }} />
            <div aria-hidden className="pointer-events-none absolute right-1/4 top-6 h-2 w-2 rounded-full bg-white/50 animate-float-soft" style={{ animationDelay: '2s' }} />

            <div className="relative">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur ring-1 ring-inset ring-white/30">
                  <Heart className="h-3.5 w-3.5" /> {p.impactTitle}
                </span>
                <h2 className="font-serif text-3xl font-black sm:text-4xl">{g.title} {g.titleHighlight}</h2>
              </div>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {g.impact.map((s) => (
                  <div key={s.label} className="text-center">
                    <Counter to={s.value} suffix={s.suffix} className="tabular font-serif text-4xl font-black drop-shadow-md sm:text-5xl" />
                    <p className="mt-1 text-sm font-medium text-white/85">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 text-center">
                <Button
                  asChild
                  className="sheen group gap-2 rounded-full bg-white px-7 font-bold text-brand-emerald shadow-md transition hover:scale-[1.02] hover:bg-white/95"
                >
                  <Link href="/#prezzi">
                    {tr.cta.primary} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
            <ContactSection />

    </PageShell>
  )
}
