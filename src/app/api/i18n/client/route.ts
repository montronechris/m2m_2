// src/app/api/i18n/client/route.ts
//
// Traduzione a runtime del namespace UI `client` verso una lingua qualsiasi.
// La sorgente è FISSA e controllata dal server (dictionary.it.client): l'unico
// input utente è il codice lingua, validato contro un pattern di locale.
//
// Flusso:
//   1. valida `lang` (locale BCP-47 semplificato) + rate-limit per IP;
//   2. se è una lingua nativa (it/en) → nessuna traduzione, mappa vuota;
//   3. cache-hit su `ui_translations` → restituisce la mappa salvata;
//   4. altrimenti traduce via gtx, salva in cache (best-effort) e restituisce.
//
// La tabella `ui_translations` è accessibile SOLO col service role (RLS attiva,
// nessuna policy pubblica): il segreto non c'è, ma teniamo la superficie minima.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { dictionary } from "@/lib/i18n/dictionary";
import { collectClientSource, type TranslationMap } from "@/lib/i18n/client-translations";
import { translateBatch } from "@/lib/i18n/gtx-translate";
import { hitRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LOCALE_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i;
const NAMESPACE = "client";

// Normalizza il locale per l'endpoint gtx: per la maggior parte basta il
// sottotag primario; il cinese richiede la regione (zh-CN / zh-TW).
function toGoogleTarget(locale: string): string {
  const lower = locale.toLowerCase();
  const primary = lower.split("-")[0];
  if (primary === "zh") return lower.startsWith("zh-tw") ? "zh-TW" : "zh-CN";
  if (primary === "pt") return lower.startsWith("pt-pt") ? "pt-PT" : "pt";
  return primary;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("lang") ?? "").trim();

  if (!LOCALE_RE.test(raw)) {
    return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  }

  const primary = raw.toLowerCase().split("-")[0];
  // Lingue native del dizionario: nessuna traduzione necessaria.
  if (primary === "it" || primary === "en") {
    return NextResponse.json({ map: {}, native: true });
  }

  const rl = hitRateLimit(`i18n-client:${getClientIp(req)}`, 30, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const target = toGoogleTarget(raw);

  // 1) Cache
  try {
    const { data: cached } = await supabaseServer
      .from("ui_translations")
      .select("data")
      .eq("lang", target)
      .eq("namespace", NAMESPACE)
      .maybeSingle();
    if (cached?.data) {
      return NextResponse.json({ map: cached.data, cached: true });
    }
  } catch {
    /* cache non disponibile → si prosegue con la traduzione live */
  }

  // 2) Traduzione
  const source = collectClientSource(dictionary.it.client);
  const paths = Object.keys(source);
  const texts = paths.map((p) => source[p].v);

  let translated: string[];
  try {
    translated = await translateBatch(texts, target, "it");
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }

  const map: TranslationMap = {};
  paths.forEach((p, i) => {
    map[p] = { k: source[p].k, v: translated[i] ?? source[p].v };
  });

  // 3) Salvataggio best-effort (non blocca la risposta in caso di errore)
  try {
    await supabaseServer.from("ui_translations").upsert(
      {
        lang: target,
        namespace: NAMESPACE,
        data: map,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lang,namespace" },
    );
  } catch {
    /* noop */
  }

  return NextResponse.json({ map });
}
