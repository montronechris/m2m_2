"use client";

<<<<<<< HEAD
import { useRef, useEffect, useState } from "react";
=======
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
import Link from "next/link";
import { ShoppingCart, QrCode } from "lucide-react";
import type { Palette } from "@/components/client/order/CategoryFilter";

interface OrderHeaderProps {
  cartCount: number;
  cartHref: string;
  palette: Palette;
}

export function OrderHeader({ cartCount, cartHref, palette: T }: OrderHeaderProps) {
  // Sfondo header: versione scura del brand (come il footer)
  const bgFrom = shadeHex(T.brand, -0.55);
  const bgMid  = shadeHex(T.brand, -0.45);
  const bgTo   = shadeHex(T.brand, -0.35);

<<<<<<< HEAD
  // Nasconde la label "Carrello" se l'header è troppo stretto
  const headerRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 360);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <header ref={headerRef} style={{
=======
  return (
    <header style={{
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgMid} 50%, ${bgTo} 100%)`,
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      boxShadow: `0 2px 20px ${T.brand}59`,
    }}>
      {/* Pattern puntini */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      <div style={{
        position: "relative",
        maxWidth: 896, margin: "0 auto", padding: "0 16px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo + nome */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.15)"}
          >
            <QrCode style={{ width: 20, height: 20, color: "#fff" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 800, fontSize: 15,
              color: "#fff", letterSpacing: "-0.02em", lineHeight: 1,
            }}>TavolaRapida</span>
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 9, fontWeight: 600,
              color: "rgba(255,255,255,0.55)", letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>Menu Digitale</span>
          </div>
        </Link>

        {/* Carrello */}
        <Link href={cartHref} id="cart-icon" style={{ textDecoration: "none" }}>
          <div
            style={{
              position: "relative",
              display: "flex", alignItems: "center", gap: 8,
<<<<<<< HEAD
              padding: compact ? "8px" : "8px 18px",
=======
              padding: "8px 18px",
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
              borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(8px)",
              cursor: "pointer", transition: "all 0.2s",
              color: "#fff",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.25)";
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.15)";
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            <ShoppingCart style={{ width: 18, height: 18, color: "#fff" }} />
<<<<<<< HEAD
            {!compact && (
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600, fontSize: 14, color: "#fff",
              }}>Carrello</span>
            )}
=======
            <span style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 600, fontSize: 14, color: "#fff",
            }}>Carrello</span>
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
            {cartCount > 0 && (
              <span style={{
                position: "absolute", top: -8, right: -8,
                width: 20, height: 20, borderRadius: "50%",
                background: "#f97316",
                border: `2px solid ${bgFrom}`,
                color: "#fff", fontSize: 10, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(249,115,22,0.5)",
              }}>
                {cartCount}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
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