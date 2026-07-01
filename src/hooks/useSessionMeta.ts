// src/hooks/useSessionMeta.ts
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getTableSession } from "@/lib/table-session";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SessionMeta = {
  tableNumber: string | null;
  brandColor: string;
  effectiveBrand: string;
  restaurantName: string | null;
};

/**
 * Risolve numero tavolo + colore brand a partire da un sessionId
 * (qr_sessions oppure table_qr_sessions, con fallback su tables).
 *
 * Pensato per essere usato nel layout di (client), così la Navbar
 * resta consistente su tutte le pagine senza ripetere la query
 * in ogni singola page.tsx.
 */
export function useSessionMeta(sessionId: string | undefined): SessionMeta {
  const [tableNumber, setTableNumber] = useState<string | null>(() => {
    if (typeof window === "undefined" || !sessionId) return null;
    try { const c = localStorage.getItem(`table_number_${sessionId}`); return (c && c !== "0") ? c : null; } catch { return null; }
  });
  const [restaurantName, setRestaurantName] = useState<string | null>(() => {
    if (typeof window === "undefined" || !sessionId) return null;
    try { return localStorage.getItem(`restaurant_name_${sessionId}`) || null; } catch { return null; }
  });
  const [brandColor, setBrandColor] = useState<string>(() => {
    if (typeof window === "undefined") return "#ffffff";
    try {
      // 1. Cache specifico per questa sessione (più preciso)
      if (sessionId) {
        const bySession = localStorage.getItem(`brand_color_session_${sessionId}`);
        if (bySession) return bySession;
      }
      // 2. Cache per restaurantId via session cookie
      const sess = getTableSession();
      if (sess?.restaurantId) {
        const byRestaurant = localStorage.getItem(`brand_color_${sess.restaurantId}`);
        if (byRestaurant) return byRestaurant;
      }
    } catch {
      /* ignore */
    }
    return "#ffffff";
  });

  // Ascolta l'evento emesso dalla page quando ha già i dati del ristorante,
  // così non dobbiamo aspettare una seconda query Supabase dal layout.
  useEffect(() => {
    const handler = (e: Event) => {
      const { name, brandColor: color, tableNumber: tn } = (e as CustomEvent<{
        name?: string; brandColor?: string; tableNumber?: string | null
      }>).detail
      if (name) {
        setRestaurantName(name)
        if (sessionId) try { localStorage.setItem(`restaurant_name_${sessionId}`, name) } catch {}
      }
      if (color) {
        setBrandColor(color)
        if (sessionId) try { localStorage.setItem(`brand_color_session_${sessionId}`, color) } catch {}
      }
      if (tn) {
        setTableNumber(tn)
        if (sessionId) try { localStorage.setItem(`table_number_${sessionId}`, tn) } catch {}
      }
    }
    window.addEventListener('restaurant-meta-ready', handler)
    return () => window.removeEventListener('restaurant-meta-ready', handler)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        let restaurantId: string | null = null;
        let resolvedTableNumber: string | null = null;

        const { data: qr } = await supabase
          .from("qr_sessions")
          .select("restaurant_id, table_number, table_id")
          .eq("id", sessionId)
          .maybeSingle();

        if (qr) {
          restaurantId = qr.restaurant_id;
          if (qr.table_id) {
            const { data: table } = await supabase
              .from("tables")
              .select("label")
              .eq("id", qr.table_id)
              .maybeSingle();
            if (table?.label) resolvedTableNumber = table.label;
          }
          if (!resolvedTableNumber && qr.table_number != null && qr.table_number !== 0) {
            resolvedTableNumber = String(qr.table_number);
          }
        } else {
          const { data: tqr } = await supabase
            .from("table_qr_sessions")
            .select("id, restaurant_id, table_number")
            .eq("id", sessionId)
            .maybeSingle();
          if (tqr) {
            restaurantId = tqr.restaurant_id;
            resolvedTableNumber =
              tqr.table_number != null ? String(tqr.table_number) : null;
          }
        }

        if (cancelled) return;
        if (resolvedTableNumber) {
          setTableNumber(resolvedTableNumber);
          try { localStorage.setItem(`table_number_${sessionId}`, resolvedTableNumber); } catch { /* ignore */ }
        }

        if (restaurantId) {
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("brand_color, name")
            .eq("id", restaurantId)
            .maybeSingle();
          if (!cancelled && restaurant) {
            if (restaurant.brand_color) {
              setBrandColor(restaurant.brand_color);
              try {
                localStorage.setItem(`brand_color_${restaurantId}`, restaurant.brand_color);
                localStorage.setItem(`brand_color_session_${sessionId}`, restaurant.brand_color);
              } catch { /* ignore */ }
            }
            if (restaurant.name) {
              setRestaurantName(restaurant.name);
              try { localStorage.setItem(`restaurant_name_${sessionId}`, restaurant.name); } catch { /* ignore */ }
            }
          }
        }
      } catch (err) {
        console.error("[useSessionMeta]", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const effectiveBrand = brandColor === "#ffffff" ? "#2563eb" : brandColor;

  return { tableNumber, brandColor, effectiveBrand, restaurantName };
}
