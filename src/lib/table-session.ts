// src/lib/table-session.ts

export interface TableSession {
  sessionId: string;
  tableCode: string;
  restaurantSlug: string;
  tableNumber?: string;
  restaurantId?: string;
  tableId?: string;
  createdAt: number;
  lastActivity: number;
}

const STORAGE_KEY = "tavolarapida_table_session";
const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;  // 4 ore max assoluto
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minuti di inattività

// ─── Core ────────────────────────────────────────────────────────────────────

export const saveTableSession = (session: Omit<TableSession, "createdAt" | "lastActivity">) => {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const newSession: TableSession = {
      ...session,
      createdAt: now,
      lastActivity: now,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
  } catch (e) {
    console.error("Failed to save table session:", e);
  }
};

export const getTableSession = (): TableSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: TableSession = JSON.parse(stored);
    const now = Date.now();

    const lastActivity = session.lastActivity ?? session.createdAt;
    const isInactive = now - lastActivity > INACTIVITY_TIMEOUT_MS;
    const isExpired  = now - session.createdAt > MAX_SESSION_DURATION_MS;

    if (isInactive || isExpired) {
      clearTableSession();
      return null;
    }

    return session;
  } catch (e) {
    console.error("Failed to parse table session:", e);
    clearTableSession();
    return null;
  }
};

/** Aggiorna il timestamp di ultima attività senza toccare il resto della sessione. */
export const touchSession = (): void => {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const session: TableSession = JSON.parse(stored);
    session.lastActivity = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch { /* silenzioso */ }
};

export const clearTableSession = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear table session:", e);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Restituisce true se esiste una sessione valida (non scaduta) */
export const hasValidSession = (): boolean => {
  return getTableSession() !== null;
};

/** Restituisce il sessionId salvato, o null se scaduto/assente */
export const getSessionId = (): string | null => {
  return getTableSession()?.sessionId ?? null;
};

/** Costruisce l'href del menu a partire dalla sessione salvata */
export const getMenuHref = (): string => {
  const session = getTableSession();
  if (!session) return "/";
  return `/order/${session.sessionId}?slug=${session.restaurantSlug}&table=${session.tableCode}`;
};

/** Costruisce l'href del cart a partire dalla sessione salvata */
export const getCartHref = (): string => {
  const sessionId = getSessionId();
  return sessionId ? `/cart/${sessionId}` : "/";
};