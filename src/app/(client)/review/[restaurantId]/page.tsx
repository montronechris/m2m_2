// src/app/(client)/review/[restaurantId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

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
  const glowRing  = `0 0 0 6px ${alpha(0.08)}, 0 8px 40px ${alpha(0.30)}`;

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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "4px solid #e2e8f0", borderTopColor: "#10b981", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <p style={{ color: "#78716c", fontSize: 16 }}>Ristorante non trovato.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, #ffffff 0%, ${mix(brand, "#ffffff", 0.92)} 50%, ${mix(brand, "#ffffff", 0.85)} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes checkIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 480,
        background: "rgba(255,255,255,0.90)",
        backdropFilter: "blur(20px)",
        borderRadius: 28,
        border: `1.5px solid ${alpha(0.2)}`,
        boxShadow: `0 16px 60px ${alpha(0.15)}, 0 2px 0 rgba(255,255,255,0.9) inset`,
        overflow: "hidden",
        animation: "fadeUp 0.6s ease both",
      }}>

        {/* Header */}
        <div style={{
          background: btnBg,
          padding: "32px 32px 28px",
          position: "relative", overflow: "hidden",
          textAlign: "center",
        }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", bottom: -40, left: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="logo" style={{ width: 64, height: 64, borderRadius: 18, objectFit: "contain", background: "rgba(255,255,255,0.15)", marginBottom: 14, display: "block", margin: "0 auto 14px" }} />
          )}
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>Recensisci</p>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.4rem, 5vw, 1.9rem)", fontWeight: 800, color: "#fff" }}>{restaurant.name}</h1>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 32px 36px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", animation: "fadeUp 0.5s ease" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: alpha(0.12), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "checkIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#1c1917" }}>Grazie mille! 🙏</h2>
              <p style={{ margin: "0 0 6px", fontSize: 15, color: "#78716c", lineHeight: 1.6 }}>La tua recensione è stata inviata con successo.</p>
              {stars >= 4 && (restaurant.google_review_url || restaurant.tripadvisor) && (
                <p style={{ margin: "16px 0 0", fontSize: 13, color: "#a8a29e" }}>
                  Stai per essere reindirizzato su {restaurant.google_review_url ? "Google" : "TripAdvisor"}…
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Stelle */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#78716c" }}>Com'è stata la tua esperienza?</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                  {[1, 2, 3, 4, 5].map(n => {
                    const filled = n <= (hovered || stars);
                    return (
                      <button key={n} onClick={() => setStars(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, transition: "transform 0.15s", transform: filled ? "scale(1.15)" : "scale(1)" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24"
                          fill={filled ? brand : "none"}
                          stroke={filled ? brand : "#d4c5b0"}
                          strokeWidth={1.5}
                          style={{ filter: filled ? `drop-shadow(0 2px 8px ${alpha(0.4)})` : "none", transition: "all 0.15s" }}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    );
                  })}
                </div>
                {stars > 0 && (
                  <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 600, color: brand }}>
                    {["", "Pessima 😞", "Scarsa 😕", "Nella media 😐", "Ottima 😊", "Eccellente 🤩"][stars]}
                  </p>
                )}
              </div>

              {/* Testo */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#78716c", marginBottom: 10 }}>
                  Raccontaci di più (opzionale)
                </label>
                <textarea rows={4} value={text} onChange={e => setText(e.target.value)}
                  placeholder="Cosa ti è piaciuto? C'è qualcosa che potremmo migliorare?"
                  style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 14, border: `2px solid ${alpha(0.2)}`, background: alpha(0.04), color: "#1c1917", fontSize: 14, lineHeight: 1.6, outline: "none", resize: "none", transition: "border-color 0.2s", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = alpha(0.5))}
                  onBlur={e => (e.target.style.borderColor = alpha(0.2))}
                />
              </div>

              {error && <p style={{ margin: "0 0 16px", fontSize: 13, color: "#ef4444", fontWeight: 500 }}>{error}</p>}

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: submitting ? alpha(0.4) : btnBg, color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : btnShadow, transition: "transform 0.15s, box-shadow 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
              >
                {submitting ? (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                    Invio in corso…
                  </>
                ) : (
                  <>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Invia la tua recensione
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}