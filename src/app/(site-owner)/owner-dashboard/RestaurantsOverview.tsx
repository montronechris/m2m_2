"use client";

// Overview di tutti i ristoranti registrati (solo lettura) per la owner-dashboard.
// Dati da GET /api/owner/restaurants (autenticazione via cookie site_owner_token).
import { useEffect, useState } from "react";

interface RestaurantRow {
  id: string;
  name: string | null;
  plan: string | null;
  status: string | null;
  access_expires_at: string | null;
  created_at: string | null;
  staff_count: number;
}

// Il gate abbonamento (isRestaurantActive in src/lib/check-access.ts) esenta
// sempre questo ID a prescindere da status/access_expires_at: è la vetrina
// demo pubblica e non deve mai risultare bloccata.
const DEMO_RESTAURANT_ID = "de8f0f41-5b5d-48a3-8e98-281deb79412d";

const PLAN_LABEL: Record<string, string> = {
  free_trial: "Prova gratuita",
  base: "Base",
  pro: "Pro",
  enterprise: "Enterprise",
  custom: "Personalizzato",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Attivo",
  closed: "Chiuso (temporaneo)",
  suspended: "Sospeso",
  deleted: "Eliminato",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

const cellStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#e2e8f0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  whiteSpace: "nowrap",
};
const headStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

export default function RestaurantsOverview() {
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/owner/restaurants", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data?.error ?? "Errore nel caricamento.");
        } else {
          setRows((data.restaurants ?? []) as RestaurantRow[]);
        }
      } catch {
        if (active) setError("Errore di rete.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const totalStaff = rows.reduce((s, r) => s + Number(r.staff_count || 0), 0);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          Ristoranti registrati
        </h2>
        {!loading && !error && (
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            {rows.length} ristoranti · {totalStaff} membri staff totali
          </span>
        )}
      </div>

      {loading && <p style={{ color: "#94a3b8", fontSize: 14 }}>Caricamento…</p>}
      {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Nessun ristorante registrato.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headStyle}>Nome</th>
                <th style={headStyle}>Abbonamento</th>
                <th style={headStyle}>Stato</th>
                <th style={headStyle}>Scadenza</th>
                <th style={{ ...headStyle, textAlign: "center" }}>Staff</th>
                <th style={headStyle}>Creato il</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expired = isExpired(r.access_expires_at);
                const blocked = r.status === "suspended" || r.status === "deleted";
                return (
                  <tr key={r.id}>
                    <td style={{ ...cellStyle, fontWeight: 600, color: "#f1f5f9" }}>
                      {r.name || "(senza nome)"}
                    </td>
                    <td style={cellStyle}>
                      {r.plan ? (PLAN_LABEL[r.plan] ?? r.plan) : "Legacy / illimitato"}
                    </td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: blocked ? "#fca5a5" : "#6ee7b7",
                          background: blocked ? "rgba(248,113,113,0.12)" : "rgba(16,185,129,0.12)",
                        }}
                      >
                        {r.status ? (STATUS_LABEL[r.status] ?? r.status) : "—"}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, color: r.id === DEMO_RESTAURANT_ID ? "#94a3b8" : expired ? "#fca5a5" : "#e2e8f0" }}>
                      {r.id === DEMO_RESTAURANT_ID ? (
                        "Nessuna scadenza (bypass da codice)"
                      ) : (
                        <>
                          {r.access_expires_at ? fmtDate(r.access_expires_at) : "Nessuna"}
                          {expired && " (scaduto)"}
                        </>
                      )}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{Number(r.staff_count || 0)}</td>
                    <td style={cellStyle}>{fmtDate(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
