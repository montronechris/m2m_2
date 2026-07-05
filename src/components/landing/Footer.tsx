'use client'

import Link from 'next/link'
import { UtensilsCrossed, Instagram, Facebook, Twitter } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

export function Footer() {
  const { tr } = useI18n()
  const f = tr.footer

  const cols = [
    { title: f.product, links: f.productLinks },
    { title: f.company, links: f.companyLinks },
    { title: f.resources, links: f.resourcesLinks },
  ]

  return (
    <footer className="relative mt-auto border-t border-ink/5 bg-white/60 backdrop-blur">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px divider-gradient" />
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
                <UtensilsCrossed className="h-4 w-4" />
                <span className="status-dot absolute -right-0.5 -top-0.5 bg-brand-emerald" />
              </span>
              <span className="text-lg font-black tracking-tight text-ink">
                m<span className="text-gradient-warm">2</span>m
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/55">{f.tagline}</p>
            <div className="mt-5 flex gap-2">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className="lift-hover grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-white/60 text-ink/60 transition hover:bg-brand-amber hover:text-white hover:border-brand-amber"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-bold text-ink">{c.title}</h4>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="link-underline text-sm text-ink/55 transition hover:text-brand-terra">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-ink/5 pt-6 text-xs text-ink/45 sm:flex-row">
          <p>© {new Date().getFullYear()} m2m — {f.rights}</p>
          <div className="flex gap-4">
            <Link href="#" className="link-underline hover:text-ink">{f.privacy}</Link>
            <Link href="#" className="link-underline hover:text-ink">{f.terms}</Link>
            <Link href="#" className="link-underline hover:text-ink">{f.cookie}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
