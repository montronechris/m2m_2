"use client";

import { useEffect, useRef, useState } from "react";
import type { Palette } from "@/components/client/order/CategoryFilter";

interface RestaurantInfoProps {
  name: string;
  restaurantId?: string | null;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tripadvisor?: string | null;
  website?: string | null;
  palette: Palette;
}

export function RestaurantInfo({
  name, restaurantId, address, phone, instagram, facebook, tripadvisor, website, palette: T,
}: RestaurantInfoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Almeno un campo social/contatto deve esistere
  const hasContact = address || phone || instagram || facebook || tripadvisor || website;
  if (!hasContact) return null;

  const socials = [
    instagram && {
      key: "instagram",
      label: "Instagram",
      href: instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace("@","")}`,
      color: "#E1306C",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
        </svg>
      ),
    },
    facebook && {
      key: "facebook",
      label: "Facebook",
      href: facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook.replace("@","")}`,
      color: "#1877F2",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
        </svg>
      ),
    },
    tripadvisor && {
      key: "tripadvisor",
      label: "TripAdvisor",
      href: tripadvisor.startsWith("http") ? tripadvisor : `https://tripadvisor.com/${tripadvisor}`,
      color: "#34E0A1",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a7 7 0 110 14A7 7 0 0112 5zm0 2a5 5 0 100 10A5 5 0 0012 7zm0 2a3 3 0 110 6 3 3 0 010-6z"/>
        </svg>
      ),
    },
  ].filter(Boolean) as { key: string; label: string; href: string; color: string; icon: React.ReactNode }[];

  return (
    <div
      ref={ref}
      style={{
        maxWidth: 896,
        margin: "0 auto",
        padding: "0 16px 64px",
      }}
    >
      {/* Divider decorativo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        marginBottom: 40,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(20px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${T.borderMid})` }} />
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: T.brand,
              opacity: 1 - i * 0.25,
            }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${T.borderMid})` }} />
      </div>

      {/* Card principale */}
      <div style={{
        borderRadius: 28,
        border: `1.5px solid ${T.borderMid}`,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        boxShadow: `0 8px 40px ${T.border}, 0 2px 0 rgba(255,255,255,0.9) inset`,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(32px)",
        transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
      }}>

        {/* Header card */}
        <div style={{
          background: T.btnBg,
          padding: "28px 32px 24px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Blob decorativo */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 180, height: 180, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }} />
          <div style={{
            position: "absolute", bottom: -30, left: 20,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />
          <p style={{
            margin: 0,
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            marginBottom: 6,
          }}>Chi siamo</p>
          <h2 style={{
            margin: 0,
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}>{name}</h2>
        </div>

        {/* Corpo card */}
        <div style={{ padding: "24px 32px 28px" }}>

          {/* Indirizzo */}
          {address && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              marginBottom: phone ? 20 : 24,
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateX(-16px)",
              transition: "opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: T.chipBg,
                border: `1.5px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth={2}>
                  <path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textSoft }}>Indirizzo</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: T.text, lineHeight: 1.4 }}>{address}</p>
              </div>
            </div>
          )}

          {/* Telefono */}
          {phone && (
            <a
              href={`tel:${phone}`}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                marginBottom: socials.length > 0 ? 28 : 0,
                textDecoration: "none",
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateX(-16px)",
                transition: "opacity 0.5s ease 0.35s, transform 0.5s ease 0.35s",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: T.chipBg,
                border: `1.5px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = T.chipBgActive}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = T.chipBg}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth={2}>
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textSoft }}>Telefono</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: T.brand }}>{phone}</p>
              </div>
            </a>
          )}

          {/* Bottom row: social sinistra + website destra */}
          {(socials.length > 0 || website) && (
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(16px)",
              transition: "opacity 0.5s ease 0.45s, transform 0.5s ease 0.45s",
            }}>

              {/* Colonna sinistra: social */}
              {socials.length > 0 && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: "0 0 14px",
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: T.textSoft,
                  }}>Seguici</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {socials.map((s, i) => (
                      <a
                        key={s.key}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: 9,
                          padding: "10px 18px",
                          borderRadius: 999,
                          border: `1.5px solid ${T.border}`,
                          background: "rgba(255,255,255,0.7)",
                          color: T.textMuted,
                          textDecoration: "none",
                          fontSize: 13, fontWeight: 600,
                          transition: "all 0.2s",
                          boxShadow: `0 2px 8px ${T.border}`,
                          opacity: visible ? 1 : 0,
                          transform: visible ? "none" : "scale(0.9)",
                          transitionDelay: `${0.5 + i * 0.08}s`,
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.background = s.color + "18";
                          el.style.borderColor = s.color + "60";
                          el.style.color = s.color;
                          el.style.transform = "translateY(-2px)";
                          el.style.boxShadow = `0 6px 20px ${s.color}30`;
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.background = "rgba(255,255,255,0.7)";
                          el.style.borderColor = T.border;
                          el.style.color = T.textMuted;
                          el.style.transform = "none";
                          el.style.boxShadow = `0 2px 8px ${T.border}`;
                        }}
                      >
                        <span style={{ color: s.color, display: "flex" }}>{s.icon}</span>
                        {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Colonna destra: bottone sito web */}
              {website && (
                <div style={{ flexShrink: 0 }}>
                  <p style={{
                    margin: "0 0 14px",
                    fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: T.textSoft,
                  }}>Il nostro sito</p>
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      padding: "12px 22px",
                      borderRadius: 14,
                      background: T.btnBg,
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 14, fontWeight: 700,
                      boxShadow: T.btnShadow,
                      transition: "transform 0.2s, box-shadow 0.2s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.transform = "translateY(-2px)";
                      el.style.boxShadow = T.glowRing;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.transform = "none";
                      el.style.boxShadow = T.btnShadow;
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                    </svg>
                    Visita il sito
                  </a>
                </div>
              )}

            </div>
          )}

          {/* Bottone recensione */}
          {restaurantId && (
            <div style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: `1.5px solid ${T.border}`,
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(16px)",
              transition: "opacity 0.5s ease 0.55s, transform 0.5s ease 0.55s",
            }}>
              <p style={{
                margin: "0 0 14px",
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: T.textSoft,
              }}>La tua opinione conta</p>
              <a
                href={`/review/${restaurantId}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  padding: "13px 24px",
                  borderRadius: 14,
                  background: T.btnBg,
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 14, fontWeight: 700,
                  boxShadow: T.btnShadow,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = T.glowRing;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "none";
                  el.style.boxShadow = T.btnShadow;
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Lascia una recensione
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}