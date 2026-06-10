// src/app/admin/dashboard/sections/StaffSection.tsx
//
// ─── SEZIONE: STAFF ───────────────────────────────────────────────────────────
//
// Gestisce tutto ciò che riguarda lo staff del ristorante:
//   - Card abbonamento con slot staff usati / disponibili
//   - Generazione codici invito (validi 48 ore)
//   - Copia / eliminazione codici attivi
//   - Lista codici usati e scaduti (collassata)
//   - Lista membri staff registrati
//
// Props ricevute dal page.tsx orchestratore:
//   - ctx:   dati ristorante (restaurantId, maxStaff, plan, …)
//   - theme: "dark" | "light"
//
// Stato locale: tutti i dati staff vengono caricati qui,
// non nel page.tsx, per mantenere ogni sezione autonoma.
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Users, Plus, Copy, CheckCircle, AlertCircle,
  Loader2, RefreshCw, Shield, Clock,
  Trash2, Lock,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteCode {
  id:          string;
  code:        string;
  created_at:  string;
  used_at:     string | null;
  used_by:     string | null; // uuid del profile che ha usato il codice
  expires_at:  string;
  notes:       string | null;
}

interface StaffMember {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  role:       "staff" | "manager";
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  ctx:   RestaurantCtx;
  theme: ThemeMode;
}

export function StaffSection({ ctx, theme }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Stato ────────────────────────────────────────────────────────────────────
  const [isLoading,    setIsLoading]    = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [copiedId,     setCopiedId]     = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [successMsg,   setSuccessMsg]   = useState<string | null>(null);

  const [inviteCodes,  setInviteCodes]  = useState<InviteCode[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [currentStaff, setCurrentStaff] = useState(0);

  // ── Caricamento dati ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const rid = ctx.restaurantId;

      // Staff count
      const { count: staffCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", rid)
        .in("role", ["staff", "manager"]);

      setCurrentStaff(staffCount ?? 0);

      // Codici invito staff (tutti, filtriamo lato client)
      const { data: codes } = await supabase
        .from("staff_invite_codes")
        .select("*")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: false });

      setInviteCodes((codes as InviteCode[]) ?? []);

      // Membri staff
      const { data: staff } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, created_at")
        .eq("restaurant_id", rid)
        .in("role", ["staff", "manager"])
        .order("created_at", { ascending: false });

      setStaffMembers((staff as StaffMember[]) ?? []);
    } catch (err: any) {
      setError(err.message ?? "Errore nel caricamento dei dati.");
    } finally {
      setIsLoading(false);
    }
  }, [ctx.restaurantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Genera codice invito ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!canAdd) return;

    setGenerating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const code      = generateCode();
// 5 minuti, ora italiana (Europe/Rome)
const expiresAt = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
expiresAt.setMinutes(expiresAt.getMinutes() + 5);

const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error("Utente non autenticato");

const { error: insertError } = await supabase.from("staff_invite_codes").insert({
  code,
  restaurant_id: ctx.restaurantId,
  created_by:    user.id,
  expires_at:    expiresAt.toISOString(),
});

      if (insertError) throw insertError;

      setSuccessMsg(`Codice ${code} generato con successo!`);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Errore nella generazione del codice.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Copia codice ─────────────────────────────────────────────────────────────
  const handleCopy = async (c: InviteCode) => {
    await navigator.clipboard.writeText(c.code);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Elimina codice ───────────────────────────────────────────────────────────
  const handleDelete = async (codeId: string) => {
    setDeletingId(codeId);
    try {
      const { error: delError } = await supabase
        .from("staff_invite_codes")
        .delete()
        .eq("id", codeId);
      if (delError) throw delError;
      setInviteCodes(prev => prev.filter(c => c.id !== codeId));
    } catch (err: any) {
      setError(err.message ?? "Errore nell'eliminazione del codice.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Token tema ───────────────────────────────────────────────────────────────
  const dark  = theme === "dark";
  const card  = dark ? "bg-[#13131e]"    : "bg-white";
  const bord  = dark ? "border-white/8"  : "border-gray-200";
  const txt   = dark ? "text-white"      : "text-gray-900";
  const muted = dark ? "text-gray-400"   : "text-gray-500";

  // ── Computed ─────────────────────────────────────────────────────────────────
  const maxStaff = ctx.maxStaff ?? 0;
  const canAdd   = maxStaff === 0 || currentStaff < maxStaff;
  const staffPct = maxStaff ? Math.round((currentStaff / maxStaff) * 100) : 0;

  const now          = new Date();
  const activeInvites  = inviteCodes.filter(c => !c.used_at && new Date(c.expires_at) > now);
  const usedInvites    = inviteCodes.filter(c => !!c.used_at);
  const expiredInvites = inviteCodes.filter(c => !c.used_at && new Date(c.expires_at) <= now);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl w-full mx-auto">

      {/* ── FEEDBACK BANNERS ────────────────────────────────────────────── */}
      {error && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          dark
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          dark
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-green-50 border-green-200 text-green-700"
        }`}>
          <CheckCircle className="w-5 h-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          CARD 1 — ABBONAMENTO E SLOT STAFF
          ════════════════════════════════════════════════════════════════════ */}
      <div className={`${card} rounded-2xl border ${bord} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className={`text-xs font-bold uppercase tracking-wider ${
                dark ? "text-indigo-400" : "text-indigo-600"
              }`}>
                Piano {ctx.plan ?? "—"}
              </span>
            </div>
            <p className={`font-semibold ${txt}`}>
              {currentStaff}
              {maxStaff > 0 && (
                <span className={`font-normal ${muted}`}> / {maxStaff}</span>
              )}{" "}
              membri staff
            </p>
            <p className={`text-sm mt-0.5 ${muted}`}>
              {canAdd
                ? `Puoi aggiungere ancora ${maxStaff - currentStaff} membro${maxStaff - currentStaff !== 1 ? "i" : ""}`
                : "Limite raggiunto — fai l'upgrade per aggiungere altro staff"
              }
            </p>
          </div>

          {/* Barra utilizzo */}
          {maxStaff > 0 && (
            <div className="sm:w-44">
              <div className={`flex justify-between text-xs mb-1.5 ${muted}`}>
                <span>Utilizzo</span>
                <span>{staffPct}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-gray-100"}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    canAdd ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(staffPct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          CARD 2 — CODICI INVITO
          ════════════════════════════════════════════════════════════════════ */}
      <div className={`${card} rounded-2xl border ${bord} p-6`}>

        {/* Header card */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className={`font-bold ${txt}`}>Codici Invito</h2>
            <p className={`text-sm mt-0.5 ${muted}`}>
              Genera un codice da condividere con il nuovo membro. Valido 48 ore.
            </p>
          </div>

          {/* Pulsante genera */}
          <div className="shrink-0 ml-4">
            {canAdd ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-60"
              >
                {generating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Plus    className="w-4 h-4" />
                }
                Genera codice
              </button>
            ) : (
              <div className={`flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl cursor-not-allowed select-none ${
                dark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
              }`}>
                <Lock className="w-4 h-4" />
                Limite raggiunto
              </div>
            )}
          </div>
        </div>

        {/* ── Codici attivi ── */}
        {activeInvites.length === 0 ? (
          <div className={`text-center py-8 rounded-xl border border-dashed ${
            dark ? "border-white/10 bg-white/3" : "border-gray-200 bg-gray-50"
          }`}>
            <Clock className={`w-8 h-8 mx-auto mb-2 ${muted} opacity-50`} />
            <p className={`text-sm ${muted}`}>Nessun codice attivo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeInvites.map(c => (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                  dark ? "bg-white/5 border-white/8" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div>
                  <span className={`font-mono font-bold tracking-widest text-lg ${txt}`}>
                    {c.code}
                  </span>
                  <p className={`text-xs mt-0.5 ${muted}`}>
                    Scade il {formatDate(c.expires_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Copia */}
                  <button
                    onClick={() => handleCopy(c)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      dark
                        ? "border-white/10 bg-white/5 hover:bg-green-500/15 hover:border-green-500/30 hover:text-green-400 text-gray-400"
                        : "border-gray-200 bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                    }`}
                  >
                    {copiedId === c.id ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        Copiato
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copia
                      </>
                    )}
                  </button>

                  {/* Elimina */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    title="Elimina codice"
                    className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${
                      dark
                        ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                        : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    {deletingId === c.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2  className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Codici usati / scaduti (collassati) ── */}
        {(usedInvites.length > 0 || expiredInvites.length > 0) && (
          <details className="mt-4">
            <summary className={`text-xs cursor-pointer select-none transition-colors ${
              dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
            }`}>
              Mostra codici usati / scaduti ({usedInvites.length + expiredInvites.length})
            </summary>
            <div className="mt-3 space-y-2">
              {[...usedInvites, ...expiredInvites].map(c => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 border opacity-50 ${
                    dark ? "bg-white/3 border-white/5" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div>
                    <span className={`font-mono font-bold tracking-widest ${muted}`}>
                      {c.code}
                    </span>
                    <p className={`text-xs mt-0.5 ${muted}`}>
                      {c.used_at
                        ? `Usato il ${formatDate(c.used_at)}`
                        : `Scaduto il ${formatDate(c.expires_at)}`
                      }
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    c.used_at
                      ? dark ? "bg-green-500/15 text-green-400"  : "bg-green-100 text-green-700"
                      : dark ? "bg-white/5 text-gray-500"        : "bg-gray-100 text-gray-500"
                  }`}>
                    {c.used_at ? "Usato" : "Scaduto"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          CARD 3 — MEMBRI STAFF
          ════════════════════════════════════════════════════════════════════ */}
      <div className={`${card} rounded-2xl border ${bord} p-6`}>

        {/* Header card */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`font-bold ${txt}`}>Membri Staff</h2>
            <p className={`text-sm mt-0.5 ${muted}`}>
              {staffMembers.length} membro{staffMembers.length !== 1 ? "i" : ""} registrato
              {staffMembers.length !== 1 ? "i" : ""}
            </p>
          </div>
          <button
            onClick={loadData}
            title="Aggiorna lista"
            className={`p-2 rounded-xl transition-all ${
              dark ? "text-gray-500 hover:bg-white/5 hover:text-gray-300" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        {staffMembers.length === 0 ? (
          <div className={`text-center py-10 rounded-xl border border-dashed ${
            dark ? "border-white/10 bg-white/3" : "border-gray-200 bg-gray-50"
          }`}>
            <Users className={`w-8 h-8 mx-auto mb-2 ${muted} opacity-50`} />
            <p className={`text-sm ${muted}`}>Nessun membro staff ancora registrato</p>
            <p className={`text-xs mt-1 ${muted}`}>
              Genera un codice invito e condividilo con il tuo staff
            </p>
          </div>
        ) : (
          <div className={`divide-y ${dark ? "divide-white/5" : "divide-gray-100"}`}>
            {staffMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                {/* Avatar + nome */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {member.first_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${txt}`}>
                      {member.first_name} {member.last_name}
                    </p>
                    <p className={`text-xs ${muted}`}>{member.email}</p>
                  </div>
                </div>

                {/* Badge ruolo + data */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    member.role === "manager"
                      ? dark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-100 text-indigo-700"
                      : dark ? "bg-green-500/15 text-green-400"   : "bg-green-100 text-green-700"
                  }`}>
                    {member.role === "manager" ? "Manager" : "Staff"}
                  </span>
                  <span className={`text-xs hidden sm:block ${muted}`}>
                    dal {formatDate(member.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}