import { useEffect, useRef } from "react";
import { touchSession, INACTIVITY_TIMEOUT_MS } from "@/lib/table-session";

const ACTIVITY_EVENTS = [
  "touchstart", "touchmove", "click", "keydown", "scroll", "pointerdown",
] as const;

/**
 * Ascolta gli eventi utente, aggiorna lastActivity nel localStorage e,
 * allo scadere del timeout di inattività, invoca onTimeout.
 */
export function useInactivityTimeout(onTimeout: () => void) {
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    const reset = () => {
      touchSession();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onTimeoutRef.current(), INACTIVITY_TIMEOUT_MS);
    };

    // Avvia il timer subito
    reset();

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, []);
}
