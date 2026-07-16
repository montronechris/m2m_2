// src/app/api/translate-review/route.ts
//
// ─── TRADUZIONE TESTO RECENSIONI (Google Translate) ──────────────────────────
//
// Proxy lato server verso l'endpoint gratuito di Google Translate. Tenerlo
// server-side evita problemi di CORS e nasconde l'URL non ufficiale al client.
// Usato dalla sezione Recensioni (/admin/dashboard) per tradurre il testo libero
// scritto dagli utenti nella lingua scelta. NB: separato da /api/translate, che
// è dedicato ai menu/ingredienti (Groq) e non adatto a testo arbitrario.
// ──────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface TranslateBody {
  q?: string;
  target?: string;
  source?: string;
}

export async function POST(req: Request) {
  let body: TranslateBody;
  try {
    body = (await req.json()) as TranslateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const q = (body.q ?? "").trim();
  const target = (body.target ?? "").trim() || "en";
  const source = (body.source ?? "auto").trim() || "auto";

  if (!q) {
    return NextResponse.json({ error: "Missing text to translate" }, { status: 400 });
  }
  // L'endpoint gtx tronca i testi molto lunghi: fissiamo un limite di sicurezza.
  if (q.length > 5000) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  }

  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}` +
    `&dt=t&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Translation service error (${res.status})` },
        { status: 502 }
      );
    }

    // Formato risposta gtx: [[["tradotto","originale",...], ...], null, "<lingua>", ...]
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return NextResponse.json({ error: "Unexpected translation response" }, { status: 502 });
    }

    const segments = data[0] as unknown[];
    const text = segments
      .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
      .join("");
    const detected = typeof data[2] === "string" ? (data[2] as string) : source;

    return NextResponse.json({ text, source: detected, target });
  } catch {
    return NextResponse.json({ error: "Translation request failed" }, { status: 502 });
  }
}
