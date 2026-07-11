"use client";

// Gestione (elenco / creazione / eliminazione) delle card della pagina
// /integrazioni, riservata al site owner. API: /api/owner/integration-cards
// (GET, POST) e /api/owner/integration-cards/[id] (DELETE). Auth via cookie.
import { useEffect, useState } from "react";

interface Card {
  id: string;
  card_key: string;
  icon_key: string;
  tag_key: string;
  title_it: string;
  title_en: string;
  description_it: string;
  description_en: string;
  votes: number;
  sort_order: number;
  is_active: boolean;
}

const ICONS = [
  "Truck", "CalendarCheck", "CreditCard", "PackageCheck", "HeartHandshake",
  "Sparkles", "ShieldCheck", "MonitorSmartphone", "Star", "ShoppingBag",
];
const TAGS = [
  "popular", "requested", "coming_soon", "new", "trending",
  "innovative", "compliance", "essential", "ai_powered", "practical",
];

const emptyForm = {
  card_key: "",
  icon_key: "Sparkles",
  tag_key: "new",
  title_it: "",
  title_en: "",
  description_it: "",
  description_en: "",
  votes: "",
  sort_order: "",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: 5,
};
const cellStyle: React.CSSProperties = {
  padding: "11px 12px",
  fontSize: 14,
  color: "#e2e8f0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  verticalAlign: "top",
};
const headStyle: React.CSSProperties = {
  padding: "11px 12px",
  fontSize: 12,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

export default function IntegrationsManager() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ ...emptyForm });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      const res = await fetch("/api/owner/integration-cards", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Errore nel caricamento.");
      } else {
        setCards((data.cards ?? []) as Card[]);
        setError(null);
      }
    } catch {
      setError("Errore di rete.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const setField = (k: keyof typeof emptyForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.card_key.trim() || !form.title_it.trim() || !form.title_en.trim()) {
      setFormError("card_key, titolo IT e titolo EN sono obbligatori.");
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        card_key: form.card_key.trim(),
        icon_key: form.icon_key,
        tag_key: form.tag_key,
        title_it: form.title_it.trim(),
        title_en: form.title_en.trim(),
        description_it: form.description_it.trim(),
        description_en: form.description_en.trim(),
      };
      if (form.votes.trim() !== "") payload.votes = Number(form.votes);
      if (form.sort_order.trim() !== "") payload.sort_order = Number(form.sort_order);

      const res = await fetch("/api/owner/integration-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error ?? "Creazione non riuscita.");
      } else {
        setForm({ ...emptyForm });
        await fetchCards();
      }
    } catch {
      setFormError("Errore di rete.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/owner/integration-cards/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Eliminazione non riuscita.");
      } else {
        setCards((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      setError("Errore di rete.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Form creazione ─────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 18px" }}>
          Nuova card integrazione
        </h2>
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label style={labelStyle}>card_key (univoco) *</label>
              <input style={inputStyle} value={form.card_key}
                onChange={(e) => setField("card_key", e.target.value)} placeholder="es. delivery" />
            </div>
            <div>
              <label style={labelStyle}>Icona</label>
              <select style={inputStyle} value={form.icon_key}
                onChange={(e) => setField("icon_key", e.target.value)}>
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tag</label>
              <select style={inputStyle} value={form.tag_key}
                onChange={(e) => setField("tag_key", e.target.value)}>
                {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Titolo IT *</label>
              <input style={inputStyle} value={form.title_it}
                onChange={(e) => setField("title_it", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Titolo EN *</label>
              <input style={inputStyle} value={form.title_en}
                onChange={(e) => setField("title_en", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Voti iniziali</label>
              <input style={inputStyle} type="number" min={0} value={form.votes}
                onChange={(e) => setField("votes", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Ordine</label>
              <input style={inputStyle} type="number" value={form.sort_order}
                onChange={(e) => setField("sort_order", e.target.value)} placeholder="auto" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>Descrizione IT</label>
              <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={form.description_it}
                onChange={(e) => setField("description_it", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Descrizione EN</label>
              <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={form.description_en}
                onChange={(e) => setField("description_en", e.target.value)} />
            </div>
          </div>

          {formError && (
            <p style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{formError}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              marginTop: 18,
              padding: "10px 22px",
              borderRadius: 10,
              border: "none",
              background: creating ? "rgba(16,185,129,0.4)" : "#10b981",
              color: "#04120c",
              fontSize: 14,
              fontWeight: 700,
              cursor: creating ? "default" : "pointer",
            }}
          >
            {creating ? "Creazione…" : "Crea card"}
          </button>
        </form>
      </div>

      {/* ── Elenco card ────────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Card esistenti
          </h2>
          {!loading && <span style={{ fontSize: 13, color: "#94a3b8" }}>{cards.length} card</span>}
        </div>

        {loading && <p style={{ color: "#94a3b8", fontSize: 14 }}>Caricamento…</p>}
        {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}

        {!loading && cards.length === 0 && !error && (
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Nessuna card. Creane una qui sopra.</p>
        )}

        {!loading && cards.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: "center" }}>#</th>
                  <th style={headStyle}>card_key</th>
                  <th style={headStyle}>Titolo (IT)</th>
                  <th style={headStyle}>Icona</th>
                  <th style={headStyle}>Tag</th>
                  <th style={{ ...headStyle, textAlign: "center" }}>Voti</th>
                  <th style={{ ...headStyle, textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td style={{ ...cellStyle, textAlign: "center", color: "#64748b" }}>{c.sort_order}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: "#f1f5f9" }}>{c.card_key}</td>
                    <td style={cellStyle}>{c.title_it}</td>
                    <td style={{ ...cellStyle, color: "#94a3b8" }}>{c.icon_key}</td>
                    <td style={{ ...cellStyle, color: "#94a3b8" }}>{c.tag_key}</td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{c.votes}</td>
                    <td style={{ ...cellStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      {confirmId === c.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            style={{
                              padding: "6px 12px", borderRadius: 8, border: "none",
                              background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700,
                              cursor: "pointer", marginRight: 6,
                            }}
                          >
                            {deletingId === c.id ? "…" : "Conferma"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            style={{
                              padding: "6px 12px", borderRadius: 8,
                              border: "1px solid rgba(255,255,255,0.15)",
                              background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Annulla
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmId(c.id)}
                          style={{
                            padding: "6px 12px", borderRadius: 8,
                            border: "1px solid rgba(248,113,113,0.3)",
                            background: "rgba(248,113,113,0.08)", color: "#fca5a5",
                            fontSize: 13, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Elimina
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
