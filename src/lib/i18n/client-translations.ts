// src/lib/i18n/client-translations.ts
//
// Helper condivisi (server + client) per tradurre a runtime SOLO il namespace
// `client` del dizionario, senza cablare le lingue nel codice.
//
// Idea:
//  - collectClientSource()  → gira lato server: percorre `dictionary.it.client`
//    (italiano = lingua sorgente) e produce una mappa piatta `path -> testo`.
//    Le stringhe semplici finiscono come {k:'s'}. Le chiavi-FUNZIONE (es.
//    `(n) => \`${n} recensioni\``) vengono invocate con segnaposto `{0}`,`{1}`…
//    così da estrarne il template traducibile ({k:'f'}). Google preserva i
//    segnaposto numerici (verificato) e ne rispetta anche il riordino.
//  - applyClientTranslations() → gira lato client: applica la mappa tradotta
//    sopra la stessa base, ricostruendo le funzioni a partire dai template.
//    Le foglie non traducibili (simboli, formattatori numerici) restano invariate.
//
// Poiché entrambe le funzioni camminano sulla STESSA struttura di base
// (`dictionary.it.client`), i path combaciano e la forma dell'oggetto risultante
// è identica a quella attesa dalle pagine (le funzioni restano funzioni).

export type LeafKind = "s" | "f";
export interface Leaf {
  k: LeafKind;
  v: string;
}
export type TranslationMap = Record<string, Leaf>;

// Contiene almeno una lettera (Unicode): evita di tradurre simboli/numeri puri.
const HAS_LETTER = /\p{L}/u;
// Verifica presenza di un segnaposto {0}, {1}, … (regex NON globale: niente
// stato di lastIndex tra le chiamate).
const HAS_PLACEHOLDER = /\{\d+\}/;

function joinPath(prefix: string, key: string | number): string {
  return prefix ? `${prefix}.${key}` : String(key);
}

// ── Lato server: raccolta delle stringhe traducibili ────────────────────────
export function collectClientSource(root: unknown): TranslationMap {
  const out: TranslationMap = {};
  walkCollect(root, "", out);
  return out;
}

function walkCollect(node: unknown, path: string, out: TranslationMap): void {
  if (typeof node === "string") {
    if (HAS_LETTER.test(node)) out[path] = { k: "s", v: node };
    return;
  }
  if (typeof node === "function") {
    const arity = Math.max((node as (...a: unknown[]) => unknown).length, 1);
    const args = Array.from({ length: arity }, (_, i) => `{${i}}`);
    try {
      const r = (node as (...a: unknown[]) => unknown)(...args);
      // Traduciamo solo funzioni che producono testo con segnaposto: così
      // saltiamo i formattatori puramente numerici (es. prezzi) che, chiamati
      // con "{0}", darebbero risultati privi di senso.
      if (typeof r === "string" && HAS_PLACEHOLDER.test(r) && HAS_LETTER.test(r)) {
        out[path] = { k: "f", v: r };
      }
    } catch {
      /* funzione con logica non compatibile → si userà la base */
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkCollect(v, joinPath(path, i), out));
    return;
  }
  if (node && typeof node === "object") {
    for (const key of Object.keys(node as Record<string, unknown>)) {
      walkCollect((node as Record<string, unknown>)[key], joinPath(path, key), out);
    }
  }
}

// ── Lato client: applicazione della mappa tradotta sulla base ───────────────
export function applyClientTranslations<T>(base: T, map: TranslationMap): T {
  return buildTranslated(base, "", map) as T;
}

function buildTranslated(node: unknown, path: string, map: TranslationMap): unknown {
  const entry = map[path];

  if (typeof node === "string") {
    return entry && entry.k === "s" ? entry.v : node;
  }
  if (typeof node === "function") {
    if (entry && entry.k === "f") {
      const tmpl = entry.v;
      return (...args: unknown[]) =>
        tmpl.replace(/\{(\d+)\}/g, (_m, i: string) => {
          const a = args[Number(i)];
          return a === undefined || a === null ? "" : String(a);
        });
    }
    return node; // nessun template tradotto → funzione base (fallback)
  }
  if (Array.isArray(node)) {
    return node.map((v, i) => buildTranslated(v, joinPath(path, i), map));
  }
  if (node && typeof node === "object") {
    const o: Record<string, unknown> = {};
    for (const key of Object.keys(node as Record<string, unknown>)) {
      o[key] = buildTranslated((node as Record<string, unknown>)[key], joinPath(path, key), map);
    }
    return o;
  }
  return node;
}
