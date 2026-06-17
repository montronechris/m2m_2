// src/app/admin/dashboard/components/AIAssistantOverlay.tsx
//
// Floating AI assistant disponibile in tutta la dashboard admin.
// Può leggere E modificare dati, ma SOLO del ristorante dell'admin loggato.
//
// Flusso:
//  1. L'AI genera una query SQL (SELECT o mutazione)
//  2. La query viene eseguita via RPC execute_admin_query (SECURITY INVOKER)
//  3. L'admin vede l'anteprima e conferma le mutazioni prima dell'esecuzione

"use client";

import { useState, useRef, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Sparkles, Send, Loader2, User, Bot, Trash2, X,
  AlertTriangle, CheckCircle2, ChevronDown,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";
import type { AIProvider } from "../sections/SettingsSection";

interface Props {
  ctx:   RestaurantCtx;
  theme: ThemeMode;
}

interface Message {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  loading?:  boolean;
  needsConfirm?: {
    sql:         string;
    description: string;
  };
  confirmed?: boolean;
}

interface AICfg {
  provider: AIProvider;
  apiKey:   string;
}

// ─── System prompt per operazioni admin ──────────────────────────────────────

const ADMIN_SCHEMA = `
Sei Risto, assistente AI del pannello admin di {{RESTAURANT_NAME}}.
Diretto, simpatico, vai subito al punto.
Data/ora: {{NOW}}

Hai due modalità:

━━ MODALITÀ CHAT (domande generiche) ━━
Per saluti, chiacchiere, consigli di cucina, meteo, curiosità, qualsiasi cosa NON riguardi i dati del ristorante:
Rispondi con questo JSON:
{ "type": "chat", "answer": "risposta libera in italiano, max 3 righe, una emoji" }

━━ MODALITÀ DB (dati del ristorante) ━━
SOLO se la domanda chiede ESPLICITAMENTE dati del ristorante (ordini, menu, tavoli, recensioni, incassi, staff):
Hai accesso al database per il ristorante ID: {{RESTAURANT_ID}}

Tabelle (filtra SEMPRE per restaurant_id = '{{RESTAURANT_ID}}'):
restaurants · menu_categories · menu_items · orders · order_items · tables · reviews · profiles · qr_sessions
price_cents = centesimi (€12,50 → 1250). Mai DROP/ALTER/CREATE/TRUNCATE/GRANT.

Rispondi con:
{ "type": "read" | "write", "sql": "...", "description": "max 5 parole", "explanation": "risposta breve, una emoji" }

━━ REGOLA FONDAMENTALE ━━
In caso di dubbio usa sempre MODALITÀ CHAT. "Ho voglia di pasta", "ciao", "che tempo fa" → CHAT, non DB.
Rispondi SOLO con JSON valido, zero testo fuori.
`.trim();

const ANSWER_PROMPT = `
Sei Risto, assistente admin di un ristorante italiano. Diretto e simpatico.
Hai appena eseguito una query e hai i risultati da mostrare all'admin.

REGOLA PRINCIPALE: mostra SEMPRE i dati ricevuti, anche se parziali o con campi null.

Per recensioni: mostra ogni riga come "⭐⭐⭐⭐ · 13 giu 2026 · nessun commento" oppure "⭐⭐⭐ · 10 giu 2026 · Ottimo servizio!". Una per riga.
Per piatti/ordini/tavoli: elenca i risultati in modo leggibile, una riga per elemento.
Campi null = non compilato dal cliente, scrivilo inline ("nessun commento", "senza descrizione" ecc).
Dopo i dati, aggiungi UNA riga di commento breve con emoji se utile. Niente intro, vai dritto ai dati.
Mai SQL. Se i risultati sono proprio vuoti (0 righe), solo allora dì che non ce ne sono.
`.trim();

const GENERAL_PROMPT = `
Sei Risto, assistente simpatico e diretto integrato nel pannello admin di un ristorante italiano.
Rispondi in italiano a qualsiasi domanda generica — meteo, ricette, curiosità, consigli, tutto.
Stile: breve, diretto, con una emoji dove ci sta. Max 4-5 righe salvo richieste che richiedono più dettaglio.
Non menzionare mai il database o il pannello admin a meno che non sia rilevante.
`.trim();

// ─── Componente ───────────────────────────────────────────────────────────────

export function AIAssistantOverlay({ ctx, theme }: Props) {
  const dark   = theme === "dark";
  const bg     = dark ? "bg-[#0f0f1a]"    : "bg-white";
  const bord   = dark ? "border-white/10" : "border-gray-200";
  const txt    = dark ? "text-white"      : "text-gray-900";
  const muted  = dark ? "text-gray-400"   : "text-gray-500";
  const bgSoft = dark ? "bg-white/5"      : "bg-gray-50";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isOpen,     setIsOpen]     = useState(false);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [busy,       setBusy]       = useState(false);
  const [aiCfg,      setAiCfg]      = useState<AICfg | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // ── Carica config AI ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("restaurants")
          .select("settings")
          .eq("id", ctx.restaurantId)
          .single();
        const s        = data?.settings ?? {};
        const provider = s.ai_provider as AIProvider | undefined;
        const apiKey   = provider ? (s[`${provider}_api_key`] ?? null) : null;
        setAiCfg(provider && apiKey ? { provider, apiKey } : null);
      } catch {
        setAiCfg(null);
      } finally {
        setCfgLoading(false);
      }
    };
    load();
  }, [ctx.restaurantId]);

  // ── Scroll al fondo ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus input all'apertura ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const addMsg = (msg: Omit<Message, "id">) => {
    const m = { ...msg, id: crypto.randomUUID() };
    setMessages(prev => [...prev, m]);
    return m.id;
  };

  const updateMsg = (id: string, patch: Partial<Message>) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  // ── Chiama AI proxy ─────────────────────────────────────────────────────────
  const callAI = async (system: string, userContent: string): Promise<string> => {
    if (!aiCfg) throw new Error("Nessun provider configurato.");
    const res = await fetch("/api/ai-analytics", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider:   aiCfg.provider,
        apiKey:     aiCfg.apiKey,
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Errore API");
    return data?.content?.[0]?.text ?? "";
  };

  // ── Esegui query sul DB ─────────────────────────────────────────────────────
  const runQuery = async (sql: string): Promise<any[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_admin_query`,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query: sql, restaurant_id: ctx.restaurantId }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message ?? "Errore nell'esecuzione della query.");
    }
    return res.json();
  };

  // ── Flusso principale ───────────────────────────────────────────────────────
  const ask = async (question: string) => {
    if (!question.trim() || busy || !aiCfg) return;
    setBusy(true);
    setInput("");

    addMsg({ role: "user", content: question });
    const thinkingId = addMsg({ role: "assistant", content: "", loading: true });

    try {
      const now       = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });

      // ── Unico prompt: decide se serve SQL o risponde direttamente ───────────
      const systemSQL = ADMIN_SCHEMA
        .replace(/{{RESTAURANT_ID}}/g, ctx.restaurantId)
        .replace(/{{RESTAURANT_NAME}}/g, ctx.restaurantName)
        .replace(/{{NOW}}/g, now);

      const rawText = await callAI(systemSQL, question);

      let parsed: any = null;
      try {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        throw new Error("Risposta AI non interpretabile.");
      }

      // Modalità chat: risposta libera senza SQL
      if (parsed?.type === "chat") {
        updateMsg(thinkingId, { content: parsed.answer ?? "😊", loading: false });
        return;
      }

      if (!parsed?.sql) throw new Error("Nessuna query generata.");

      const sqlUp = parsed.sql.trim().toUpperCase();

      // Blocco di sicurezza lato client
      if (/\b(DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/.test(sqlUp)) {
        throw new Error("Operazione non consentita.");
      }

      if (parsed.type === "write") {
        // Mostra anteprima e aspetta conferma
        updateMsg(thinkingId, {
          content: parsed.explanation ?? "Vuoi eseguire questa operazione?",
          loading: false,
          needsConfirm: {
            sql:         parsed.sql,
            description: parsed.description ?? "",
          },
        });
      } else {
        // SELECT → esegui subito
        const rows = await runQuery(parsed.sql);
        const answer = await callAI(
          ANSWER_PROMPT,
          `Domanda: "${question}"\n\nRisultati (${rows.length} righe):\n${JSON.stringify(rows, null, 2)}`
        );
        updateMsg(thinkingId, { content: answer, loading: false });
      }
    } catch (e: any) {
      updateMsg(thinkingId, {
        content: `⚠️ ${e.message ?? "Errore durante l'elaborazione."}`,
        loading: false,
      });
    } finally {
      setBusy(false);
    }
  };

  // ── Conferma operazione di scrittura ────────────────────────────────────────
  const confirmWrite = async (msgId: string, sql: string) => {
    setBusy(true);
    try {
      await runQuery(sql);
      updateMsg(msgId, {
        content: "✅ Operazione eseguita con successo!",
        needsConfirm: undefined,
        confirmed: true,
      });
    } catch (e: any) {
      updateMsg(msgId, {
        content: `⚠️ Errore nell'esecuzione: ${e.message}`,
        needsConfirm: undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const cancelWrite = (msgId: string) =>
    updateMsg(msgId, {
      content: "❌ Operazione annullata.",
      needsConfirm: undefined,
    });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── FLOATING BUTTON ────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-2xl shadow-2xl
          flex items-center justify-center
          transition-all duration-300
          ${isOpen
            ? "bg-red-500 hover:bg-red-400 rotate-0 scale-95"
            : "bg-gradient-to-br from-purple-600 to-violet-700 hover:scale-110 hover:shadow-purple-500/30"
          }
        `}
        title={isOpen ? "Chiudi assistente" : "Apri assistente AI"}
      >
        {isOpen
          ? <X          className="w-6 h-6 text-white" />
          : <Sparkles   className="w-6 h-6 text-white" />
        }
      </button>

      {/* ── OVERLAY CHAT ───────────────────────────────────────────────────── */}
      <div
        className={`
          fixed inset-0 z-40
          transition-all duration-400 ease-out
          ${isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }
        `}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Panel */}
        <div
          className={`
            absolute bottom-24 right-6
            w-[420px] max-w-[calc(100vw-3rem)]
            ${bg} rounded-2xl border ${bord}
            shadow-2xl shadow-black/40
            flex flex-col overflow-hidden
            transition-all duration-400 ease-out
            ${isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-8 scale-95 opacity-0"
            }
          `}
          style={{ height: "min(580px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className={`px-5 py-4 border-b ${bord} flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className={`font-semibold text-sm ${txt}`}>Assistente AI</p>
                <p className={`text-xs ${muted}`}>{ctx.restaurantName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className={`p-1.5 rounded-lg ${muted} hover:text-red-400 transition-colors`}
                  title="Pulisci chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-lg ${muted} hover:text-white transition-colors`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {cfgLoading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              </div>
            )}

            {!cfgLoading && !aiCfg && (
              <div className={`rounded-xl border ${bord} p-5 text-center space-y-2`}>
                <Sparkles className={`w-8 h-8 mx-auto ${muted}`} />
                <p className={`text-sm font-medium ${txt}`}>Nessun provider AI configurato</p>
                <p className={`text-xs ${muted}`}>Vai in Impostazioni e inserisci una chiave API.</p>
              </div>
            )}

            {!cfgLoading && aiCfg && messages.length === 0 && (
              <div className="space-y-3">
                <p className={`text-xs font-semibold ${muted} uppercase tracking-wider`}>Puoi chiedermi di…</p>
                {[
                  "Elimina tutti i piatti del menu",
                  "Rendi non disponibili tutti i piatti dei Primi",
                  "Cancella gli ordini cancellati",
                  "Mostrami le ultime 5 recensioni",
                  "Aggiungi il piatto Tiramisù a €6,50 nei Dolci",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className={`
                      w-full text-left text-xs px-4 py-3 rounded-xl border ${bord}
                      ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"}
                      transition-colors ${muted} hover:text-purple-400 hover:border-purple-500/30
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`
                  w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                  ${msg.role === "user" ? "bg-purple-500/20" : dark ? "bg-white/8" : "bg-gray-100"}
                `}>
                  {msg.role === "user"
                    ? <User className="w-3.5 h-3.5 text-purple-400" />
                    : <Bot  className="w-3.5 h-3.5 text-green-400" />
                  }
                </div>

                <div className={`
                  max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-3
                  ${msg.role === "user"
                    ? "bg-purple-500 text-white rounded-tr-sm"
                    : `${dark ? "bg-white/5" : "bg-gray-50"} ${txt} rounded-tl-sm border ${bord}`
                  }
                `}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span className={`text-xs ${muted}`}>Elaborazione…</span>
                    </div>
                  ) : (
                    <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                  )}

                  {/* Conferma operazione di scrittura */}
                  {msg.needsConfirm && (
                    <div className="space-y-2 pt-1">
                      <div className={`rounded-lg p-3 border ${dark ? "border-yellow-500/30 bg-yellow-500/10" : "border-yellow-300 bg-yellow-50"} space-y-2`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span className="text-xs font-semibold text-yellow-400">Conferma operazione</span>
                        </div>
                        <p className={`text-xs ${muted}`}>{msg.needsConfirm.description}</p>
                        <pre className={`text-[10px] font-mono p-2 rounded-lg overflow-x-auto ${dark ? "bg-black/30 text-green-400" : "bg-gray-100 text-green-700"}`}>
                          {msg.needsConfirm.sql}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmWrite(msg.id, msg.needsConfirm!.sql)}
                          disabled={busy}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Conferma
                        </button>
                        <button
                          onClick={() => cancelWrite(msg.id)}
                          disabled={busy}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 ${bgSoft} border ${bord} ${muted} hover:text-red-400 text-xs font-medium rounded-lg transition-colors`}
                        >
                          <X className="w-3.5 h-3.5" /> Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!cfgLoading && aiCfg && (
            <div className={`border-t ${bord} p-3 shrink-0`}>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={busy}
                  placeholder="Chiedi qualcosa o dai un comando…"
                  className={`
                    flex-1 px-3 py-2.5 border-2 rounded-xl text-sm outline-none
                    transition-colors resize-none disabled:opacity-50
                    ${dark
                      ? "bg-[#0e0d0b] border-white/10 text-white placeholder-gray-600 focus:border-purple-500"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500"
                    }
                  `}
                  style={{ maxHeight: 80 }}
                />
                <button
                  onClick={() => ask(input)}
                  disabled={busy || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
                >
                  {busy
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Send    className="w-4 h-4 text-white" />
                  }
                </button>
              </div>
              <p className={`text-[10px] ${muted} mt-1.5 text-center`}>
                Invio · Shift+Invio per a capo · Solo dati di {ctx.restaurantName}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}