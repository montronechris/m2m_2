// src/hooks/useSessionMeta.ts
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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
    try { return localStorage.getItem(`table_number_${sessionId}`) || null; } catch { return null; }
  });
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string>(() => {
    if (typeof window === "undefined") return "#ffffff";
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("brand_color_")
      );
      if (keys.length === 1) return localStorage.getItem(keys[0]) || "#ffffff";
    } catch {
      /* ignore */
    }
    return "#ffffff";
  });

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
          if (!resolvedTableNumber && qr.table_number != null) {
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
            if (restaurant.brand_color) setBrandColor(restaurant.brand_color);
            if (restaurant.name) setRestaurantName(restaurant.name);
            try {
              localStorage.setItem(
                `brand_color_${restaurantId}`,
                restaurant.brand_color
              );
            } catch {
              /* ignore */
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
