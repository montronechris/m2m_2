"use client";
// src/app/(site-owner)/owner-dashboard/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Tipi ───────────────────────────────────────────────────────────────────
interface InviteCode {
  id:                   string;
  code:                 string;
  used_by_email:        string | null;
  expires_at:           string;
  used_at:              string | null;
  created_at:           string;
  plan:                 string | null;
  access_duration_days: number | null;
  max_staff:            number | null;
  notes:                string | null;
}

interface RestaurantInfo {
  name:           string;
  slug:           string;
  status:         string;
  admin_email:    string;
  plan?:          string;
  registered_at?: string;
  staff?:         { name: string; role: string; email?: string }[];
}

interface GenerateForm {
  plan:                 string;
  access_duration_days: number;
  max_staff:            number;
  notes:                string;
  expires_hours:        number;
}

// ── Piani predefiniti ──────────────────────────────────────────────────────
const PLANS = [
  { id: "free_trial", label: "Prova gratuita", days: 7,   staff: 2,  color: "#10b981" },
  { id: "base",       label: "Base",            days: 30,  staff: 5,  color: "#60a5fa" },
  { id: "pro",        label: "Pro",             days: 365, staff: 15, color: "#a78bfa" },
  { id: "enterprise", label: "Enterprise",      days: 730, staff: 50, color: "#f59e0b" },
  { id: "custom",     label: "Personalizzato",  days: 30,  staff: 5,  color: "#10b981" },
] as const;

function planColor(planId: string | null) {
  return PLANS.find(p => p.id === planId)?.color ?? "#555";
}
function planLabel(planId: string | null) {
  return PLANS.find(p => p.id === planId)?.label ?? planId ?? "—";
}

// ── Helpers date ───────────────────────────────────────────────────────────
function parseUTC(iso: string): Date {
  const n = iso.endsWith("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z";
  return new Date(n);
}
function formatDate(iso: string) {
  return parseUTC(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Countdown live ─────────────────────────────────────────────────────────
function LiveCountdown({ expiresAt }: { expiresAt: string }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    function calc() {
      const diff = parseUTC(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setDisplay("Scaduto"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${m}m ${String(s).padStart(2, "0")}s`);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const urgent = parseUTC(expiresAt).getTime() - Date.now() < 5 * 60 * 1000;
  return (
    <span style={{ color: urgent ? "#f59e0b" : "#10b981", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}

// ── Toggle visibilità codice ───────────────────────────────────────────────
function CodeCell({ code, isActive }: { code: string; isActive: boolean }) {
  const [visible, setVisible] = useState(false);
  const [prefix, suffix] = code.includes("-") ? code.split(/-(.+)/) : [code, ""];
  const displayed = visible ? code : suffix ? `${prefix}-${"•".repeat(suffix.length)}` : "•".repeat(code.length);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.05em", color: isActive ? "#fff" : "#444", minWidth: 160 }}>
        {displayed}
      </span>
      <button
        onClick={() => setVisible(v => !v)}
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px", color: visible ? "#10b981" : "#555", display: "flex", alignItems: "center" }}
      >
        {visible
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        }
      </button>
    </div>
  );
}

// ── Modale genera codice (ex CreaCodicRinnovo) ─────────────────────────────
function GenerateModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [form, setForm] = useState<GenerateForm>({
    plan:                 "free_trial",
    access_duration_days: 7,
    max_staff:            2,
    notes:                "",
    expires_hours:        0.5,
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function selectPlan(planId: string) {
    const p = PLANS.find(x => x.id === planId);
    setForm(f => ({
      ...f,
      plan:                 planId,
      access_duration_days: p ? p.days  : f.access_duration_days,
      max_staff:            p ? p.staff : f.max_staff,
    }));
  }

  async function handleSubmit() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/invite-codes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Errore nella generazione."); return; }
      setSuccess(data.code?.code ?? "Codice generato!");
      onGenerated();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlan = PLANS.find(p => p.id === form.plan);
  const accentColor  = selectedPlan?.color ?? "#10b981";

  const expiresLabel =
    form.expires_hours < 1
      ? `${form.expires_hours * 60} min`
      : form.expires_hours < 24
        ? `${form.expires_hours} ora`
        : `${form.expires_hours / 24} gg`;

  const accessLabel =
    form.access_duration_days >= 365
      ? `${form.access_duration_days / 365} anno/i`
      : `${form.access_duration_days} giorni`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "24px 16px", backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#161616", border: "1px solid #2a2a2a", borderRadius: 20,
          width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
          padding: "32px 28px", position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Chiudi */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 18, right: 18, background: "transparent", border: "none", color: "#555", cursor: "pointer", padding: 4, lineHeight: 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <p style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Codice generato!</p>
            <p style={{
              fontFamily: "monospace", fontSize: 24, fontWeight: 700, color: "#fff",
              letterSpacing: "0.1em", background: "#0d0d0d", border: "1px solid #2a2a2a",
              borderRadius: 10, padding: "14px 20px", display: "inline-block", margin: "0 0 28px",
            }}>
              {success}
            </p>
            <button onClick={onClose} style={btnPrimary}>Chiudi</button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Nuovo Codice Invito</h2>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 28px" }}>
              Configura le condizioni di accesso prima di generare.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Piano */}
              <div>
                <label style={labelStyle}>Piano di accesso</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PLANS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPlan(p.id)}
                      style={{
                        padding: "11px 14px", borderRadius: 10, border: "1px solid",
                        borderColor:  form.plan === p.id ? p.color : "#252525",
                        background:   form.plan === p.id ? `${p.color}18` : "#0f0f0f",
                        color:        form.plan === p.id ? p.color : "#777",
                        cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600,
                        transition: "all 0.15s",
                        gridColumn: p.id === "custom" ? "1 / -1" : undefined,
                      }}
                    >
                      {p.label}
                      <span style={{
                        display: "block", fontSize: 11, fontWeight: 400, marginTop: 2,
                        color: form.plan === p.id ? `${p.color}aa` : "#3a3a3a",
                      }}>
                        {p.days >= 365 ? `${p.days / 365} anno/i` : `${p.days} giorni`} · max {p.staff} staff
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Durata accesso */}
              <div>
                <label style={labelStyle}>
                  Durata accesso dopo l&apos;uso{" "}
                  <span style={{ color: accentColor, fontWeight: 700 }}>{accessLabel}</span>
                </label>
                <input
                  type="range" min={1} max={730} value={form.access_duration_days}
                  onChange={e => setForm(f => ({ ...f, access_duration_days: +e.target.value, plan: "custom" }))}
                  style={{ width: "100%", accentColor, cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 4 }}>
                  <span>1 giorno</span><span>6 mesi</span><span>1 anno</span><span>2 anni</span>
                </div>
              </div>

              {/* Max staff */}
              <div>
                <label style={labelStyle}>
                  Max staff consentiti{" "}
                  <span style={{ color: accentColor, fontWeight: 700 }}>{form.max_staff} persone</span>
                </label>
                <input
                  type="range" min={1} max={50} value={form.max_staff}
                  onChange={e => setForm(f => ({ ...f, max_staff: +e.target.value, plan: "custom" }))}
                  style={{ width: "100%", accentColor, cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 4 }}>
                  <span>1</span><span>10</span><span>25</span><span>50</span>
                </div>
              </div>

              {/* Scadenza codice */}
              <div>
                <label style={labelStyle}>Il codice scade tra (tempo per usarlo)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "30 min", val: 0.5 },
                    { label: "1 ora",  val: 1   },
                    { label: "24 ore", val: 24  },
                    { label: "7 gg",   val: 168 },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setForm(f => ({ ...f, expires_hours: opt.val }))}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid",
                        borderColor: form.expires_hours === opt.val ? "#10b981" : "#252525",
                        background:  form.expires_hours === opt.val ? "#10b98118" : "#0f0f0f",
                        color:       form.expires_hours === opt.val ? "#10b981" : "#666",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={labelStyle}>Note interne (opzionale)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Es: codice per Ristorante Mario, promo giugno..."
                  rows={2}
                  style={{
                    width: "100%", background: "#0f0f0f", border: "1px solid #252525",
                    borderRadius: 8, color: "#ccc", fontSize: 13, padding: "10px 12px",
                    resize: "none", fontFamily: "inherit", boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>

              {/* Riepilogo */}
              <div style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ color: "#444", margin: "0 0 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Riepilogo
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 0", fontSize: 13 }}>
                  <span style={{ color: "#555" }}>Piano:</span>
                  <span style={{ color: accentColor, fontWeight: 600 }}>{planLabel(form.plan)}</span>
                  <span style={{ color: "#555" }}>Accesso:</span>
                  <span style={{ color: "#ccc" }}>{accessLabel}</span>
                  <span style={{ color: "#555" }}>Staff max:</span>
                  <span style={{ color: "#ccc" }}>{form.max_staff} persone</span>
                  <span style={{ color: "#555" }}>Codice valido:</span>
                  <span style={{ color: "#ccc" }}>{expiresLabel}</span>
                </div>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, marginTop: 4 }}
              >
                {saving ? "Generazione..." : "Genera Codice"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modale genera codice RINNOVO ──────────────────────────────────────────
function RenewalModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [form, setForm] = useState<GenerateForm>({
    plan:                 "free_trial",
    access_duration_days: 7,
    max_staff:            2,
    notes:                "",
    expires_hours:        0.5,
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function selectPlan(planId: string) {
    const p = PLANS.find(x => x.id === planId);
    setForm(f => ({
      ...f,
      plan:                 planId,
      access_duration_days: p ? p.days  : f.access_duration_days,
      max_staff:            p ? p.staff : f.max_staff,
    }));
  }

  async function handleSubmit() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/invite-codes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, renewal: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Errore nella generazione."); return; }
      setSuccess(data.code?.code ?? "Codice generato!");
      onGenerated();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlan = PLANS.find(p => p.id === form.plan);
  const accentColor  = "#f59e0b"; // amber for renewal

  const expiresLabel =
    form.expires_hours < 1
      ? `${form.expires_hours * 60} min`
      : form.expires_hours < 24
        ? `${form.expires_hours} ora`
        : `${form.expires_hours / 24} gg`;

  const accessLabel =
    form.access_duration_days >= 365
      ? `${form.access_duration_days / 365} anno/i`
      : `${form.access_duration_days} giorni`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "24px 16px", backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#161616",
          border: "1px solid #3a2800",
          borderRadius: 20,
          width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
          padding: "32px 28px", position: "relative",
          boxShadow: "0 24px 64px rgba(245,158,11,0.12)",
        }}
      >
        {/* Badge rinnovo */}
        <div style={{
          position: "absolute", top: 18, left: 28,
          display: "flex", alignItems: "center", gap: 6,
          background: "#f59e0b18", border: "1px solid #f59e0b44",
          borderRadius: 99, padding: "3px 10px",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>RINNOVO</span>
        </div>

        {/* Chiudi */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 18, right: 18, background: "transparent", border: "none", color: "#555", cursor: "pointer", padding: 4, lineHeight: 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>♻️</div>
            <p style={{ color: "#f59e0b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Codice rinnovo generato!</p>
            <p style={{
              fontFamily: "monospace", fontSize: 24, fontWeight: 700, color: "#fff",
              letterSpacing: "0.1em", background: "#0d0d0d",
              border: "1px solid #f59e0b44",
              borderRadius: 10, padding: "14px 20px", display: "inline-block", margin: "0 0 28px",
            }}>
              {success}
            </p>
            <button onClick={onClose} style={{ ...btnPrimary, background: "#78350f" }}>Chiudi</button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "42px 0 6px" }}>Codice Rinnovo Abbonamento</h2>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 28px" }}>
              Genera un codice valido esclusivamente per rinnovare un abbonamento esistente.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Piano */}
              <div>
                <label style={labelStyle}>Piano di rinnovo</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PLANS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPlan(p.id)}
                      style={{
                        padding: "11px 14px", borderRadius: 10, border: "1px solid",
                        borderColor:  form.plan === p.id ? "#f59e0b" : "#252525",
                        background:   form.plan === p.id ? "#f59e0b18" : "#0f0f0f",
                        color:        form.plan === p.id ? "#f59e0b" : "#777",
                        cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600,
                        transition: "all 0.15s",
                        gridColumn: p.id === "custom" ? "1 / -1" : undefined,
                      }}
                    >
                      {p.label}
                      <span style={{
                        display: "block", fontSize: 11, fontWeight: 400, marginTop: 2,
                        color: form.plan === p.id ? "#f59e0baa" : "#3a3a3a",
                      }}>
                        {p.days >= 365 ? `${p.days / 365} anno/i` : `${p.days} giorni`} · max {p.staff} staff
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Durata accesso */}
              <div>
                <label style={labelStyle}>
                  Durata rinnovo{" "}
                  <span style={{ color: accentColor, fontWeight: 700 }}>{accessLabel}</span>
                </label>
                <input
                  type="range" min={1} max={730} value={form.access_duration_days}
                  onChange={e => setForm(f => ({ ...f, access_duration_days: +e.target.value, plan: "custom" }))}
                  style={{ width: "100%", accentColor, cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 4 }}>
                  <span>1 giorno</span><span>6 mesi</span><span>1 anno</span><span>2 anni</span>
                </div>
              </div>

              {/* Max staff */}
              <div>
                <label style={labelStyle}>
                  Max staff consentiti{" "}
                  <span style={{ color: accentColor, fontWeight: 700 }}>{form.max_staff} persone</span>
                </label>
                <input
                  type="range" min={1} max={50} value={form.max_staff}
                  onChange={e => setForm(f => ({ ...f, max_staff: +e.target.value, plan: "custom" }))}
                  style={{ width: "100%", accentColor, cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 4 }}>
                  <span>1</span><span>10</span><span>25</span><span>50</span>
                </div>
              </div>

              {/* Scadenza codice */}
              <div>
                <label style={labelStyle}>Il codice scade tra (tempo per usarlo)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "30 min", val: 0.5 },
                    { label: "1 ora",  val: 1   },
                    { label: "24 ore", val: 24  },
                    { label: "7 gg",   val: 168 },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setForm(f => ({ ...f, expires_hours: opt.val }))}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid",
                        borderColor: form.expires_hours === opt.val ? "#f59e0b" : "#252525",
                        background:  form.expires_hours === opt.val ? "#f59e0b18" : "#0f0f0f",
                        color:       form.expires_hours === opt.val ? "#f59e0b" : "#666",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={labelStyle}>Note interne (opzionale)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Es: rinnovo annuale per Ristorante Mario..."
                  rows={2}
                  style={{
                    width: "100%", background: "#0f0f0f", border: "1px solid #252525",
                    borderRadius: 8, color: "#ccc", fontSize: 13, padding: "10px 12px",
                    resize: "none", fontFamily: "inherit", boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>

              {/* Riepilogo */}
              <div style={{ background: "#0f0f0f", border: "1px solid #3a2800", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ color: "#f59e0b66", margin: "0 0 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Riepilogo rinnovo
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 0", fontSize: 13 }}>
                  <span style={{ color: "#555" }}>Tipo:</span>
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>♻️ Rinnovo</span>
                  <span style={{ color: "#555" }}>Piano:</span>
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>{selectedPlan?.label ?? "Personalizzato"}</span>
                  <span style={{ color: "#555" }}>Durata rinnovo:</span>
                  <span style={{ color: "#ccc" }}>{accessLabel}</span>
                  <span style={{ color: "#555" }}>Staff max:</span>
                  <span style={{ color: "#ccc" }}>{form.max_staff} persone</span>
                  <span style={{ color: "#555" }}>Codice valido:</span>
                  <span style={{ color: "#ccc" }}>{expiresLabel}</span>
                </div>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  ...btnPrimary,
                  background: saving ? "#78350f88" : "#92400e",
                  opacity: saving ? 0.6 : 1,
                  marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {saving ? "Generazione..." : "Genera Codice Rinnovo"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modale info ristorante ─────────────────────────────────────────────────
function InfoModal({ code, email, onClose }: { code: string; email: string; onClose: () => void }) {
  const [info,    setInfo]    = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/by-email?email=${encodeURIComponent(email)}`);
        if (!res.ok) { setError("Dati non disponibili."); setLoading(false); return; }
        setInfo(await res.json());
      } catch { setError("Errore di rete."); }
      finally { setLoading(false); }
    })();
  }, [email]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#111", border: "1px solid #222", borderRadius: 16, width: "100%", maxWidth: 480, padding: 28, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#555", cursor: "pointer" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <p style={{ fontSize: 11, color: "#555", fontFamily: "monospace", marginBottom: 4 }}>CODICE</p>
        <p style={{ fontSize: 13, color: "#10b981", fontFamily: "monospace", fontWeight: 700, marginBottom: 20 }}>{code}</p>
        {loading && <p style={{ color: "#555", fontSize: 14 }}>Caricamento...</p>}
        {error   && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
        {info && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InfoRow label="Ristorante" value={info.name} />
            <InfoRow label="Slug"       value={info.slug} mono />
            <InfoRow label="Stato"      value={info.status} />
            {info.plan && (
              <div>
                <p style={infoLabelStyle}>Piano</p>
                <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: `${planColor(info.plan)}18`, color: planColor(info.plan), border: `1px solid ${planColor(info.plan)}33` }}>
                  {planLabel(info.plan)}
                </span>
              </div>
            )}
            <InfoRow label="Admin"          value={info.admin_email} />
            {info.registered_at && <InfoRow label="Registrato il" value={formatDate(info.registered_at)} />}
            {info.staff && info.staff.length > 0 && (
              <div>
                <p style={infoLabelStyle}>Staff ({info.staff.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  {info.staff.map((s, i) => (
                    <div key={i} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ color: "#ccc", fontSize: 13, fontWeight: 600, margin: 0 }}>{s.name}</p>
                        {s.email && <p style={{ color: "#555", fontSize: 12, margin: "2px 0 0" }}>{s.email}</p>}
                      </div>
                      <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 500 }}>{s.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={infoLabelStyle}>{label}</p>
      <p style={{ color: "#ccc", fontSize: 14, margin: 0, fontFamily: mono ? "monospace" : undefined }}>{value}</p>
    </div>
  );
}

// ── Icone ──────────────────────────────────────────────────────────────────
function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}
function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.01"/><line x1="12" y1="12" x2="12" y2="16"/>
    </svg>
  );
}

// ── Stili ──────────────────────────────────────────────────────────────────
const ghostBtnStyle: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", border: "1px solid #2a2a2a",
  borderRadius: 8, color: "#666", fontSize: 14, cursor: "pointer",
};
const smallBtnStyle: React.CSSProperties = {
  padding: "4px 12px", background: "transparent", border: "1px solid #2a2a2a",
  borderRadius: 6, color: "#aaa", fontSize: 12, cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "10px 24px", background: "#064e3b", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8,
};
const infoLabelStyle: React.CSSProperties = {
  color: "#555", fontSize: 11, fontWeight: 500, textTransform: "uppercase",
  letterSpacing: "0.06em", margin: "0 0 4px",
};

// ── Pagina principale ──────────────────────────────────────────────────────
type FilterType = "all" | "active" | "used" | "expired";

export default function OwnerDashboardPage() {
  const router = useRouter();

  const [ownerEmail,  setOwnerEmail]  = useState("");
  const [codes,       setCodes]       = useState<InviteCode[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [copiedId,    setCopiedId]    = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [filter,      setFilter]      = useState<FilterType>("all");
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [deleting,    setDeleting]    = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showRenewal,  setShowRenewal]  = useState(false);
  const [infoTarget,  setInfoTarget]  = useState<{ code: string; email: string } | null>(null);

  const fetchCodes = useCallback(async () => {
    const res = await fetch("/api/invite-codes");
    if (res.status === 401) { router.push("/owner-login"); return; }
    const data = await res.json();
    setCodes(data.codes ?? []);
  }, [router]);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/site-owner/me");
      if (!meRes.ok) { router.push("/owner-login"); return; }
      const me = await meRes.json();
      setOwnerEmail(me.email);
      await fetchCodes();
      setLoading(false);
    })();
  }, [router, fetchCodes]);

  function codeStatus(c: InviteCode) {
    if (c.used_at)                           return { label: "Usato",   color: "#6b7280", key: "used"    as FilterType };
    if (parseUTC(c.expires_at) < new Date()) return { label: "Scaduto", color: "#ef4444", key: "expired" as FilterType };
    return                                          { label: "Attivo",  color: "#10b981", key: "active"  as FilterType };
  }

  const activeCodes   = codes.filter(c => !c.used_at && parseUTC(c.expires_at) > new Date());
  const usedCodes     = codes.filter(c => c.used_at);
  const expiredCodes  = codes.filter(c => !c.used_at && parseUTC(c.expires_at) <= new Date());
  const filteredCodes = filter === "all" ? codes : filter === "active" ? activeCodes : filter === "used" ? usedCodes : expiredCodes;

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    setSelected(selected.size === filteredCodes.length ? new Set() : new Set(filteredCodes.map(c => c.id)));
  }

  async function handleDeleteSelected() {
    if (!selected.size) return;
    if (!confirm(`Eliminare ${selected.size} codice/i?`)) return;
    setDeleting(true); setError(null);
    try {
      await Promise.all([...selected].map(id => fetch(`/api/invite-codes/${id}`, { method: "DELETE" })));
      setSelected(new Set());
      await fetchCodes();
    } catch { setError("Errore durante l'eliminazione."); }
    finally { setDeleting(false); }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revocare questo codice?")) return;
    setError(null);
    const res  = await fetch(`/api/invite-codes/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Errore."); return; }
    await fetchCodes();
  }

  async function handleCopy(code: string, id: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleLogout() {
    await fetch("/api/site-owner/me", { method: "DELETE" });
    router.push("/owner-login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#666", fontFamily: "system-ui" }}>Caricamento...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dashboard Proprietario</h1>
            <p style={{ color: "#555", fontSize: 14, marginTop: 4 }}>{ownerEmail}</p>
          </div>
          <button onClick={handleLogout} style={ghostBtnStyle}>Esci</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
          {([
            { label: "Attivi",  value: activeCodes.length,  color: "#10b981", key: "active"  },
            { label: "Usati",   value: usedCodes.length,    color: "#6b7280", key: "used"    },
            { label: "Scaduti", value: expiredCodes.length, color: "#ef4444", key: "expired" },
          ] as const).map(s => (
            <button
              key={s.label}
              onClick={() => setFilter(f => f === s.key ? "all" : s.key)}
              style={{
                background:   filter === s.key ? `${s.color}12` : "#111",
                border:       `1px solid ${filter === s.key ? s.color + "44" : "#1f1f1f"}`,
                borderRadius: 12, padding: "16px 20px", textAlign: "left", cursor: "pointer",
              }}
            >
              <p style={{ color: s.color, fontSize: 28, fontWeight: 700, margin: 0 }}>{s.value}</p>
              <p style={{ color: filter === s.key ? s.color : "#555", fontSize: 13, margin: "4px 0 0", fontWeight: filter === s.key ? 600 : 400 }}>
                {s.label} {filter === s.key ? "↑" : ""}
              </p>
            </button>
          ))}
        </div>

        {/* Genera codice — trigger card */}
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 14, padding: 24, marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>Gestione Codici</h2>
          <p style={{ color: "#555", fontSize: 13, margin: "0 0 20px" }}>
            Genera un nuovo codice invito oppure un codice di rinnovo per un abbonamento esistente.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowGenerate(true)}
              style={{
                padding: "10px 20px", background: "#064e3b", color: "#fff",
                border: "1px solid #10b98133", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuovo Codice Invito
            </button>
            <button
              onClick={() => setShowRenewal(true)}
              style={{
                padding: "10px 20px", background: "#78350f22", color: "#f59e0b",
                border: "1px solid #f59e0b44", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Codice Rinnovo
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</p>
        )}

        {/* Lista codici */}
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 14, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {filter === "all" ? "Tutti i Codici" : filter === "active" ? "Attivi" : filter === "used" ? "Usati" : "Scaduti"}
              </h2>
              <span style={{ color: "#555", fontSize: 13 }}>({filteredCodes.length})</span>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}>
                  mostra tutti
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "active", "used", "expired"] as FilterType[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500, border: "1px solid",
                  background:  filter === f ? "#fff" : "transparent",
                  color:       filter === f ? "#000" : "#555",
                  borderColor: filter === f ? "#fff" : "#2a2a2a",
                  cursor: "pointer",
                }}>
                  {f === "all" ? "Tutti" : f === "active" ? "Attivi" : f === "used" ? "Usati" : "Scaduti"}
                </button>
              ))}
            </div>
          </div>

          {/* Barra azioni selezione */}
          {selected.size > 0 && (
            <div style={{ padding: "10px 20px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#aaa", fontSize: 13 }}>{selected.size} selezionato/i</span>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, background: "#1a0505", border: "1px solid #f8717133", color: "#f87171", cursor: "pointer" }}
              >
                <TrashIcon size={13} /> {deleting ? "Eliminazione..." : "Elimina selezionati"}
              </button>
              <button onClick={() => setSelected(new Set())} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 13 }}>
                Deseleziona tutto
              </button>
            </div>
          )}

          {filteredCodes.length === 0 ? (
            <p style={{ padding: 24, color: "#555", textAlign: "center", fontSize: 14 }}>Nessun codice in questa categoria.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0d0d0d" }}>
                  <th style={{ padding: "10px 16px", width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === filteredCodes.length && filteredCodes.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer", accentColor: "#10b981" }}
                    />
                  </th>
                  {["Codice", "Piano", "Stato", "Scade / Usato", "Usato da", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555", fontWeight: 500, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((c, i) => {
                  const status   = codeStatus(c);
                  const isActive = status.key === "active";
                  return (
                    <tr key={c.id} style={{ borderTop: i > 0 ? "1px solid #1a1a1a" : undefined, background: selected.has(c.id) ? "#10b98108" : undefined }}>
                      <td style={{ padding: "10px 16px" }}>
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ cursor: "pointer", accentColor: "#10b981" }} />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <CodeCell code={c.code} isActive={isActive} />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {c.plan ? (
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${planColor(c.plan)}15`, color: planColor(c.plan), border: `1px solid ${planColor(c.plan)}33` }}>
                            {planLabel(c.plan)}
                          </span>
                        ) : <span style={{ color: "#333" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: `${status.color}18`, color: status.color, border: `1px solid ${status.color}33` }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#555", fontSize: 13 }}>
                        {isActive ? <LiveCountdown expiresAt={c.expires_at} /> : c.used_at ? formatDate(c.used_at) : formatDate(c.expires_at)}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#555", fontSize: 13 }}>
                        {c.used_by_email ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {isActive && (
                            <>
                              <button onClick={() => handleCopy(c.code, c.id)} style={smallBtnStyle}>
                                {copiedId === c.id ? "✓" : "Copia"}
                              </button>
                              <button onClick={() => handleRevoke(c.id)} style={{ ...smallBtnStyle, color: "#f87171", borderColor: "#f8717133" }}>
                                Revoca
                              </button>
                            </>
                          )}
                          {c.used_by_email && (
                            <button
                              onClick={() => setInfoTarget({ code: c.code, email: c.used_by_email! })}
                              style={{ background: "transparent", border: "1px solid #1f4a6a33", borderRadius: 6, cursor: "pointer", padding: "4px 8px", color: "#60a5fa", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                            >
                              <InfoIcon size={13} /> Info
                            </button>
                          )}
                          <button
                            onClick={() => setSelected(new Set([c.id]))}
                            style={{ background: "transparent", border: "1px solid #1a1a1a", borderRadius: 6, cursor: "pointer", padding: "4px 7px", color: "#555", display: "flex", alignItems: "center" }}
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modale genera codice */}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { fetchCodes(); }}
        />
      )}

      {/* Modale codice rinnovo */}
      {showRenewal && (
        <RenewalModal
          onClose={() => setShowRenewal(false)}
          onGenerated={() => { fetchCodes(); }}
        />
      )}

      {/* Modale info ristorante */}
      {infoTarget && (
        <InfoModal code={infoTarget.code} email={infoTarget.email} onClose={() => setInfoTarget(null)} />
      )}
    </div>
  );
}