// src/lib/invite-code.ts
// Generazione e validazione codici invito.

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I per leggibilità
const CODE_LENGTH = 8;
const PREFIX = "RESTO";
export const DEFAULT_EXPIRY_HOURS = 0.5; // 30 minuti


// ── Generazione ────────────────────────────────────────────────────────────
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  const random = Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
  return `${PREFIX}-${random}`;
}

// ── Scadenza default ───────────────────────────────────────────────────────
export function defaultExpiresAt(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
  //                                              ^^^^
}
// ── Validità ───────────────────────────────────────────────────────────────
export function isCodeExpired(expiresAt: string | Date): boolean {
  const normalized = typeof expiresAt === "string"
    ? (expiresAt.endsWith("Z") || expiresAt.includes("+") ? expiresAt : expiresAt.replace(" ", "T") + "Z")
    : expiresAt;
  return new Date(normalized) < new Date();
}

export function isCodeUsed(usedAt: string | Date | null): boolean {
  return usedAt !== null;
}

// ── Formato ───────────────────────────────────────────────────────────────
export function sanitizeCode(raw: string): string {
  // Normalizza: maiuscolo, rimuove spazi, accetta sia con che senza prefisso
  return raw.trim().toUpperCase();
}