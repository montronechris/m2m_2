"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QrCode, ArrowRight, ShoppingCart, X, Menu } from "lucide-react";
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
  const isOrderPage = pathname.startsWith("/order");
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [ultraCompact, setUltraCompact] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = (width: number) => {
      setCompact(width < 430);
      setUltraCompact(width < 320);
    };
    const obs = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    obs.observe(el);
    update(el.getBoundingClientRect().width);
    return () => obs.disconnect();
  }, []);

  const brand = palette?.brand ?? "#10b981";
  const bgFrom = palette ? shadeHex(brand, -0.55) : null;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPanelOpen(document.body.hasAttribute("data-panel-open"));
    });
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const handleLogoClick = () => {
    if (isHome) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      onScrollToTop?.();
    } else {
      router.push("/");
    }
  };

  const closeMenu = () => setSidebarOpen(false);

  if (panelOpen) return null;

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md"
        style={palette ? {
          background: `${palette.light100}e6`,
          borderBottom: `1px solid ${palette.border}`,
          boxShadow: "0 1px 20px rgba(0,0,0,0.06)",
        } : {
          background: "rgba(255,255,255,0.85)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 1px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

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
            {!ultraCompact && (
              <div className="flex flex-col items-start">
                <span
                  className="font-bold text-xl text-gray-900 tracking-tight leading-none transition-colors"
                  onMouseEnter={e => palette && ((e.currentTarget as HTMLSpanElement).style.color = brand)}
                  onMouseLeave={e => palette && ((e.currentTarget as HTMLSpanElement).style.color = "")}
                >
                  TavolaRapida
                </span>
                <span className="text-[10px] font-bold text-gray-400/80 uppercase tracking-[0.12em]">
                  Digital Menu
                </span>
              </div>
            )}
          </button>

          {/* DESKTOP NAVIGATION */}
          <nav
            className="hidden md:flex justify-center items-center gap-0.5 p-1.5 rounded-full"
            style={palette ? {
              background: palette.chipBg,
              border: `1px solid ${palette.border}`,
            } : {
              background: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            {sessionId && tableNumber ? (
              <>
                <NavLink href={`/order/${sessionId}`} brand={brand}>Il tuo ordine</NavLink>
                <span
                  className="px-4 py-2 text-sm font-bold text-gray-900 tracking-wide uppercase border-x whitespace-nowrap"
                  style={{ borderColor: palette?.border ?? "rgba(0,0,0,0.08)" }}
                >
                  {tableNumber}
                </span>
                <NavLink href={`/status/${sessionId}`} brand={brand}>Stato ordine</NavLink>
              </>
            ) : sessionId && !tableNumber ? (
              <span className="px-5 py-2 text-sm text-gray-400">Caricamento…</span>
            ) : (
              <>
                <NavLink href="/#features" brand={brand}>Funzionalità</NavLink>
                <NavLink href="/#contact" brand={brand}>Contatti</NavLink>
                <NavLink href="/login" brand={brand}>Area Cucina</NavLink>
              </>
            )}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex justify-end items-center gap-3">
            {/* Cart icon (session pages) */}
            {sessionId && tableNumber && (
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
            )}

            {/* Demo Live button (desktop only, homepage) */}
            {!sessionId && (
              <Link
                href="/scan/TERR-HRVU"
                style={palette ? { background: brand, boxShadow: `0 4px 14px ${brand}40` } : undefined}
                className={`hidden md:flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-full transition-all duration-300 hover:-translate-y-0.5 ${!palette ? "bg-green-600 hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/30" : ""}`}
                onMouseEnter={e => palette && ((e.currentTarget as HTMLAnchorElement).style.background = shadeHex(brand, 0.15))}
                onMouseLeave={e => palette && ((e.currentTarget as HTMLAnchorElement).style.background = brand)}
              >
                <span>Demo Live</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {/* On /order pages: cart button instead of hamburger (mobile) */}
            {isOrderPage && sessionId ? (
              <Link
                id="cart-icon"
                href={cartHref ?? `/cart/${sessionId}`}
                aria-label="Carrello"
                className="md:hidden flex items-center gap-2 text-white text-sm font-bold rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{
                  background: brand,
                  boxShadow: `0 4px 14px ${brand}40`,
                  padding: compact ? "8px 10px" : "8px 16px",
                  position: "relative",
                }}
              >
                <ShoppingCart className="w-4 h-4" style={{ flexShrink: 0 }} />
                {!compact && <span>Carrello</span>}
                {cartCount > 0 && (
                  compact ? (
                    <span
                      style={{
                        position: "absolute", top: -6, right: -6,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "#fff", color: brand,
                        fontSize: 10, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {cartCount}
                    </span>
                  ) : (
                    <span className="bg-white/25 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {cartCount}
                    </span>
                  )
                )}
              </Link>
            ) : (
              /* Hamburger — visible on mobile, non-order pages */
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Apri menu"
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: sidebarOpen ? brand : "rgba(0,0,0,0.06)",
                  color: sidebarOpen ? "#fff" : "#374151",
                }}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── SIDEBAR OVERLAY ───────────────────────────────────────────── */}

      {/* Backdrop */}
      <div
        onClick={closeMenu}
        className="fixed inset-0 z-[60] transition-all duration-300"
        style={{
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? "auto" : "none",
        }}
      />

      {/* Sidebar panel */}
      <aside
        className="fixed top-0 right-0 h-full z-[70] flex flex-col"
        style={{
          width: "min(320px, 85vw)",
          background: palette ? `${palette.light100}` : "#ffffff",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: palette?.border ?? "rgba(0,0,0,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${shadeHex(brand, -0.35)}, ${brand})`,
              }}
            >
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">Navigazione</span>
          </div>
          <button
            onClick={closeMenu}
            aria-label="Chiudi menu"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1">
          {sessionId && tableNumber ? (
            <>
              {tableNumber && (
                <div
                  className="px-4 py-2 mb-3 rounded-xl text-xs font-bold uppercase tracking-widest"
                  style={{ background: `${brand}18`, color: brand }}
                >
                  Tavolo {tableNumber}
                </div>
              )}
              <SidebarLink href={`/order/${sessionId}`} brand={brand} onClick={closeMenu}>
                Il tuo ordine
              </SidebarLink>
              <SidebarLink href={`/status/${sessionId}`} brand={brand} onClick={closeMenu}>
                Stato ordine
              </SidebarLink>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: palette?.border ?? "rgba(0,0,0,0.07)" }}>
                <Link
                  href={cartHref ?? `/cart/${sessionId}`}
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90"
                  style={{ background: brand }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Carrello {cartCount > 0 && `(${cartCount})`}</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <SidebarLink href="/#features" brand={brand} onClick={closeMenu}>Funzionalità</SidebarLink>
              <SidebarLink href="/#contact" brand={brand} onClick={closeMenu}>Contatti</SidebarLink>
              <SidebarLink href="/login" brand={brand} onClick={closeMenu}>Area Cucina</SidebarLink>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                <Link
                  href="/scan/TERR-HRVU"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90"
                  style={{ background: "#10b981", boxShadow: "0 4px 14px #10b98133" }}
                >
                  <span>Demo Live</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Sidebar footer */}
        <div
          className="px-6 py-4 border-t"
          style={{ borderColor: palette?.border ?? "rgba(0,0,0,0.07)" }}
        >
          <p className="text-[11px] text-gray-400 text-center">
            TavolaRapida · Digital Menu
          </p>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ href, children, brand, onClick }: { href: string; children: React.ReactNode; brand: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-4 py-3.5 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.color = brand;
        (e.currentTarget as HTMLAnchorElement).style.background = `${brand}10`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.color = "";
        (e.currentTarget as HTMLAnchorElement).style.background = "";
      }}
    >
      {children}
    </Link>
  );
}

function NavLink({ href, children, brand }: { href: string; children: React.ReactNode; brand: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-1.5 text-sm font-semibold text-gray-600 rounded-full hover:bg-white hover:shadow-sm hover:text-gray-900 transition-all whitespace-nowrap"
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