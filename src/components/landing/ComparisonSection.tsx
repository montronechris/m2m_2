'use client'

import { motion } from 'framer-motion'
import { Check, X, Sparkles, TableProperties } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/components/i18n/I18nProvider'
import { cn } from '@/lib/utils'

function CellCheck({ value }: { value: boolean }) {
  return value ? (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-emerald/15 text-brand-emerald">
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  ) : (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/5 text-ink/30">
      <X className="h-4 w-4" strokeWidth={3} />
    </span>
  )
}

export function ComparisonSection() {
  const { tr, lang } = useI18n()
  const c = tr.comparison
  const recommendedLabel = lang === 'it' ? 'Consigliato' : 'Recommended'

  return (
    <section
      id="confronto"
      className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      {/* decorative orbs */}
      <div className="pointer-events-none absolute -left-10 top-1/3 h-72 w-72 rounded-full bg-brand-emerald/10 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-10 bottom-1/4 h-72 w-72 rounded-full bg-brand-violet/10 blur-3xl animate-blob-alt" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-sky/30 bg-brand-sky/10 text-brand-sky">
            <TableProperties className="h-3.5 w-3.5" />
            {c.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {c.title}{' '}
            <span className="text-gradient-vivid">{c.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{c.subtitle}</p>
        </motion.div>

        {/* Desktop table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hidden md:block"
        >
          <div className="relative mt-12 overflow-hidden rounded-3xl border border-ink/5 bg-white/80 shadow-md backdrop-blur">
            <Table>
              <TableHeader>
                <TableRow className="border-ink/5 bg-ink/5 hover:bg-ink/5">
                  <TableHead className="h-16 px-5 text-xs font-bold uppercase tracking-wider text-ink/60">
                    {c.features}
                  </TableHead>
                  <TableHead className="relative h-16 px-5 text-center">
                    <span className="absolute inset-x-0 -top-px h-1 bg-gradient-to-r from-brand-amber via-brand-terra to-brand-rose" />
                    <div className="relative flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        <Sparkles className="h-2.5 w-2.5" /> {recommendedLabel}
                      </span>
                      <span className="font-serif text-lg font-black text-ink">{c.us}</span>
                    </div>
                  </TableHead>
                  <TableHead className="h-16 px-5 text-center font-serif text-lg font-bold text-ink/50">
                    {c.paper}
                  </TableHead>
                  <TableHead className="h-16 px-5 text-center font-serif text-lg font-bold text-ink/50">
                    {c.generic}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.rows.map((row, i) => (
                  <TableRow
                    key={row.f}
                    className={cn(
                      'border-ink/5 transition-colors hover:bg-brand-amber/[0.04]',
                      i % 2 === 0 ? 'bg-white' : 'bg-ink/[0.015]'
                    )}
                  >
                    <TableCell className="px-5 py-4 text-sm font-medium text-ink/80">
                      {row.f}
                    </TableCell>
                    <TableCell className="relative px-5 py-4">
                      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-brand-amber/[0.08] via-brand-terra/[0.04] to-brand-rose/[0.08]" />
                      <div className="relative flex justify-center">
                        <CellCheck value={row.us} />
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-center">
                        <CellCheck value={row.paper} />
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-center">
                        <CellCheck value={row.generic} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>

        {/* Mobile stacked cards */}
        <div className="mt-10 space-y-3 md:hidden">
          {/* Mini legend */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-gradient-to-br from-brand-amber/15 to-brand-rose/10 px-2 py-1.5 ring-1 ring-brand-amber/30">
              <span className="text-[11px] font-bold text-brand-terra">{c.us}</span>
            </div>
            <div className="rounded-xl bg-ink/5 px-2 py-1.5">
              <span className="text-[11px] font-bold text-ink/50">{c.paper}</span>
            </div>
            <div className="rounded-xl bg-ink/5 px-2 py-1.5">
              <span className="text-[11px] font-bold text-ink/50">{c.generic}</span>
            </div>
          </div>

          {c.rows.map((row, i) => (
            <motion.div
              key={row.f}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              className="lift-hover noise-overlay rounded-2xl border border-ink/5 bg-white/80 p-4 shadow-sm backdrop-blur"
            >
              <p className="text-sm font-semibold text-ink">{row.f}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {/* m2m */}
                <div
                  className={cn(
                    'rounded-xl px-2 py-2',
                    row.us
                      ? 'bg-gradient-to-br from-brand-amber/15 to-brand-rose/10 ring-1 ring-brand-amber/30'
                      : 'bg-ink/5'
                  )}
                >
                  <div className="flex justify-center">
                    <CellCheck value={row.us} />
                  </div>
                </div>
                {/* paper */}
                <div className="rounded-xl bg-ink/5 px-2 py-2">
                  <div className="flex justify-center">
                    <CellCheck value={row.paper} />
                  </div>
                </div>
                {/* generic */}
                <div className="rounded-xl bg-ink/5 px-2 py-2">
                  <div className="flex justify-center">
                    <CellCheck value={row.generic} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 h-px divider-gradient" />
      </div>
    </section>
  )
}
