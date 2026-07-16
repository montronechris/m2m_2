'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check,
  Sparkles,
  RefreshCcw,
  Headset,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/i18n/I18nProvider'

// Visual-only trust badges (static labels, not from i18n)
const trustLine: { icon: LucideIcon; label: string }[] = [
  { icon: CreditCard, label: 'Nessuna carta richiesta' },
  { icon: RefreshCcw, label: 'Cancella quando vuoi' },
  { icon: Headset, label: 'Supporto 7/7' },
]

export function Pricing() {
  const { tr } = useI18n()
  const p = tr.pricing

  return (
    <section id="prezzi" className="relative overflow-hidden pb-16 pt-8 scroll-mt-24 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12">
      {/* Floating decorative orbs */}
      <div aria-hidden className="pointer-events-none absolute -left-12 top-24 h-44 w-44 rounded-full bg-brand-violet/10 blur-3xl animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-1/3 h-48 w-48 rounded-full bg-brand-amber/10 blur-3xl animate-blob" />

      <div className="relative mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-violet/30 bg-brand-violet/10 text-brand-violet">
            {p.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {p.title}{' '}
            <span className="text-gradient-vivid">{p.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{p.subtitle}</p>
        </motion.div>

        {/* Plans grid */}
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {p.plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.12, duration: 0.55 }}
              className={cn(
                'relative overflow-hidden rounded-3xl border p-6 backdrop-blur',
                plan.featured
                  ? 'noise-overlay animate-border-glow bg-gradient-to-br from-brand-violet to-brand-sky text-white border-transparent shadow-glow-violet lg:-translate-y-4'
                  : 'lift-hover noise-overlay bg-white/80 border-ink/5 shadow-sm'
              )}
            >
              {/* Featured card: subtle grid pattern in the background */}
              {plan.featured && (
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-soft opacity-20" />
              )}
              {/* Soft tinted wash in the top-right corner for non-featured */}
              {!plan.featured && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-brand-amber/10 to-brand-rose/10 blur-2xl"
                />
              )}

              {/* Featured badge — gradient + sparkle spin */}
              {plan.featured && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-rose px-2.5 py-1 text-[11px] font-bold text-white shadow-md ring-1 ring-white/40">
                  <Sparkles className="h-3.5 w-3.5 animate-sparkle-spin" />
                  {p.mostChosen}
                </span>
              )}

              <h3 className={cn('font-serif text-xl font-bold', plan.featured ? 'text-white' : 'text-ink')}>
                {plan.name}
              </h3>
              <p className={cn('mt-1 text-sm', plan.featured ? 'text-white/70' : 'text-ink/50')}>
                {plan.desc}
              </p>

              {/* Price — BIG tabular number with gradient on non-featured */}
              <div className="relative mt-5 flex items-end gap-1">
                <span
                  className={cn(
                    'tabular font-serif text-5xl font-black leading-none sm:text-6xl',
                    plan.featured ? 'text-white text-lift-strong' : 'text-gradient-warm'
                  )}
                >
                  {plan.price}
                </span>
                <span className={cn('mb-1.5 text-sm font-medium', plan.featured ? 'text-white/70' : 'text-ink/40')}>
                  {plan.period}
                </span>
              </div>

              {/* Annual-billing savings pill (visual-only) — reserves height even when absent, so CTA buttons stay aligned across cards */}
              <div className="relative mt-3 flex h-[26px] items-center">
                {plan.note && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur',
                      plan.featured
                        ? 'bg-white/15 text-white ring-1 ring-inset ring-white/30'
                        : 'bg-brand-amber/10 text-brand-terra ring-1 ring-inset ring-brand-amber/30'
                    )}
                  >
                    <Sparkles className="h-3 w-3" /> {plan.note}
                  </span>
                )}
              </div>

              <Button
                asChild
                className={cn(
                  'mt-5 w-full rounded-full font-semibold',
                  plan.featured
                    ? 'sheen bg-white text-brand-violet hover:bg-white/90 shadow-lg'
                    : 'sheen bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber hover:opacity-95 hover:shadow-glow-amber'
                )}
              >
                <Link href={plan.href ?? '/#contattaci'}>
                  {plan.cta}
                </Link>
              </Button>

              <ul className="relative mt-6 grid grid-cols-2 gap-x-3 gap-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn(
                        'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full',
                        plan.featured ? 'bg-white/20' : 'bg-brand-emerald/15'
                      )}
                    >
                      <Check
                        className={cn('h-3 w-3', plan.featured ? 'text-white' : 'text-brand-emerald')}
                        strokeWidth={3}
                      />
                    </span>
                    <span className={plan.featured ? 'text-white/85' : 'text-ink/70'}>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Trust line with icons */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink/55"
        >
          {trustLine.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-brand-amber" />
              {label}
            </span>
          ))}
        </motion.div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
