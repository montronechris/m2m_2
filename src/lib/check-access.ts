// src/lib/check-access.ts

/**
 * Stati "ristorante" che indicano un account bloccato a livello di piattaforma
 * (impostato dal site owner, es. per mancato pagamento).
 *
 * NB: 'closed' NON è incluso di proposito: è uno stato self-service temporaneo
 * (il titolare mette il locale "chiuso"/non accetta ordini in questo momento,
 * vedi updateRestaurantStatus) e non deve mai bloccare l'accesso alla dashboard.
 * Il valore realmente usato in produzione per il blocco è 'suspended';
 * 'paused'/'blocked' sono mantenuti per retro/forward-compatibilità.
 */
const BLOCKED_STATUSES = new Set(['suspended', 'deleted', 'paused', 'blocked'])

/**
 * Ristorante DEMO (vetrina pubblica): UNICO account esente dal gate abbonamento.
 *
 * È un singolo UUID hardcoded lato server — NON un flag su DB e NON un valore che
 * arriva dal client — quindi non è impostabile né falsificabile da altri account.
 * Il restaurant_id confrontato in isRestaurantActive proviene sempre da una fonte
 * server-authoritative (requireStaff → profiles.restaurant_id dell'utente loggato,
 * oppure una query RLS-scoped al proprio ristorante), mai dal corpo della richiesta.
 * Per beneficiare dell'esenzione un account dovrebbe avere LETTERALMENTE questo id,
 * impossibile perché l'id è univoco e assegnato in fase di registrazione.
 */
export const DEMO_RESTAURANT_ID = 'de8f0f41-5b5d-48a3-8e98-281deb79412d'

/**
 * Ritorna true se il ristorante può accedere alle aree riservate.
 * È false quando l'account è sospeso dalla piattaforma oppure quando è
 * impostata una scadenza abbonamento (access_expires_at) ormai passata.
 * access_expires_at = null significa "nessuna scadenza" (account legacy/illimitato)
 * e viene considerato ATTIVO.
 */
export function isRestaurantActive(restaurant: {
  id?: string | null
  status?: string | null
  access_expires_at?: string | null
} | null): boolean {
  if (!restaurant) return false
  // Esenzione DEMO (vedi DEMO_RESTAURANT_ID): la vetrina pubblica non ha e non
  // deve avere un abbonamento. Confronto su un unico UUID hardcoded, non abusabile
  // da altri account perché l'id qui è sempre server-authoritative, mai dal client.
  if (restaurant.id === DEMO_RESTAURANT_ID) return true
  if (restaurant.status && BLOCKED_STATUSES.has(restaurant.status)) return false
  if (restaurant.access_expires_at) {
    const expired = new Date(restaurant.access_expires_at).getTime() < Date.now()
    if (expired) return false
  }
  return true
}
