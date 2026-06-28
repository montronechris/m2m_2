'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  UtensilsCrossed,
  ArrowRight,
  ChevronDown,
  Shield,
  Leaf,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/i18n/I18nProvider'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PromoCountdown } from './PromoCountdown'

export function Header() {
  const { tr } = useI18n()
  const n = tr.nav
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: n.features, href: '/#funzioni' },
    { label: n.how, href: '/#come-funziona' },
    { label: n.reviews, href: '/#recensioni' },
    { label: n.pricing, href: '/#prezzi' },
  ]

  const discoverLinks = [
    { label: n.discoverSecurity, href: '/security', icon: Shield, color: 'text-brand-sky' },
    { label: n.discoverGreen, href: '/green', icon: Leaf, color: 'text-brand-emerald' },
  ]

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'py-2' : 'py-4'
      )}
    >
      {/* Promo countdown strip — sits on top of the nav bar inside the same fixed stack
          so they never overlap (previously the promo was rendered in <main> at y=0 and
          got covered by this fixed header). */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <PromoCountdown />
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={cn(
            'flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300',
            scrolled
              ? 'glass border border-ink/5 shadow-lg'
              : 'border border-transparent'
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
              <UtensilsCrossed className="h-4 w-4" />
              <span className="status-dot absolute -right-0.5 -top-0.5 bg-brand-emerald" />
            </span>
            <span className="text-lg font-black tracking-tight text-ink">
              m<span className="text-gradient-warm">2</span>m
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="link-underline rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </Link>
            ))}

            {/* Discover more dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="link-underline flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5 hover:text-ink">
                  {n.discover}
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52 rounded-2xl p-1.5">
                <DropdownMenuLabel className="text-xs text-ink/50">
                  {n.discover}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {discoverLinks.map((d) => {
                  const Icon = d.icon
                  return (
                    <DropdownMenuItem key={d.href} asChild>
                      <Link
                        href={d.href}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2"
                      >
                        <span className={cn('grid h-8 w-8 place-items-center rounded-lg bg-ink/5', d.color)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm font-medium text-ink">{d.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-ink/30" />
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Desktop CTA + language */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="font-semibold text-ink/70 hover:text-ink" asChild>
              <Link href="/scan/TERR-HRVU">
                <Play className="mr-1 h-3.5 w-3.5" /> {n.demo}
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="sheen group gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra font-semibold text-white shadow-glow-amber hover:opacity-95"
            >
              <Link href="/#prezzi">
                {n.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lift-hover grid h-10 w-10 place-items-center rounded-xl border border-ink/10 bg-white/60 lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="noise-overlay mt-2 overflow-hidden rounded-2xl glass border border-ink/5 shadow-lg lg:hidden"
            >
              <div className="flex flex-col p-3">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="link-underline rounded-lg px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-1.5 h-px divider-gradient" />
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                  {n.discover}
                </p>
                {discoverLinks.map((d) => {
                  const Icon = d.icon
                  return (
                    <Link
                      key={d.href}
                      href={d.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5"
                    >
                      <Icon className={cn('h-4 w-4', d.color)} />
                      {d.label}
                    </Link>
                  )
                })}
                <div className="my-1.5 flex items-center justify-between rounded-lg bg-ink/5 px-3 py-2">
                  <span className="text-xs font-medium text-ink/50">{n.language}</span>
                  <LanguageSwitcher />
                </div>
                <Button
                  asChild
                  className="sheen mt-2 gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra font-semibold text-white"
                >
                  <Link href="/scan/TERR-HRVU" onClick={() => setOpen(false)}>
                    <Play className="h-3.5 w-3.5" /> {n.demo}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="lift-hover mt-2 gap-1.5 rounded-full font-semibold text-ink"
                >
                  <Link href="/#prezzi" onClick={() => setOpen(false)}>
                    {n.cta}
                  </Link>
                </Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
