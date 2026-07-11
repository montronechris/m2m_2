// Segnala al layout client di nascondere la navbar restando sulla stessa route
// (es. card "carrello vuoto" in /confirm, "nessun ordine" in /status).
//
// Usa un CustomEvent + una variabile globale su window come "ultimo valore noto":
// gli effect dei figli girano PRIMA di quelli del layout (ordine bottom-up di
// React), quindi il primo dispatch in mount arriverebbe prima che il layout
// abbia registrato il listener e andrebbe perso. Il layout, appena si registra,
// rilegge il valore globale per recuperare lo stato che si è perso.
const EVENT_NAME = "end-screen-active";

export function setEndScreenActive(active: boolean) {
  if (typeof window === "undefined") return;
  (window as unknown as { __endScreenActive?: boolean }).__endScreenActive = active;
  window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: active }));
}

export function getEndScreenActive(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { __endScreenActive?: boolean }).__endScreenActive;
}

export function subscribeEndScreenActive(cb: (active: boolean) => void): () => void {
  const handler = (e: Event) => cb(!!(e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
