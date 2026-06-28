"use client";

import Link from "next/link";
import { QrCode, ArrowRight } from "lucide-react";
import type { Palette } from "@/components/client/order/palette";

interface FooterProps {
  palette?: Palette;
}

// Palette di fallback (usata nelle pagine non-order, es. landing)
const DEFAULT_PALETTE: Partial<Palette> = {
  brand:    "#10b981",
  text:     "#052e1c",
  textMuted:"#047857",
  border:   "rgba(16,185,129,0.20)",
};

export function Footer({ palette }: FooterProps) {
  const T = { ...DEFAULT_PALETTE, ...palette } as Palette;

  // Sfondo footer: versione scura del brand
  const bgFrom  = shadeHex(T.brand, -0.55);  // molto scuro
  const bgVia   = shadeHex(T.brand, -0.45);
  const bgTo    = "#111827";                   // quasi nero (invariante)

  return (
    <footer
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgVia} 55%, ${bgTo} 100%)`,
        color: "#fff",
        padding: "40px 16px",
      }}
    >
      {/* Cerchi decorativi */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 600, height: 600, borderRadius: "50%",
        background: `${T.brand}0d`,
        transform: "translate(25%, -50%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        width: 400, height: 400, borderRadius: "50%",
        background: `${T.brand}0a`,
        transform: "translate(-25%, 33%)",
        pointerEvents: "none",
      }} />

      {/* Grid texture */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, position: "relative", zIndex: 10 }}>

        {/* Colonna 1: Brand */}
        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}>
              <QrCode style={{ width: 28, height: 28, color: `${T.brand}dd` }} />
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", margin: 0 }}>TavolaRapida</h3>
              <span style={{ fontSize: 15, fontWeight: 600, color: `${T.brand}cc`, textTransform: "uppercase", letterSpacing: "0.10em" }}>Digital Menu</span>
            </div>
          </div>

          <p style={{ color: "rgba(255,255,255,0.55)", maxWidth: 320, lineHeight: 1.65, fontSize: 14, margin: 0 }}>
            La soluzione completa per la ristorazione moderna. Semplifichiamo l'ordinazione, ottimizziamo il servizio e proteggiamo i tuoi dati.
          </p>

          {/* Social icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[
              { name: "Instagram", href: "#", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.64.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
              { name: "Facebook", href: "#", path: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" },
              { name: "LinkedIn", href: "#", path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" },
            ].map((social) => (
              <SocialBtn key={social.name} {...social} brandColor={T.brand} />
            ))}
          </div>
        </div>

        {/* Colonna 2: Navigazione */}
        <FooterCol title="Navigazione" brandColor={T.brand} links={[
          { label: "Home",          href: "/" },
          { label: "Funzionalità",  href: "/#features" },
          { label: "Contatti",      href: "/#contact" },
          { label: "Area Cucina",   href: "/login" },
        ]} />

        {/* Colonna 3: Legale */}
        <FooterCol title="Legale" brandColor={T.brand} links={[
          { label: "Privacy Policy",      href: "#" },
          { label: "Termini di Servizio", href: "#" },
          { label: "Cookie Policy",       href: "#" },
          { label: "GDPR",                href: "#" },
        ]} />
      </div>

      {/* Divider */}
      <div style={{ maxWidth: 1280, margin: "40px auto 0", position: "relative", zIndex: 10 }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${T.brand}66, transparent)` }} />
      </div>

      {/* Copyright */}
      <div style={{
        maxWidth: 1280, margin: "20px auto 0", position: "relative", zIndex: 10,
        display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12,
        color: "rgba(255,255,255,0.35)", fontSize: 12,
      }}>
        <p style={{ margin: 0 }}>© 2026 TavolaRapida S.r.l. — Tutti i diritti riservati.</p>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          Made with <span style={{ color: "#f87171" }}>❤️</span> in Italy
        </p>
      </div>
    </footer>
  );
}

// ── Sotto-componenti interni ──────────────────────────────────────────────────

function FooterCol({ title, links, brandColor }: { title: string; links: { label: string; href: string }[]; brandColor: string }) {
  return (
    <div>
      <h4 style={{ fontWeight: 700, color: `${brandColor}cc`, marginBottom: 16, textTransform: "uppercase", fontSize: 16, letterSpacing: "0.08em" }}>
        {title}
      </h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                color: "rgba(255,255,255,0.55)",
                textDecoration: "none", fontSize: 14,
                transition: "color 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.55)"; }}
            >
              <ArrowRight style={{ width: 12, height: 12, opacity: 0.6 }} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialBtn({ name, href, path, brandColor }: { name: string; href: string; path: string; brandColor: string }) {
  return (
    <Link
      href={href}
      aria-label={name}
      style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s",
        color: `${brandColor}cc`,
        textDecoration: "none",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = brandColor;
        el.style.borderColor = brandColor;
        el.style.transform = "scale(1.1)";
        el.style.color = "#fff";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = "rgba(255,255,255,0.10)";
        el.style.borderColor = "rgba(255,255,255,0.15)";
        el.style.transform = "scale(1)";
        el.style.color = `${brandColor}cc`;
      }}
    >
      <svg style={{ width: 16, height: 16, fill: "currentColor" }} viewBox="0 0 24 24">
        <path d={path} />
      </svg>
    </Link>
  );
}

// ── Utility: scurisce/schiarisce un colore hex ────────────────────────────────
function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8)  & 255) * (1 + amount));
  const b = clamp(( n        & 255) * (1 + amount));
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}
