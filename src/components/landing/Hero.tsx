'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Play,
  Sparkles,
  QrCode,
  Star,
  UtensilsCrossed,
  ChefHat,
  Wine,
  BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhoneMockup } from './PhoneMockup'
import { useI18n } from '@/components/i18n/I18nProvider'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

export function Hero() {
  const { tr } = useI18n()
  const h = tr.hero
  const p = tr.promo

  return (
    <section className="relative overflow-hidden pt-44 pb-20 sm:pt-52 lg:pt-56 sm:pb-24">
      {/* Decorative floating orbs in background */}
      <div aria-hidden className="pointer-events-none absolute -left-20 top-40 h-40 w-40 rounded-full bg-brand-amber/20 blur-3xl animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute right-10 top-24 h-24 w-24 rounded-full bg-brand-rose/20 blur-2xl animate-float-soft" style={{ animationDelay: '1.5s' }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-20 h-48 w-48 rounded-full bg-brand-emerald/15 blur-3xl animate-blob" />

      {/* Floating restaurant-themed decorative icons */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, rotate: -10 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="pointer-events-none absolute left-[6%] top-32 hidden text-brand-terra/25 blur-[1px] md:block lg:left-[3%]"
      >
        <UtensilsCrossed className="h-16 w-16 animate-float-soft" strokeWidth={1.4} />
      </motion.div>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="pointer-events-none absolute right-[8%] top-44 hidden text-brand-violet/25 blur-[1px] lg:block"
      >
        <ChefHat className="h-20 w-20 animate-float-soft" strokeWidth={1.4} style={{ animationDelay: '1.2s' }} />
      </motion.div>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="pointer-events-none absolute left-[12%] bottom-10 hidden text-brand-rose/25 blur-[1px] md:block"
      >
        <Wine className="h-14 w-14 animate-float-soft" strokeWidth={1.4} style={{ animationDelay: '2s' }} />
      </motion.div>

      {/* Animated gradient hairline at the bottom of hero */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-brand-amber/70 to-brand-rose/60 animate-gradient-pan" style={{ backgroundSize: '200% 100%' }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px divider-gradient opacity-80" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <motion.div variants={container} initial="hidden" animate="show" className="relative">
            {/* Soft veil so the headline always sits on a clean, high-contrast pad */}
            <div aria-hidden className="hero-veil pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10" />
            <motion.div variants={item} className="flex flex-wrap items-center gap-2">
              <span className="eyebrow border border-brand-amber/30 bg-brand-amber/10 text-brand-terra">
                <Sparkles className="h-3.5 w-3.5 animate-sparkle-spin" />
                {h.badge}
              </span>
              {/* Promo badge — 14 days */}
              <span className="sheen relative inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-rose to-brand-violet px-6 py-2.5 text-base font-bold text-white shadow-glow-rose">
                <span aria-hidden className="absolute inset-0 rounded-full bg-brand-rose/40 blur-md -z-10 animate-pulse" />
                <Star className="h-3.5 w-3.5 fill-current" />
                {p.badge}: {p.text}
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="text-lift mt-5 font-serif text-5xl font-black leading-[1.04] tracking-tight text-ink drop-shadow-sm sm:text-6xl lg:text-7xl"
            >
              {h.title1}
              <br />
              {h.title2}
              <br />
              <span className="relative inline-block">
                <span className="text-gradient-warm text-lift-strong animate-gradient-pan">{h.titleHighlight}</span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  aria-hidden
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    d="M2 8 C 80 2, 220 2, 298 8"
                    stroke="oklch(0.55 0.21 55)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-lg leading-relaxed text-ink/60"
            >
              {h.subtitle}
            </motion.p>

            <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                asChild
                className="sheen group gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-7 text-base font-semibold text-white shadow-glow-amber hover:opacity-95 hover:shadow-glow-amber"
              >
                <Link href="/#prezzi">
                  {h.ctaPrimary}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="lift-hover gap-2 rounded-full border-ink/15 bg-white/70 px-7 text-base font-semibold text-ink backdrop-blur hover:bg-white"
              >
                <Link href="/scan/TERR-HRVU">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-violet/15 text-brand-violet">
                    <Play className="h-3 w-3 fill-current" />
                  </span>
                  {h.ctaSecondary}
                </Link>
              </Button>
            </motion.div>

            {/* Trust row */}
            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2.5">
                <div className="relative flex -space-x-2.5">
                  {['from-brand-amber to-brand-terra', 'from-brand-emerald to-brand-sky', 'from-brand-rose to-brand-violet', 'from-brand-sky to-brand-emerald'].map(
                    (g, i) => (
                      <span
                        key={i}
                        className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br ${g} text-[10px] font-bold text-white shadow-sm`}
                      >
                        {['AM', 'GB', 'LC', 'MR'][i]}
                      </span>
                    )
                  )}
                  <span className="grid h-6 w-6 translate-x-1 place-items-center rounded-full border-2 border-white bg-brand-emerald text-white shadow-md ring-2 ring-brand-emerald/20">
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-0.5 text-brand-amber">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-ink/50">{h.trustRestaurants}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-ink/10" />
              <div className="flex items-center gap-2 text-ink/60">
                <span className="status-dot bg-brand-emerald" />
                <QrCode className="h-5 w-5 text-brand-emerald" />
                <span className="font-medium">{h.setup}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: phone */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="relative"
          >
            {/* Colored radial halo behind the phone */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.72_0.19_60/0.45),oklch(0.62_0.22_18/0.22)_45%,transparent_70%)] blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-amber/15 blur-3xl animate-float-soft" />
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
