"use client";
// src/app/(site-owner)/owner-dashboard/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import IntegrationsManager from "./IntegrationsManager";
import RestaurantsOverview from "./RestaurantsOverview";
import SubscriptionRequestsManager from "./SubscriptionRequestsManager";

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
    <span
      style={{
        color: urgent ? "#f59e0b" : "#10b981",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        padding: "2px 8px",
        borderRadius: 6,
        background: urgent ? "#f59e0b12" : "#10b9810c",
        border: `1px solid ${urgent ? "#f59e0b33" : "#10b98122"}`,
        display: "inline-block",
        animation: urgent ? "pulseUrgent 1.4s ease-in-out infinite" : undefined,
      }}
    >
      {urgent && <span style={{ display: "inline-block", marginRight: 4, animation: "blink 1s steps(2) infinite" }}>●</span>}
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
      <span
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: isActive ? "#fff" : "#777",
          minWidth: 160,
          padding: "3px 8px",
          borderRadius: 6,
          background: isActive ? "#10b9810a" : "transparent",
          border: `1px solid ${isActive ? "#10b98122" : "transparent"}`,
          transition: "all 0.25s ease",
        }}
      >
        {displayed}
      </span>
      <button
        onClick={() => setVisible(v => !v)}
        className="icon-btn"
        style={{
          background: "transparent", border: "none", cursor: "pointer", padding: "4px",
          color: visible ? "#10b981" : "#555",
          display: "flex", alignItems: "center",
          borderRadius: 6, transition: "all 0.2s ease",
        }}
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
      className="modal-backdrop"
      style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0.85) 70%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "24px 16px", backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-panel"
        style={{
          background: "linear-gradient(180deg, #1a1a1a 0%, #131313 100%)",
          border: `1px solid ${accentColor}33`,
          borderRadius: 20,
          width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
          padding: "32px 28px", position: "relative",
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 60px ${accentColor}15, inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Glow decorativo */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 120, height: 120,
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none", filter: "blur(20px)",
        }} />

        {/* Chiudi */}
        <button
          onClick={onClose}
          className="close-btn"
          style={{
            position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.03)",
            border: "1px solid #2a2a2a", color: "#666", cursor: "pointer",
            padding: 6, lineHeight: 1, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {success ? (
          <div className="success-state" style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              fontSize: 48, marginBottom: 16, color: "#10b981",
              filter: "drop-shadow(0 0 20px rgba(16,185,129,0.6))",
              animation: "successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <p style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 8, animation: "fadeInUp 0.5s ease 0.2s both" }}>Codice generato!</p>
            <p style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 22, fontWeight: 700, color: "#fff",
              letterSpacing: "0.12em",
              background: "linear-gradient(180deg, #0d0d0d, #070707)",
              border: "1px solid #10b98144",
              borderRadius: 12, padding: "16px 22px", display: "inline-block", margin: "0 0 28px",
              boxShadow: "0 0 30px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.03)",
              animation: "fadeInUp 0.6s ease 0.3s both",
            }}>
              {success}
            </p>
            <div style={{ animation: "fadeInUp 0.6s ease 0.4s both" }}>
              <button onClick={onClose} className="btn-primary" style={{ ...btnPrimary, background: `linear-gradient(135deg, #064e3b, #022c22)` }}>Chiudi</button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", background: "linear-gradient(135deg, #fff 0%, #aaa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Nuovo Codice Invito</h2>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 28px" }}>
              Configura le condizioni di accesso prima di generare.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Piano */}
              <div>
                <label style={labelStyle}>Piano di accesso</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PLANS.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => selectPlan(p.id)}
                      className="plan-btn"
                      style={{
                        padding: "11px 14px", borderRadius: 10, border: "1px solid",
                        borderColor:  form.plan === p.id ? p.color : "#252525",
                        background:   form.plan === p.id ? `linear-gradient(135deg, ${p.color}22, ${p.color}08)` : "linear-gradient(135deg, #111, #0a0a0a)",
                        color:        form.plan === p.id ? p.color : "#888",
                        cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600,
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        gridColumn: p.id === "custom" ? "1 / -1" : undefined,
                        boxShadow: form.plan === p.id ? `0 0 20px ${p.color}25, inset 0 1px 0 rgba(255,255,255,0.04)` : "none",
                        animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {form.plan === p.id && (
                        <span style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: 2,
                          background: `linear-gradient(90deg, transparent, ${p.color}, transparent)`,
                        }} />
                      )}
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
                  className="range-input"
                  style={{ width: "100%", accentColor, cursor: "pointer", height: 6 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 6 }}>
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
                  className="range-input"
                  style={{ width: "100%", accentColor, cursor: "pointer", height: 6 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 6 }}>
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
                  ].map((opt, idx) => (
                    <button
                      key={opt.val}
                      onClick={() => setForm(f => ({ ...f, expires_hours: opt.val }))}
                      className="chip-btn"
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid",
                        borderColor: form.expires_hours === opt.val ? "#10b981" : "#252525",
                        background:  form.expires_hours === opt.val ? "linear-gradient(135deg, #10b98122, #10b98108)" : "#0f0f0f",
                        color:       form.expires_hours === opt.val ? "#10b981" : "#666",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: form.expires_hours === opt.val ? "0 0 16px rgba(16,185,129,0.2)" : "none",
                        animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
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
                  className="text-input"
                  style={{
                    width: "100%", background: "linear-gradient(180deg, #0f0f0f, #0a0a0a)", border: "1px solid #252525",
                    borderRadius: 8, color: "#ccc", fontSize: 13, padding: "10px 12px",
                    resize: "none", fontFamily: "inherit", boxSizing: "border-box", outline: "none",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>

              {/* Riepilogo */}
              <div style={{
                background: "linear-gradient(135deg, #0f0f0f, #0a0a0a)",
                border: `1px solid ${accentColor}22`,
                borderRadius: 10, padding: "14px 16px",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1,
                  background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
                }} />
                <p style={{ color: accentColor, margin: "0 0 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>
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

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0, animation: "shake 0.4s ease" }}>{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary"
                style={{
                  ...btnPrimary,
                  background: saving
                    ? "linear-gradient(135deg, #064e3baa, #022c22aa)"
                    : `linear-gradient(135deg, #064e3b, #022c22)`,
                  opacity: saving ? 0.7 : 1,
                  marginTop: 4,
                  boxShadow: saving ? "none" : "0 8px 24px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    Generazione...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Genera Codice
                  </>
                )}
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
      className="modal-backdrop"
      style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, rgba(0,0,0,0.85) 70%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "24px 16px", backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-panel"
        style={{
          background: "linear-gradient(180deg, #1a1505 0%, #131310 100%)",
          border: "1px solid #f59e0b33",
          borderRadius: 20,
          width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
          padding: "32px 28px", position: "relative",
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Glow decorativo */}
        <div style={{
          position: "absolute", top: -40, left: -40, width: 120, height: 120,
          background: "radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none", filter: "blur(20px)",
        }} />

        {/* Badge rinnovo */}
        <div style={{
          position: "absolute", top: 18, left: 28,
          display: "flex", alignItems: "center", gap: 6,
          background: "linear-gradient(135deg, #f59e0b22, #f59e0b08)",
          border: "1px solid #f59e0b44",
          borderRadius: 99, padding: "3px 10px",
          boxShadow: "0 0 16px rgba(245,158,11,0.2)",
          animation: "fadeInDown 0.4s ease both",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 6s linear infinite" }}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>RINNOVO</span>
        </div>

        {/* Chiudi */}
        <button
          onClick={onClose}
          className="close-btn"
          style={{
            position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.03)",
            border: "1px solid #3a2800", color: "#666", cursor: "pointer",
            padding: 6, lineHeight: 1, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {success ? (
          <div className="success-state" style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              fontSize: 48, marginBottom: 16, color: "#f59e0b",
              filter: "drop-shadow(0 0 20px rgba(245,158,11,0.6))",
              animation: "successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>
            <p style={{ color: "#f59e0b", fontSize: 16, fontWeight: 700, marginBottom: 8, animation: "fadeInUp 0.5s ease 0.2s both" }}>Codice rinnovo generato!</p>
            <p style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 22, fontWeight: 700, color: "#fff",
              letterSpacing: "0.12em",
              background: "linear-gradient(180deg, #0d0d0d, #070707)",
              border: "1px solid #f59e0b44",
              borderRadius: 12, padding: "16px 22px", display: "inline-block", margin: "0 0 28px",
              boxShadow: "0 0 30px rgba(245,158,11,0.18), inset 0 1px 0 rgba(255,255,255,0.03)",
              animation: "fadeInUp 0.6s ease 0.3s both",
            }}>
              {success}
            </p>
            <div style={{ animation: "fadeInUp 0.6s ease 0.4s both" }}>
              <button onClick={onClose} className="btn-primary" style={{ ...btnPrimary, background: "linear-gradient(135deg, #92400e, #78350f)" }}>Chiudi</button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "42px 0 6px", background: "linear-gradient(135deg, #fff 0%, #f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Codice Rinnovo Abbonamento</h2>
            <p style={{ color: "#666", fontSize: 13, margin: "0 0 28px" }}>
              Genera un codice valido esclusivamente per rinnovare un abbonamento esistente.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Piano */}
              <div>
                <label style={labelStyle}>Piano di rinnovo</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PLANS.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => selectPlan(p.id)}
                      className="plan-btn"
                      style={{
                        padding: "11px 14px", borderRadius: 10, border: "1px solid",
                        borderColor:  form.plan === p.id ? "#f59e0b" : "#252525",
                        background:   form.plan === p.id ? "linear-gradient(135deg, #f59e0b22, #f59e0b08)" : "linear-gradient(135deg, #111, #0a0a0a)",
                        color:        form.plan === p.id ? "#f59e0b" : "#888",
                        cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600,
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        gridColumn: p.id === "custom" ? "1 / -1" : undefined,
                        boxShadow: form.plan === p.id ? "0 0 20px rgba(245,158,11,0.18), inset 0 1px 0 rgba(255,255,255,0.04)" : "none",
                        animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {form.plan === p.id && (
                        <span style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: 2,
                          background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
                        }} />
                      )}
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
                  className="range-input"
                  style={{ width: "100%", accentColor, cursor: "pointer", height: 6 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 6 }}>
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
                  className="range-input"
                  style={{ width: "100%", accentColor, cursor: "pointer", height: 6 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a3a3a", marginTop: 6 }}>
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
                  ].map((opt, idx) => (
                    <button
                      key={opt.val}
                      onClick={() => setForm(f => ({ ...f, expires_hours: opt.val }))}
                      className="chip-btn"
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid",
                        borderColor: form.expires_hours === opt.val ? "#f59e0b" : "#252525",
                        background:  form.expires_hours === opt.val ? "linear-gradient(135deg, #f59e0b22, #f59e0b08)" : "#0f0f0f",
                        color:       form.expires_hours === opt.val ? "#f59e0b" : "#666",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: form.expires_hours === opt.val ? "0 0 16px rgba(245,158,11,0.2)" : "none",
                        animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
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
                  className="text-input"
                  style={{
                    width: "100%", background: "linear-gradient(180deg, #0f0f0f, #0a0a0a)", border: "1px solid #252525",
                    borderRadius: 8, color: "#ccc", fontSize: 13, padding: "10px 12px",
                    resize: "none", fontFamily: "inherit", boxSizing: "border-box", outline: "none",
                    transition: "all 0.2s ease",
                  }}
                />
              </div>

              {/* Riepilogo */}
              <div style={{
                background: "linear-gradient(135deg, #1a1305, #0a0a0a)",
                border: "1px solid #f59e0b22",
                borderRadius: 10, padding: "14px 16px",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)",
                }} />
                <p style={{ color: "#f59e0b", margin: "0 0 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>
                  Riepilogo rinnovo
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 0", fontSize: 13 }}>
                  <span style={{ color: "#555" }}>Tipo:</span>
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>♻ Rinnovo</span>
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

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0, animation: "shake 0.4s ease" }}>{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary"
                style={{
                  ...btnPrimary,
                  background: saving
                    ? "linear-gradient(135deg, #92400e88, #78350f88)"
                    : "linear-gradient(135deg, #92400e, #78350f)",
                  opacity: saving ? 0.7 : 1,
                  marginTop: 4,
                  boxShadow: saving ? "none" : "0 8px 24px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                    Generazione...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Genera Codice Rinnovo
                  </>
                )}
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
    <div
      onClick={onClose}
      className="modal-backdrop"
      style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at center, rgba(96,165,250,0.06) 0%, rgba(0,0,0,0.85) 70%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 24, backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-panel"
        style={{
          background: "linear-gradient(180deg, #161616 0%, #0f0f0f 100%)",
          border: "1px solid #1f4a6a33",
          borderRadius: 16, width: "100%", maxWidth: 480, padding: 28, position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(96,165,250,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <button
          onClick={onClose}
          className="close-btn"
          style={{
            position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.03)",
            border: "1px solid #2a2a2a", color: "#666", cursor: "pointer",
            padding: 6, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <p style={{ fontSize: 11, color: "#555", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>CODICE</p>
        <p style={{
          fontSize: 14, color: "#10b981", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontWeight: 700, marginBottom: 20, padding: "6px 10px", background: "#10b9810a",
          border: "1px solid #10b98122", borderRadius: 6, display: "inline-block",
        }}>{code}</p>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", fontSize: 14 }}>
            <span style={{ width: 14, height: 14, border: "2px solid rgba(96,165,250,0.3)", borderTopColor: "#60a5fa", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            Caricamento...
          </div>
        )}
        {error   && <p style={{ color: "#f87171", fontSize: 14, animation: "shake 0.4s ease" }}>{error}</p>}
        {info && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeInUp 0.4s ease both" }}>
            <InfoRow label="Ristorante" value={info.name} />
            <InfoRow label="Slug"       value={info.slug} mono />
            <InfoRow label="Stato"      value={info.status} />
            {info.plan && (
              <div>
                <p style={infoLabelStyle}>Piano</p>
                <span style={{
                  display: "inline-block", padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: `${planColor(info.plan)}18`, color: planColor(info.plan),
                  border: `1px solid ${planColor(info.plan)}44`,
                  boxShadow: `0 0 12px ${planColor(info.plan)}25`,
                }}>
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
                    <div
                      key={i}
                      className="staff-row"
                      style={{
                        background: "linear-gradient(135deg, #0d0d0d, #080808)",
                        border: "1px solid #1a1a1a", borderRadius: 8,
                        padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "all 0.2s ease",
                        animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
                      }}
                    >
                      <div>
                        <p style={{ color: "#ccc", fontSize: 13, fontWeight: 600, margin: 0 }}>{s.name}</p>
                        {s.email && <p style={{ color: "#555", fontSize: 12, margin: "2px 0 0" }}>{s.email}</p>}
                      </div>
                      <span style={{
                        color: "#6b7280", fontSize: 11, fontWeight: 500,
                        padding: "2px 8px", background: "#1a1a1a", borderRadius: 99,
                      }}>{s.role}</span>
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
    <div style={{ animation: "fadeInUp 0.3s ease both" }}>
      <p style={infoLabelStyle}>{label}</p>
      <p style={{ color: "#ccc", fontSize: 14, margin: 0, fontFamily: mono ? "ui-monospace, 'SF Mono', Menlo, monospace" : undefined }}>{value}</p>
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
  borderRadius: 8, color: "#aaa", fontSize: 14, cursor: "pointer",
  transition: "all 0.2s ease",
};
const smallBtnStyle: React.CSSProperties = {
  padding: "4px 12px", background: "transparent", border: "1px solid #2a2a2a",
  borderRadius: 6, color: "#aaa", fontSize: 12, cursor: "pointer",
  transition: "all 0.2s ease",
};
const btnPrimary: React.CSSProperties = {
  padding: "11px 24px", background: "#064e3b", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
  transition: "all 0.25s ease",
};
const labelStyle: React.CSSProperties = {
  color: "#aaa", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8,
};
const infoLabelStyle: React.CSSProperties = {
  color: "#555", fontSize: 11, fontWeight: 500, textTransform: "uppercase",
  letterSpacing: "0.08em", margin: "0 0 4px",
};

// ── Pagina principale ──────────────────────────────────────────────────────
type FilterType = "all" | "active" | "used" | "expired";

export default function OwnerDashboardPage() {
  const router = useRouter();

  const [view, setView] = useState<"codes" | "integrations" | "restaurants" | "requests">("codes");
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
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at center, #0f0f0f 0%, #050505 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid rgba(16,185,129,0.15)",
          borderTopColor: "#10b981",
          borderRadius: "50%",
          animation: "spin 0.9s linear infinite",
          filter: "drop-shadow(0 0 8px rgba(16,185,129,0.4))",
        }} />
        <p style={{ color: "#666", fontFamily: "system-ui", fontSize: 14, letterSpacing: "0.05em" }}>Caricamento dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0f1512 0%, #0a0a0a 50%, #050505 100%)",
      color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", padding: "32px 24px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorazione di sfondo */}
      <div style={{
        position: "absolute", top: -200, left: -100, width: 500, height: 500,
        background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none", animation: "float 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: -150, right: -100, width: 400, height: 400,
        background: "radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)",
        filter: "blur(40px)", pointerEvents: "none", animation: "float 10s ease-in-out infinite reverse",
      }} />

      <div style={{ maxWidth: 940, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40,
          animation: "fadeInDown 0.6s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
              color: "#fff", fontWeight: 700, fontSize: 18,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <h1 style={{
                fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #fff 0%, #888 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Dashboard Proprietario</h1>
              <p style={{ color: "#666", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "blink 2s ease-in-out infinite" }} />
                {ownerEmail}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="ghost-btn"
            style={ghostBtnStyle}
          >Esci</button>
        </div>

        {/* Navigazione sezioni owner-dashboard */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {([
            ["codes", "Codici invito"],
            ["integrations", "Card integrazioni"],
            ["restaurants", "Ristoranti"],
            ["requests", "Richieste abbonamento"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                border: view === key ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                background: view === key ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                color: view === key ? "#10b981" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "integrations" && <IntegrationsManager />}
        {view === "restaurants" && <RestaurantsOverview />}
        {view === "requests" && <SubscriptionRequestsManager />}

        {view === "codes" && (
          <>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
          {([
            { label: "Attivi",  value: activeCodes.length,  color: "#10b981", key: "active"  },
            { label: "Usati",   value: usedCodes.length,    color: "#6b7280", key: "used"    },
            { label: "Scaduti", value: expiredCodes.length, color: "#ef4444", key: "expired" },
          ] as const).map((s, idx) => (
            <button
              key={s.label}
              onClick={() => setFilter(f => f === s.key ? "all" : s.key)}
              className="stat-card"
              style={{
                background:   filter === s.key
                  ? `linear-gradient(135deg, ${s.color}18, ${s.color}05)`
                  : "linear-gradient(135deg, #111 0%, #0a0a0a 100%)",
                border:       `1px solid ${filter === s.key ? s.color + "55" : "#1f1f1f"}`,
                borderRadius: 14, padding: "18px 20px", textAlign: "left", cursor: "pointer",
                boxShadow: filter === s.key
                  ? `0 8px 24px ${s.color}15, inset 0 1px 0 rgba(255,255,255,0.04)`
                  : "inset 0 1px 0 rgba(255,255,255,0.02)",
                animation: `fadeInUp 0.5s ease ${idx * 0.08 + 0.1}s both`,
                position: "relative", overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {filter === s.key && (
                <span style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
                }} />
              )}
              <p style={{
                color: s.color, fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em",
                textShadow: filter === s.key ? `0 0 20px ${s.color}55` : "none",
              }}>{s.value}</p>
              <p style={{
                color: filter === s.key ? s.color : "#555", fontSize: 13, margin: "4px 0 0",
                fontWeight: filter === s.key ? 600 : 400,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {s.label}
                {filter === s.key && <span style={{ animation: "fadeInRight 0.3s ease" }}>↑</span>}
              </p>
            </button>
          ))}
        </div>

        {/* Genera codice — trigger card */}
        <div style={{
          background: "linear-gradient(135deg, #111 0%, #0a0a0a 100%)",
          border: "1px solid #1f1f1f", borderRadius: 14, padding: 24, marginBottom: 32,
          position: "relative", overflow: "hidden",
          animation: "fadeInUp 0.6s ease 0.3s both",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
        }}>
          {/* Glow animato */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #10b98155, #f59e0b55, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 4s linear infinite",
          }} />

          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", color: "#fff" }}>Gestione Codici</h2>
          <p style={{ color: "#555", fontSize: 13, margin: "0 0 20px" }}>
            Genera un nuovo codice invito oppure un codice di rinnovo per un abbonamento esistente.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowGenerate(true)}
              className="action-btn"
              style={{
                padding: "11px 22px",
                background: "linear-gradient(135deg, #064e3b, #022c22)",
                color: "#fff",
                border: "1px solid #10b98144", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 8px 20px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
                transition: "all 0.25s ease",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease" }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuovo Codice Invito
            </button>
            <button
              onClick={() => setShowRenewal(true)}
              className="action-btn"
              style={{
                padding: "11px 22px",
                background: "linear-gradient(135deg, #92400e22, #78350f11)",
                color: "#f59e0b",
                border: "1px solid #f59e0b44", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 8px 20px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                transition: "all 0.25s ease",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.4s ease" }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Codice Rinnovo
            </button>
          </div>
        </div>

        {error && (
          <p style={{
            color: "#f87171", fontSize: 13, marginBottom: 16, padding: "10px 14px",
            background: "#f8717108", border: "1px solid #f8717133", borderRadius: 8,
            animation: "shake 0.4s ease",
          }}>{error}</p>
        )}

        {/* Lista codici */}
        <div style={{
          background: "linear-gradient(135deg, #111 0%, #0a0a0a 100%)",
          border: "1px solid #1f1f1f", borderRadius: 14, overflow: "hidden",
          animation: "fadeInUp 0.6s ease 0.4s both",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
        }}>

          {/* Toolbar */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid #1f1f1f",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
            background: "linear-gradient(180deg, #111, #0d0d0d)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {filter === "all" ? "Tutti i Codici" : filter === "active" ? "Attivi" : filter === "used" ? "Usati" : "Scaduti"}
              </h2>
              <span style={{
                color: "#555", fontSize: 13, padding: "2px 8px", background: "#1a1a1a",
                borderRadius: 99, border: "1px solid #222",
              }}>({filteredCodes.length})</span>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} style={{
                  background: "transparent", border: "none", color: "#555", cursor: "pointer",
                  fontSize: 12, textDecoration: "underline", padding: 0, transition: "color 0.2s ease",
                }} className="text-link">
                  mostra tutti
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "active", "used", "expired"] as FilterType[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} className="filter-pill" style={{
                  padding: "5px 13px", borderRadius: 99, fontSize: 12, fontWeight: 500, border: "1px solid",
                  background:  filter === f ? "linear-gradient(135deg, #fff, #ddd)" : "transparent",
                  color:       filter === f ? "#000" : "#666",
                  borderColor: filter === f ? "#fff" : "#2a2a2a",
                  cursor: "pointer", transition: "all 0.2s ease",
                  boxShadow: filter === f ? "0 4px 12px rgba(255,255,255,0.15)" : "none",
                }}>
                  {f === "all" ? "Tutti" : f === "active" ? "Attivi" : f === "used" ? "Usati" : "Scaduti"}
                </button>
              ))}
            </div>
          </div>

          {/* Barra azioni selezione */}
          {selected.size > 0 && (
            <div style={{
              padding: "10px 20px", background: "linear-gradient(180deg, #0d0d0d, #0a0a0a)",
              borderBottom: "1px solid #1a1a1a",
              display: "flex", alignItems: "center", gap: 12,
              animation: "slideDown 0.3s ease both",
            }}>
              <span style={{ color: "#aaa", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171", animation: "blink 1.5s ease-in-out infinite" }} />
                {selected.size} selezionato/i
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="danger-btn"
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 7,
                  fontSize: 13, fontWeight: 500,
                  background: "linear-gradient(135deg, #1a0505, #0d0303)",
                  border: "1px solid #f8717133", color: "#f87171", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <TrashIcon size={13} />
                {deleting ? "Eliminazione..." : "Elimina selezionati"}
              </button>
              <button onClick={() => setSelected(new Set())} style={{
                background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 13,
                transition: "color 0.2s ease",
              }} className="text-link">
                Deseleziona tutto
              </button>
            </div>
          )}

          {filteredCodes.length === 0 ? (
            <div style={{
              padding: 48, textAlign: "center",
              animation: "fadeIn 0.4s ease both",
            }}>
              <div style={{
                width: 48, height: 48, margin: "0 auto 16",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1a1a1a, #0f0f0f)",
                border: "1px solid #222",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#444",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/>
                </svg>
              </div>
              <p style={{ color: "#555", fontSize: 14, margin: 0 }}>Nessun codice in questa categoria.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, #0d0d0d, #0a0a0a)" }}>
                    <th style={{ padding: "12px 16px", width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selected.size === filteredCodes.length && filteredCodes.length > 0}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer", accentColor: "#10b981" }}
                      />
                    </th>
                    {["Codice", "Piano", "Stato", "Scade / Usato", "Usato da", ""].map(h => (
                      <th key={h} style={{
                        padding: "12px 14px", textAlign: "left", color: "#555",
                        fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((c, i) => {
                    const status   = codeStatus(c);
                    const isActive = status.key === "active";
                    return (
                      <tr
                        key={c.id}
                        className="code-row"
                        style={{
                          borderTop: i > 0 ? "1px solid #1a1a1a" : undefined,
                          background: selected.has(c.id) ? "linear-gradient(90deg, #10b98108, transparent)" : undefined,
                          animation: `fadeInUp 0.4s ease ${Math.min(i * 0.03, 0.5)}s both`,
                          transition: "background 0.2s ease",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ cursor: "pointer", accentColor: "#10b981" }} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <CodeCell code={c.code} isActive={isActive} />
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {c.plan ? (
                            <span style={{
                              display: "inline-block", padding: "3px 10px", borderRadius: 99,
                              fontSize: 11, fontWeight: 600,
                              background: `${planColor(c.plan)}15`, color: planColor(c.plan),
                              border: `1px solid ${planColor(c.plan)}44`,
                              boxShadow: `0 0 10px ${planColor(c.plan)}15`,
                            }}>
                              {planLabel(c.plan)}
                            </span>
                          ) : <span style={{ color: "#333" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            display: "inline-block", padding: "3px 11px", borderRadius: 99,
                            fontSize: 12, fontWeight: 600,
                            background: `${status.color}18`, color: status.color,
                            border: `1px solid ${status.color}44`,
                            boxShadow: status.key === "active" ? `0 0 12px ${status.color}25` : "none",
                          }}>
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#888", fontSize: 13 }}>
                          {isActive ? <LiveCountdown expiresAt={c.expires_at} /> : c.used_at ? formatDate(c.used_at) : formatDate(c.expires_at)}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#666", fontSize: 13 }}>
                          {c.used_by_email ?? "—"}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {isActive && (
                              <>
                                <button
                                  onClick={() => handleCopy(c.code, c.id)}
                                  className="row-btn"
                                  style={{
                                    ...smallBtnStyle,
                                    background: copiedId === c.id ? "#10b98115" : "transparent",
                                    color: copiedId === c.id ? "#10b981" : "#aaa",
                                    borderColor: copiedId === c.id ? "#10b98144" : "#2a2a2a",
                                  }}
                                >
                                  {copiedId === c.id ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "successPop 0.4s ease" }}>
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                      Copiato
                                    </span>
                                  ) : "Copia"}
                                </button>
                                <button
                                  onClick={() => handleRevoke(c.id)}
                                  className="row-btn"
                                  style={{ ...smallBtnStyle, color: "#f87171", borderColor: "#f8717133", background: "#f8717108" }}
                                >
                                  Revoca
                                </button>
                              </>
                            )}
                            {c.used_by_email && (
                              <button
                                onClick={() => setInfoTarget({ code: c.code, email: c.used_by_email! })}
                                className="row-btn"
                                style={{
                                  background: "transparent", border: "1px solid #1f4a6a33", borderRadius: 6,
                                  cursor: "pointer", padding: "4px 10px", color: "#60a5fa",
                                  display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <InfoIcon size={13} /> Info
                              </button>
                            )}
                            <button
                              onClick={() => setSelected(new Set([c.id]))}
                              className="row-btn"
                              style={{
                                background: "transparent", border: "1px solid #1a1a1a", borderRadius: 6,
                                cursor: "pointer", padding: "4px 8px", color: "#555",
                                display: "flex", alignItems: "center", transition: "all 0.2s ease",
                              }}
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
            </div>
          )}
        </div>
          </>
        )}
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

      {/* Stili globali e keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); max-height: 0; }
          to   { opacity: 1; transform: translateY(0); max-height: 60px; }
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
        @keyframes pulseUrgent {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50%      { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
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

        /* Backdrop modale — animazione in/out */
        .modal-backdrop {
          animation: backdropIn 0.3s ease forwards;
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .modal-backdrop {
          animation: backdropIn 0.3s ease forwards;
        }

        /* Pannello modale — scale-in */
        .modal-panel {
          animation: modalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Hover states */
        .ghost-btn:hover {
          background: #1a1a1a !important;
          border-color: #10b98144 !important;
          color: #10b981 !important;
          transform: translateY(-1px);
        }
        .close-btn:hover {
          background: #f8717115 !important;
          border-color: #f8717144 !important;
          color: #f87171 !important;
          transform: rotate(90deg);
        }
        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.12) !important;
        }
        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.12) !important;
        }
        .action-btn:hover svg {
          transform: rotate(90deg);
        }
        .filter-pill:hover {
          background: #1a1a1a !important;
          color: #aaa !important;
          border-color: #2a2a2a !important;
        }
        .plan-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.2) !important;
        }
        .chip-btn:hover {
          background: #1a1a1a !important;
          color: #aaa !important;
        }
        .text-link:hover {
          color: #10b981 !important;
        }
        .row-btn:hover {
          background: #1a1a1a !important;
          border-color: #333 !important;
          transform: translateY(-1px);
        }
        .danger-btn:hover {
          background: linear-gradient(135deg, #2a0808, #1a0505) !important;
          box-shadow: 0 4px 12px rgba(248,113,113,0.2) !important;
        }
        .icon-btn:hover {
          background: #1a1a1a !important;
          color: #10b981 !important;
        }
        .staff-row:hover {
          border-color: #2a2a2a !important;
          transform: translateX(2px);
        }

        /* Code row hover */
        .code-row:hover {
          background: linear-gradient(90deg, rgba(255,255,255,0.02), transparent) !important;
        }

        /* Range input styling */
        .range-input {
          -webkit-appearance: none;
          appearance: none;
          background: #1a1a1a;
          border-radius: 99px;
          outline: none;
        }
        .range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: 2px solid currentColor;
          box-shadow: 0 0 12px currentColor;
          transition: transform 0.2s ease;
        }
        .range-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .range-input::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: 2px solid currentColor;
          box-shadow: 0 0 12px currentColor;
        }

        /* Text input focus */
        .text-input:focus {
          border-color: #10b98155 !important;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
        }

        /* Btn primary press */
        .btn-primary {
          transition: all 0.25s ease !important;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
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
