'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  Wine,
  BadgeCheck,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/I18nProvider'

// Visual-only avatar group ("Già scelto da 2.000+ ristoranti")
const avatarTints = [
  'from-brand-amber to-brand-terra',
  'from-brand-emerald to-brand-sky',
  'from-brand-rose to-brand-violet',
  'from-brand-violet to-brand-sky',
]

export function CTA() {
  const { tr } = useI18n()
  const c = tr.cta

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      {/* Background decorative icons — floating, blurred, low opacity */}
      <UtensilsCrossed
        aria-hidden
        className="pointer-events-none absolute -left-6 top-12 h-28 w-28 text-brand-terra/20 blur-[1px] animate-float-soft"
      />
      <ChefHat
        aria-hidden
        className="pointer-events-none absolute right-4 top-20 h-24 w-24 text-brand-violet/20 blur-[1px] animate-float-soft"
        style={{ animationDelay: '1.5s' }}
      />
      <Wine
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-1/4 h-20 w-20 text-brand-rose/20 blur-[1px] animate-float-soft"
        style={{ animationDelay: '2.5s' }}
      />

      <div className="relative mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="noise-overlay relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-terra via-brand-amber to-brand-rose p-8 text-center shadow-glow-amber sm:p-14"
        >
          {/* Animated gradient pan layer — bolder, multi-color */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-gradient-pan bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.28)_45%,rgba(255,255,255,0.1)_55%,transparent_75%)] bg-[length:220%_100%]"
          />

          {/* Radial spotlight behind the headline */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,255,255,0.35),transparent_70%)]"
          />

          {/* Floating decorative dots / sparkles */}
          <div aria-hidden className="pointer-events-none absolute left-8 top-8 h-3 w-3 rounded-full bg-white/50 animate-float-soft" />
          <div aria-hidden className="pointer-events-none absolute right-10 bottom-10 h-4 w-4 rounded-full bg-white/40 animate-float-soft" style={{ animationDelay: '1s' }} />
          <div aria-hidden className="pointer-events-none absolute right-1/4 top-6 h-2 w-2 rounded-full bg-white/60 animate-float-soft" style={{ animationDelay: '2s' }} />
          <div aria-hidden className="pointer-events-none absolute left-1/3 bottom-12 h-1.5 w-1.5 rounded-full bg-white/70 animate-float-soft" style={{ animationDelay: '2.6s' }} />
          <Sparkles aria-hidden className="pointer-events-none absolute left-12 top-1/2 h-4 w-4 text-white/50 animate-sparkle-spin" />
          <Sparkles aria-hidden className="pointer-events-none absolute right-16 top-1/3 h-3 w-3 text-white/40 animate-sparkle-spin" style={{ animationDelay: '1.5s' }} />

          {/* Inner soft warm veil for depth */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-terra/30 to-transparent" />

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur ring-1 ring-inset ring-white/30">
                <Sparkles className="h-3.5 w-3.5 animate-sparkle-spin" /> {c.badge}
              </span>

              {/* Urgency pill — countdown / "first 14 days free" */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-terra/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white ring-1 ring-inset ring-white/40 backdrop-blur">
                <Clock className="h-3 w-3" /> Parti oggi · primi 14 giorni gratis
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="mt-5 font-serif text-4xl font-black leading-tight text-white text-lift-strong sm:text-5xl lg:text-6xl"
            >
              {c.title1}
              <br /> {c.title2}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.55 }}
              className="mx-auto mt-4 max-w-xl text-base text-white/90 text-lift sm:text-lg"
            >
              {c.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.55 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Button
                size="lg"
                asChild
                className="sheen group gap-2 rounded-full bg-white px-8 text-base font-bold text-brand-terra shadow-xl hover:bg-white/95"
              >
                <Link href="/#prezzi">
                  {c.primary}
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="lift-hover glass rounded-full border-white/40 bg-white/15 px-8 text-base font-semibold text-white backdrop-blur hover:bg-white/25"
              >
                <Link href="/scan/TERR-HRVU">{c.secondary}</Link>
              </Button>
            </motion.div>

            {/* Trust badge with avatar group */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="mt-8 flex items-center justify-center gap-3"
            >
              <div className="flex -space-x-2.5">
                {avatarTints.map((t, i) => (
                  <span
                    key={i}
                    className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${t} text-[10px] font-bold text-white ring-2 ring-white/80`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                ))}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-terra text-[10px] font-bold text-white ring-2 ring-white/80">
                  +2k
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
                <BadgeCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
                Già scelto da 2.000+ ristoranti
              </div>
            </motion.div>
          </div>

          {/* Bottom gradient divider inside the band */}
          <div aria-hidden className="pointer-events-none absolute inset-x-10 bottom-3 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </motion.div>

        {/* Subtle bottom gradient divider outside the band */}
        <div className="mx-auto mt-12 h-px divider-gradient" />
      </div>
    </section>
  )
}
