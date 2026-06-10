// src/app/rinnova/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Step = "idle" | "loading" | "valid" | "success" | "error";

interface CodeInfo {
  id: string;
  plan: string;
  access_duration_days: number;
  max_staff: number;
  restaurant_id: string;
  restaurant_name: string;
  new_expiry: Date;
}

export default function RinnovaAbbonamento() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [applying, setApplying] = useState(false);

  async function verificaCodice() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setStep("loading");
    setErrorMsg("");
    setCodeInfo(null);


    // 1. Recupera il codice
    const { data: invite, error } = await supabase
      .from("invite_codes")
      .select("id, code, plan, access_duration_days, max_staff, restaurant_id, used_at, expires_at, is_renewal")
      .eq("code", trimmed)
      .single();

    if (error || !invite) {
      setErrorMsg("Codice non trovato. Controlla e riprova.");
      setStep("error");
      return;
    }

    // 2. Già usato?
    if (invite.used_at) {
      setErrorMsg("Questo codice è già stato utilizzato.");
      setStep("error");
      return;
    }

    // 3. Scaduto?
    if (new Date(invite.expires_at) < new Date()) {
      setErrorMsg("Questo codice è scaduto. Contatta il gestore del servizio.");
      setStep("error");
      return;
    }

    // 4. È un codice di RINNOVO?
    if (!invite.is_renewal) {
      setErrorMsg(
        "Questo codice è valido solo per la registrazione di un nuovo ristorante, non per un rinnovo."
      );
      setStep("error");
      return;
    }

    // 5. Verifica che l'utente loggato sia admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Devi essere autenticato per rinnovare l'abbonamento.");
      setStep("error");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || !profile.restaurant_id) {
      setErrorMsg("Non sei autorizzato a rinnovare l'abbonamento.");
      setStep("error");
      return;
    }

    // 6. Recupera il ristorante dell'utente loggato
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, access_expires_at, status")
      .eq("id", profile.restaurant_id)
      .single();

    if (restError || !restaurant) {
      setErrorMsg("Errore nel recupero del tuo ristorante.");
      setStep("error");
      return;
    }

    // Calcola nuova scadenza: parto da oggi o da access_expires_at se è nel futuro
    const base =
      restaurant.access_expires_at && new Date(restaurant.access_expires_at) > new Date()
        ? new Date(restaurant.access_expires_at)
        : new Date();

    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + invite.access_duration_days);

    setCodeInfo({
      id: invite.id,
      plan: invite.plan,
      access_duration_days: invite.access_duration_days,
      max_staff: invite.max_staff,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      new_expiry: newExpiry,
    });

    setStep("valid");
  }

  async function confermRinnovo() {
    if (!codeInfo) return;
    setApplying(true);

    // 1. Aggiorna il ristorante
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({
        plan: codeInfo.plan,
        max_staff: codeInfo.max_staff,
        access_expires_at: codeInfo.new_expiry.toISOString(),
        status: "open",
        invite_code_id: codeInfo.id,
      })
      .eq("id", codeInfo.restaurant_id);

    if (updateError) {
      setErrorMsg("Errore durante il rinnovo. Riprova tra qualche istante.");
      setStep("error");
      setApplying(false);
      return;
    }

    // 2. Segna il codice come usato
    const { error: usedError } = await supabase
      .from("invite_codes")
      .update({
        used_at: new Date().toISOString(),
        used_by: codeInfo.restaurant_id,
      })
      .eq("id", codeInfo.id);

    if (usedError) {
      // Il rinnovo è andato a buon fine anche se questo fallisce, logga solo
      console.error("Errore nel marcare il codice come usato:", usedError);
    }

    setApplying(false);
    setStep("success");
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 mb-4">
            <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Rinnova Abbonamento</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Inserisci il codice ricevuto per rinnovare l'accesso al tuo ristorante
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* Step: inserimento codice */}
          {(step === "idle" || step === "loading" || step === "error") && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Codice di rinnovo
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (step === "error") setStep("idle");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && verificaCodice()}
                  placeholder="Es. CT45PC2E"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent uppercase"
                  disabled={step === "loading"}
                  maxLength={20}
                />
              </div>

              {step === "error" && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              <button
                onClick={verificaCodice}
                disabled={step === "loading" || !code.trim()}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifica in corso...
                  </span>
                ) : (
                  "Verifica codice"
                )}
              </button>
            </div>
          )}

          {/* Step: codice valido — mostra riepilogo */}
          {step === "valid" && codeInfo && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl text-sm font-medium">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Codice valido — controlla il riepilogo
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ristorante</span>
                  <span className="font-semibold text-gray-900">{codeInfo.restaurant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Piano</span>
                  <span className="font-semibold text-gray-900">{codeInfo.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durata</span>
                  <span className="font-semibold text-gray-900">{codeInfo.access_duration_days} giorni</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Staff massimo</span>
                  <span className="font-semibold text-gray-900">{codeInfo.max_staff} persone</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="text-gray-500">Nuovo accesso fino al</span>
                  <span className="font-bold text-orange-600">{formatDate(codeInfo.new_expiry)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep("idle"); setCode(""); setCodeInfo(null); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={confermRinnovo}
                  disabled={applying}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition disabled:opacity-50"
                >
                  {applying ? "Attivazione..." : "Conferma rinnovo"}
                </button>
              </div>
            </div>
          )}

          {/* Step: successo */}
          {step === "success" && codeInfo && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Abbonamento rinnovato!</h2>
                <p className="text-gray-500 text-sm mt-1">
                  <strong>{codeInfo.restaurant_name}</strong> è attivo fino al{" "}
                  <strong className="text-orange-600">{formatDate(codeInfo.new_expiry)}</strong>
                </p>
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-semibold transition"
              >
                Vai alla dashboard →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Hai problemi con il codice? Contatta il gestore del servizio.
        </p>
      </div>
    </div>
  );
}