// src/lib/notificationSound.ts
// Stato condiviso (mute/unmute) del suono di notifica nuovi ordini.
// Persistito in localStorage e sincronizzato tra componenti via CustomEvent.

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

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctor();
  return sharedAudioCtx;
}

/** Riproduce un doppio beep per notificare un nuovo ordine/piatto, se non mutato. */
export function playNotificationSound(): void {
  if (isNotificationSoundMuted()) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const beepAt = (startOffset: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    const start = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  };

  beepAt(0);
  beepAt(0.25);
}
