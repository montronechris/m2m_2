"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QrCode, ArrowRight, ShoppingCart } from "lucide-react";
import type { Palette } from "@/components/client/order/CategoryFilter";

interface NavbarProps {
  onScrollToTop?: () => void;
  tableNumber?: string | null;
  sessionId?: string | null;
  cartCount?: number;
  cartHref?: string;
  palette?: Palette;
}

export function Navbar({ onScrollToTop, tableNumber, sessionId, cartCount = 0, cartHref, palette }: NavbarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);

  const brand = palette?.brand ?? "#10b981";
  const bgFrom = palette ? shadeHex(brand, -0.55) : null;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPanelOpen(document.body.hasAttribute("data-panel-open"));
    });
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const handleLogoClick = () => {
    if (isHome) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      onScrollToTop?.();
    } else {
      router.push("/");
    }
  };

  if (panelOpen) return null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md"
      style={palette ? {
        background: `${palette.light100}e6`,
        borderBottom: `1px solid ${palette.border}`,
      } : {
        background: "rgba(255,255,255,0.80)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 grid grid-cols-3 items-center">

        {/* LOGO & BRAND */}
        <button
          onClick={handleLogoClick}
          className="group flex items-center gap-3 p-2 -ml-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div
            style={palette ? {
              background: `linear-gradient(135deg, ${shadeHex(brand, -0.35)}, ${brand})`,
              boxShadow: `0 4px 14px ${brand}33`,
            } : undefined}
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl shadow-lg transition-all duration-300 group-hover:scale-105 ${!palette ? "bg-gradient-to-br from-green-600 to-emerald-600 shadow-green-500/20 group-hover:shadow-green-500/40" : ""}`}
          >
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col items-start">
            <span
              className="font-bold text-xl text-gray-900 tracking-tight leading-none transition-colors"
              style={palette ? {} : undefined}
              onMouseEnter={e => palette && ((e.currentTarget as HTMLSpanElement).style.color = brand)}
              onMouseLeave={e => palette && ((e.currentTarget as HTMLSpanElement).style.color = "")}
            >
              TavolaRapida
            </span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Digital Menu
            </span>
          </div>
        </button>

        {/* DESKTOP NAVIGATION */}
        <nav
          className="hidden md:flex justify-center items-center gap-1 p-1 rounded-full"
          style={palette ? {
            background: palette.chipBg,
            border: `1px solid ${palette.border}`,
          } : {
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {tableNumber && sessionId ? (
            <>
              <NavLink href={`/order/${sessionId}`} brand={brand}>Il tuo ordine</NavLink>
              <span className="px-5 py-2 text-base font-black text-gray-900 tracking-wide uppercase border-x border-gray-200">
                Tavolo {tableNumber}
              </span>
              <NavLink href={`/status/${sessionId}`} brand={brand}>Stato ordine</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/#features" brand={brand}>Funzionalità</NavLink>
              <NavLink href="/#contact" brand={brand}>Contatti</NavLink>
              <NavLink href="/login" brand={brand}>Area Cucina</NavLink>
            </>
          )}
        </nav>

        {/* CTA BUTTON */}
        <div className="flex justify-end items-center gap-4">
          {tableNumber && sessionId ? (
            <Link
              id="cart-icon"
              href={cartHref ?? `/cart/${sessionId}`}
              aria-label="Carrello"
              style={palette ? { background: bgFrom ?? "#111" } : undefined}
              className={`relative hidden sm:flex items-center justify-center w-11 h-11 text-white rounded-full transition-all duration-300 hover:-translate-y-0.5 ${!palette ? "bg-gray-900 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25" : ""}`}
              onMouseEnter={e => palette && ((e.currentTarget as HTMLAnchorElement).style.background = brand)}
              onMouseLeave={e => palette && ((e.currentTarget as HTMLAnchorElement).style.background = bgFrom ?? "#111")}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  style={palette ? { background: brand } : undefined}
                  className={`absolute -top-1 -right-1 w-5 h-5 text-white text-[11px] font-bold rounded-full flex items-center justify-center ${!palette ? "bg-green-500" : ""}`}
                >
                  {cartCount}
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/scan/TAV1-X9Z2"
              style={palette ? { background: bgFrom ?? "#111" } : undefined}
              className={`hidden sm:flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 ${!palette ? "bg-gray-900 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25" : ""}`}
              onMouseEnter={e => palette && ((e.currentTarget as HTMLAnchorElement).style.background = brand)}
              onMouseLeave={e => palette && ((e.currentTarget as HTMLAnchorElement).style.background = bgFrom ?? "#111")}
            >
              <span>Demo Live</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-gray-500 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children, brand }: { href: string; children: React.ReactNode; brand: string }) {
  return (
    <Link
      href={href}
      className="px-5 py-2 text-sm font-medium text-gray-600 rounded-full hover:bg-white hover:shadow-sm transition-all"
      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = brand)}
      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "")}
    >
      {children}
    </Link>
  );
}

function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8)  & 255) * (1 + amount));
  const b = clamp(( n        & 255) * (1 + amount));
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}