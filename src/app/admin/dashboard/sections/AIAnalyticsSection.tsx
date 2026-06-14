// src/app/admin/dashboard/sections/AIAnalyticsSection.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Sparkles, Send, Loader2, User, Bot, Trash2, KeyRound, ArrowRight,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";
import type { AIProvider } from "./SettingsSection";

interface Props {
  ctx:             RestaurantCtx;
  theme:           ThemeMode;
  onSectionChange?: (s: string) => void;
}

interface Message {
  id:       string;
  role:     "user" | "assistant";
  content:  string;
  loading?: boolean;
}

interface AICfg {
  provider: AIProvider;
  apiKey:   string;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Claude",
  openai:    "GPT-4o mini",
  gemini:    "Gemini Flash",
  groq:      "Llama 3.3",
};

const SUGGESTED = [
  "Quali sono i piatti più richiesti questa settimana?",
  "A che ora arrivano più ordini di solito?",
  "Com'è andato il fatturato negli ultimi 7 giorni?",
  "Quante recensioni abbiamo ricevuto e qual è la media?",
  "Qual è lo scontrino medio per ordine?",
  "Quali giorni della settimana sono più trafficati?",
];

const DB_SCHEMA = `
Hai accesso a un database PostgreSQL (Supabase) di un ristorante.
Il restaurant_id corrente è: {{RESTAURANT_ID}}
La data/ora corrente è: {{NOW}}

Tabelle disponibili:

orders (id, restaurant_id, table_id, status, total_cents, created_at, confirmed_at)
  - total_cents: importo in centesimi (dividi per 100 per avere €)
  - status: 'pending' | 'confirmed' | 'cooking' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'expired'
  - 'delivered' NON esiste come status, non usarlo mai
  - per "fatturato" o "ordini totali" usa status NOT IN ('cancelled','expired') — questo è l'UNICO filtro status da usare per il fatturato, NON filtrare per status = 'served'
  - usa "= 'served'" SOLO se l'utente chiede esplicitamente di "ordini serviti/completati e consegnati al tavolo"

order_items (id, order_id, menu_item_id, name_snapshot, name, quantity, base_price)
  - usa SEMPRE name_snapshot per il nome del piatto (il campo "name" è sempre vuoto, NON usarlo)
  - ATTENZIONE: order_items NON ha restaurant_id e NON ha created_at.
    Per filtrare per ristorante e/o data devi SEMPRE fare JOIN con orders:
    JOIN orders o ON o.id = order_items.order_id
    poi WHERE o.restaurant_id = '{{RESTAURANT_ID}}' AND o.created_at >= ...

reviews (id, restaurant_id, stars, text, created_at)
  - stars: da 1 a 5

tables (id, restaurant_id, label)

menu_items (id, restaurant_id, name, price_cents, category_id, is_available)

menu_categories (id, restaurant_id, name)

qr_sessions (id, restaurant_id, table_id, created_at, last_activity)

Esempio — "piatti più richiesti questa settimana":
{
  "sql": "SELECT oi.name_snapshot AS piatto, SUM(oi.quantity) AS totale FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.restaurant_id = '{{RESTAURANT_ID}}' AND o.created_at >= now() - interval '7 days' AND o.status NOT IN ('cancelled','expired') GROUP BY oi.name_snapshot ORDER BY totale DESC LIMIT 10",
  "explanation": "Somma le quantità ordinate per piatto negli ultimi 7 giorni"
}

Il tuo compito:
1. Analizza la domanda dell'utente
2. Scrivi UNA query SQL valida per rispondere
   (usa SEMPRE WHERE restaurant_id = '{{RESTAURANT_ID}}' o un JOIN che lo garantisce)
3. Restituisci SOLO un JSON con questo formato esatto:
{
  "sql": "SELECT ...",
  "explanation": "Breve spiegazione"
}

Regole SQL:
- Filtra SEMPRE per restaurant_id (direttamente o via JOIN con orders/menu_items)
- Per ore: EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Europe/Rome')
- Per giorni: TO_CHAR(o.created_at AT TIME ZONE 'Europe/Rome', 'Day')
- "Questa settimana" / "ultimi 7 giorni" = created_at >= now() - interval '7 days'
- LIMIT 10 o 20 max
- Solo SELECT — mai DROP, DELETE, UPDATE, INSERT, ALTER, CREATE
`.trim();

const ANSWER_PROMPT = `
Sei un assistente analitico per un ristorante italiano, con un tono simpatico e un po' scherzoso — come un collega sveglio.
Hai eseguito una query SQL e ricevuto i risultati.
Vai dritto al punto: prima il dato/la risposta, poi eventualmente un commento o una battuta breve. Niente preamboli, niente "allora vediamo un po'", niente giri di parole.
Rispondi in italiano, frasi corte, con qualche emoji per dare colore.
Se i dati sono vuoti, dillo subito in una riga e proponi un'alternativa.
Non mostrare mai il codice SQL.
`.trim();

export function AIAnalyticsSection({ ctx, theme, onSectionChange }: Props) {
  const dark     = theme === "dark";
  const card     = dark ? "bg-[#13131e]"   : "bg-white";
  const bord     = dark ? "border-white/8" : "border-gray-200";
  const txt      = dark ? "text-white"     : "text-gray-900";
  const muted    = dark ? "text-gray-400"  : "text-gray-500";
  const inputCls = dark
    ? "bg-[#0e0d0b] border-white/10 text-white placeholder-gray-600 focus:border-purple-500"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [busy,       setBusy]       = useState(false);
  const [aiCfg,      setAiCfg]      = useState<AICfg | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Carica provider attivo + chiave da Supabase ──────────────────────────
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

        if (provider && apiKey) {
          setAiCfg({ provider, apiKey });
        } else {
          setAiCfg(null);
        }
      } catch {
        setAiCfg(null);
      } finally {
        setCfgLoading(false);
      }
    };
    load();
  }, [ctx.restaurantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = (msg: Omit<Message, "id">) => {
    const m = { ...msg, id: crypto.randomUUID() };
    setMessages(prev => [...prev, m]);
    return m.id;
  };

  const updateMsg = (id: string, patch: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  // ── Helper: chiama /api/ai-analytics con provider e chiave ───────────────
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

    const text = data?.content?.[0]?.text ?? "";
    if (!text) throw new Error("Risposta vuota dal modello.");
    return text;
  };

  // ── Flusso principale: domanda → SQL → Supabase → risposta ──────────────
  const ask = async (question: string) => {
    if (!question.trim() || busy || !aiCfg) return;
    setBusy(true);
    setInput("");

    addMsg({ role: "user", content: question });
    const thinkingId = addMsg({ role: "assistant", content: "", loading: true });

    try {
      // Step 1: genera query SQL
      const now = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
      const systemSQL = DB_SCHEMA
        .replace(/{{RESTAURANT_ID}}/g, ctx.restaurantId)
        .replace(/{{NOW}}/g, now);

      const sqlText = await callAI(systemSQL, question);

      let sql = "";
      try {
        const match = sqlText.match(/\{[\s\S]*\}/);
        if (match) sql = JSON.parse(match[0]).sql ?? "";
      } catch {
        throw new Error("Impossibile interpretare la query generata.");
      }

      if (!sql.trim().toUpperCase().startsWith("SELECT")) {
        throw new Error("Il modello ha generato una query non valida.");
      }

      // Step 2: esegui su Supabase via RPC, usando il token della sessione
      // autenticata (NON la anon key) → RLS filtra automaticamente per
      // restaurant_id del titolare loggato
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Sessione non valida. Ricarica la pagina e riprova ad accedere.");
      }

      const queryRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_analytics_query`,
        {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "apikey":        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ query: sql }),
        }
      );

      let rows: any[] = [];
      if (queryRes.ok) {
        rows = await queryRes.json();
      } else {
        const err = await queryRes.json().catch(() => ({}));
        throw new Error(err?.message ?? "Errore nell'esecuzione della query.");
      }

      // Step 3: interpreta i risultati
      const answer = await callAI(
        ANSWER_PROMPT,
        `Domanda: "${question}"\n\nRisultati (${rows.length} righe):\n${JSON.stringify(rows, null, 2)}`
      );

      updateMsg(thinkingId, { content: answer, loading: false });

    } catch (e: any) {
      updateMsg(thinkingId, {
        content: `⚠️ ${e.message ?? "Errore durante l'elaborazione."}`,
        loading: false,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (cfgLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  // ── Nessun provider configurato ──────────────────────────────────────────
  if (!aiCfg) {
    return (
      <div className="p-6 max-w-4xl w-full mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${txt}`}>AI Analytics</h2>
            <p className={`text-xs ${muted}`}>Fai domande sui tuoi dati in linguaggio naturale</p>
          </div>
        </div>

        <div className={`${card} rounded-2xl border ${bord} p-8 flex flex-col items-center text-center gap-4`}>
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <p className={`font-semibold ${txt} mb-1`}>Nessun provider AI configurato</p>
            <p className={`text-sm ${muted} max-w-sm`}>
              Vai nelle Impostazioni, inserisci la chiave di almeno un provider
              (Gemini o Groq sono gratuiti) e selezionalo come attivo.
            </p>
          </div>
          {onSectionChange && (
            <button
              onClick={() => onSectionChange("settings")}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Vai alle Impostazioni
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 max-w-4xl w-full mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${txt}`}>AI Analytics</h2>
            <p className={`text-xs ${muted}`}>
              Powered by{" "}
              <span className="text-purple-400 font-medium">
                {PROVIDER_LABELS[aiCfg.provider]}
              </span>
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className={`flex items-center gap-1.5 text-xs ${muted} hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Pulisci chat
          </button>
        )}
      </div>

      {/* CHAT BOX */}
      <div
        className={`${card} rounded-2xl border ${bord} overflow-hidden flex flex-col`}
        style={{ height: 520 }}
      >
        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-4">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-purple-400" />
                </div>
                <p className={`font-semibold ${txt} mb-1`}>Chiedi qualsiasi cosa sui tuoi dati</p>
                <p className={`text-xs ${muted}`}>
                  Analizza ordini, fatturato, piatti e recensioni in linguaggio naturale
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTED.map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className={`text-left text-xs px-4 py-3 rounded-xl border ${bord}
                      ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"}
                      transition-colors ${muted} hover:text-purple-400 hover:border-purple-500/30`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                ${msg.role === "user"
                  ? "bg-purple-500/20"
                  : dark ? "bg-white/8" : "bg-gray-100"
                }`}
              >
                {msg.role === "user"
                  ? <User className="w-4 h-4 text-purple-400" />
                  : <Bot  className="w-4 h-4 text-green-400"  />
                }
              </div>

              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === "user"
                  ? "bg-purple-500 text-white rounded-tr-sm"
                  : `${dark ? "bg-white/5" : "bg-gray-50"} ${txt} rounded-tl-sm border ${bord}`
                }`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className={muted}>Sto analizzando i dati…</span>
                  </div>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={`border-t ${bord} p-4`}>
          <div className="flex gap-3 items-end">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={busy}
              placeholder="es. Quanti ordini abbiamo avuto mercoledì sera?"
              className={`flex-1 px-4 py-2.5 border-2 rounded-xl text-sm outline-none transition-colors resize-none ${inputCls} disabled:opacity-50`}
              style={{ maxHeight: 100 }}
            />
            <button
              onClick={() => ask(input)}
              disabled={busy || !input.trim()}
              className="w-10 h-10 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              {busy
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send    className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          <p className={`text-xs ${muted} mt-2`}>Invio con Enter · Nuova riga con Shift+Enter</p>
        </div>
      </div>
    </div>
  );
}