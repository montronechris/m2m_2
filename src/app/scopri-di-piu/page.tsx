'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Smartphone,
  QrCode,
  ChefHat,
  BarChart3,
  Star,
  CreditCard,
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
  LayoutDashboard,
  Bell,
  RefreshCw,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/landing/PageShell'
import { Counter } from '@/components/landing/Counter'
import { ContactSection } from '@/components/landing/ContactSection'
import { useI18n } from '@/components/i18n/I18nProvider'

/* ── Module icon + colour theme mapping (mirrors the Features section) ── */
const moduleIcons: LucideIcon[] = [Smartphone, QrCode, ChefHat, BarChart3, Star, CreditCard]
const moduleThemes = [
  {
    ring: 'hover:border-brand-emerald/40',
    iconWrap: 'bg-brand-emerald/15 text-brand-emerald',
    glow: 'group-hover:shadow-glow-emerald',
    accent: 'text-brand-emerald',
    chip: 'bg-brand-emerald/10 text-brand-emerald',
    span: 'lg:col-span-2',
    cornerOrb: 'bg-brand-emerald',
  },
  {
    ring: 'hover:border-brand-rose/40',
    iconWrap: 'bg-brand-rose/15 text-brand-rose',
    glow: 'group-hover:shadow-glow-rose',
    accent: 'text-brand-rose',
    chip: 'bg-brand-rose/10 text-brand-rose',
    cornerOrb: 'bg-brand-rose',
  },
  {
    ring: 'hover:border-brand-amber/40',
    iconWrap: 'bg-brand-amber/15 text-brand-amber',
    glow: 'group-hover:shadow-glow-amber',
    accent: 'text-brand-amber',
    chip: 'bg-brand-amber/10 text-brand-amber',
    span: 'lg:col-span-2',
    cornerOrb: 'bg-brand-amber',
  },
  {
    ring: 'hover:border-brand-violet/40',
    iconWrap: 'bg-brand-violet/15 text-brand-violet',
    glow: 'group-hover:shadow-glow-violet',
    accent: 'text-brand-violet',
    chip: 'bg-brand-violet/10 text-brand-violet',
    cornerOrb: 'bg-brand-violet',
  },
  {
    ring: 'hover:border-brand-sky/40',
    iconWrap: 'bg-brand-sky/15 text-brand-sky',
    glow: 'group-hover:shadow-glow-emerald',
    accent: 'text-brand-sky',
    chip: 'bg-brand-sky/10 text-brand-sky',
    span: 'lg:col-span-2',
    cornerOrb: 'bg-brand-sky',
  },
  {
    ring: 'hover:border-brand-terra/40',
    iconWrap: 'bg-brand-terra/15 text-brand-terra',
    glow: 'group-hover:shadow-glow-amber',
    accent: 'text-brand-terra',
    chip: 'bg-brand-terra/10 text-brand-terra',
    cornerOrb: 'bg-brand-terra',
  },
]

/* Journey step accent colours */
const stepAccents = [
  'from-brand-emerald to-brand-sky',
  'from-brand-sky to-brand-violet',
  'from-brand-violet to-brand-rose',
  'from-brand-rose to-brand-amber',
  'from-brand-amber to-brand-terra',
  'from-brand-terra to-brand-emerald',
]

/* Realtime feature icons */
const realtimeIcons: LucideIcon[] = [RefreshCw, Bell, Users, Utensils]
const realtimeThemes = [
  'bg-brand-emerald/15 text-brand-emerald',
  'bg-brand-amber/15 text-brand-amber',
  'bg-brand-violet/15 text-brand-violet',
  'bg-brand-rose/15 text-brand-rose',
]

/* Floating hero icons */
const heroFloatIcons = [
  { Icon: Smartphone, className: 'left-[5%] top-28 h-14 w-14 text-brand-emerald/25', delay: '0s' },
  { Icon: QrCode, className: 'right-[7%] top-36 h-16 w-16 text-brand-rose/25', delay: '1.2s' },
  { Icon: ChefHat, className: 'left-[12%] bottom-20 h-12 w-12 text-brand-amber/25', delay: '2s' },
  { Icon: BarChart3, className: 'right-[10%] bottom-24 h-16 w-16 text-brand-violet/20', delay: '2.6s' },
]

export default function ScopriDiPiuPage() {
  const { tr } = useI18n()
  const s = tr.pages.scopriDiPiu

  return (
    <PageShell>
      {/* ════════════════ HERO ════════════════ */}
      <section className="relative overflow-hidden pt-16 pb-12 sm:pt-20 lg:pt-24 sm:pb-16">
        {/* Decorative orbs + floating icons */}
        <div aria-hidden className="pointer-events-none absolute -left-20 top-32 h-44 w-44 rounded-full bg-brand-amber/20 blur-3xl animate-float-soft" />
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
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 font-serif text-4xl font-black tracking-tight text-ink text-lift sm:text-6xl lg:text-7xl"
          >
            {s.title}{' '}
            <span className="relative inline-block">
              <span className="text-brand-amber">{s.titleHighlight}</span>
              <svg
                className="absolute -bottom-3 left-0 w-full sm:-bottom-5 lg:-bottom-6"
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
            className="mt-7 flex flex-wrap justify-center gap-3"
          >
            <Button asChild className="sheen group gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra font-semibold text-white shadow-glow-amber">
              <Link href="/create">
                {s.ctaPrimary} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="lift-hover gap-2 rounded-full font-semibold text-ink">
              <Link href="/scan/TERR-HRVU">
                {s.ctaSecondary}
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ════════════════ STATS BAND ════════════════ */}
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
                  decimals={0}
                  suffix={st.suffix}
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

      {/* ════════════════ OVERVIEW ════════════════ */}
      <section className="relative py-14 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -left-10 top-1/4 h-40 w-40 rounded-full bg-brand-emerald/10 blur-3xl animate-float-soft" />
        <div className="mx-auto max-w-4xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
              {s.overview.badge}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-ink sm:text-5xl">
              {s.overview.title}{' '}
              <span className="text-gradient-vivid">{s.overview.titleHighlight}</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
              {s.overview.text}
            </p>
          </motion.div>

          {/* Visual: 5 scattered tools → 1 unified platform */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="noise-overlay mt-12 grid gap-4 rounded-3xl border border-ink/5 bg-white/85 p-6 shadow-lg backdrop-blur sm:p-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center"
          >
            {/* Before: scattered tools */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">{s.overview.beforeLabel}</p>
              {s.overview.beforeItems.map((t, i) => (
                <div
                  key={t}
                  className="flex items-center gap-3 rounded-xl border border-ink/5 bg-ink/[0.02] px-4 py-2.5 text-sm text-ink/55 line-through decoration-brand-rose/60"
                  style={{ marginLeft: `${i * 8}px` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-rose/60" />
                  {t}
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center py-2 lg:py-0">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
                <ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" />
              </div>
            </div>

            {/* After: one platform */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-emerald">{s.overview.afterLabel}</p>
              <div className="rounded-2xl border border-brand-emerald/20 bg-gradient-to-br from-brand-emerald/10 to-brand-amber/10 p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
                    <Utensils className="h-4 w-4" />
                  </span>
                  <span className="font-serif text-xl font-black text-ink">
                    m<span className="text-gradient-warm">2</span>m
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {s.overview.afterText}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <div className="divider-gradient" aria-hidden />
      </div>

      {/* ════════════════ SIX MODULES ════════════════ */}
      <section className="relative py-8 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute right-0 top-1/3 h-40 w-40 rounded-full bg-brand-amber/10 blur-3xl animate-blob" />
        <div aria-hidden className="pointer-events-none absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-brand-rose/10 blur-3xl animate-float-soft" style={{ animationDelay: '2s' }} />

        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-serif text-3xl font-black tracking-tight text-ink sm:text-5xl">
              {s.modules.title}{' '}
              <span className="text-gradient-vivid">{s.modules.titleHighlight}</span>
            </h2>
            <p className="mt-4 text-lg text-ink/60">{s.modules.subtitle}</p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s.modules.items.map((m, i) => {
              const Icon = moduleIcons[i]
              const t = moduleThemes[i]
              const num = String(i + 1).padStart(2, '0')
              return (
                <motion.article
                  key={m.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: (i % 3) * 0.08, duration: 0.55 }}
                  className={`lift-hover noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/85 p-6 shadow-sm backdrop-blur transition-all duration-300 ${t.ring} ${t.glow} ${t.span ?? ''}`}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-brand-amber via-brand-rose to-brand-violet opacity-0 transition-all duration-500 group-hover:scale-x-100 group-hover:opacity-100"
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute right-3 top-1 font-serif text-7xl font-black leading-none ${t.accent} opacity-10 transition-opacity duration-300 group-hover:opacity-20`}
                  >
                    {num}
                  </span>
                  <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-brand-amber/5 blur-2xl" />

                  <div className="relative">
                    <div className="relative inline-block">
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 rounded-2xl ${t.cornerOrb} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30`}
                      />
                      <span className={`relative grid h-14 w-14 place-items-center rounded-2xl ${t.iconWrap} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                        <Icon className="h-7 w-7" />
                      </span>
                    </div>

                    <h3 className="mt-5 font-serif text-xl font-bold tracking-tight text-ink sm:text-2xl">
                      {m.title}
                    </h3>
                    <p className={`mt-1 text-sm font-semibold ${t.accent}`}>{m.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ink/65">{m.desc}</p>

                    <ul className="mt-4 grid gap-2">
                      {m.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-ink/70">
                          <span className={`mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full ${t.chip}`}>
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <div className="divider-gradient" aria-hidden />
      </div>

      {/* ════════════════ CUSTOMER JOURNEY ════════════════ */}
      <section className="relative py-14 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -left-10 top-1/4 h-44 w-44 rounded-full bg-brand-sky/10 blur-3xl animate-float-soft" />

        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="eyebrow border border-brand-sky/30 bg-brand-sky/10 text-brand-sky">
              {s.journey.badge}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-ink sm:text-5xl">
              {s.journey.title}{' '}
              <span className="text-gradient-vivid">{s.journey.titleHighlight}</span>
            </h2>
            <p className="mt-4 text-lg text-ink/60">{s.journey.subtitle}</p>
          </motion.div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {s.journey.steps.map((step, i) => {
              const accent = stepAccents[i]
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
                  className="lift-hover noise-overlay relative overflow-hidden rounded-3xl border border-ink/5 bg-white/85 p-6 shadow-sm backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${accent} font-serif text-lg font-black text-white shadow-lg`}
                    >
                      {step.num}
                    </span>
                    <h3 className="font-serif text-lg font-bold tracking-tight text-ink">{step.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-ink/65">{step.desc}</p>
                  {i < s.journey.steps.length - 1 && (
                    <ArrowUpRight className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-ink/15" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <div className="divider-gradient" aria-hidden />
      </div>

      {/* ════════════════ ADMIN DASHBOARD ════════════════ */}
      <section className="relative py-14 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute right-0 top-1/3 h-40 w-40 rounded-full bg-brand-violet/10 blur-3xl animate-blob" />

        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="eyebrow border border-brand-violet/30 bg-brand-violet/10 text-brand-violet">
              {s.dashboard.badge}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-ink sm:text-5xl">
              {s.dashboard.title}{' '}
              <span className="text-gradient-vivid">{s.dashboard.titleHighlight}</span>
            </h2>
            <p className="mt-4 text-lg text-ink/60">{s.dashboard.subtitle}</p>
          </motion.div>

          {/* Grouped dashboard sections */}
          <div className="mt-12 space-y-10">
            {s.dashboard.groups.map((group, gi) => (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: gi * 0.1, duration: 0.5 }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 divider-gradient" />
                  <h3 className="font-serif text-xl font-bold text-ink">{group.name}</h3>
                  <span className="h-px flex-1 divider-gradient" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.items.map((it) => (
                    <div
                      key={it.title}
                      className="lift-hover noise-overlay rounded-2xl border border-ink/5 bg-white/80 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:border-brand-amber/40 hover:shadow-glow-amber"
                    >
                      <h4 className="font-serif text-base font-bold text-ink">{it.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-ink/60">{it.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Assistant callout */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="noise-overlay mt-12 overflow-hidden rounded-3xl border border-brand-violet/20 bg-gradient-to-br from-brand-violet/10 via-white/80 to-brand-amber/10 p-6 shadow-lg backdrop-blur sm:p-8"
          >
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-violet to-brand-sky text-white shadow-glow-violet">
                <Sparkles className="h-7 w-7 animate-sparkle-spin" />
              </span>
              <div className="flex-1">
                <h3 className="font-serif text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  {s.dashboard.aiTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70 sm:text-base">{s.dashboard.aiDesc}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        <div className="divider-gradient" aria-hidden />
      </div>

      {/* ════════════════ REALTIME ════════════════ */}
      <section className="relative py-14 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -left-10 top-1/4 h-40 w-40 rounded-full bg-brand-emerald/10 blur-3xl animate-float-soft" />
        <div aria-hidden className="pointer-events-none absolute right-0 bottom-1/4 h-40 w-40 rounded-full bg-brand-amber/10 blur-3xl animate-blob" />

        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
              {s.realtime.badge}
            </span>
            <h2 className="mt-4 font-serif text-3xl font-black tracking-tight text-ink sm:text-5xl">
              {s.realtime.title}{' '}
              <span className="text-gradient-vivid">{s.realtime.titleHighlight}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink/65">{s.realtime.desc}</p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.realtime.items.map((it, i) => {
              const Icon = realtimeIcons[i]
              const theme = realtimeThemes[i]
              return (
                <motion.div
                  key={it.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="lift-hover noise-overlay rounded-3xl border border-ink/5 bg-white/85 p-6 text-center shadow-sm backdrop-blur transition-all duration-300 hover:shadow-glow-emerald"
                >
                  <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${theme} transition-transform duration-300 hover:scale-110`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-serif text-base font-bold text-ink">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{it.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════ FINAL CTA ════════════════ */}
      <section className="relative py-10 sm:py-14">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-amber/15 blur-3xl animate-blob" />
        <div className="relative mx-auto max-w-3xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="noise-overlay overflow-hidden rounded-[2rem] border border-ink/5 bg-gradient-to-br from-white/90 via-brand-amber/10 to-brand-terra/10 p-8 text-center shadow-2xl backdrop-blur sm:p-12"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
              <LayoutDashboard className="h-7 w-7" />
            </span>
            <h2 className="mt-5 font-serif text-3xl font-black tracking-tight text-ink sm:text-5xl">
              {s.ctaFinal.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink/65">{s.ctaFinal.subtitle}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild className="sheen group gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra font-semibold text-white shadow-glow-amber">
                <Link href="/create">
                  {s.ctaFinal.primary} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="lift-hover gap-2 rounded-full font-semibold text-ink">
                <Link href="/scan/TERR-HRVU">
                  {s.ctaFinal.secondary}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <ContactSection />
    </PageShell>
  )
}
