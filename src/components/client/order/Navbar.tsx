// src/components/client/order/Navbar.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// ─── Props ────────────────────────────────────────────────────────────────────

interface NavbarProps {
  /** Testo centrale (es. nome ristorante / numero tavolo) */
  title: string;
  /** Link href del carrello */
  cartHref: string;
  /** Numero articoli nel carrello (badge) */
  cartCount?: number;
  /** Colore brand del ristorante */
  brandColor?: string;
  /** true se la pagina è scrollata (shrink) */
  scrolled?: boolean;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
      stroke="#d9b67e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
      stroke="#d9b67e" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Navbar({
  title,
  cartHref,
  cartCount = 0,
  brandColor = "#C07A3A",
  scrolled = false,
}: NavbarProps) {
  const router = useRouter();

  const handleBg = `linear-gradient(177deg, ${brandColor}cc 0%, ${brandColor} 52%, ${brandColor}dd 100%)`;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      style={{
        paddingTop: scrolled ? 12 : 24,
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
            height: 88,
            width: "min(820px, 92vw)",
            filter:
              "drop-shadow(0 26px 38px rgba(74,48,22,.24)) drop-shadow(0 5px 9px rgba(74,48,22,.14))",
          }}
        >
          {/* ── MANICO SINISTRO = tasto back ── */}
          <motion.button
            onClick={() => router.push("/")}
            whileHover={{ scale: 1.03, filter: "brightness(1.08)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="relative flex flex-col items-center justify-center gap-[6px] overflow-hidden"
            style={{
              width: 120,
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
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: 0.45,
                background:
                  "repeating-linear-gradient(94deg,rgba(20,10,0,.16) 0 1.5px,transparent 1.5px 8px)",
              }}
            />
            {/* top sheen */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
              style={{ background: "linear-gradient(180deg,rgba(255,225,185,.14),transparent)" }}
            />
            <div className="relative z-[2]">
              <BackIcon />
            </div>
            <span
              className="z-[2] text-[10px] font-semibold tracking-[0.3em]"
              style={{
                color: "rgba(247,226,194,.72)",
                textShadow: "0 1px 1px rgba(0,0,0,.4)",
              }}
            >
              HOME
            </span>
          </motion.button>

          {/* ── BOLSTER sinistro ── */}
          <div
            className="relative z-[5] -mx-[7px] w-[30px] self-stretch flex-shrink-0"
            style={{
              background: "linear-gradient(177deg,#f0f0ee,#cccdc9 48%,#a6a6a1)",
              clipPath: "polygon(0 0,58% 0,100% 100%,0 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,.75)",
            }}
          />

          {/* ── LAMA = titolo centrato ── */}
          <div
            className="relative flex flex-1 items-center justify-center"
            style={{
              background:
                "linear-gradient(177deg,#fefdfa 0%,#f4f0e8 38%,#ece6da 60%,#ddd5c6 100%)",
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,.95), inset 0 -4px 9px rgba(120,90,55,.14), inset 0 0 0 1px rgba(255,255,255,.5)",
            }}
          >
            {/* sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: 0.5,
                background:
                  "linear-gradient(102deg,transparent 28%,rgba(255,255,255,.6) 46%,transparent 58%)",
              }}
            />

            <div className="relative z-[2] flex flex-col items-center gap-[5px]">
              {/* Tre rivetti */}
              <div className="flex gap-[7px] mb-[4px]">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,.9), ${brandColor}88)`,
                      boxShadow: "0 1px 2px rgba(0,0,0,.22)",
                    }}
                  />
                ))}
              </div>

              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(1.1rem, 2.8vw, 1.45rem)",
                  fontWeight: 700,
                  color: "#3a2f26",
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                {title}
              </span>

              {/* underline decorativa */}
              <div
                style={{
                  marginTop: 5,
                  height: 2,
                  width: 32,
                  borderRadius: 9,
                  background: `linear-gradient(90deg, ${brandColor}44, ${brandColor}, ${brandColor}44)`,
                }}
              />
            </div>
          </div>

          {/* ── BOLSTER destro ── */}
          <div
            className="relative z-[5] -mx-[7px] w-[30px] self-stretch flex-shrink-0"
            style={{
              background: "linear-gradient(177deg,#f0f0ee,#cccdc9 48%,#a6a6a1)",
              clipPath: "polygon(42% 0,100% 0,100% 100%,0 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,.75)",
            }}
          />

          {/* ── MANICO DESTRO = carrello ── */}
          <Link
            id="cart-icon"
            href={cartHref}
            className="relative flex flex-col items-center justify-center gap-[7px] overflow-hidden transition-[filter,transform] duration-300 hover:-translate-y-px hover:brightness-110"
            style={{
              width: 120,
              borderRadius: "6px 66px 66px 6px",
              background: handleBg,
              boxShadow:
                "inset 0 2px 0 rgba(255,221,180,.18), inset 0 -9px 17px rgba(0,0,0,.28)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            {/* wood grain */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: 0.45,
                background:
                  "repeating-linear-gradient(94deg,rgba(20,10,0,.16) 0 1.5px,transparent 1.5px 8px)",
              }}
            />
            {/* top sheen */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
              style={{ background: "linear-gradient(180deg,rgba(255,225,185,.14),transparent)" }}
            />
            <div className="relative z-[2]">
              <CartIcon />
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: "#fff",
                    color: brandColor,
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    lineHeight: 1,
                  }}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
            <span
              className="z-[2] text-[10px] font-semibold tracking-[0.3em]"
              style={{
                color: "rgba(247,226,194,.72)",
                textShadow: "0 1px 1px rgba(0,0,0,.4)",
              }}
            >
              CARRELLO
            </span>
          </Link>
        </div>
      </div>

      {/* ══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className="pointer-events-auto relative w-[min(560px,92vw)] md:hidden">
        <div
          className="flex items-center justify-between rounded-[22px] border border-white/60 px-4"
          style={{
            paddingTop: scrolled ? 11 : 18,
            paddingBottom: scrolled ? 11 : 18,
            background: "rgba(245,240,231,.82)",
            backdropFilter: "blur(18px) saturate(150%)",
            boxShadow: "0 14px 32px -14px rgba(80,55,25,.35)",
            transition: "padding .45s ease",
          }}
        >
          {/* Back */}
          <button
            onClick={() => router.push("/")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1.5px solid ${brandColor}33`,
              background: `${brandColor}18`,
              color: brandColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Titolo */}
          <div className="flex flex-col items-center gap-[3px]">
            <div className="flex gap-[5px] mb-[1px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: brandColor,
                    opacity: i === 1 ? 1 : 0.45,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#3a2f26",
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {title}
            </span>
          </div>

          {/* Cart */}
          <Link
            id="cart-icon"
            href={cartHref}
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1.5px solid ${brandColor}33`,
              background: `${brandColor}18`,
              color: brandColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: brandColor,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  lineHeight: 1,
                }}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
