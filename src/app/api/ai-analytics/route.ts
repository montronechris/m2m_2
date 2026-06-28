// src/app/api/ai-analytics/route.ts
//
// Proxy lato server per tutte le chiamate AI.
// Il client manda { provider, apiKey, ...body }
// Questo file normalizza la chiamata verso il provider corretto
// e restituisce sempre { content: [{ type: "text", text: "..." }] }

import { NextRequest, NextResponse } from "next/server";

export type AIProvider = "anthropic" | "openai" | "gemini" | "groq";

// ── Normalizzatori risposta → formato interno { text } ────────────────────────

function extractAnthropic(data: any): string {
  return data?.content?.find((b: any) => b.type === "text")?.text ?? "";
}

function extractOpenAI(data: any): string {
  return data?.choices?.[0]?.message?.content ?? "";
}

function extractGemini(data: any): string {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function extractGroq(data: any): string {
  return data?.choices?.[0]?.message?.content ?? "";
}

// ── Costruttori chiamata per provider ─────────────────────────────────────────

async function callAnthropic(apiKey: string, body: any) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: body.max_tokens ?? 1000,
      system:     body.system,
      messages:   body.messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Errore Anthropic");
  return extractAnthropic(data);
}

async function callOpenAI(apiKey: string, body: any) {
  const messages = [
    ...(body.system ? [{ role: "system", content: body.system }] : []),
    ...(body.messages ?? []),
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:      "gpt-4o-mini",
      max_tokens: body.max_tokens ?? 1000,
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Errore OpenAI");
  return extractOpenAI(data);
}

async function callGemini(apiKey: string, body: any) {
  const parts = body.messages?.map((m: any) => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  })) ?? [];

  const payload: any = { contents: parts };
  if (body.system) {
    payload.systemInstruction = { parts: [{ text: body.system }] };
  }
  payload.generationConfig = { maxOutputTokens: body.max_tokens ?? 1000 };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Errore Gemini");
  return extractGemini(data);
}

async function callGroq(apiKey: string, body: any) {
  const messages = [
    ...(body.system ? [{ role: "system", content: body.system }] : []),
    ...(body.messages ?? []),
  ];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:      "llama-3.3-70b-versatile",
      max_tokens: body.max_tokens ?? 1000,
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Errore Groq");
  return extractGroq(data);
}

// ── Validatori chiave ─────────────────────────────────────────────────────────

const KEY_PREFIXES: Record<AIProvider, string> = {
  anthropic: "sk-ant-",
  openai:    "sk-",
  gemini:    "AIza",
  groq:      "gsk_",
};

function validateKey(provider: AIProvider, key: string): boolean {
  return key.startsWith(KEY_PREFIXES[provider]);
}

// ── Handler principale ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, ...body } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider e chiave API sono obbligatori." },
        { status: 400 }
      );
    }

    if (!validateKey(provider as AIProvider, apiKey)) {
      return NextResponse.json(
        { error: `Chiave API non valida per ${provider}. Controlla le Impostazioni.` },
        { status: 400 }
      );
    }

    let text = "";

    switch (provider as AIProvider) {
      case "anthropic": text = await callAnthropic(apiKey, body); break;
      case "openai":    text = await callOpenAI(apiKey, body);    break;
      case "gemini":    text = await callGemini(apiKey, body);    break;
      case "groq":      text = await callGroq(apiKey, body);      break;
      default:
        return NextResponse.json({ error: "Provider non supportato." }, { status: 400 });
    }

    return NextResponse.json({
      content: [{ type: "text", text }],
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Errore interno del server." },
      { status: 500 }
    );
  }
}