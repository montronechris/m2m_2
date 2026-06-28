'use client'

import { motion } from 'framer-motion'
import {
  CreditCard,
  Plug,
  FileText,
  Mail,
  BarChart3,
  Zap,
  Bell,
  MessageSquare,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/I18nProvider'
import { cn } from '@/lib/utils'

type CatTheme = {
  icon: LucideIcon
  iconBg: string // solid gradient for the logo square
  pill: string // translucent + colored text
  glow: string
}

function themeFor(cat: string): CatTheme {
  const c = cat.toLowerCase()
  if (c === 'pagamenti' || c === 'payments') {
    return {
      icon: CreditCard,
      iconBg: 'bg-gradient-to-br from-brand-amber to-brand-terra',
      pill: 'bg-brand-amber/15 text-brand-terra',
      glow: 'group-hover:shadow-glow-amber',
    }
  }
  if (c === 'pos') {
    return {
      icon: Plug,
      iconBg: 'bg-gradient-to-br from-brand-emerald to-brand-sky',
      pill: 'bg-brand-emerald/15 text-brand-emerald',
      glow: 'group-hover:shadow-glow-emerald',
    }
  }
  if (c === 'fatturazione' || c === 'invoicing') {
    return {
      icon: FileText,
      iconBg: 'bg-gradient-to-br from-brand-violet to-brand-sky',
      pill: 'bg-brand-violet/15 text-brand-violet',
      glow: 'group-hover:shadow-glow-violet',
    }
  }
  if (c === 'email') {
    return {
      icon: Mail,
      iconBg: 'bg-gradient-to-br from-brand-rose to-brand-amber',
      pill: 'bg-brand-rose/15 text-brand-rose',
      glow: 'group-hover:shadow-glow-rose',
    }
  }
  if (c === 'analytics') {
    return {
      icon: BarChart3,
      iconBg: 'bg-gradient-to-br from-brand-sky to-brand-emerald',
      pill: 'bg-brand-sky/15 text-brand-sky',
      glow: 'group-hover:shadow-glow-emerald',
    }
  }
  if (c === 'automazioni' || c === 'automation') {
    return {
      icon: Zap,
      iconBg: 'bg-gradient-to-br from-brand-terra to-brand-amber',
      pill: 'bg-brand-terra/15 text-brand-terra',
      glow: 'group-hover:shadow-glow-amber',
    }
  }
  if (c === 'notifiche' || c === 'notifications') {
    return {
      icon: Bell,
      iconBg: 'bg-gradient-to-br from-brand-amber to-brand-rose',
      pill: 'bg-brand-amber/15 text-brand-amber',
      glow: 'group-hover:shadow-glow-amber',
    }
  }
  // Messaging (default)
  return {
    icon: MessageSquare,
    iconBg: 'bg-gradient-to-br from-brand-emerald to-brand-violet',
    pill: 'bg-brand-emerald/15 text-brand-emerald',
    glow: 'group-hover:shadow-glow-emerald',
  }
}

export function IntegrationsSection() {
  const { tr } = useI18n()
  const i = tr.integrations

  return (
    <section
      id="integrazioni"
      className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      {/* dotted background */}
      <div className="pointer-events-none absolute inset-0 divider-dots opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/5 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-rose/30 bg-brand-rose/10 text-brand-rose">
            <Plug className="h-3.5 w-3.5" />
            {i.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {i.title}{' '}
            <span className="text-gradient-warm">{i.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{i.subtitle}</p>
        </motion.div>

        {/* Grid */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {i.items.map((item, idx) => {
            const t = themeFor(item.cat)
            const Icon = t.icon
            return (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: (idx % 5) * 0.06 }}
                className={cn(
                  'card-gradient-border lift-hover noise-overlay group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-white/80 p-4 text-center shadow-sm backdrop-blur sm:p-5',
                  t.glow
                )}
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-white/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span
                  className={cn(
                    'grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3',
                    t.iconBg
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative">
                  <p className="text-sm font-bold text-ink">{item.name}</p>
                  <span
                    className={cn(
                      'mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      t.pill
                    )}
                  >
                    {item.cat}
                  </span>
                </div>
              </motion.article>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 text-center"
        >
          <p className="text-base font-semibold text-ink/70">{i.cta}</p>
          <Button
            asChild
            className="sheen group gap-2 rounded-full bg-ink px-6 text-base font-semibold text-white shadow-md hover:bg-ink/90"
          >
            <a href="#contattaci">
              <Sparkles className="h-4 w-4" />
              {i.ctaButton}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>
        </motion.div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
