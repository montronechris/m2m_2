'use client'

import Link from 'next/link'
import { UtensilsCrossed, Instagram, Facebook } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const socialLinks = [
  { Icon: Instagram, tint: 'hover:bg-gradient-to-br hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:border-transparent' },
  { Icon: Facebook, tint: 'hover:bg-[#1877F2] hover:border-[#1877F2]' },
  { Icon: XIcon, tint: 'hover:bg-black hover:border-black' },
]

export function Footer() {
  const { tr } = useI18n()
  const f = tr.footer

  const cols = [
    {
      title: f.product,
      links: f.productLinks,
      hrefs: ['/#funzioni', '/#prezzi', '/scan/TERR-HRVU', '/integrazioni', '/404'],
    },
    {
      title: f.company,
      links: f.companyLinks,
      hrefs: ['/chi-siamo', '/404', '/404', '/404', '/404'],
    },
    {
      title: f.resources,
      links: f.resourcesLinks,
      hrefs: ['/help', '/qr-code', '/404', '/404', '/404'],
    },
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
              {socialLinks.map(({ Icon, tint }, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social"
                  className={`lift-hover grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-white/60 text-ink/60 transition hover:text-white ${tint}`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-4 md:col-span-2 md:contents lg:col-span-3">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="text-sm font-bold text-ink">{c.title}</h4>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l, i) => (
                    <li key={l}>
                      <Link
                        href={c.hrefs[i]}
                        className="link-underline text-sm text-ink/55 transition hover:text-brand-terra"
                      >
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-ink/5 pt-6 text-xs text-ink/45 sm:flex-row">
          <p>© {new Date().getFullYear()} m2m — {f.rights}</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="link-underline hover:text-ink">{f.privacy}</Link>
            <Link href="/termini" className="link-underline hover:text-ink">{f.terms}</Link>
            <Link href="/cookie" className="link-underline hover:text-ink">{f.cookie}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
