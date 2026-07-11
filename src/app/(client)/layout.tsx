// src/app/(client)/layout.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { CallWaiterButton } from "@/components/layout/CallWaiterButton";
import { ChatWidget } from "@/components/landing/ChatWidget";
import { useSessionMeta } from "@/hooks/useSessionMeta";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { clearTableSession } from "@/lib/table-session";
import { useCartStore } from "@/stores/useCartStore";
import { getEndScreenActive, subscribeEndScreenActive } from "@/lib/end-screen-signal";

const HIDDEN_NAVBAR_SEGMENTS = ["cart", "scan"];

/**
 * Estrae il sessionId direttamente dal pathname, senza dipendere da useParams().
 *
 * Tutte le route che usano questo layout hanno il sessionId come
 * SECONDO segmento del path:
 *   /order/[token]       → segments[1]
 *   /status/[sessionId]  → segments[1]
 *   /confirm/[sessionId] → segments[1]
 *   /cart/[sessionId]    → segments[1]
 *
 * Leggere il pathname è sincrono e stabile: non cambia mai a metà
 * transizione come useParams(), quindi il layout non vede mai undefined.
 */
function extractSessionId(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  // Il sessionId è sempre il secondo segmento (indice 1)
  return segments[1] ?? undefined;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const firstSegment = segments[0] ?? "";

  // La schermata di fine ordine (showEndScreen in /status) o le card "vuote"
  // (es. carrello vuoto in /confirm, nessun ordine in /status) nascondono la
  // navbar pur restando sulla stessa route: la pagina lo segnala via
  // setEndScreenActive() perché il layout non ha visibilità sullo stato
  // interno del componente. getEndScreenActive() recupera il valore se il
  // dispatch dei figli (che girano prima del layout, ordine bottom-up di
  // React) è avvenuto prima che questo listener fosse registrato.
  const [endScreenActive, setEndScreenActive] = useState(getEndScreenActive);
  useEffect(() => {
    setEndScreenActive(getEndScreenActive());
    return subscribeEndScreenActive(setEndScreenActive);
  }, []);

  const hideNavbar = HIDDEN_NAVBAR_SEGMENTS.includes(firstSegment) || endScreenActive;
  const isOrderPage =
    firstSegment === "order" ||
    firstSegment === "status" ||
    firstSegment === "confirm";
  const isCartPage = firstSegment === "cart";
  const isScanPage = firstSegment === "scan";

  // Legge il sessionId SOLO dal pathname — mai da useParams() —
  // così è sempre disponibile e stabile durante ogni navigazione client-side.
  const rawSessionId = extractSessionId(pathname ?? "");

  // Ref per mantenere l'ultimo valore valido: se per qualsiasi ragione
  // rawSessionId fosse undefined per un frame, si usa il precedente.
  const sessionIdRef = useRef<string | undefined>(rawSessionId);
  if (rawSessionId) sessionIdRef.current = rawSessionId;
  const sessionId = sessionIdRef.current;

  const { tableNumber, effectiveBrand, restaurantName } = useSessionMeta(sessionId);
  const router = useRouter();
  const expireCart = useCartStore(s => s.expireCart);

  // Scadenza per inattività: svuota il carrello nel DB, pulisce la sessione e reindirizza
  useInactivityTimeout(async () => {
    try { await expireCart(); } catch { /* silenzioso */ }
    clearTableSession();
    router.replace("/");
  });

  const [waiterTrigger, setWaiterTrigger] = useState(0);
  const [waiterStatus, setWaiterStatus] = useState<'idle' | 'pending' | 'acknowledged'>('idle');
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    const handler = () => { setChatOpen(true); setTimeout(() => setChatOpen(false), 100); };
    window.addEventListener('open-chat', handler);
    return () => window.removeEventListener('open-chat', handler);
  }, []);

  useEffect(() => {
    const handler = () => setWaiterTrigger((n) => n + 1);
    window.addEventListener('call-waiter', handler);
    return () => window.removeEventListener('call-waiter', handler);
  }, []);

  return (
    <>
      {!hideNavbar && (
        <Navbar
          tableNumber={tableNumber}
          sessionId={sessionId ?? ""}
          brandColor={effectiveBrand}
          restaurantName={restaurantName}
          onCallWaiter={
            isOrderPage ? () => setWaiterTrigger((n) => n + 1) : undefined
          }
          onOpenChat={
            isOrderPage
              ? () => {
                  setChatOpen(true);
                  setTimeout(() => setChatOpen(false), 100);
                }
              : undefined
          }
        />
      )}
      {!isScanPage && (
        <CallWaiterButton
          sessionId={sessionId}
          tableNumber={tableNumber}
          hideFloatingButton={isOrderPage}
          externalTrigger={waiterTrigger}
          onStatusChange={(s) => {
            setWaiterStatus(s);
            window.dispatchEvent(new CustomEvent('waiter-status', { detail: s }));
          }}
          inlineStyle={isCartPage}
        />
      )}
      <ChatWidget
        brandColor={effectiveBrand}
        hideFloatingButton
        externalOpen={chatOpen}
      />

      {children}
    </>
  );
}