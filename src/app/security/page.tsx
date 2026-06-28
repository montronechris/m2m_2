'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield,
  ShieldCheck,
  Lock,
  FileCheck2,
  CreditCard,
  DatabaseBackup,
  KeyRound,
  ScrollText,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  ServerCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/landing/PageShell'
import { Counter } from '@/components/landing/Counter'
import { useI18n } from '@/components/i18n/I18nProvider'
import { ContactSection } from '@/components/landing/ContactSection'

const icons = [Lock, FileCheck2, CreditCard, DatabaseBackup, KeyRound, ScrollText]
const themes = [
  { wrap: 'bg-brand-emerald/15 text-brand-emerald', ring: 'group-hover:ring-brand-emerald/30', glow: 'group-hover:shadow-glow-emerald' },
  { wrap: 'bg-brand-sky/15 text-brand-sky', ring: 'group-hover:ring-brand-sky/30', glow: 'group-hover:shadow-[0_18px_40px_-16px_oklch(0.6_0.15_235_/_0.35)]' },
  { wrap: 'bg-brand-amber/15 text-brand-amber', ring: 'group-hover:ring-brand-amber/30', glow: 'group-hover:shadow-glow-amber' },
  { wrap: 'bg-brand-violet/15 text-brand-violet', ring: 'group-hover:ring-brand-violet/30', glow: 'group-hover:shadow-glow-violet' },
  { wrap: 'bg-brand-rose/15 text-brand-rose', ring: 'group-hover:ring-brand-rose/30', glow: 'group-hover:shadow-glow-rose' },
  { wrap: 'bg-brand-terra/15 text-brand-terra', ring: 'group-hover:ring-brand-terra/30', glow: 'group-hover:shadow-[0_18px_40px_-16px_oklch(0.64_0.21_38_/_0.35)]' },
]

const heroFloatIcons = [
  { Icon: Shield, className: 'left-[6%] top-28 h-14 w-14 text-brand-sky/25', delay: '0s' },
  { Icon: Lock, className: 'right-[8%] top-36 h-16 w-16 text-brand-violet/25', delay: '1.2s' },
  { Icon: Fingerprint, className: 'left-[14%] bottom-16 h-12 w-12 text-brand-emerald/25', delay: '2s' },
  { Icon: ServerCog, className: 'right-[12%] bottom-24 h-16 w-16 text-brand-amber/20', delay: '2.6s' },
]

export default function SecurityPage() {
  const { tr } = useI18n()
  const s = tr.pages.security

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-44 pb-12 sm:pt-52 lg:pt-56 sm:pb-16">
        {/* Decorative floating orbs + icons */}
        <div aria-hidden className="pointer-events-none absolute -left-20 top-32 h-44 w-44 rounded-full bg-brand-sky/20 blur-3xl animate-float-soft" />
        <div aria-hidden className="pointer-events-none absolute right-0 top-24 h-40 w-40 rounded-full bg-brand-violet/15 blur-3xl animate-blob" />
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-10 h-48 w-48 rounded-full bg-brand-emerald/15 blur-3xl animate-float-soft" style={{ animationDelay: '1.5s' }} />

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

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px divider-gradient opacity-80" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow border border-brand-sky/30 bg-brand-sky/10 text-brand-sky"
          >
            <Shield className="h-3.5 w-3.5" /> {s.badge}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 font-serif text-4xl font-black tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            {s.title}{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(110deg, oklch(0.45 0.16 162), oklch(0.42 0.21 295), oklch(0.45 0.16 235))' }}
            >
              {s.titleHighlight}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/70"
          >
            {s.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild className="sheen group gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-violet font-semibold text-white shadow-glow-violet">
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

      {/* Stats band */}
      <section className="relative py-6">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="noise-overlay grid grid-cols-2 gap-4 rounded-3xl border border-ink/5 bg-white/85 p-6 shadow-xl backdrop-blur lg:grid-cols-4"
          >
            {s.stats.map((st) => (
              <div key={st.label} className="text-center">
                <Counter
                  to={st.value}
                  decimals={'decimals' in st ? st.decimals : 0}
                  suffix={'suffix' in st ? st.suffix : ''}
                  className="tabular font-serif text-3xl font-black text-gradient-warm sm:text-4xl"
                />
                <p className="mt-1 text-xs font-medium text-ink/55">{st.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <div className="divider-gradient" aria-hidden />
      </div>

      {/* Intro + pillars */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-4 text-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-sky to-brand-violet text-white shadow-glow-violet">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <p className="text-lg leading-relaxed text-ink/75">{s.intro}</p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.pillars.map((p, i) => {
              const Icon = icons[i]
              const t = themes[i]
              return (
                <motion.article
                  key={p.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
                  className={`card-gradient-border lift-hover noise-overlay group relative rounded-3xl bg-white/85 p-6 shadow-sm backdrop-blur ring-1 ring-inset ring-ink/5 transition-all duration-300 ${t.ring} ${t.glow}`}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t.wrap} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-serif text-lg font-bold text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{p.desc}</p>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>
      
      <ContactSection />

      {/* CTA */}
      <section className="relative py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="noise-overlay relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-sky via-brand-violet to-brand-terra p-8 text-center text-white shadow-glow-violet sm:p-14"
          >
            <div aria-hidden className="absolute inset-0 bg-grid-soft opacity-20" />
            <div aria-hidden className="pointer-events-none absolute left-8 top-8 h-3 w-3 rounded-full bg-white/40 animate-float-soft" />
            <div aria-hidden className="pointer-events-none absolute right-10 bottom-10 h-4 w-4 rounded-full bg-white/30 animate-float-soft" style={{ animationDelay: '1s' }} />
            <div className="relative">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-inset ring-white/30">
                <CheckCircle2 className="h-8 w-8 drop-shadow-lg" />
              </span>
              <h2 className="mt-5 font-serif text-3xl font-black sm:text-4xl">
                {tr.cta.title1} {tr.cta.title2}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/90">{tr.cta.subtitle}</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="sheen group gap-2 rounded-full bg-white px-7 font-bold text-brand-violet shadow-md transition hover:scale-[1.02] hover:bg-white/95"
                >
                  <Link href="/#prezzi">
                    {tr.cta.primary} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="lift-hover glass gap-2 rounded-full border-white/40 bg-white/15 px-7 font-semibold text-white backdrop-blur hover:bg-white/25"
                >
                  <Link href="/#contattaci">{tr.cta.secondary}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  )
}
