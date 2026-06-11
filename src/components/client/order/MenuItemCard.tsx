// src/components/client/order/MenuItemCard.tsx
"use client";

import { useState, useRef } from "react";
import { Plus, Info, Leaf, WheatOff, Loader2, X, Sprout, AlertTriangle, ShoppingBag } from "lucide-react";
import React from "react";
import type { Palette } from "./CategoryFilter";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  image_url?: string | null;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  allergens?: string[];
  ingredients?: string[];
  story?: string | null;
}

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem, originRect: DOMRect) => void;
  isLoadingOptions?: boolean;
  palette: Palette;
}

export function MenuItemCard({ item, onAdd, isLoadingOptions = false, palette: T }: MenuItemCardProps) {
  const [showInfo, setShowInfo]   = useState(false);
  const [animating, setAnimating] = useState(false);
  const infoButtonRef             = useRef<HTMLButtonElement>(null);

  const openInfo = () => {
    setShowInfo(true);
    setAnimating(false);
    document.body.setAttribute("data-panel-open", "true");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimating(true));
    });
  };

  const closeInfo = () => {
    setAnimating(false);
    document.body.removeAttribute("data-panel-open");
    setTimeout(() => setShowInfo(false), 280);
  };

  const badges = [
    item.is_vegan       && { label: "Vegano",        icon: <Sprout   className="w-3.5 h-3.5" />, color: "#16a34a", bg: "#dcfce7" },
    item.is_vegetarian  && { label: "Vegetariano",   icon: <Leaf     className="w-3.5 h-3.5" />, color: "#15803d", bg: "#f0fdf4" },
    item.is_gluten_free && { label: "Senza glutine", icon: <WheatOff className="w-3.5 h-3.5" />, color: "#b45309", bg: "#fffbeb" },
  ].filter(Boolean) as { label: string; icon: React.ReactNode; color: string; bg: string }[];

  return (
    <>
      {/* ── CARD ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: 20,
          border: `1.5px solid ${T.border}`,
          boxShadow: `0 2px 12px ${T.border}`,
          transition: "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
          overflow: "hidden",
          position: "relative",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${T.borderMid}`;
          (e.currentTarget as HTMLDivElement).style.borderColor = T.borderStrong;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 12px ${T.border}`;
          (e.currentTarget as HTMLDivElement).style.borderColor = T.border;
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>

          {/* Thumbnail immagine */}
          {item.image_url && (
            <div style={{ width: 110, flexShrink: 0, position: "relative", overflow: "hidden" }}>
              <img
                src={item.image_url}
                alt={item.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to right, transparent 60%, rgba(255,255,255,0.18))",
              }} />
            </div>
          )}

          {/* Contenuto principale */}
          <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>

            {/* Nome + badge icone */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, lineHeight: 1.2, margin: 0 }}>
                  {item.name}
                </h3>
                {item.is_vegan       && <Sprout   style={{ width: 15, height: 15, color: "#16a34a", flexShrink: 0 }} />}
                {item.is_vegetarian  && <Leaf     style={{ width: 15, height: 15, color: "#22c55e", flexShrink: 0 }} />}
                {item.is_gluten_free && <WheatOff style={{ width: 15, height: 15, color: "#d97706", flexShrink: 0 }} />}
              </div>

              {item.description && (
                <p style={{
                  fontSize: 13.5, color: T.textMuted, lineHeight: 1.55, margin: "0 0 14px",
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                }}>
                  {item.description}
                </p>
              )}
            </div>

            {/* Prezzo + azioni */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>

              {/* Prezzo */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.brand, letterSpacing: "0.02em" }}>€</span>
                <span style={{ fontSize: 23, fontWeight: 900, color: T.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {(item.price_cents / 100).toFixed(2)}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Info */}
                <button
                  ref={infoButtonRef}
                  onClick={openInfo}
                  aria-label="Informazioni piatto"
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    border: `1.5px solid ${T.border}`,
                    background: T.chipBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.18s", flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = T.chipBgActive;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderStrong;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = T.chipBg;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                  }}
                >
                  <Info style={{ width: 15, height: 15, color: T.brand }} />
                </button>

                {/* Aggiungi */}
                <button
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    onAdd(item, rect);
                  }}
                  disabled={isLoadingOptions}
                  style={{
                    height: 40, paddingLeft: 18, paddingRight: 18,
                    borderRadius: 999, border: "none",
                    background: isLoadingOptions ? `${T.brand}66` : T.btnBg,
                    color: "#fff",
                    fontSize: 14, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6,
                    cursor: isLoadingOptions ? "not-allowed" : "pointer",
                    boxShadow: isLoadingOptions ? "none" : T.btnShadow,
                    transition: "transform 0.15s, box-shadow 0.15s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (!isLoadingOptions) {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = T.glowRing ?? T.btnShadow;
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = isLoadingOptions ? "none" : T.btnShadow;
                  }}
                >
                  {isLoadingOptions
                    ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                    : <><Plus style={{ width: 16, height: 16 }} />Aggiungi</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIDE PANEL INFO ── */}
      {showInfo && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeInfo}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              opacity: animating ? 1 : 0,
              transition: "opacity 0.28s ease",
            }}
          />

          {/* Pannello laterale sinistro */}
          <div
            style={{
              position: "fixed",
              top: 0, bottom: 0, left: 0,
              width: "min(85vw, 520px)",
              zIndex: 101,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: "0 24px 24px 0",
              boxShadow: "8px 0 40px rgba(0,0,0,0.18)",
              transform: animating ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {/* Header chiudi */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              padding: "12px 16px",
              flexShrink: 0,
            }}>
              <button
                onClick={closeInfo}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#f3f4f6", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X style={{ width: 16, height: 16, color: "#6b7280" }} />
              </button>
            </div>

            {/* Area scrollabile */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* Foto piatto */}
              {item.image_url && (
                <div style={{ position: "relative", width: "100%", height: 260, overflow: "hidden" }}>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
                    background: "linear-gradient(to bottom, transparent, #fff)",
                  }} />
                </div>
              )}

              {/* Contenuto */}
              <div style={{ padding: "20px 24px 32px" }}>

                {/* Nome e prezzo */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.2, flex: 1, marginRight: 12 }}>
                    {item.name}
                  </h2>
                  <span style={{ fontSize: 20, fontWeight: 900, color: T.brand, whiteSpace: "nowrap" }}>
                    €{(item.price_cents / 100).toFixed(2)}
                  </span>
                </div>

                {/* Descrizione */}
                {item.description && (
                  <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.6, marginBottom: 20 }}>
                    {item.description}
                  </p>
                )}

                {/* Badge dietetici */}
                {badges.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Caratteristiche
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {badges.map((b) => (
                        <span
                          key={b.label}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "6px 12px", borderRadius: 999,
                            background: b.bg, color: b.color,
                            fontSize: 13, fontWeight: 600,
                            border: `1px solid ${b.color}30`,
                          }}
                        >
                          {b.icon} {b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingredienti */}
                {item.ingredients && item.ingredients.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Ingredienti
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {item.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "4px 10px", borderRadius: 999,
                            background: T.light100, color: T.text,
                            fontSize: 13, border: `1px solid ${T.border}`,
                          }}
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergeni — colori fissi (warning semantico, non brand) */}
                {item.allergens && item.allergens.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Allergeni
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {item.allergens.map((al, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 999,
                            background: "#fff7ed", color: "#c2410c",
                            fontSize: 13, border: "1px solid #fed7aa",
                          }}
                        >
                          <AlertTriangle style={{ width: 12, height: 12 }} />
                          {al}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Storia del piatto */}
                {item.story ? (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      La storia del piatto
                    </p>
                    <div style={{
                      background: T.light100,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14, padding: "16px 18px",
                      position: "relative", overflow: "hidden",
                    }}>
                      <span style={{
                        position: "absolute", top: 6, left: 12,
                        fontSize: 48, color: T.light300, fontFamily: "Georgia, serif",
                        lineHeight: 1, userSelect: "none",
                      }}>❝</span>
                      <p style={{
                        fontSize: 14, color: "#374151", lineHeight: 1.75,
                        fontStyle: "italic", paddingLeft: 24, margin: 0,
                      }}>
                        {item.story}
                      </p>
                    </div>
                  </div>
                ) : (
                  badges.length === 0 && (!item.ingredients || item.ingredients.length === 0) && (!item.allergens || item.allergens.length === 0) && (
                    <div style={{ textAlign: "center", padding: "12px 0 4px", color: "#9ca3af", fontSize: 14 }}>
                      Nessuna informazione aggiuntiva disponibile.
                    </div>
                  )
                )}

                {/* CTA aggiungi */}
                <button
                  onClick={(e) => {
                    closeInfo();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    onAdd(item, rect);
                  }}
                  disabled={isLoadingOptions}
                  style={{
                    width: "100%", padding: "14px 0", marginTop: 8,
                    borderRadius: 14, border: "none", cursor: "pointer",
                    background: isLoadingOptions ? `${T.brand}66` : T.btnBg,
                    color: "#fff", fontSize: 16, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: isLoadingOptions ? "none" : T.btnShadow,
                    opacity: isLoadingOptions ? 0.6 : 1,
                  }}
                >
                  <ShoppingBag style={{ width: 18, height: 18 }} />
                  Aggiungi al carrello
                </button>
              </div>
            </div>{/* fine area scrollabile */}
          </div>
        </>
      )}
    </>
  );
}