'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { HelpCircle, MessageCircle, Mail, ArrowRight } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n/I18nProvider'

export function FAQSection() {
  const { tr } = useI18n()
  const f = tr.faq

  return (
    <section
      id="faq"
      className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      {/* decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-40" />
      <div className="pointer-events-none absolute -left-10 top-12 h-64 w-64 rounded-full bg-brand-amber/10 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-10 bottom-12 h-72 w-72 rounded-full bg-brand-rose/10 blur-3xl animate-blob-alt" />

      <div className="relative mx-auto max-w-5xl px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
            <HelpCircle className="h-3.5 w-3.5" />
            {f.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {f.title}{' '}
            <span className="text-gradient-warm">{f.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{f.subtitle}</p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-12 max-w-3xl"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {f.items.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className="lift-hover noise-overlay overflow-hidden rounded-2xl border border-ink/5 bg-white/80 px-5 shadow-sm backdrop-blur last:border-b"
              >
                <AccordionTrigger className="py-5 text-left font-serif text-base font-bold text-ink hover:no-underline sm:text-lg">
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-amber/15 text-brand-terra">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <span>{item.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-ink/65 sm:text-base">
                  <p className="pl-10 pr-2">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-12 flex flex-col items-center justify-center gap-4 text-center"
        >
          <p className="text-base font-semibold text-ink/70">{f.cta}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="sheen group gap-2 rounded-full bg-brand-terra px-6 text-base font-semibold text-white shadow-md hover:bg-brand-terra/90"
            >
              <a href="mailto:hello@m2m.app">
                <Mail className="h-4 w-4" />
                {f.ctaButton}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="lift-hover gap-2 rounded-full border-ink/15 px-6 text-base font-semibold text-ink hover:bg-ink/5"
            >
              <Link href="/scan/TERR-HRVU">
                <MessageCircle className="h-4 w-4" />
                Demo
              </Link>
            </Button>
          </div>
        </motion.div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
