// src/lib/rate-limit.ts
//
// Rate limiter in-memory (fixed window) per proteggere endpoint sensibili come
// il login dal brute-force. Semplice e senza dipendenze: adatto a un singolo
// processo Node. In un deploy multi-istanza andrebbe sostituito con uno store
// condiviso (es. Redis / Upstash), ma per questo caso è sufficiente.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms in cui la finestra si azzera
}

const buckets = new Map<string, Bucket>();

// Sweep periodico opportunistico per evitare crescita illimitata della Map.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
function maybeSweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Registra un tentativo per `key` e restituisce lo stato del rate limit.
 * Quando i tentativi nella finestra superano `max`, `limited` diventa true.
 */
export function hitRateLimit(
  key: string,
  max = 8,
  windowMs = 15 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: max - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      limited: true,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { limited: false, remaining: max - bucket.count, retryAfterSec: 0 };
}

/** Azzera il contatore per `key` (es. dopo un login riuscito). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Estrae l'IP del client dagli header del proxy (best-effort). */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
