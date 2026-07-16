// src/lib/i18n/gtx-translate.ts
//
// Traduttore batch server-side basato sull'endpoint gratuito `gtx` di Google
// (lo stesso usato da /api/translate-review). Pensato per tradurre UNA VOLTA il
// namespace UI di una lingua e poi metterlo in cache: il volume di chiamate è
// minimo, quindi l'endpoint non ufficiale è adeguato.
//
// Batching: le stringhe vengono unite con "\n" e tradotte in blocco; Google
// preserva le andate a capo, quindi lo split per "\n" ricostruisce esattamente
// N risultati (verificato). Le stringhe che contengono già "\n" vengono isolate
// per non falsare il conteggio.

const GTX_URL = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK_CHARS = 4000; // sotto il limite dell'endpoint gtx

async function gtxTranslateOne(q: string, target: string, source: string): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: source,
    tl: target,
    dt: "t",
    q,
  });
  const res = await fetch(`${GTX_URL}?${params.toString()}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("gtx: unexpected response");
  }
  return (data[0] as unknown[])
    .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
    .join("");
}

// Raggruppa gli indici in blocchi di dimensione controllata; isola le stringhe
// multilinea (che romperebbero lo split per "\n").
function groupIndices(texts: string[]): number[][] {
  const groups: number[][] = [];
  let cur: number[] = [];
  let curLen = 0;

  const flush = () => {
    if (cur.length) groups.push(cur);
    cur = [];
    curLen = 0;
  };

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (t.includes("\n") || t.length >= MAX_CHUNK_CHARS) {
      flush();
      groups.push([i]);
      continue;
    }
    if (curLen + t.length + 1 > MAX_CHUNK_CHARS && cur.length) flush();
    cur.push(i);
    curLen += t.length + 1;
  }
  flush();
  return groups;
}

/**
 * Traduce un array di stringhe restituendo un array di pari lunghezza.
 * In caso di errore su un blocco, ripiega sulla traduzione singola e, come
 * ultima risorsa, sul testo originale (mai un buco nell'array).
 */
export async function translateBatch(
  texts: string[],
  target: string,
  source = "it",
): Promise<string[]> {
  const out = new Array<string>(texts.length);
  const groups = groupIndices(texts);

  for (const group of groups) {
    const joined = group.map((i) => texts[i]).join("\n");
    try {
      const translated = await gtxTranslateOne(joined, target, source);
      const parts = translated.split("\n");
      if (parts.length === group.length) {
        group.forEach((idx, k) => (out[idx] = parts[k]));
        continue;
      }
      // Conteggio non allineato → fallback per singola stringa.
      throw new Error("segment count mismatch");
    } catch {
      for (const idx of group) {
        try {
          out[idx] = await gtxTranslateOne(texts[idx], target, source);
        } catch {
          out[idx] = texts[idx];
        }
      }
    }
  }
  return out;
}
