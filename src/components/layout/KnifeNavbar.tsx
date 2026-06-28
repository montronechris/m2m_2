// src/components/layout/KnifeNavbar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChefHat, UtensilsCrossed, BookOpen, Leaf, CalendarDays, Mail,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home",     href: "/",         Icon: ChefHat },
  { label: "Menu",     href: "/#menu",    Icon: UtensilsCrossed },
  { label: "Ricette",  href: "/#recipes", Icon: BookOpen },
  { label: "About",    href: "/#about",   Icon: Leaf },
  { label: "Events",   href: "/#events",  Icon: CalendarDays },
  { label: "Contact",  href: "/#contact", Icon: Mail },
];

// Larghezza totale, altezza, dove inizia il manico
const W = 640;
const H = 56;
const BLADE_END = 510; // dove finisce la lama e inizia il manico

export function KnifeNavbar() {
  const [active, setActive] = useState("/");

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        width: W,
        maxWidth: "calc(100vw - 32px)",
        height: H,
        userSelect: "none",
        filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18)) drop-shadow(0 1px 3px rgba(0,0,0,0.10))",
      }}
    >
      {/* SVG background — forma coltello completa */}
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", top: 0, left: 0 }}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Lama: bianco avorio */}
          <linearGradient id="bladeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FDFAF4" />
            <stop offset="100%" stopColor="#EDE8DC" />
          </linearGradient>

          {/* Manico: legno caldo */}
          <linearGradient id="woodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#A0703A" />
            <stop offset="25%"  stopColor="#8A5C28" />
            <stop offset="50%"  stopColor="#7A5020" />
            <stop offset="75%"  stopColor="#8C6030" />
            <stop offset="100%" stopColor="#7A5228" />
          </linearGradient>

          {/* Highlight superiore manico */}
          <linearGradient id="woodSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
            <stop offset="35%"  stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
          </linearGradient>

          {/* Rivetto metallico */}
          <radialGradient id="rivetGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#E8C878" />
            <stop offset="50%"  stopColor="#B8922A" />
            <stop offset="100%" stopColor="#7A5C10" />
          </radialGradient>

          {/* Pattern venature legno */}
          <pattern id="grain" x="0" y="0" width={W} height={H} patternUnits="userSpaceOnUse">
            <line x1={BLADE_END} y1="7"  x2={W} y2="8"  stroke="rgba(0,0,0,0.06)" strokeWidth="1.0" />
            <line x1={BLADE_END} y1="14" x2={W} y2="13" stroke="rgba(0,0,0,0.08)" strokeWidth="1.3" />
            <line x1={BLADE_END} y1="20" x2={W} y2="21" stroke="rgba(0,0,0,0.05)" strokeWidth="0.8" />
            <line x1={BLADE_END} y1="27" x2={W} y2="26" stroke="rgba(0,0,0,0.09)" strokeWidth="1.5" />
            <line x1={BLADE_END} y1="33" x2={W} y2="34" stroke="rgba(0,0,0,0.05)" strokeWidth="0.7" />
            <line x1={BLADE_END} y1="40" x2={W} y2="39" stroke="rgba(0,0,0,0.08)" strokeWidth="1.2" />
            <line x1={BLADE_END} y1="47" x2={W} y2="48" stroke="rgba(0,0,0,0.06)" strokeWidth="0.9" />
            <line x1={BLADE_END} y1="11" x2={W} y2="11" stroke="rgba(200,160,80,0.08)" strokeWidth="0.5" />
            <line x1={BLADE_END} y1="23" x2={W} y2="24" stroke="rgba(200,160,80,0.07)" strokeWidth="0.5" />
            <line x1={BLADE_END} y1="36" x2={W} y2="35" stroke="rgba(200,160,80,0.09)" strokeWidth="0.6" />
            <line x1={BLADE_END} y1="44" x2={W} y2="45" stroke="rgba(200,160,80,0.07)" strokeWidth="0.4" />
          </pattern>

          <clipPath id="knifeClip">
            {/* Forma completa del coltello:
                - sinistra: arrotondata (punta lama)
                - centro: rettangolare piatta
                - destra: manico con bordi arrotondati più pronunciati */}
            <path d={`
              M ${H / 2},0
              L ${BLADE_END + 10},0
              Q ${BLADE_END + 20},0 ${BLADE_END + 22},${H * 0.08}
              L ${W - 14},${H * 0.04}
              Q ${W},${H * 0.04} ${W},${H / 2}
              Q ${W},${H * 0.96} ${W - 14},${H * 0.96}
              L ${BLADE_END + 22},${H * 0.92}
              Q ${BLADE_END + 20},${H} ${BLADE_END + 10},${H}
              L ${H / 2},${H}
              Q 0,${H} 0,${H / 2}
              Q 0,0 ${H / 2},0
              Z
            `} />
          </clipPath>
        </defs>

        <g clipPath="url(#knifeClip)">
          {/* Lama */}
          <rect x="0" y="0" width={BLADE_END + 22} height={H} fill="url(#bladeGrad)" />

          {/* Bordo lama */}
          <rect x="0" y="0" width={BLADE_END + 22} height={H}
            fill="none" stroke="#D4CAB5" strokeWidth="1" />

          {/* Separatore lama/manico — linea verticale sottile */}
          <line
            x1={BLADE_END + 1} y1={H * 0.08}
            x2={BLADE_END + 1} y2={H * 0.92}
            stroke="#B0A898" strokeWidth="1"
          />

          {/* Manico - legno */}
          <rect x={BLADE_END} y="0" width={W - BLADE_END} height={H} fill="url(#woodGrad)" />
          {/* Venature */}
          <rect x={BLADE_END} y="0" width={W - BLADE_END} height={H} fill="url(#grain)" />
          {/* Lucentezza */}
          <rect x={BLADE_END} y="0" width={W - BLADE_END} height={H} fill="url(#woodSheen)" />
        </g>

        {/* Bordo esterno coltello */}
        <path
          d={`
            M ${H / 2},0.5
            L ${BLADE_END + 10},0.5
            Q ${BLADE_END + 20},0.5 ${BLADE_END + 22},${H * 0.08}
            L ${W - 14},${H * 0.04}
            Q ${W - 0.5},${H * 0.04} ${W - 0.5},${H / 2}
            Q ${W - 0.5},${H * 0.96} ${W - 14},${H * 0.96}
            L ${BLADE_END + 22},${H * 0.92}
            Q ${BLADE_END + 20},${H - 0.5} ${BLADE_END + 10},${H - 0.5}
            L ${H / 2},${H - 0.5}
            Q 0.5,${H - 0.5} 0.5,${H / 2}
            Q 0.5,0.5 ${H / 2},0.5
            Z
          `}
          fill="none"
          stroke="#5A3D1E"
          strokeWidth="0.8"
          opacity="0.4"
        />

        {/* Rivetti — 3 piccoli, metallici */}
        {[BLADE_END + 26, BLADE_END + 52, BLADE_END + 78].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy={H / 2} r={4.5} fill="rgba(0,0,0,0.20)" transform="translate(0.4,0.6)" />
            <circle cx={cx} cy={H / 2} r={4.5} fill="url(#rivetGrad)" />
            <ellipse cx={cx - 1.2} cy={H / 2 - 1.5} rx={1.8} ry={1.0} fill="rgba(255,255,255,0.60)" />
          </g>
        ))}
      </svg>

      {/* Nav items sovrapposti alla lama */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: BLADE_END,
        height: H,
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
      }}>
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = active === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setActive(href)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "4px 0",
                borderRadius: 9999,
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
                background: isActive ? "rgba(0,0,0,0.06)" : "transparent",
                color: isActive ? "#1a1714" : "#7a7060",
                flex: 1,
                height: "80%",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "#1a1714";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "#7a7060";
              }}
            >
              <Icon strokeWidth={1.5} style={{ width: 16, height: 16, color: "inherit", flexShrink: 0 }} />
              <span style={{
                fontSize: 8.5,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "inherit",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
              {isActive && (
                <span style={{
                  display: "block",
                  width: 14,
                  height: 1.5,
                  borderRadius: 99,
                  background: "#3a2e1e",
                }} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}