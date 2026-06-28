// src/components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavbarProps {
  onScrollToTop?: () => void;
  tableNumber?: string | null;
  sessionId?: string | null;
  cartCount?: number;
  cartHref?: string;
  brandColor?: string;
  scrolled?: boolean;
  onCallWaiter?: () => void;
  onOpenChat?: () => void;
  restaurantName?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// ─── Chef hat (logo) ──────────────────────────────────────────────────────────

function ChefHat({ size = 34, color = "#B6794C" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 18.5h11M8 18.5v-3.3M16 18.5v-3.3M12 18.5v-3.3" />
      <path d="M7.8 15.3a3.6 3.6 0 0 1-1-7 3.6 3.6 0 0 1 6.9-1.5 3.6 3.6 0 0 1 3.7 1.4 3.6 3.6 0 0 1-1.2 7.1" />
    </svg>
  );
}

// ─── Cart icon ────────────────────────────────────────────────────────────────

function CartSvg() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
      stroke="#d9b67e" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// ─── Magnetic blade link ──────────────────────────────────────────────────────

function BladeLink({
  href,
  children,
  brandColor,
}: {
  href: string;
  children: React.ReactNode;
  brandColor: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 280, damping: 18 });
  const y = useSpring(0, { stiffness: 280, damping: 18 });
  const [hover, setHover] = useState(false);

  const move = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3 - 2);
  };
  const leave = () => { x.set(0); y.set(0); setHover(false); };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={move}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={leave}
      style={{
        x, y,
        color: hover ? brandColor : "#6f5e4c",
        textDecoration: "none",
      }}
      className="relative z-[4] flex flex-col items-center justify-center gap-[6px] px-5 h-full will-change-transform"
    >
      <motion.span
        animate={{ y: hover ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 13 }}
        className="text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap"
      >
        {children}
      </motion.span>
    </motion.a>
  );
}

// ─── Homepage blade link (anchor scroll) ─────────────────────────────────────

function HomepageBladeLink({
  href,
  children,
  brandColor,
  active,
}: {
  href: string;
  children: React.ReactNode;
  brandColor: string;
  active: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 280, damping: 18 });
  const y = useSpring(0, { stiffness: 280, damping: 18 });
  const [hover, setHover] = useState(false);

  const move = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3 - 2);
  };
  const leave = () => { x.set(0); y.set(0); setHover(false); };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={move}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={leave}
      style={{
        x, y,
        color: active || hover ? brandColor : "#6f5e4c",
        textDecoration: "none",
      }}
      className="relative z-[4] flex flex-col items-center justify-center gap-[6px] px-4 h-full will-change-transform"
    >
      <motion.span
        animate={{ y: hover ? -2 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 13 }}
        className="text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap"
      >
        {children}
      </motion.span>
    </motion.a>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Navbar({
  onScrollToTop,
  tableNumber,
  sessionId,
  cartCount = 0,
  cartHref,
  brandColor = "#B6794C",
  scrolled: scrolledProp,
  onCallWaiter,
  onOpenChat,
  restaurantName,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const isStatusPage = pathname.startsWith("/status") || pathname.startsWith("/confirm");
  // isOrderPage dipende SOLO da sessionId + pathname, mai da tableNumber
  // (tableNumber arriva async → causerebbe un frame dove la navbar collassa).
  const isOrderPage = !!(sessionId && (
    pathname.startsWith("/order") ||
    pathname.startsWith("/status") ||
    pathname.startsWith("/confirm") ||
    pathname.startsWith("/cart")
  ));

  // internal scroll state (used if caller doesn't pass scrolled)
  const [scrolledInternal, setScrolledInternal] = useState(false);
  const scrolled = scrolledProp ?? scrolledInternal;

  useEffect(() => {
    if (scrolledProp !== undefined) return;
    const onScroll = () => setScrolledInternal(window.scrollY > 18);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrolledProp]);

  // active section (homepage only)
  const [activeSection, setActiveSection] = useState("top");
  useEffect(() => {
    if (!isHome) return;
    const sections = ["features", "security", "contact"];
    const onScroll = () => {
      const found = sections.find((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= 140 && rect.bottom > 140;
      });
      setActiveSection(found ?? "top");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // Evita hydration mismatch: brandColor arriva async da Supabase,
  // quindi SSR e client divergerebbero su tutti gli stili inline.
  // Rendiamo il componente visibile solo dopo il mount client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // review star button (visible after "Salta")
  const [showReviewStar, setShowReviewStar] = useState(false);
  useEffect(() => {
    const onSkipped = () => setShowReviewStar(true);
    const onOpened  = () => setShowReviewStar(false);
    window.addEventListener("review-skipped", onSkipped);
    window.addEventListener("review-opened",  onOpened);
    return () => {
      window.removeEventListener("review-skipped", onSkipped);
      window.removeEventListener("review-opened",  onOpened);
    };
  }, []);

  // mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  // panel guard
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setPanelOpen(document.body.hasAttribute("data-panel-open"))
    );
    obs.observe(document.body, { attributes: true });
    return () => obs.disconnect();
  }, []);

  if (panelOpen) return null;
  if (!mounted) return null;

  const handleBg = `linear-gradient(177deg, ${brandColor}cc 0%, ${brandColor} 52%, ${brandColor}dd 100%)`;
  const cartFinal = cartHref ?? (sessionId ? `/cart/${sessionId}` : "/");
  const tableLabel = tableNumber ? `TAVOLO-${tableNumber}` : "";

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      style={{
        paddingTop: scrolled ? 10 : 22,
        transition: "padding-top .5s cubic-bezier(.22,.61,.36,1)",
      }}
    >
      {/* ══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div
        className="pointer-events-auto hidden origin-top md:block"
        style={{
          transform: `scale(${scrolled ? 0.9 : 1})`,
          transition: "transform .5s cubic-bezier(.22,.61,.36,1)",
        }}
      >
        <div
          className="relative flex items-stretch"
          style={{
            height: 112,
            width: isOrderPage ? "min(860px, 94vw)" : "min(960px, 94vw)",
            filter:
              "drop-shadow(0 26px 38px rgba(74,48,22,.24)) drop-shadow(0 5px 9px rgba(74,48,22,.14))",
          }}
        >
          {/* ── MANICO SINISTRO = logo / back ── */}
          <motion.button
            onClick={() => {
              if (isHome) {
                window.scrollTo({ top: 0, behavior: "smooth" });
                onScrollToTop?.();
              } else {
                router.push("/");
              }
            }}
            whileHover={{ scale: 1.03, filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="relative flex flex-col items-center justify-center gap-[7px] overflow-hidden"
            style={{
              width: 140,
              borderRadius: "66px 6px 6px 66px",
              background: handleBg,
              boxShadow:
                "inset 0 2px 0 rgba(255,221,180,.18), inset 0 -9px 17px rgba(0,0,0,.28)",
              cursor: "pointer",
              border: "none",
              flexShrink: 0,
            }}
          >
            {/* wood grain */}
            <div className="pointer-events-none absolute inset-0"
              style={{ opacity: 0.45, background: "repeating-linear-gradient(94deg,rgba(20,10,0,.16) 0 1.5px,transparent 1.5px 8px)" }} />
            {/* top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
              style={{ background: "linear-gradient(180deg,rgba(255,225,185,.14),transparent)" }} />

            <div className="relative z-[2]">
              <ChefHat size={30} color="#d9b67e" />
            </div>
            <span className="z-[2] text-[10px] font-semibold tracking-[0.3em]"
              style={{ color: "rgba(247,226,194,.72)", textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>
              {isHome ? "HOME" : "← HOME"}
            </span>
          </motion.button>

          {/* ── BOLSTER sinistro ── */}
          <div className="relative z-[5] -mx-[7px] w-[30px] self-stretch flex-shrink-0"
            style={{
              background: "linear-gradient(177deg,#f0f0ee,#cccdc9 48%,#a6a6a1)",
              clipPath: "polygon(0 0,58% 0,100% 100%,0 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,.75)",
            }} />

          {/* ── LAMA ── */}
          <div
            className="relative flex flex-1 items-center justify-center"
            style={{
              background: "linear-gradient(177deg,#fefdfa 0%,#f4f0e8 38%,#ece6da 60%,#ddd5c6 100%)",
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,.95), inset 0 -4px 9px rgba(120,90,55,.14), inset 0 0 0 1px rgba(255,255,255,.5)",
            }}
          >
            {/* sheen */}
            <div className="pointer-events-none absolute inset-0"
              style={{ opacity: 0.5, background: "linear-gradient(102deg,transparent 28%,rgba(255,255,255,.6) 46%,transparent 58%)" }} />

            {isOrderPage ? (
              /* ── Contenuto sessione ordine ── */
              <div className="relative z-[2] flex h-full items-center gap-0">
                <BladeLink href={`/order/${sessionId}`} brandColor={brandColor}>
                  IL TUO ORDINE
                </BladeLink>

                {/* Divisore + tavolo */}
                <div className="flex flex-col items-center px-5 gap-[5px]">
                  {/* Tre rivetti */}
                  <div className="flex gap-[6px] mb-[2px]">
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,.9), ${brandColor}88)`,
                        boxShadow: "0 1px 2px rgba(0,0,0,.22)",
                      }} />
                    ))}
                  </div>
                  {restaurantName && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2 }}>
                      <span style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: "clamp(1rem, 2.4vw, 1.45rem)",
                        fontWeight: 700,
                        color: "#3a2f26",
                        letterSpacing: "-0.01em",
                        whiteSpace: "nowrap",
                      }}>
                        {restaurantName}
                      </span>
                      {tableNumber && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: brandColor, letterSpacing: "0.05em" }}>
                          #{tableNumber}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{
                    height: 2, width: 28, borderRadius: 9,
                    background: `linear-gradient(90deg, ${brandColor}44, ${brandColor}, ${brandColor}44)`,
                  }} />
                </div>

                <BladeLink href={`/status/${sessionId}`} brandColor={brandColor}>
                  STATO ORDINE
                </BladeLink>
              </div>
            ) : (
              /* ── Contenuto homepage ── */
              <div className="relative z-[2] flex h-full items-stretch">
                {/* sliding underline */}
                <motion.div
                  className="absolute bottom-[26px] left-[28px] z-[3] h-[2.5px] w-7 rounded"
                  style={{ background: `linear-gradient(90deg,${brandColor}88,${brandColor})` }}
                  animate={{
                    x: activeSection === "features" ? 96
                      : activeSection === "security" ? 192
                      : activeSection === "contact" ? 288
                      : 0,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                />
                <HomepageBladeLink href="/#top" brandColor={brandColor} active={activeSection === "top"}>HOME</HomepageBladeLink>
                <HomepageBladeLink href="/#features" brandColor={brandColor} active={activeSection === "features"}>FUNZIONI</HomepageBladeLink>
                <HomepageBladeLink href="/#security" brandColor={brandColor} active={activeSection === "security"}>SICUREZZA</HomepageBladeLink>
                <HomepageBladeLink href="/#contact" brandColor={brandColor} active={activeSection === "contact"}>CONTATTI</HomepageBladeLink>
              </div>
            )}
          </div>

          {/* ── BOLSTER destro ── */}
          <div className="relative z-[5] -mx-[7px] w-[30px] self-stretch flex-shrink-0"
            style={{
              background: "linear-gradient(177deg,#f0f0ee,#cccdc9 48%,#a6a6a1)",
              clipPath: "polygon(42% 0,100% 0,100% 100%,0 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,.75)",
            }} />

          {/* ── MANICO DESTRO ── */}
          {isOrderPage ? (
            /* Notifica cameriere */
            <button
              type="button"
              onClick={onCallWaiter}
              className="relative flex flex-col items-center justify-center gap-[7px] overflow-hidden transition-[filter,transform] duration-300 hover:-translate-y-px hover:brightness-110"
              style={{
                width: 140,
                borderRadius: "6px 66px 66px 6px",
                background: handleBg,
                boxShadow: "inset 0 2px 0 rgba(255,221,180,.18), inset 0 -9px 17px rgba(0,0,0,.28)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <div className="pointer-events-none absolute inset-0"
                style={{ opacity: 0.45, background: "repeating-linear-gradient(94deg,rgba(20,10,0,.16) 0 1.5px,transparent 1.5px 8px)" }} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
                style={{ background: "linear-gradient(180deg,rgba(255,225,185,.14),transparent)" }} />
              <div className="relative z-[2]">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                  stroke="rgba(247,226,194,.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <span className="z-[2] text-[10px] font-semibold tracking-[0.3em]"
                style={{ color: "rgba(247,226,194,.72)", textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>
                NOTIFICA
              </span>
            </button>
          ) : (
            /* Demo Live */
            <Link
              href="/scan/TERR-HRVU"
              rel="noopener"
              className="relative flex flex-col items-center justify-center gap-[7px] overflow-hidden transition-[filter,transform] duration-300 hover:-translate-y-px hover:brightness-110"
              style={{
                width: 160,
                borderRadius: "6px 66px 66px 6px",
                background: "linear-gradient(177deg,#7c5736 0%,#5d3c22 52%,#6a482c 100%)",
                boxShadow: "inset 0 2px 0 rgba(255,221,180,.22), inset 0 -9px 17px rgba(0,0,0,.32)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <div className="pointer-events-none absolute inset-0"
                style={{ opacity: 0.55, background: "repeating-linear-gradient(94deg,rgba(20,10,0,.16) 0 1.5px,transparent 1.5px 8px)" }} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
                style={{ background: "linear-gradient(180deg,rgba(255,225,185,.18),transparent)" }} />
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#d9b67e"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="z-[2]">
                <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 2-3 5s1 4 3 4v9" />
              </svg>
              <span className="z-[2] text-[10px] font-semibold tracking-[0.34em]"
                style={{ color: "rgba(247,226,194,.72)", textShadow: "0 1px 1px rgba(0,0,0,.45)" }}>
                AVVIA DEMO
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className="pointer-events-auto relative w-[min(560px,92vw)] md:hidden">
        <div
          className="flex items-center justify-between rounded-[22px] border border-white/60 px-[18px]"
          style={{
            paddingTop: scrolled ? 12 : 20,
            paddingBottom: scrolled ? 12 : 20,
            background: "rgba(245,240,231,.82)",
            backdropFilter: "blur(18px) saturate(150%)",
            boxShadow: "0 14px 32px -14px rgba(80,55,25,.35)",
            transition: "padding .45s ease",
          }}
        >
          {/* Logo / back */}
          <button
            onClick={() => {
              if (isHome) { window.scrollTo({ top: 0, behavior: "smooth" }); onScrollToTop?.(); }
              else router.push("/");
            }}
            className="flex items-center gap-2.5"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <ChefHat size={26} color={brandColor} />
            {isOrderPage ? (
              restaurantName && (
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 17, fontWeight: 700, color: "#3a2f26",
                    letterSpacing: "-0.01em",
                  }}>
                    {restaurantName}
                  </span>
                  {tableNumber && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: brandColor, letterSpacing: "0.04em" }}>
                      #{tableNumber}
                    </span>
                  )}
                </div>
              )
            ) : (
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 15, fontWeight: 600, color: "#3a2f26",
                letterSpacing: "-0.01em",
              }}>
                TavolaRapida
              </span>
            )}
          </button>

          {/* Right side */}
          {isOrderPage ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Stellina recensione — visibile solo su /status dopo "Salta" */}
              {showReviewStar && pathname.startsWith("/status") && (
                <motion.button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-review"))}
                  title="Lascia una recensione"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  whileTap={{ scale: 0.88 }}
                  style={{
                    width: 38, height: 38, borderRadius: 12,
                    border: `1.5px solid ${brandColor}33`,
                    background: `${brandColor}18`,
                    color: brandColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 20,
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <motion.span
                    animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeInOut" }}
                    style={{ display: "block", lineHeight: 1 }}
                  >
                    ⭐
                  </motion.span>
                  <motion.span
                    aria-hidden
                    animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut", repeatDelay: 0.6 }}
                    style={{
                      position: "absolute", inset: 0, borderRadius: 12,
                      border: `2px solid ${brandColor}`, pointerEvents: "none",
                    }}
                  />
                </motion.button>
              )}
              {/* Bell / chiama cameriere */}
              <motion.button
                onClick={onCallWaiter}
                title="Chiama il cameriere"
                whileTap={{ scale: 0.88 }}
                style={{
                  position: "relative",
                  width: 38, height: 38, borderRadius: 12,
                  border: `1.5px solid ${brandColor}33`,
                  background: `${brandColor}18`,
                  color: brandColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </motion.button>
            </div>
          ) : (
            /* Hamburger */
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="menu"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border bg-white/50"
              style={{ borderColor: "rgba(120,90,55,.16)", color: "#5a4a38" }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                {mobileOpen
                  ? <path d="M6 6l12 12M18 6 6 18" />
                  : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          )}
        </div>

        {/* Mobile dropdown (homepage) */}
        {mobileOpen && !isOrderPage && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute inset-x-0 top-[calc(100%+10px)] rounded-3xl border border-white/60 p-3.5"
            style={{
              background: "rgba(246,241,232,.9)",
              backdropFilter: "blur(26px) saturate(150%)",
              boxShadow: "0 24px 48px -18px rgba(80,55,25,.45)",
            }}
          >
            {[
              { href: "/#top", label: "HOME" },
              { href: "/#features", label: "FUNZIONI" },
              { href: "/#security", label: "SICUREZZA" },
              { href: "/#contact", label: "CONTATTI" },
            ].map(({ href, label }) => (
              <a key={href} href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-4 rounded-[15px] px-4 py-3.5 hover:bg-white/60"
                style={{ color: "#4a3d30", textDecoration: "none" }}>
                <span className="text-[15px] font-semibold tracking-[0.1em]">{label}</span>
              </a>
            ))}
            <Link
              href="/scan/TERR-HRVU"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center rounded-[15px] px-4 py-4 text-base font-semibold"
              style={{ color: "#fff8ef", background: "linear-gradient(135deg,#8a5e30,#6a482c)", boxShadow: "0 12px 26px -12px rgba(106,72,44,.7)", textDecoration: "none" }}
            >
              Avvia Demo →
            </Link>
          </motion.div>
        )}

        {/* Mobile order links (order pages) */}
        {isOrderPage && (
          <div
            className="mt-2 flex rounded-[18px] border border-white/60 overflow-hidden"
            style={{
              background: "rgba(245,240,231,.78)",
              backdropFilter: "blur(18px) saturate(150%)",
              boxShadow: "0 8px 20px -10px rgba(80,55,25,.28)",
            }}
          >
            {[
              { href: `/order/${sessionId}`, label: "IL TUO ORDINE" },
              { href: `/status/${sessionId}`, label: "STATO ORDINE" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                style={{
                  flex: 1, padding: "12px 4px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", color: "#6f5e4c",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                  textDecoration: "none",
                  borderBottom: pathname === href ? `2px solid ${brandColor}` : "2px solid transparent",
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = brandColor)}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "#6f5e4c")}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}