// src/app/(client)/review/[restaurantId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, ArrowRight, Home, RotateCcw } from "lucide-react";

type Restaurant = {
  id: string;
  name: string;
  brand_color: string;
  logo_url?: string | null;
  google_review_url?: string | null;
  tripadvisor?: string | null;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  if (isNaN(n)) return [16, 185, 129];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return `#${[
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

const MAX_CHARS = 500;
const MOODS = ["", "Pessima 😞", "Scarsa 😕", "Nella media 😐", "Ottima 😊", "Eccellente 🤩"];

export default function ReviewPage() {
  const params = useParams();
  const restaurantId = typeof params?.restaurantId === "string" ? params.restaurantId : null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading]       = useState(true);
  const [stars, setStars]           = useState(0);
  const [hovered, setHovered]       = useState(0);
  const [text, setText]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from("restaurants")
          .select("id, name, brand_color, logo_url, google_review_url, tripadvisor")
          .eq("id", restaurantId)
          .single();
        if (cancelled) return;
        if (!dbErr && data) setRestaurant(data);
      } catch (e) {
        console.error("[ReviewPage] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [restaurantId]);

  const brand    = restaurant?.brand_color ?? "#10b981";
  const [r, g, b] = hexToRgb(brand);
  const alpha    = (a: number) => `rgba(${r},${g},${b},${a})`;
  const dark300  = mix(brand, "#000000", 0.20);
  const btnBg    = `linear-gradient(135deg, ${brand}, ${dark300})`;
  const btnShadow = `0 6px 24px ${alpha(0.35)}`;

  const handleSubmit = async () => {
    if (stars === 0) { setError("Seleziona almeno una stella."); return; }
    if (!restaurantId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("reviews").insert({
        restaurant_id: restaurantId,
        stars,
        text: text.trim() || null,
      });
      if (e) throw e;
      setSubmitted(true);
      if (stars >= 4) {
        const url = restaurant?.google_review_url || restaurant?.tripadvisor;
        if (url) {
          setTimeout(() => {
            window.location.href = url.startsWith("http") ? url : `https://${url}`;
          }, 2000);
        }
      }
    } catch (e: any) {
      setError(e.message || "Errore nel salvataggio. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="relative grid min-h-screen place-items-center overflow-hidden"
        style={{ background: "linear-gradient(160deg,#ffffff,#f6f3ee)" }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full blur-3xl" style={{ background: alpha(0.1) }} />
        </div>
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-20 w-20 place-items-center rounded-3xl shadow-xl"
          style={{ background: btnBg, boxShadow: btnShadow }}
        >
          <Star className="h-9 w-9 text-white" strokeWidth={2.2} />
          <motion.span
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-3xl"
            style={{ border: `2px solid ${brand}` }}
          />
        </motion.div>
        <p className="mt-6 text-sm font-medium text-ink/50">Caricamento…</p>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!restaurant) {
    return (
      <div className="grid min-h-screen place-items-center px-6" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50">
            <Star className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-base font-semibold text-ink/70">Ristorante non trovato.</p>
          <a href="/" className="mt-4 inline-block text-sm font-semibold" style={{ color: brand }}>← Torna alla home</a>
        </div>
      </div>
    );
  }

  const bgGradient = `linear-gradient(160deg, #ffffff 0%, ${mix(brand, "#ffffff", 0.94)} 45%, ${mix(brand, "#ffffff", 0.84)} 100%)`;

  return (
    <div
      className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-8"
      style={{ background: bgGradient, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: alpha(0.12) }} />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full blur-3xl" style={{ background: alpha(0.08) }} />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full blur-3xl animate-float" style={{ background: alpha(0.06) }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md overflow-hidden rounded-[28px] border bg-white/90 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: alpha(0.2), boxShadow: `0 16px 60px ${alpha(0.18)}, 0 2px 0 rgba(255,255,255,0.9) inset` }}
      >
        {/* Header */}
        <div className="relative overflow-hidden px-7 py-8 text-center text-white" style={{ background: btnBg }}>
          <div aria-hidden className="absolute -top-12 -right-10 h-40 w-40 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div aria-hidden className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          {restaurant.logo_url && (
            <motion.img
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              src={restaurant.logo_url}
              alt={`${restaurant.name} logo`}
              className="relative mx-auto mb-3 h-16 w-16 rounded-2xl object-contain p-2"
              style={{ background: "rgba(255,255,255,0.16)" }}
            />
          )}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-white/70"
          >
            Recensisci
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="relative mt-1 font-serif text-3xl font-black leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {restaurant.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.34 }}
            className="relative mt-2 text-sm text-white/75"
          >
            La tua opinione conta per noi 💚
          </motion.p>
        </div>

        {/* Body */}
        <div className="px-7 py-7">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative text-center"
              >
                {/* Floating sparkles */}
                {stars >= 4 && [0, 1, 2, 3, 4].map(i => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 0, x: 0 }}
                    animate={{ opacity: [0, 1, 0], y: [-10, -60 - i * 8], x: [(i - 2) * 14, (i - 2) * 26] }}
                    transition={{ duration: 1.8, delay: i * 0.12, repeat: Infinity, repeatDelay: 0.6 }}
                    className="pointer-events-none absolute left-1/2 top-10"
                  >
                    <Sparkles className="h-4 w-4" style={{ color: brand }} />
                  </motion.span>
                ))}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 16 }}
                  className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full"
                  style={{ background: alpha(0.12) }}
                >
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </motion.div>
                <h2 className="mb-2 font-serif text-2xl font-extrabold text-ink">Grazie mille! 🙏</h2>
                <p className="mx-auto mb-5 max-w-xs text-sm leading-relaxed text-ink/60">
                  La tua recensione è stata inviata con successo. Ci aiuti a migliorare ogni giorno.
                </p>
                {stars >= 4 && (restaurant.google_review_url || restaurant.tripadvisor) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4 rounded-2xl border p-4 text-left"
                    style={{ borderColor: alpha(0.2), background: alpha(0.05) }}
                  >
                    <p className="text-sm font-semibold text-ink">Ti va di pubblicarla anche su {restaurant.google_review_url ? "Google" : "TripAdvisor"}?</p>
                    <p className="mt-1 text-xs text-ink/50">Stai per essere reindirizzato…</p>
                  </motion.div>
                )}
                <a
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
                  style={{ color: brand }}
                >
                  <Home className="h-4 w-4" /> Torna alla home
                </a>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Stars */}
                <div className="mb-7 text-center">
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-ink/45">Com&apos;è stata la tua esperienza?</p>
                  <div className="flex justify-center gap-2.5">
                    {[1, 2, 3, 4, 5].map(n => {
                      const filled = n <= (hovered || stars);
                      return (
                        <motion.button
                          key={n}
                          whileHover={{ scale: 1.18 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setStars(n)}
                          onMouseEnter={() => setHovered(n)}
                          onMouseLeave={() => setHovered(0)}
                          aria-label={`${n} stelle`}
                          className="grid place-items-center rounded-full p-1 transition"
                          style={{ background: filled ? alpha(0.1) : "transparent" }}
                        >
                          <Star
                            className="h-9 w-9 transition-all"
                            fill={filled ? brand : "none"}
                            stroke={filled ? brand : "#d4c5b0"}
                            strokeWidth={1.6}
                            style={{ filter: filled ? `drop-shadow(0 2px 8px ${alpha(0.45)})` : "none" }}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    {stars > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-3 text-sm font-semibold"
                        style={{ color: brand }}
                      >
                        {MOODS[stars]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Text */}
                <div className="mb-5">
                  <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-ink/45">
                    Raccontaci di più <span className="font-normal lowercase text-ink/30">(opzionale)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={text}
                      maxLength={MAX_CHARS}
                      onChange={e => setText(e.target.value)}
                      placeholder="Cosa ti è piaciuto? C'è qualcosa che potremmo migliorare?"
                      className="w-full resize-none rounded-2xl border-2 bg-white/60 p-4 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink/30 focus:bg-white"
                      style={{ borderColor: alpha(0.2) }}
                      onFocus={e => (e.currentTarget.style.borderColor = alpha(0.5))}
                      onBlur={e => (e.currentTarget.style.borderColor = alpha(0.2))}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-3 text-[11px] font-medium text-ink/35">
                      {text.length}/{MAX_CHARS}
                    </span>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition disabled:cursor-not-allowed"
                  style={{ background: submitting ? alpha(0.45) : btnBg, boxShadow: submitting ? "none" : btnShadow }}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Invio in corso…
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4" fill="currentColor" />
                      Invia la tua recensione
                    </>
                  )}
                </motion.button>
                <button
                  onClick={() => { setStars(0); setHovered(0); setText(""); setError(null); }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink/40 transition hover:text-ink/60"
                >
                  <RotateCcw className="h-3 w-3" /> Ricomincia
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
