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
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 16,
        padding: "40px 36px",
        width: "100%",
        maxWidth: 400,
      }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Accesso Proprietario
        </h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>
          Area riservata alla gestione del sito.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
            placeholder="admin@tuosito.com"
          />

          <label style={{ ...labelStyle, marginTop: 16 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            minLength={8}
            style={inputStyle}
            placeholder="••••••••"
          />

          {error && (
            <p style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 14,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "12px 0",
              background: loading ? "#1a3a2a" : "#064e3b",
              color: loading ? "#6ee7b7" : "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#aaa",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#fff",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};