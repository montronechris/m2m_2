"use client";

import { ChefHat, MapPin } from "lucide-react";

interface RestaurantTitleProps {
  name: string;
  tableNumber?: string | null;
}

export function RestaurantTitle({ name, tableNumber }: RestaurantTitleProps) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        .hero-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 7vw, 58px);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.05;
          background: linear-gradient(135deg, #052e1c 0%, #065f35 45%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 6px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px 7px 9px;
          border-radius: 999px;
          background: rgba(255,255,255,0.85);
          border: 1.5px solid rgba(5,150,105,0.22);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 16px rgba(5,150,105,0.1);
          margin-bottom: 22px;
        }
        .hero-badge-text {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #059669;
        }
        .hero-table-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 20px;
          border-radius: 999px;
          background: rgba(255,255,255,0.88);
          border: 1.5px solid rgba(5,150,105,0.2);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 16px rgba(5,150,105,0.1);
          margin-bottom: 22px;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .hero-table-num {
          font-size: 15px;
          font-weight: 700;
          color: #065f35;
        }
        .hero-table-sep {
          color: rgba(5,150,105,0.3);
          font-size: 13px;
        }
        .hero-buon {
          font-size: 14px;
          font-weight: 600;
          color: #059669;
        }
        .hero-desc {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(15px, 2.2vw, 18px);
          font-style: italic;
          font-weight: 400;
          line-height: 1.8;
          color: #3d7a58;
          max-width: 500px;
          margin: 0 auto;
        }
        .hero-desc strong {
          font-style: normal;
          font-weight: 700;
          color: #059669;
        }
      `}</style>

      <div style={{
        position: "relative",
        overflow: "hidden",
        padding: "60px 24px 56px",
        textAlign: "center",
      }}>
        {/* Pattern puntini */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(5,150,105,0.1) 1.5px, transparent 1.5px)",
          backgroundSize: "26px 26px",
        }} />

        {/* Cerchio decorativo alto-destra */}
        <div style={{
          position: "absolute", top: -100, right: -100,
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        {/* Cerchio decorativo basso-sinistra */}
        <div style={{
          position: "absolute", bottom: -70, left: -70,
          width: 240, height: 240, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Striscia accent superiore */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, transparent 0%, #34d399 25%, #059669 75%, transparent 100%)",
        }} />

        {/* Contenuto */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>

          {/* Badge */}
          <div className="hero-badge">
            <div style={{
              width: 28, height: 28, borderRadius: 9,
              background: "linear-gradient(135deg, #059669, #10b981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 10px rgba(16,185,129,0.45)",
            }}>
              <ChefHat style={{ width: 15, height: 15, color: "#fff" }} />
            </div>
            <span className="hero-badge-text">Ristorante Partner</span>
          </div>

          {/* Nome */}
          <h1 className="hero-name">{name}</h1>

          {/* Divisore */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, margin: "18px auto 20px", maxWidth: 200,
          }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(5,150,105,0.28))" }} />
            <span style={{ fontSize: 6, color: "#10b981", letterSpacing: 6 }}>●●●</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(5,150,105,0.28), transparent)" }} />
          </div>

          {/* Tavolo pill */}
          {tableNumber && (
            <div className="hero-table-pill">
              <MapPin style={{ width: 14, height: 14, color: "#059669", flexShrink: 0 }} />
              <span className="hero-table-num">Tavolo {tableNumber}</span>
              <span className="hero-table-sep">•</span>
              <span className="hero-buon">Buon appetito! 🍽️</span>
            </div>
          )}

          {/* Descrizione in Playfair italic */}
          <p className="hero-desc">
            Scegli tra i nostri piatti preparati con passione.{" "}
            <strong>Ingredienti freschi</strong>, ricette tradizionali
            e servizio veloce direttamente al tuo tavolo.
          </p>

        </div>
      </div>
    </>
  );
}