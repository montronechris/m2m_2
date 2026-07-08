"use client";
// src/app/(site-owner)/owner-login/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/site-owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Errore sconosciuto.");
        return;
      }

      router.push("/owner-dashboard");
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0f1512 0%, #0a0a0a 50%, #050505 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Blob animati di sfondo (coerenti con la dashboard) */}
      <div style={{
        position: "absolute", top: -150, left: -100, width: 500, height: 500,
        background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none", animation: "float 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: -150, right: -100, width: 400, height: 400,
        background: "radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none", animation: "float 10s ease-in-out infinite reverse",
      }} />

      {/* Card login */}
      <div
        className="login-card"
        style={{
          background: "linear-gradient(180deg, #161616 0%, #0d0d0d 100%)",
          border: "1px solid #1f1f1f",
          borderRadius: 20,
          padding: "44px 38px",
          width: "100%",
          maxWidth: 420,
          position: "relative",
          zIndex: 1,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          animation: "modalIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        {/* Glow decorativo */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 140, height: 140,
          background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none", filter: "blur(20px)",
        }} />

        {/* Border-top gradient animato */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #10b981aa, #f59e0b55, transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer 4s linear infinite",
          borderRadius: "20px 20px 0 0",
        }} />

        {/* Icona avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          color: "#fff", marginBottom: 20,
          animation: "successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>

        <h1 style={{
          color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #fff 0%, #888 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          animation: "fadeInUp 0.5s ease 0.2s both",
        }}>
          Accesso Proprietario
        </h1>
        <p style={{
          color: "#666", fontSize: 14, marginBottom: 32,
          display: "flex", alignItems: "center", gap: 6,
          animation: "fadeInUp 0.5s ease 0.3s both",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "blink 2s ease-in-out infinite" }} />
          Area riservata alla gestione del sito.
        </p>

        <form onSubmit={handleSubmit} style={{ animation: "fadeInUp 0.5s ease 0.4s both" }}>
          <label style={labelStyle}>Email</label>
          <div style={{ position: "relative", marginBottom: 4 }}>
            <svg style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "#444", pointerEvents: "none",
            }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="text-input"
              style={{ ...inputStyle, paddingLeft: 40 }}
              placeholder="admin@tuosito.com"
            />
          </div>

          <label style={{ ...labelStyle, marginTop: 18 }}>Password</label>
          <div style={{ position: "relative", marginBottom: 4 }}>
            <svg style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "#444", pointerEvents: "none",
            }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={8}
              className="text-input"
              style={{ ...inputStyle, paddingLeft: 40, paddingRight: 40 }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer", padding: 4,
                color: showPw ? "#10b981" : "#555",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6, transition: "all 0.2s ease",
              }}
              className="icon-btn"
              tabIndex={-1}
              aria-label={showPw ? "Nascondi password" : "Mostra password"}
            >
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p style={{
              marginTop: 18,
              padding: "11px 14px",
              background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05))",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 14,
              display: "flex", alignItems: "center", gap: 8,
              animation: "shake 0.4s ease",
              boxShadow: "0 0 16px rgba(239,68,68,0.1)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              marginTop: 26,
              width: "100%",
              padding: "13px 0",
              background: loading
                ? "linear-gradient(135deg, #064e3baa, #022c22aa)"
                : "linear-gradient(135deg, #064e3b, #022c22)",
              color: loading ? "#6ee7b7" : "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.25s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: loading
                ? "none"
                : "0 8px 24px rgba(16,185,129,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#6ee7b7",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                  filter: "drop-shadow(0 0 6px rgba(16,185,129,0.5))",
                }} />
                Accesso in corso...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease" }}>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Accedi
              </>
            )}
          </button>
        </form>

        {/* Footer ornamentale */}
        <div style={{
          marginTop: 28, paddingTop: 20, borderTop: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          color: "#3a3a3a", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
          animation: "fadeInUp 0.5s ease 0.6s both",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Connessione sicura
        </div>
      </div>

      {/* Stili globali e keyframes — coerenti con la dashboard */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes successPop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33%      { transform: translate(20px, -20px); }
          66%      { transform: translate(-15px, 15px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          75%      { transform: translateX(6px); }
        }

        /* Hover / focus states */
        .text-input {
          transition: all 0.2s ease !important;
        }
        .text-input:focus {
          border-color: #10b98155 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.02) !important;
          background: #161616 !important;
        }
        .text-input:hover:not(:focus) {
          border-color: #333 !important;
        }
        .icon-btn:hover {
          background: #1a1a1a !important;
          color: #10b981 !important;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.12);
          box-shadow: 0 12px 32px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.12) !important;
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .btn-primary:hover:not(:disabled) svg {
          transform: translateX(3px);
        }
        .login-card:hover {
          box-shadow: 0 28px 88px rgba(0,0,0,0.75), 0 0 80px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.05) !important;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #333; }

        /* Selection */
        ::selection { background: rgba(16,185,129,0.3); color: #fff; }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#aaa",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 8,
  letterSpacing: "0.02em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  color: "#fff",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
