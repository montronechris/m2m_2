"use client";
// src/app/(site-owner)/owner-dashboard/SubscriptionRequestsManager.tsx
//
// Vista "Richieste abbonamento" della dashboard proprietario.
// Mostra le richieste di RINNOVO e CAMBIO PIANO inviate dagli admin dei
// ristoranti e permette di segnarle come gestite o rifiutate.

import { useCallback, useEffect, useState } from "react";

// ── Tipi ────────────────────────────────────────────────────────────────────
interface RequestRow {
  id: string;
  restaurant_id: string;
  type: "renew" | "plan_change";
  current_plan: string | null;
  requested_plan: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  restaurants: {
    name: string | null;
    slug: string | null;
    plan: string | null;
    access_expires_at: string | null;
  } | null;
}

type FilterKey = "pending" | "all" | "approved" | "rejected";

// ── Helpers ───────────────────────────────────────────────────────────────
function parseUTC(iso: string): Date {
  const n = iso.endsWith("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z";
  return new Date(n);
}
function formatDate(iso: string) {
  return parseUTC(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const TYPE_META = {
  renew: { label: "Rinnovo", color: "#f59e0b", icon: "♻" },
  plan_change: { label: "Cambio piano", color: "#a78bfa", icon: "⇄" },
} as const;

const STATUS_META = {
  pending: { label: "In attesa", color: "#f59e0b" },
  approved: { label: "Gestita", color: "#10b981" },
  rejected: { label: "Rifiutata", color: "#6b7280" },
} as const;

// ── Componente ──────────────────────────────────────────────────────────────
export default function SubscriptionRequestsManager() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/owner/subscription-requests");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Errore nel caricamento.");
        return;
      }
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setError("Errore di rete.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchRequests();
      setLoading(false);
    })();
  }, [fetchRequests]);

  async function resolve(id: string, status: "approved" | "rejected" | "pending") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/owner/subscription-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Errore nell'aggiornamento.");
        return;
      }
      await fetchRequests();
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const shown =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", fontSize: 14, padding: "40px 0" }}>
        <span style={{ width: 16, height: 16, border: "2px solid rgba(245,158,11,0.25)", borderTopColor: "#f59e0b", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
        Caricamento richieste...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeInUp 0.4s ease both" }}>
      {/* Intestazione */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#fff" }}>Richieste abbonamento</h2>
          <p style={{ color: "#666", fontSize: 13, margin: "4px 0 0" }}>
            {pending.length > 0
              ? `${pending.length} richiesta/e in attesa di gestione`
              : "Nessuna richiesta in attesa"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([
            ["pending", "In attesa"],
            ["approved", "Gestite"],
            ["rejected", "Rifiutate"],
            ["all", "Tutte"],
          ] as [FilterKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid",
                borderColor: filter === key ? "#f59e0b" : "#252525",
                background: filter === key ? "linear-gradient(135deg, #f59e0b22, #f59e0b08)" : "transparent",
                color: filter === key ? "#f59e0b" : "#888",
                fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease",
              }}
            >
              {label}
              {key === "pending" && pending.length > 0 && (
                <span style={{ marginLeft: 6, background: "#f59e0b", color: "#000", borderRadius: 99, padding: "0 6px", fontSize: 11, fontWeight: 700 }}>
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16, animation: "shake 0.4s ease" }}>{error}</p>
      )}

      {shown.length === 0 ? (
        <div style={{
          border: "1px dashed #2a2a2a", borderRadius: 14, padding: "48px 24px",
          textAlign: "center", color: "#555", fontSize: 14,
          background: "linear-gradient(135deg, #0d0d0d, #080808)",
        }}>
          Nessuna richiesta in questa categoria.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {shown.map((r, idx) => {
            const tm = TYPE_META[r.type];
            const sm = STATUS_META[r.status];
            return (
              <div
                key={r.id}
                style={{
                  background: "linear-gradient(135deg, #131313, #0c0c0c)",
                  border: `1px solid ${tm.color}22`,
                  borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden",
                  animation: `fadeInUp 0.35s ease ${idx * 0.04}s both`,
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: tm.color }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: `${tm.color}18`, color: tm.color, border: `1px solid ${tm.color}44`,
                        borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 700,
                      }}>
                        <span aria-hidden>{tm.icon}</span> {tm.label}
                      </span>
                      <span style={{
                        background: `${sm.color}18`, color: sm.color, border: `1px solid ${sm.color}44`,
                        borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                      }}>
                        {sm.label}
                      </span>
                    </div>

                    <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>
                      {r.restaurants?.name ?? "Ristorante"}
                    </p>
                    <p style={{ color: "#666", fontSize: 12, margin: 0 }}>
                      {r.restaurants?.slug ? `/${r.restaurants.slug}` : r.restaurant_id}
                    </p>

                    <div style={{ marginTop: 10, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
                      <div>
                        <span style={{ color: "#555" }}>Piano attuale: </span>
                        <span style={{ color: "#ccc", fontWeight: 600 }}>{r.current_plan ?? r.restaurants?.plan ?? "—"}</span>
                      </div>
                      {r.type === "plan_change" && (
                        <div>
                          <span style={{ color: "#555" }}>Piano richiesto: </span>
                          <span style={{ color: "#a78bfa", fontWeight: 700 }}>{r.requested_plan ?? "—"}</span>
                        </div>
                      )}
                    </div>

                    {r.note && (
                      <p style={{ color: "#888", fontSize: 12, margin: "10px 0 0", fontStyle: "italic" }}>“{r.note}”</p>
                    )}

                    <p style={{ color: "#444", fontSize: 11, margin: "10px 0 0" }}>
                      Inviata il {formatDate(r.created_at)}
                      {r.resolved_at && ` · gestita il ${formatDate(r.resolved_at)}`}
                    </p>
                  </div>

                  {r.status === "pending" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 150 }}>
                      <button
                        onClick={() => resolve(r.id, "approved")}
                        disabled={busyId === r.id}
                        style={{
                          padding: "8px 14px", borderRadius: 8, border: "none",
                          background: busyId === r.id ? "#064e3baa" : "linear-gradient(135deg, #064e3b, #022c22)",
                          color: "#fff", fontSize: 13, fontWeight: 600, cursor: busyId === r.id ? "default" : "pointer",
                          opacity: busyId === r.id ? 0.7 : 1, transition: "all 0.2s ease",
                          boxShadow: "0 4px 14px rgba(16,185,129,0.2)",
                        }}
                      >
                        ✓ Segna gestita
                      </button>
                      <button
                        onClick={() => resolve(r.id, "rejected")}
                        disabled={busyId === r.id}
                        style={{
                          padding: "8px 14px", borderRadius: 8, border: "1px solid #3a1f1f",
                          background: "transparent", color: "#f87171", fontSize: 13, fontWeight: 600,
                          cursor: busyId === r.id ? "default" : "pointer", opacity: busyId === r.id ? 0.6 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        Rifiuta
                      </button>
                    </div>
                  )}

                  {r.status !== "pending" && (
                    <button
                      onClick={() => resolve(r.id, "pending")}
                      disabled={busyId === r.id}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a",
                        background: "transparent", color: "#888", fontSize: 12, fontWeight: 600,
                        cursor: busyId === r.id ? "default" : "pointer", opacity: busyId === r.id ? 0.6 : 1,
                        height: "fit-content", transition: "all 0.2s ease",
                      }}
                    >
                      ↺ Ripristina
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
