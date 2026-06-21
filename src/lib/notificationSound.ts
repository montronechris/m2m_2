// src/lib/notificationSound.ts
// Stato condiviso (mute/unmute) del suono di notifica nuovi ordini.
// Persistito in localStorage e sincronizzato tra componenti via CustomEvent,
// così la topbar (bottone campanella) e le sezioni ordini restano coerenti
// senza bisogno di un Context dedicato.

const STORAGE_KEY = "notif_sound_muted";
const EVENT_NAME = "notif-sound-mute-change";

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: muted }));
}

export function subscribeNotificationSoundMuted(
  callback: (muted: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => callback((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
