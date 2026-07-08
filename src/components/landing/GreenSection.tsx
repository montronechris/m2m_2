'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Leaf,
  Sun,
  FileX,
  Code2,
  TreePine,
  ArrowRight,
} from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { Counter } from './Counter'

const pledgeIcons = [Sun, FileX, Code2, TreePine]

const pledgeThemes = [
  { icon: 'bg-brand-amber/15 text-brand-amber', card: 'hover:border-brand-amber/40' },
  { icon: 'bg-brand-emerald/15 text-brand-emerald', card: 'hover:border-brand-emerald/40' },
  { icon: 'bg-brand-sky/15 text-brand-sky', card: 'hover:border-brand-sky/40' },
  { icon: 'bg-brand-violet/15 text-brand-violet', card: 'hover:border-brand-violet/40' },
]

export function GreenSection() {
  const { tr } = useI18n()
  const g = tr.green

  return (
    <section id="green" className="relative scroll-mt-24 overflow-hidden pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12">
      {/* Soft green tint band */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-emerald/5 via-transparent to-transparent" />
      <div aria-hidden className="pointer-events-none absolute right-10 top-20 h-32 w-32 rounded-full bg-brand-emerald/15 blur-3xl animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-20 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-sky/10 blur-3xl animate-float-soft" style={{ animationDelay: '2s' }} />

      <div className="mx-auto max-w-6xl px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
            <Leaf className="h-3.5 w-3.5" /> {g.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {g.title}{' '}
            <span className="bg-gradient-to-r from-brand-emerald to-brand-sky bg-clip-text text-transparent">
              {g.titleHighlight}
            </span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{g.subtitle}</p>
        </motion.div>

        {/* Our pledge */}
        <motion.h3
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-14 mb-5 flex items-center gap-2 font-serif text-2xl font-bold text-ink"
        >
          <span className="status-dot bg-brand-emerald" />
          <Leaf className="h-6 w-6 text-brand-emerald" />
          {g.pledgeTitle}
        </motion.h3>
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
                className={`lift-hover noise-overlay group rounded-3xl border border-ink/5 bg-white/80 p-5 shadow-sm backdrop-blur transition-all duration-300 ${t.card}`}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${t.icon} transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className="mt-4 font-bold text-ink">{it.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{it.desc}</p>
              </motion.article>
            )
          })}
        </div>

        {/* Impact stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="noise-overlay relative mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-emerald to-brand-sky p-8 text-white shadow-glow-emerald sm:p-10"
        >
          <div aria-hidden className="pointer-events-none absolute right-6 top-6 h-2 w-2 rounded-full bg-white/60 animate-float-soft" />
          <div aria-hidden className="pointer-events-none absolute left-10 bottom-8 h-1.5 w-1.5 rounded-full bg-white/50 animate-float-soft" style={{ animationDelay: '1.2s' }} />
          <h3 className="text-center font-serif text-2xl font-bold sm:text-3xl">
            {g.impactTitle}
          </h3>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {g.impact.map((s, i) => (
              <div key={s.label} className="text-center">
                <Counter
                  to={s.value}
                  suffix={s.suffix}
                  className="tabular font-serif text-4xl font-black sm:text-5xl"
                />
                <p className="mt-1 text-sm text-white/80">{s.label}</p>
                {i < g.impact.length - 1 && (
                  <div className="mx-auto mt-4 hidden h-px w-12 bg-white/30 sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/green"
              className="sheen inline-flex items-center gap-1.5 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              {tr.pages.green.backHome.includes('Torna') ? 'Scopri di più sul nostro impegno' : 'Learn more about our commitment'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-[10px] italic text-white/60">
              {tr.pages.green.backHome.includes('Torna') ? 'Aggiornato automaticamente ogni 72 ore' : 'Automatically updated every 72 hours'}
            </p>
          </div>
        </motion.div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
