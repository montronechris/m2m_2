"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, UtensilsCrossed, ChevronDown, Leaf, ShieldCheck, Sparkles } from "lucide-react";

/**
 * SiteHeader — Header uniforme per tutte le pagine del sito.
 * Stile glass/lucid warm coerente con la homepage.
 *
 * Nav: FUNZIONI · PREZZI · FAQ · INIZIA ORA · SCOPRI DI PIÙ (dropdown)
 *      + Language switcher IT/EN + ACCEDI + GUARDA DEMO
 */

export type Language = "IT" | "EN";

export const SITE_TRANSLATIONS = {
  IT: {
    navFeatures: "Funzioni",
    navPricing: "Prezzi",
    navFaq: "FAQ",
    navGetStarted: "Inizia ora",
    navDiscover: "Scopri di più",
    navWhyUs: "Perché noi",
    navSecurity: "Sicurezza",
    navGreen: "Green",
    signIn: "Accedi",
    watchDemo: "Guarda Demo",
  },
  EN: {
    navFeatures: "Features",
    navPricing: "Pricing",
    navFaq: "FAQ",
    navGetStarted: "Get Started",
    navDiscover: "Discover more",
    navWhyUs: "Why us",
    navSecurity: "Security",
    navGreen: "Green",
    signIn: "Sign In",
    watchDemo: "Watch Demo",
  },
} as const;

const MAIN_NAV = [
  { labelKey: "navFeatures", href: "/#features" },
  { labelKey: "navPricing", href: "/#pricing" },
  { labelKey: "navFaq", href: "/#faq" },
  { labelKey: "navGetStarted", href: "/#cta" },
] as const;

const DISCOVER_LINKS = [
  { labelKey: "navWhyUs", href: "/perche-sceglierci" },
  { labelKey: "navSecurity", href: "/security" },
  { labelKey: "navGreen", href: "/green" },
] as const;

interface SiteHeaderProps {
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export default function SiteHeader({ language: controlledLang, onLanguageChange }: SiteHeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [internalLang, setInternalLang] = useState<Language>("IT");
  const discoverRef = useRef<HTMLDivElement>(null);

  const language = controlledLang ?? internalLang;
  const t = SITE_TRANSLATIONS[language];

  // Persist language (default IT, leggi da localStorage)
  useEffect(() => {
    if (controlledLang) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem("site_lang") : null;
    if (saved === "IT" || saved === "EN") {
      setInternalLang(saved);
    } else {
      // Default IT, e persistilo
      setInternalLang("IT");
      if (typeof window !== "undefined") localStorage.setItem("site_lang", "IT");
    }
  }, [controlledLang]);

  useEffect(() => {
    if (controlledLang || !onLanguageChange) return;
    localStorage.setItem("site_lang", language);
  }, [language, controlledLang, onLanguageChange]);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDiscoverOpen(false);
  }, [pathname]);

  // Close discover dropdown on ANY click outside the toggle button
  // (including clicks on dropdown links themselves, and anywhere on screen)
  useEffect(() => {
    if (!discoverOpen) return;
    const onClick = (e: MouseEvent) => {
      // Don't close if clicking the toggle button itself (it handles its own toggle)
      const toggle = discoverRef.current?.querySelector("button");
      if (toggle && toggle.contains(e.target as Node)) return;
      // Close on any other click: outside, on links, anywhere
      setDiscoverOpen(false);
    };
    // Use click (not mousedown) so link navigation fires before close
    document.addEventListener("click", onClick);
    // Also close on Escape key
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDiscoverOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [discoverOpen]);

  const setLang = (lang: Language) => {
    if (onLanguageChange) onLanguageChange(lang);
    else {
      setInternalLang(lang);
      if (typeof window !== "undefined") localStorage.setItem("site_lang", lang);
    }
  };

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass-nav" : "bg-transparent"
      }`}
    >
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="glass-card flex size-9 items-center justify-center rounded-xl !p-0 !shadow-none group-hover:!shadow-[0_0_20px_oklch(0.97_0.025_85/10%)] transition-shadow duration-500">
            <UtensilsCrossed className="size-4.5 text-[oklch(0.25_0.10_65)]" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[oklch(0.25_0.10_65)]">
            Menu<span className="text-[oklch(0.80_0.19_85)]">2</span>Me
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {MAIN_NAV.map((link) => {
            const active = isActive(link.href);
            const cls = active
              ? "px-3 xl:px-4 py-2 text-xs xl:text-sm rounded-full transition-all duration-300 text-[oklch(0.25_0.10_65)] bg-[oklch(0.25_0.10_65/0.08)] font-medium whitespace-nowrap"
              : "px-3 xl:px-4 py-2 text-xs xl:text-sm rounded-full transition-all duration-300 text-[oklch(0.38_0.08_60)] hover:text-[oklch(0.25_0.10_65)] hover:bg-[oklch(0.25_0.10_65/0.06)] whitespace-nowrap";
            return (
              <Link key={link.href} href={link.href} className={cls}>
                {t[link.labelKey]}
              </Link>
            );
          })}

          {/* Scopri di più dropdown */}
          <div ref={discoverRef} className="relative">
            <button
              onClick={() => setDiscoverOpen(!discoverOpen)}
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm rounded-full transition-all duration-300 flex items-center gap-1 whitespace-nowrap ${
                discoverOpen
                  ? "text-[oklch(0.25_0.10_65)] bg-[oklch(0.25_0.10_65/0.08)] font-medium"
                  : "text-[oklch(0.38_0.08_60)] hover:text-[oklch(0.25_0.10_65)] hover:bg-[oklch(0.25_0.10_65/0.06)]"
              }`}
              aria-expanded={discoverOpen}
              aria-haspopup="true"
            >
              {t.navDiscover}
              <ChevronDown className={`size-3.5 transition-transform duration-300 ${discoverOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              className={`absolute top-full left-0 mt-2 min-w-[220px] rounded-2xl border border-[oklch(0.45_0.08_65/0.15)] p-1.5 shadow-[0_16px_48px_-12px_rgba(43,38,32,0.25)] origin-top transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                discoverOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
              }`}
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
              }}
            >
              {DISCOVER_LINKS.map((link) => {
                const active = isActive(link.href);
                const iconConfig = {
                  navGreen: { Icon: Leaf, color: "#5E7355", bg: "rgba(94,115,85,0.12)" },
                  navSecurity: { Icon: ShieldCheck, color: "#B6794C", bg: "rgba(182,121,76,0.12)" },
                  navWhyUs: { Icon: Sparkles, color: "#E0A020", bg: "rgba(224,160,32,0.12)" },
                }[link.labelKey] ?? { Icon: Leaf, color: "#5E7355", bg: "rgba(94,115,85,0.12)" };
                const { Icon, color, bg } = iconConfig;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all min-h-[48px] ${
                      active
                        ? "bg-[oklch(0.25_0.10_65/0.04)]"
                        : "hover:bg-[oklch(0.25_0.10_65/0.04)]"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: bg, color }}
                    >
                      <Icon className="size-4.5" />
                    </div>
                      <span
                        className={`text-sm flex-1 ${active ? "font-semibold text-[oklch(0.25_0.10_65)]" : "font-medium text-[oklch(0.30_0.08_60)] group-hover:text-[oklch(0.25_0.10_65)]"}`}
                      >
                        {t[link.labelKey]}
                      </span>
                      <ArrowRight className="size-3.5 text-[oklch(0.50_0.08_60)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Desktop Right: Language + Sign In + Watch Demo */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center rounded-full border border-[oklch(0.15_0.07_60/0.12)] bg-[oklch(0.98_0.015_90/0.6)] backdrop-blur-md p-0.5">
            <button
              onClick={() => setLang("IT")}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${
                language === "IT"
                  ? "bg-[oklch(0.80_0.19_85)] text-[oklch(0.20_0.06_60)] shadow-sm"
                  : "text-[oklch(0.50_0.08_60)] hover:text-[oklch(0.25_0.10_65)]"
              }`}
              aria-label="Italiano"
            >
              IT
            </button>
            <button
              onClick={() => setLang("EN")}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${
                language === "EN"
                  ? "bg-[oklch(0.80_0.19_85)] text-[oklch(0.20_0.06_60)] shadow-sm"
                  : "text-[oklch(0.50_0.08_60)] hover:text-[oklch(0.25_0.10_65)]"
              }`}
              aria-label="English"
            >
              EN
            </button>
          </div>

          <Link
            href="/login"
            className="px-3 lg:px-5 py-2 text-xs lg:text-sm font-medium text-[oklch(0.40_0.09_60)] hover:text-[oklch(0.25_0.10_65)] hover:bg-[oklch(0.25_0.10_65/0.06)] rounded-full transition-all duration-300 whitespace-nowrap"
          >
            {t.signIn}
          </Link>
          <Link
            href="/scan/TERR-HRVU"
            className="group inline-flex items-center gap-1.5 px-3 lg:px-5 py-2 text-xs lg:text-sm font-medium bg-white text-[oklch(0.20_0.06_60)] rounded-full hover:bg-[oklch(0.98_0.02_85)] shadow-[0_2px_16px_-4px_oklch(0.15_0.07_60/20%)] hover:shadow-[0_4px_24px_-4px_oklch(0.80_0.19_85/35%)] hover:scale-[1.03] transition-all duration-300 whitespace-nowrap"
          >
            {t.watchDemo}
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Mobile Right: Language + Menu Button */}
        <div className="md:hidden flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-full border border-[oklch(0.15_0.07_60/0.12)] bg-[oklch(0.98_0.015_90/0.6)] backdrop-blur-md p-0.5">
            <button
              onClick={() => setLang("IT")}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${
                language === "IT" ? "bg-[oklch(0.80_0.19_85)] text-[oklch(0.20_0.06_60)]" : "text-[oklch(0.50_0.08_60)]"
              }`}
              aria-label="Italiano"
            >
              IT
            </button>
            <button
              onClick={() => setLang("EN")}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-all ${
                language === "EN" ? "bg-[oklch(0.80_0.19_85)] text-[oklch(0.20_0.06_60)]" : "text-[oklch(0.50_0.08_60)]"
              }`}
              aria-label="English"
            >
              EN
            </button>
          </div>
          <button
            className="flex size-10 items-center justify-center rounded-xl text-[oklch(0.40_0.09_60)] hover:text-[oklch(0.25_0.10_65)] hover:bg-[oklch(0.25_0.10_65/0.06)] transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          mobileMenuOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="glass-strong mx-4 mb-4 rounded-2xl p-4 space-y-1">
          {MAIN_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-4 py-3 text-sm font-medium text-[oklch(0.40_0.09_60)] rounded-xl hover:text-[oklch(0.25_0.10_65)] hover:bg-[oklch(0.25_0.10_65/0.06)] transition-all min-h-[44px] flex items-center"
            >
              {t[link.labelKey]}
            </Link>
          ))}
          {/* Scopri di più — sezione mobile */}
          <div className="pt-2 pb-1 px-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[oklch(0.50_0.08_60)]">
              {t.navDiscover}
            </p>
          </div>
          {DISCOVER_LINKS.map((link) => {
            const iconConfig = {
              navGreen: { Icon: Leaf, color: "#5E7355", bg: "rgba(94,115,85,0.12)" },
              navSecurity: { Icon: ShieldCheck, color: "#B6794C", bg: "rgba(182,121,76,0.12)" },
              navWhyUs: { Icon: Sparkles, color: "#E0A020", bg: "rgba(224,160,32,0.12)" },
            }[link.labelKey] ?? { Icon: Leaf, color: "#5E7355", bg: "rgba(94,115,85,0.12)" };
            const { Icon, color, bg } = iconConfig;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-[oklch(0.25_0.10_65/0.04)] transition-all min-h-[48px]"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: bg, color }}
                >
                  <Icon className="size-4.5" />
                </div>
                <span className="text-sm font-medium text-[oklch(0.30_0.08_60)]">
                  {t[link.labelKey]}
                </span>
              </Link>
            );
          })}
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center min-h-[48px] rounded-xl border border-[oklch(0.15_0.07_60/0.10)] text-[oklch(0.25_0.10_65)] hover:bg-[oklch(0.25_0.10_65/0.06)] font-medium text-sm transition-all"
            >
              {t.signIn}
            </Link>
            <Link
              href="/scan/TERR-HRVU"
              className="w-full inline-flex items-center justify-center gap-1.5 min-h-[48px] bg-white text-black rounded-xl hover:bg-white/90 font-medium text-sm transition-all"
            >
              {t.watchDemo}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
