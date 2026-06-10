"use client";
// src/app/register-restaurant/page.tsx
// Pagina di registrazione per nuovi proprietari di ristorante.
// Richiede un codice invito valido generato dal site owner.

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UtensilsCrossed, Mail, Lock, User, ArrowLeft, Loader2, CheckCircle, AlertCircle, KeyRound } from "lucide-react";

type Status = "idle" | "validating" | "submitting" | "success" | "error";

function RegisterRestaurantContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    inviteCode:     searchParams.get("code") ?? "", // pre-compila se passato via URL
    email:          "",
    password:       "",
    confirmPassword: "",
    firstName:      "",
    lastName:       "",
    restaurantName: "",
  });

  const [status,       setStatus]       = useState<Status>("idle");
  const [error,        setError]        = useState<string | null>(null);
  const [codeValid,    setCodeValid]    = useState<boolean | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);

  // ── Valida il codice in tempo reale (debounced) ──────────────────────────
  useEffect(() => {
    const code = formData.inviteCode.trim();
    if (code.length < 5) { setCodeValid(null); return; }

    const timer = setTimeout(async () => {
      setCodeChecking(true);
      try {
        const res  = await fetch("/api/invite-codes/validate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ code }),
        });
        const data = await res.json();
        setCodeValid(data.valid === true);
        if (!data.valid) setError(data.error ?? "Codice non valido.");
        else             setError(null);
      } catch {
        setCodeValid(false);
      } finally {
        setCodeChecking(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.inviteCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!codeValid) {
      setError("Inserisci un codice invito valido.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Le password non corrispondono.");
      return;
    }

    if (formData.password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/register-restaurant", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          inviteCode:     formData.inviteCode.trim(),
          email:          formData.email.trim(),
          password:       formData.password,
          firstName:      formData.firstName.trim(),
          lastName:       formData.lastName.trim(),
          restaurantName: formData.restaurantName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Errore durante la registrazione.");
        return;
      }

      setStatus("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setStatus("error");
      setError("Errore di rete. Riprova.");
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Ristorante Registrato!</h2>
          <p className="text-gray-600">
            Account creato con successo.<br />
            Verrai reindirizzato al login tra pochi secondi.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-green-50/30 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Registra Ristorante</h2>
          <p className="text-gray-500 mt-2 text-sm">Inserisci il codice invito ricevuto</p>
        </div>

        {/* Errore globale */}
        {error && !codeChecking && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Codice invito */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Codice Invito *
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="inviteCode"
                required
                value={formData.inviteCode}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2.5 border-2 rounded-xl outline-none bg-gray-50 uppercase tracking-widest font-mono text-sm transition-colors ${
                  codeValid === true  ? "border-green-500 bg-green-50" :
                  codeValid === false ? "border-red-400 bg-red-50"     :
                  "border-gray-200 focus:border-green-500"
                }`}
                placeholder="RESTO-XXXXXXXX"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {codeChecking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                {!codeChecking && codeValid === true  && <CheckCircle className="w-4 h-4 text-green-500" />}
                {!codeChecking && codeValid === false && <AlertCircle className="w-4 h-4 text-red-400" />}
              </div>
            </div>
          </div>

          {/* Divisore */}
          <div className="border-t border-gray-100 pt-2" />

          {/* Nome ristorante */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Ristorante *</label>
            <div className="relative">
              <UtensilsCrossed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="restaurantName"
                required
                value={formData.restaurantName}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none bg-gray-50"
                placeholder="Il Mio Ristorante"
              />
            </div>
          </div>

          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome *</label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none bg-gray-50"
                placeholder="Mario"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cognome *</label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none bg-gray-50"
                placeholder="Rossi"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none bg-gray-50"
                placeholder="titolare@ristorante.it"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none bg-gray-50"
                placeholder="Minimo 8 caratteri"
              />
            </div>
          </div>

          {/* Conferma password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Conferma Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 border-2 rounded-xl outline-none bg-gray-50 transition-colors ${
                  formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
                    ? "border-red-400"
                    : "border-gray-200 focus:border-green-500"
                }`}
                placeholder="Ripeti password"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "submitting" || !codeValid}
            className="w-full bg-gray-900 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registrazione in corso...
              </>
            ) : (
              "Crea Account Ristorante"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600">
            <ArrowLeft className="w-4 h-4" />
            Torna al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterRestaurantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <RegisterRestaurantContent />
    </Suspense>
  );
}