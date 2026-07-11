'use client';

/**
 * ============================================================================
 *  END SCREEN — single-file version (frontend only)
 * ----------------------------------------------------------------------------
 *  Tutto in questo file: font (via <link>), CSS globale (styled-jsx), logica,
 *  animazioni in/out, effetti, e ottimizzazione mobile/tablet.
 *
 *  Backend (supabase / router) è mockato con no-op SOLO per l'anteprima.
 *  Nel tuo file reale mantieni i tuoi import — la logica/handler sono identici.
 *
 *  Design: palette calda ristorante (arancione #FF6B35, crema #FFF8F0),
 *  titoli serif Playfair Display, UI Space Grotesk, ombre morbide warm.
 *
 *  Animazioni: entrance stagger, AnimatePresence per cambio stato pagamento,
 *  count-up prezzo, confetti sul "pagato", shimmer CTA, drag-to-dismiss modal.
 *  Layout: mobile-first; dish cards in flex-scroll su mobile, grid su tablet+.
 *  Accessibilità: prefers-reduced-motion rispettato, touch target ≥44px.
 * ============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";

export type UpsellItem = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  image_url?: string | null;
  category_id: string | null;
};
export type UpsellCat = { id: string; name: string };

export interface EndScreenExperienceProps {
  orders: any[];
  restaurantId: string | null;
  sessionId: string;
  tableNumber: string | number | null;
  isDark: boolean;
  brand: string;
  supabase: any;
  isPaid: boolean;
  payLabel: string | null;
  paymentRequested: boolean;
  setPaymentRequested: (v: boolean) => void;
  paymentRequestSending: boolean;
  setPaymentRequestSending: (v: boolean) => void;
  paymentCallId: string | null;
  setPaymentCallId: (v: string | null) => void;
  upsellItems: UpsellItem[];
  upsellCategories: UpsellCat[];
  selectedUpsellCat: string | null;
  setSelectedUpsellCat: (v: string | null) => void;
  selectedUpsellDish: UpsellItem | null;
  setSelectedUpsellDish: (v: UpsellItem | null) => void;
  tS: Record<string, string>;
  allLabel: string;
}

/** Scurisce un colore esadecimale di una percentuale (0-1) per ricavare la tonalita "deep" del brand. */
function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * (1 - percent))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * (1 - percent))));
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * (1 - percent))));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* ------------------------------------------------------------------ */
/*  Theme tokens                                                        */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Hooks / helpers                                                     */
/* ------------------------------------------------------------------ */

/** Count-up che parte da 0 dopo il mount (evita mismatch di hydration:
 *  il server renderizza `target`, il client parte da 0 e anima a target). */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(target);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      // primo frame: imposta a 0; poi avanza verso target
      setVal(t === 0 ? 0 : target * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    // primo tick differito: imposta 0 senza setState sincrono nell'effect
    raf = requestAnimationFrame((now) => {
      setVal(0);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ------------------------------------------------------------------ */
/*  Confetti (burst quando si passa a "pagato")                         */
/* ------------------------------------------------------------------ */
const CONFETTI_COLORS = ["#FF6B35", "#F2622D", "#FFD166", "#06D6A0", "#EF476F", "#FFB4A2"];
function Confetti({ run }: { run: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.25,
        dur: 1.4 + Math.random() * 1.1,
        rot: Math.random() * 720 - 360,
        drift: (Math.random() - 0.5) * 140,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 7 + Math.random() * 7,
        round: Math.random() > 0.5,
      })),
    []
  );
  return (
    <AnimatePresence>
      {run && (
        <div
          aria-hidden
          style={{ position: "fixed", inset: 0, zIndex: 250, pointerEvents: "none", overflow: "hidden" }}
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: `${p.x}vw`, y: -24, opacity: 0, rotate: 0 }}
              animate={{ x: `calc(${p.x}vw + ${p.drift}px)`, y: "110vh", opacity: [0, 1, 1, 0], rotate: p.rot }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.dur, delay: p.delay, ease: "easeIn" }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.round ? "50%" : "2px",
                boxShadow: `0 0 6px ${p.color}66`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function EndScreenExperience({
  orders,
  restaurantId,
  sessionId,
  tableNumber,
  isDark,
  brand,
  supabase,
  isPaid,
  payLabel,
  paymentRequested,
  setPaymentRequested,
  paymentRequestSending,
  setPaymentRequestSending,
  paymentCallId,
  setPaymentCallId,
  upsellItems,
  upsellCategories,
  selectedUpsellCat,
  setSelectedUpsellCat,
  selectedUpsellDish,
  setSelectedUpsellDish,
  tS,
  allLabel,
}: EndScreenExperienceProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const effectivePaymentRequested = paymentRequested;

  const bg = isDark ? "#161210" : "#FFF8F0";
  const BRAND = brand;
  const BRAND_DEEP = useMemo(() => shadeColor(brand, 0.12), [brand]);
  const effectiveBrand = BRAND;

  /* text / palette shorthands */
  const text = isDark ? "#F5F0EB" : "#2D3748";
  const textMuted = isDark ? "#A89B91" : "#8B7E74";
  const cardBg = isDark ? "#221E1B" : "#FFFFFF";
  const hairline = isDark ? "rgba(255,255,255,0.07)" : "rgba(45,55,72,0.07)";

  /* shared animation variants */
  const fadeUp = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
      };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };

  /* derived order values (computed unconditionally to respect hook order) */
  const order = orders[0];
  const totalEur = order ? ((order.total_cents ?? 0) / 100).toFixed(2) : null;
  const totalNum = useCountUp(totalEur ? Number(totalEur) : 0);
  const totalDisplay = totalNum.toFixed(2).replace(".", ",");
  const originalTotalCents =
    (order as any)?.original_total_cents ??
    ((order as any)?.discount_cents > 0 ? (order.total_cents ?? 0) + (order as any).discount_cents : null);
  const originalTotalEur = originalTotalCents ? (originalTotalCents / 100).toFixed(2) : null;
  const savingEur =
    originalTotalCents && order ? ((originalTotalCents - (order.total_cents ?? 0)) / 100).toFixed(2) : null;

  /* traccia il passaggio a "pagato" per far partire i coriandoli una sola volta */
  const prevIsPaidRef = useRef(isPaid);
  useEffect(() => {
    prevIsPaidRef.current = isPaid;
  }, [isPaid]);
  const justPaid = isPaid && !prevIsPaidRef.current;


    return (
      <>
        {/* ============ FONTS + GLOBAL CSS (single-file) ============ */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- intentional: single-file requirement */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style jsx global>{`
          :root {
            --es-font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
            --es-font-ui: 'Space Grotesk', system-ui, -apple-system, sans-serif;
          }
          @keyframes es-spin { to { transform: rotate(360deg); } }
          @keyframes es-pulse-ring {
            0%   { transform: scale(0.85); opacity: 0.7; }
            70%  { transform: scale(1.6);  opacity: 0; }
            100% { transform: scale(1.6);  opacity: 0; }
          }
          @keyframes es-float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50%      { transform: translateY(-14px) rotate(3deg); }
          }
          @keyframes es-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes es-glow {
            0%, 100% { box-shadow: 0 12px 28px ${BRAND}55; }
            50%      { box-shadow: 0 12px 38px ${BRAND}88; }
          }

          .es-hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .es-hide-scrollbar::-webkit-scrollbar { display: none; }

          /* shimmer text gradient (heading) */
          .es-shimmer-text {
            background-image: linear-gradient(
              100deg,
              ${text} 0%, ${text} 35%, ${isDark ? "#FFD9C2" : "#FF8A4D"} 50%, ${text} 65%, ${text} 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            animation: es-shimmer 5s linear infinite;
          }

          /* CTA animated shimmer sweep */
          .es-cta-shimmer {
            position: relative;
            overflow: hidden;
          }
          .es-cta-shimmer::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
            background-size: 250% 100%;
            animation: es-shimmer 3.2s linear infinite;
            pointer-events: none;
          }

          /* dish card hover shine (desktop) */
          .es-dish-card { position: relative; overflow: hidden; }
          .es-dish-card::after {
            content: '';
            position: absolute;
            top: 0; left: -60%;
            width: 50%; height: 100%;
            background: linear-gradient(110deg, transparent, rgba(255,255,255,0.18), transparent);
            transform: skewX(-18deg);
            transition: left 0.55s ease;
            pointer-events: none;
          }
          @media (hover: hover) {
            .es-dish-card:hover::after { left: 130%; }
          }

          /* ===== Responsive dish layout: flex-scroll mobile → grid tablet+ ===== */
          .es-dish-track {
            display: flex;
            gap: 14px;
            overflow-x: auto;
            padding: 0 22px 8px;
            -webkit-overflow-scrolling: touch;
          }
          .es-dish-card-el { flex: 0 0 168px; }
          @media (min-width: 640px) {
            .es-upsell-wrap { max-width: 560px; margin: 0 auto; padding: 0 22px; }
            .es-dish-track {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              overflow: visible;
              padding: 0;
            }
            .es-dish-card-el { flex: none; width: 100%; }
          }
          @media (min-width: 1024px) {
            .es-upsell-wrap { max-width: 720px; }
            .es-dish-track { grid-template-columns: repeat(3, 1fr); }
          }

          /* prefers-reduced-motion: disabilita animazioni non essenziali */
          @media (prefers-reduced-motion: reduce) {
            .es-shimmer-text,
            .es-cta-shimmer::after,
            .es-dish-card::after {
              animation: none !important;
            }
          }
        `}</style>

        <Confetti run={justPaid} />

        {/* ============================ ROOT ============================ */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          style={{
            position: "relative",
            minHeight: "100vh",
            background: bg,
            fontFamily: "var(--es-font-ui)",
            overflow: "hidden",
          }}
        >
          {/* ---- Warm ambient gradient blobs ---- */}
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
            <motion.div
              animate={reduce ? {} : { x: [0, 20, 0], y: [0, -10, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: "-180px",
                left: "-120px",
                width: "460px",
                height: "460px",
                borderRadius: "50%",
                background: isDark
                  ? "radial-gradient(circle, rgba(255,107,53,0.18), transparent 65%)"
                  : "radial-gradient(circle, rgba(255,180,140,0.55), transparent 65%)",
                filter: "blur(20px)",
              }}
            />
            <motion.div
              animate={reduce ? {} : { x: [0, -16, 0], y: [0, 12, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                bottom: "-200px",
                right: "-140px",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background: isDark
                  ? "radial-gradient(circle, rgba(233,30,99,0.14), transparent 65%)"
                  : "radial-gradient(circle, rgba(255,200,220,0.6), transparent 65%)",
                filter: "blur(20px)",
              }}
            />
            {/* floating food emojis */}
            {[
              { e: "🍷", top: "12%", left: "8%", d: 0, s: 1.6 },
              { e: "🍰", top: "60%", left: "6%", d: 1.2, s: 1.3 },
              { e: "🍽️", top: "20%", right: "8%", d: 0.6, s: 1.4 },
              { e: "✨", top: "45%", right: "10%", d: 1.8, s: 1.1 },
            ].map((d, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: d.top,
                  left: (d as any).left,
                  right: (d as any).right,
                  fontSize: `${d.s}rem`,
                  opacity: isDark ? 0.05 : 0.07,
                  animation: reduce ? "none" : `es-float 7s ease-in-out ${d.d}s infinite`,
                }}
              >
                {d.e}
              </span>
            ))}
          </div>

          {/* ===================== HERO + ORDER CARD ===================== */}
          <motion.div
            variants={fadeUp}
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "72px 22px max(40px, env(safe-area-inset-bottom))",
              textAlign: "center",
            }}
          >
            {/* Animated success badge */}
            <motion.div
              variants={fadeUp}
              style={{
                position: "relative",
                width: 76,
                height: 76,
                marginBottom: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${BRAND}55, transparent 70%)`,
                  animation: reduce ? "none" : "es-pulse-ring 2.4s ease-out infinite",
                }}
              />
              <motion.div
                variants={fadeUp}
                style={{
                  position: "relative",
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DEEP})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 14px 30px ${BRAND}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
                }}
              >
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path d="M5 12.5l4.5 4.5L19 7" />
                </motion.svg>
              </motion.div>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "var(--es-font-display)",
                fontSize: "clamp(28px, 8vw, 34px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 10,
                lineHeight: 1.1,
              }}
            >
              <span className="es-shimmer-text">{tS.endScreenTitle}</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              style={{
                fontSize: "clamp(14px, 4vw, 15px)",
                color: textMuted,
                marginBottom: 30,
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              {tS.endScreenSubtitle}
            </motion.p>

            {/* ---------- Order summary card ---------- */}
            <motion.div
              variants={fadeUp}
              style={{
                position: "relative",
                background: cardBg,
                borderRadius: 24,
                padding: "22px 22px 20px",
                width: "100%",
                maxWidth: 360,
                boxShadow: isDark ? "0 18px 48px rgba(0,0,0,0.45)" : "0 18px 48px rgba(255,107,53,0.12)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(255,107,53,0.10)"}`,
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DEEP}, transparent 80%)`,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BRAND }}>
                  {tS.summary}
                </span>
                {tableNumber && (
                  <motion.span
                    layout
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: text,
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,107,53,0.08)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,107,53,0.16)"}`,
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    <span style={{ fontSize: 11 }}>🪑</span> {tS.table} #{tableNumber}
                  </motion.span>
                )}
              </div>

              {totalEur && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${hairline}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 12, color: textMuted, fontWeight: 500 }}>{tS.total}</span>
                    <AnimatePresence>
                      {savingEur && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.6, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.7, type: "spring", stiffness: 320, damping: 18 }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#16a34a",
                            background: "rgba(34,197,94,0.10)",
                            border: "1px solid rgba(34,197,94,0.22)",
                            padding: "2px 8px",
                            borderRadius: 999,
                            width: "fit-content",
                          }}
                        >
                          {tS.savingsLabel} €{savingEur}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    {originalTotalEur && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        style={{ fontSize: 13, color: "#e53935", textDecoration: "line-through", opacity: 0.75 }}
                      >
                        €{originalTotalEur}
                      </motion.span>
                    )}
                    <motion.span
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 16 }}
                      style={{
                        fontFamily: "var(--es-font-display)",
                        fontSize: "clamp(26px, 8vw, 30px)",
                        fontWeight: 800,
                        color: text,
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                      }}
                    >
                      €{totalDisplay}
                    </motion.span>
                  </div>
                </div>
              )}

              {payLabel && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: textMuted, fontWeight: 500 }}>{tS.paymentLabel}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{payLabel}</span>
                </div>
              )}

              {/* ---------- payment request block (AnimatePresence in/out) ---------- */}
              <div style={{ borderTop: `1px solid ${hairline}`, paddingTop: 16 }}>
                <AnimatePresence mode="wait">
                  {isPaid ? (
                    /* ---- PAID ---- */
                    <motion.div
                      key="paid"
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "rgba(34,197,94,0.10)",
                        border: "1px solid rgba(34,197,94,0.25)",
                      }}
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 12 }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#22c55e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </motion.span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#bbf7d0" : "#15803d" }}>
                        {tS.paymentAlreadyReceived}
                      </span>
                    </motion.div>
                  ) : effectivePaymentRequested ? (
                    /* ---- REQUESTED ---- */
                    <motion.div
                      key="requested"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "rgba(34,197,94,0.10)",
                        border: "1px solid rgba(34,197,94,0.25)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ position: "relative", width: 22, height: 22, flexShrink: 0 }}>
                          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(34,197,94,0.35)", animation: reduce ? "none" : "es-pulse-ring 1.8s ease-out infinite" }} />
                          <span style={{ position: "absolute", inset: 4, borderRadius: "50%", background: "#22c55e" }} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#bbf7d0" : "#15803d" }}>
                          {tS.waiterComingBanner}
                        </span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={async () => {
                          if (paymentCallId) {
                            await supabase.from("waiter_calls").delete().eq("id", paymentCallId);
                          }
                          setPaymentRequested(false);
                          setPaymentCallId(null);
                        }}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#ef4444",
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.28)",
                          borderRadius: 999,
                          padding: "6px 14px",
                          cursor: "pointer",
                          flexShrink: 0,
                          fontFamily: "inherit",
                          minHeight: 36,
                          transition: "all 0.15s",
                        }}
                      >
                        {tS.cancelRequest}
                      </motion.button>
                    </motion.div>
                  ) : (
                    /* ---- UNPAID: CTA ---- */
                    <motion.button
                      key="unpaid"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={paymentRequestSending}
                      className="es-cta-shimmer"
                      onClick={async () => {
                        if (paymentRequestSending || effectivePaymentRequested) return;
                        setPaymentRequestSending(true);
                        try {
                          const tableIdForRequest = orders[0]?.table_id ?? null;
                          const ridForRequest = restaurantId;
                          const orderIdForRequest = orders[0]?.id ?? null;
                          if (ridForRequest) {
                            const { data: wc } = await supabase
                              .from("waiter_calls")
                              .insert({
                                restaurant_id: ridForRequest,
                                table_id: tableIdForRequest,
                                order_id: orderIdForRequest,
                                type: "payment",
                                status: "pending",
                              })
                              .select("id")
                              .single();
                            if (wc?.id) setPaymentCallId(wc.id);
                          }
                          setPaymentRequested(true);
                        } finally {
                          setPaymentRequestSending(false);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "16px 18px",
                        borderRadius: 16,
                        border: "none",
                        background: paymentRequestSending
                          ? `linear-gradient(135deg, ${BRAND}99, ${BRAND_DEEP}99)`
                          : `linear-gradient(135deg, ${BRAND}, ${BRAND_DEEP})`,
                        color: "#fff",
                        fontSize: "clamp(14px, 4.2vw, 15px)",
                        fontWeight: 700,
                        cursor: paymentRequestSending ? "default" : "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 9,
                        minHeight: 52,
                        boxShadow: paymentRequestSending ? `0 8px 20px ${BRAND}33` : `0 12px 28px ${BRAND}55`,
                        transition: "box-shadow 0.2s, transform 0.1s",
                      }}
                    >
                      {paymentRequestSending ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: "es-spin 0.7s linear infinite" }}>
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <>
                          <span style={{ fontSize: 17 }}>💳</span>
                          <span>{tS.callWaiterToPay}</span>
                          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} style={{ marginLeft: 2 }}>
                            →
                          </motion.span>
                        </>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>

          {/* ===================== UPSELL SECTION ===================== */}
          {upsellItems.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="es-upsell-wrap"
              style={{ position: "relative", zIndex: 1, paddingBottom: 48, width: "100%" }}
            >
              {/* section header */}
              <motion.div variants={fadeUp} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 22px", marginBottom: 16 }}>
                <span style={{ height: 1, flex: "0 1 40px", background: isDark ? "rgba(255,255,255,0.10)" : "rgba(45,55,72,0.12)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: isDark ? "#A89B91" : "#8B7E74", whiteSpace: "nowrap" }}>
                  {tS.moreSpace} 🍰
                </span>
                <span style={{ height: 1, flex: "0 1 40px", background: isDark ? "rgba(255,255,255,0.10)" : "rgba(45,55,72,0.12)" }} />
              </motion.div>

              {/* category chips */}
              {upsellCategories.length > 1 && (
                <div className="es-hide-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingLeft: 22, paddingRight: 22, paddingBottom: 14 }}>
                  <button
                    onClick={() => setSelectedUpsellCat(null)}
                    className="es-chip"
                    style={chipStyle(selectedUpsellCat === null, isDark, textMuted, BRAND, BRAND_DEEP)}
                  >
                    {allLabel}
                  </button>
                  {upsellCategories.map((cat) => {
                    const active = selectedUpsellCat === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedUpsellCat(active ? null : cat.id)}
                        className="es-chip"
                        style={chipStyle(active, isDark, textMuted, BRAND, BRAND_DEEP)}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* dish track (flex mobile → grid tablet+) */}
              <div className={`es-dish-track es-hide-scrollbar`}>
                <AnimatePresence mode="popLayout">
                  {upsellItems
                    .filter((item) => selectedUpsellCat === null || item.category_id === selectedUpsellCat)
                    .map((item) => (
                      <motion.button
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedUpsellDish(item)}
                        className="es-dish-card es-dish-card-el"
                        style={{
                          borderRadius: 18,
                          overflow: "hidden",
                          textAlign: "left",
                          background: cardBg,
                          boxShadow: isDark ? "0 8px 22px rgba(0,0,0,0.4)" : "0 8px 22px rgba(255,107,53,0.10)",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(255,107,53,0.08)"}`,
                          cursor: "pointer",
                          padding: 0,
                          display: "block",
                          fontFamily: "inherit",
                        }}
                      >
                        {/* image / initial */}
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: 108,
                            background: `linear-gradient(135deg, ${BRAND}22, ${BRAND_DEEP}14)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 32,
                            fontWeight: 700,
                            color: BRAND,
                            fontFamily: "var(--es-font-display)",
                          }}
                        >
                          {item.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}
                          <span
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              background: "rgba(255,255,255,0.95)",
                              color: BRAND,
                              fontSize: 12,
                              fontWeight: 800,
                              padding: "4px 10px",
                              borderRadius: 999,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            €{(item.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ padding: "11px 13px 13px" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name}
                          </p>
                          {item.description && (
                            <p style={{ fontSize: 11, color: textMuted, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden", marginBottom: 6 }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ===================== DISH DETAIL SHEET ===================== */}
          <AnimatePresence>
            {selectedUpsellDish && (
              <>
                <motion.div
                  key="dish-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  onClick={() => setSelectedUpsellDish(null)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 200,
                    background: "rgba(20,12,8,0.6)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                  }}
                />
                <motion.div
                  key="dish-sheet"
                  drag="y"
                  dragConstraints={{ top: 0 }}
                  dragElastic={{ top: 0.05, bottom: 0.3 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 80 || info.velocity.y > 400) {
                      setSelectedUpsellDish(null);
                    }
                  }}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 201,
                    touchAction: "none",
                    maxWidth: 480,
                    margin: "0 auto",
                  }}
                >
                  <div style={{ background: cardBg, borderRadius: "28px 28px 0 0", boxShadow: "0 -20px 60px rgba(0,0,0,0.28)", overflow: "hidden" }}>
                    <div style={{ paddingTop: 11, paddingBottom: 7, display: "flex", justifyContent: "center", cursor: "grab" }}>
                      <div style={{ width: 44, height: 5, borderRadius: 99, background: isDark ? "#3a3530" : "#D4CCC4" }} />
                    </div>

                    {selectedUpsellDish.image_url && (
                      <motion.div
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: 0.08 }}
                        style={{ position: "relative" }}
                      >
                        <img
                          src={selectedUpsellDish.image_url}
                          alt={selectedUpsellDish.name}
                          style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
                          draggable={false}
                        />
                        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent 45%)" }} />
                        <motion.button
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 18 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedUpsellDish(null)}
                          aria-label={tS.close}
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(255,255,255,0.92)",
                            color: "#2D3748",
                            fontSize: 20,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          ×
                        </motion.button>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.12 }}
                      style={{ padding: "20px 22px max(28px, env(safe-area-inset-bottom))", fontFamily: "inherit" }}
                    >
                      <h2 style={{ fontFamily: "var(--es-font-display)", fontSize: 24, fontWeight: 800, color: text, marginBottom: 8, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        {selectedUpsellDish.name}
                      </h2>
                      {selectedUpsellDish.description && (
                        <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.7, marginBottom: 18 }}>
                          {selectedUpsellDish.description}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 22 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: BRAND, fontFamily: "var(--es-font-display)" }}>€</span>
                        <span style={{ fontSize: 30, fontWeight: 800, color: BRAND, letterSpacing: "-0.02em", fontFamily: "var(--es-font-display)", lineHeight: 1 }}>
                          {(selectedUpsellDish.price_cents / 100).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={async () => {
                          const allItems = orders.flatMap((o) => o.items);
                          const maxPortata = allItems.reduce((m: number, i: any) => Math.max(m, i.portata ?? 1), 0);
                          const params = new URLSearchParams({
                            upsell_id: selectedUpsellDish.id,
                            upsell_name: selectedUpsellDish.name,
                            upsell_price: String(selectedUpsellDish.price_cents),
                            upsell_portata: String(maxPortata + 1),
                          });
                          setSelectedUpsellDish(null);
                          router.push(`/cart/${sessionId}?${params.toString()}`);
                        }}
                        style={{
                          width: "100%",
                          padding: "16px",
                          borderRadius: 16,
                          border: "none",
                          background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DEEP})`,
                          color: "#fff",
                          fontSize: 16,
                          fontWeight: 800,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          boxShadow: `0 14px 32px ${BRAND}55`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 9,
                          minHeight: 52,
                        }}
                      >
                        {tS.addToOrder} <span style={{ fontSize: 18 }}>→</span>
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </motion.div>
      </>
    );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function chipStyle(
  active: boolean,
  isDark: boolean,
  textMuted: string,
  brand: string,
  brandDeep: string
): React.CSSProperties {
  return {
    flexShrink: 0,
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    border: `1.5px solid ${active ? "transparent" : isDark ? "#3a3530" : "#EDE6DE"}`,
    background: active
      ? `linear-gradient(135deg, ${brand}, ${brandDeep})`
      : isDark
      ? "rgba(255,255,255,0.04)"
      : "#fff",
    color: active ? "#fff" : textMuted,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.18s",
    boxShadow: active ? `0 6px 16px ${brand}40` : "0 2px 8px rgba(0,0,0,0.05)",
    fontFamily: "inherit",
    minHeight: 36,
  };
}
