// src/app/admin/dashboard/sections/SettingsSection.tsx
"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Settings, Eye, EyeOff, Save, CheckCircle2, AlertCircle,
  Loader2, Sparkles, ExternalLink, KeyRound, ChevronDown,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";

interface Props { ctx: RestaurantCtx; theme: ThemeMode; }

export type AIProvider = "anthropic" | "openai" | "gemini" | "groq";

interface ProviderCfg {
  id:          AIProvider;
  name:        string;
  description: string;
  badge:       string;
  badgeColor:  string;
  prefix:      string;
  placeholder: string;
  docsUrl:     string;
  docsLabel:   string;
}

const PROVIDERS: ProviderCfg[] = [
  {
    id:          "gemini",
    name:        "Gemini Flash 2.0",
    description: "Google — gratuito fino a 1500 req/giorno",
    badge:       "Gratuito",
    badgeColor:  "text-green-400 bg-green-500/10 border-green-500/20",
    prefix:      "AIza",
    placeholder: "AIzaSy…",
    docsUrl:     "https://aistudio.google.com/app/apikey",
    docsLabel:   "aistudio.google.com",
  },
  {
    id:          "groq",
    name:        "Groq (Llama 3.3)",
    description: "Groq — gratuito, velocissimo",
    badge:       "Gratuito",
    badgeColor:  "text-green-400 bg-green-500/10 border-green-500/20",
    prefix:      "gsk_",
    placeholder: "gsk_…",
    docsUrl:     "https://console.groq.com/keys",
    docsLabel:   "console.groq.com",
  },
  {
    id:          "openai",
    name:        "OpenAI GPT-4o mini",
    description: "OpenAI — a pagamento, molto accurato",
    badge:       "A pagamento",
    badgeColor:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    prefix:      "sk-",
    placeholder: "sk-…",
    docsUrl:     "https://platform.openai.com/api-keys",
    docsLabel:   "platform.openai.com",
  },
  {
    id:          "anthropic",
    name:        "Claude (Anthropic)",
    description: "Anthropic — a pagamento, ottimo per analisi",
    badge:       "A pagamento",
    badgeColor:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    prefix:      "sk-ant-",
    placeholder: "sk-ant-api03-…",
    docsUrl:     "https://console.anthropic.com/settings/keys",
    docsLabel:   "console.anthropic.com",
  },
];

type SaveState = "idle" | "saving" | "saved" | "error";

interface ProviderState {
  key:      string;
  show:     boolean;
  expanded: boolean;
}

export function SettingsSection({ ctx, theme }: Props) {
  const dark     = theme === "dark";
  const card     = dark ? "bg-[#13131e]"   : "bg-white";
  const bord     = dark ? "border-white/8" : "border-gray-200";
  const txt      = dark ? "text-white"     : "text-gray-900";
  const muted    = dark ? "text-gray-400"  : "text-gray-500";
  const inputCls = dark
    ? "bg-[#0e0e1a] border-white/10 text-white placeholder-gray-600 focus:border-purple-500"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Stato per ogni provider
  const [providers, setProviders] = useState<Record<AIProvider, ProviderState>>(
    () => Object.fromEntries(
      PROVIDERS.map(p => [p.id, { key: "", show: false, expanded: false }])
    ) as Record<AIProvider, ProviderState>
  );

  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null);
  const [loadState,      setLoadState]      = useState<"loading" | "ready" | "error">("loading");
  const [saveState,      setSaveState]      = useState<SaveState>("idle");
  const [errorMsg,       setErrorMsg]       = useState("");

  // ── Carica configurazione esistente ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("settings")
          .eq("id", ctx.restaurantId)
          .single();

        if (error) throw error;

        const s = data?.settings ?? {};
        const active: AIProvider | null = s.ai_provider ?? null;
        setActiveProvider(active);

        setProviders(prev => {
          const next = { ...prev };
          for (const p of PROVIDERS) {
            next[p.id] = {
              key:      s[`${p.id}_api_key`] ?? "",
              show:     false,
              expanded: p.id === active,
            };
          }
          return next;
        });

        setLoadState("ready");
      } catch {
        setLoadState("error");
      }
    };
    load();
  }, [ctx.restaurantId]);

  // ── Toggle espansione card provider ─────────────────────────────────────────
  const toggleExpand = (id: AIProvider) => {
    setProviders(prev => ({
      ...prev,
      [id]: { ...prev[id], expanded: !prev[id].expanded },
    }));
  };

  const setKey = (id: AIProvider, key: string) => {
    setProviders(prev => ({ ...prev, [id]: { ...prev[id], key } }));
  };

  const toggleShow = (id: AIProvider) => {
    setProviders(prev => ({ ...prev, [id]: { ...prev[id], show: !prev[id].show } }));
  };

  // ── Valida formato chiave ────────────────────────────────────────────────────
  const validateKey = (cfg: ProviderCfg, key: string): string | null => {
    if (!key) return null; // chiave vuota = ok (non configurata)
    if (!key.startsWith(cfg.prefix))
      return `La chiave ${cfg.name} deve iniziare con "${cfg.prefix}"`;
    return null;
  };

  // ── Salva tutto ─────────────────────────────────────────────────────────────
  const save = async () => {
    if (saveState === "saving") return;
    setErrorMsg("");

    // Valida tutte le chiavi non vuote
    for (const cfg of PROVIDERS) {
      const key = providers[cfg.id].key;
      const err = validateKey(cfg, key);
      if (err) { setErrorMsg(err); return; }
    }

    // Verifica che il provider attivo abbia una chiave
    if (activeProvider && !providers[activeProvider].key) {
      setErrorMsg(`Inserisci la chiave API per ${PROVIDERS.find(p => p.id === activeProvider)?.name} o cambia provider attivo.`);
      return;
    }

    setSaveState("saving");
    try {
      const { data: current } = await supabase
        .from("restaurants")
        .select("settings")
        .eq("id", ctx.restaurantId)
        .single();

      const merged = {
        ...(current?.settings ?? {}),
        ai_provider: activeProvider,
        ...Object.fromEntries(
          PROVIDERS.map(p => [`${p.id}_api_key`, providers[p.id].key.trim() || null])
        ),
      };

      const { error } = await supabase
        .from("restaurants")
        .update({ settings: merged })
        .eq("id", ctx.restaurantId);

      if (error) throw error;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e: any) {
      setErrorMsg(e.message || "Errore durante il salvataggio.");
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const maskKey = (k: string) =>
    k.length > 12 ? k.slice(0, 10) + "••••••••" + k.slice(-4) : k;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-2xl w-full mx-auto">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${dark ? "bg-white/8" : "bg-gray-100"}`}>
          <Settings className={`w-5 h-5 ${muted}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${txt}`}>Impostazioni</h2>
          <p className={`text-xs ${muted}`}>Configurazione account e integrazioni AI</p>
        </div>
      </div>

      {loadState === "loading" && (
        <div className="flex items-center gap-2 py-10 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className={`text-sm ${muted}`}>Caricamento…</span>
        </div>
      )}

      {loadState === "error" && (
        <div className={`${card} rounded-2xl border ${bord} p-6 flex items-center gap-3 text-red-400`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Impossibile caricare le impostazioni. Ricarica la pagina.</p>
        </div>
      )}

      {loadState === "ready" && (<>

        {/* SEZIONE AI */}
        <div className={`${card} rounded-2xl border ${bord} overflow-hidden`}>

          {/* Header sezione */}
          <div className={`flex items-center gap-3 px-6 py-4 border-b ${bord}`}>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${txt}`}>Provider AI</p>
              <p className={`text-xs ${muted}`}>Configura le chiavi e scegli quale AI usare per Analytics</p>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {PROVIDERS.map(cfg => {
              const pState    = providers[cfg.id];
              const isActive  = activeProvider === cfg.id;
              const hasKey    = !!pState.key;
              const validErr  = pState.key ? validateKey(cfg, pState.key) : null;

              return (
                <div key={cfg.id}>
                  {/* Riga provider */}
                  <div
                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors
                      ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}
                      ${isActive ? dark ? "bg-purple-500/5" : "bg-purple-50/60" : ""}
                    `}
                    onClick={() => toggleExpand(cfg.id)}
                  >
                    {/* Radio visivo */}
                    <button
                      onClick={e => { e.stopPropagation(); setActiveProvider(isActive ? null : cfg.id); }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${isActive
                          ? "border-purple-500 bg-purple-500"
                          : dark ? "border-white/20" : "border-gray-300"
                        }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${txt}`}>{cfg.name}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                          {cfg.badge}
                        </span>
                        {hasKey && !validErr && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20">
                            ✓ Configurato
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${muted} mt-0.5`}>{cfg.description}</p>
                    </div>

                    <ChevronDown className={`w-4 h-4 ${muted} transition-transform shrink-0 ${pState.expanded ? "rotate-180" : ""}`} />
                  </div>

                  {/* Pannello espanso */}
                  {pState.expanded && (
                    <div className={`px-6 pb-5 pt-1 space-y-3 ${dark ? "bg-black/10" : "bg-gray-50/50"}`}>

                      {/* Info link docs */}
                      <div className={`rounded-xl px-4 py-3 text-xs flex gap-3 ${dark ? "bg-purple-500/8 border border-purple-500/20" : "bg-purple-50 border border-purple-200"}`}>
                        <KeyRound className={`w-4 h-4 text-purple-400 shrink-0 mt-0.5`} />
                        <div className={`${muted}`}>
                          Ottieni la chiave su{" "}
                          <a
                            href={cfg.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 underline underline-offset-2"
                          >
                            {cfg.docsLabel}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Input chiave */}
                      <div className="space-y-1.5">
                        <label className={`text-xs font-medium ${muted}`}>Chiave API</label>
                        <div className="relative">
                          <input
                            type={pState.show ? "text" : "password"}
                            value={pState.key}
                            onChange={e => setKey(cfg.id, e.target.value)}
                            placeholder={cfg.placeholder}
                            className={`w-full px-4 py-2.5 pr-10 border-2 rounded-xl text-sm outline-none transition-colors font-mono ${inputCls} ${validErr ? "border-red-500/50" : ""}`}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button
                            onClick={() => toggleShow(cfg.id)}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} hover:text-purple-400 transition-colors`}
                            tabIndex={-1}
                            type="button"
                          >
                            {pState.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Preview mascherata */}
                        {pState.key && !pState.show && !validErr && (
                          <p className={`text-xs font-mono ${muted}`}>{maskKey(pState.key)}</p>
                        )}

                        {/* Errore formato */}
                        {validErr && (
                          <p className="text-xs text-red-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />{validErr}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: provider attivo selezionato */}
          <div className={`px-6 py-3 border-t ${bord} ${dark ? "bg-black/10" : "bg-gray-50"}`}>
            {activeProvider ? (
              <p className={`text-xs ${muted}`}>
                Provider attivo:{" "}
                <span className="text-purple-400 font-medium">
                  {PROVIDERS.find(p => p.id === activeProvider)?.name}
                </span>
                {" "}— verrà usato nell'AI Analytics
              </p>
            ) : (
              <p className={`text-xs text-yellow-500`}>
                ⚠ Nessun provider selezionato. Clicca il cerchio accanto a un provider per attivarlo.
              </p>
            )}
          </div>
        </div>

        {/* Errore salvataggio */}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 text-sm px-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Pulsante salva */}
        <button
          onClick={save}
          disabled={saveState === "saving"}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed
            ${saveState === "saved"
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : saveState === "error"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-purple-500 hover:bg-purple-400 text-white"
            }`}
        >
          {saveState === "saving" && <Loader2     className="w-4 h-4 animate-spin" />}
          {saveState === "saved"  && <CheckCircle2 className="w-4 h-4" />}
          {saveState === "error"  && <AlertCircle  className="w-4 h-4" />}
          {saveState === "idle"   && <Save         className="w-4 h-4" />}
          {saveState === "saving" ? "Salvataggio…"
            : saveState === "saved"  ? "Salvato!"
            : saveState === "error"  ? "Errore — riprova"
            : "Salva impostazioni"}
        </button>

        {/* CARD info account */}
        <div className={`${card} rounded-2xl border ${bord} px-6 py-5`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${muted} mb-4`}>Account</p>
          <div className="space-y-3">
            {[
              { label: "Ristorante",     value: ctx.restaurantName },
              { label: "Email",          value: ctx.userEmail },
              { label: "Piano",          value: ctx.plan ?? "—" },
              {
                label: "Accesso fino al",
                value: ctx.accessExpiresAt
                  ? new Date(ctx.accessExpiresAt).toLocaleDateString("it-IT", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`text-sm ${muted}`}>{label}</span>
                <span className={`text-sm font-medium ${txt}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </>)}
    </div>
  );
}