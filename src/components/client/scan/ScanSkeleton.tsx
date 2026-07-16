// src/components/client/scan/ScanSkeleton.tsx
"use client";

/**
 * Placeholder mostrato su /scan finché il colore del brand (impostato in admin)
 * non è ancora stato caricato. Evita che la pagina venga renderizzata con un
 * colore di default per poi "scattare" al colore reale non appena arriva.
 * Nessun elemento reale (testi, azioni, CTA) viene mostrato finché il brand
 * non è pronto: solo placeholder neutri in pulse.
 */
export function ScanSkeleton() {
  return (
    <div
      style={{
        position: "relative",
        height: "100dvh",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/food-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          padding: "28px 24px 0",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Header placeholder */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div className="mtr-skel" style={{ width: 56, height: 56, borderRadius: "50%" }} />
          <div className="mtr-skel" style={{ width: 160, height: 18, borderRadius: 8 }} />
          <div className="mtr-skel" style={{ width: 80, height: 12, borderRadius: 6 }} />
        </div>

        {/* Eyebrow + title placeholders */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div className="mtr-skel" style={{ width: 100, height: 11, borderRadius: 6 }} />
          <div className="mtr-skel" style={{ width: 220, height: 26, borderRadius: 8 }} />
        </div>

        {/* Steps card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "20px 18px",
            marginBottom: 16,
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div className="mtr-skel" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
                <div style={{ flex: 1, paddingTop: 2, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="mtr-skel" style={{ width: "60%", height: 13, borderRadius: 6 }} />
                  <div className="mtr-skel" style={{ width: "85%", height: 12, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "18px 18px",
            marginBottom: 16,
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          }}
        >
          <div className="mtr-skel" style={{ width: 120, height: 11, borderRadius: 6, marginBottom: 14 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1].map((i) => (
              <div key={i} className="mtr-skel" style={{ height: 66, borderRadius: 50 }} />
            ))}
          </div>
        </div>

        {/* Checkbox card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#fff",
            borderRadius: 20,
            padding: "14px 18px",
            marginBottom: 20,
            boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          }}
        >
          <div className="mtr-skel" style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0 }} />
          <div className="mtr-skel" style={{ flex: 1, height: 14, borderRadius: 6 }} />
        </div>
      </div>

      {/* Sticky CTA placeholder */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 24px max(28px, env(safe-area-inset-bottom))",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          paddingTop: 12,
        }}
      >
        <div className="mtr-skel" style={{ width: "100%", height: 54, borderRadius: 50 }} />
      </div>

      <style>{`
        .mtr-skel {
          background: linear-gradient(90deg, rgba(120,120,120,0.16) 25%, rgba(120,120,120,0.28) 37%, rgba(120,120,120,0.16) 63%);
          background-size: 400% 100%;
          animation: mtr-skel-pulse 1.4s ease-in-out infinite;
        }
        @keyframes mtr-skel-pulse {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
}
