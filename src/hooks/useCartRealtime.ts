// src/hooks/useCartRealtime.ts
"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useCartStore } from "@/stores/useCartStore";
import type { CartItemPortata } from "@/stores/useCartStore";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function rowToItem(row: any): CartItemPortata {
  return {
    orderItemId:    row.id,
    menuItemId:     row.menu_item_id,
    name:           row.name_snapshot ?? row.name ?? "",
    priceCents:     Math.round((row.base_price ?? 0) * 100),
    quantity:       row.quantity ?? 1,
    customizations: (row.customizations ?? []),
    note:           row.note ?? "",
    portata:        row.portata ?? 1,
  };
}

/**
 * Sottoscrive Supabase Realtime sulla tabella order_items per l'ordine corrente.
 * Aggiorna lo store locale quando un altro dispositivo modifica il carrello.
 * Da usare nella pagina /order e /cart.
 */
export function useCartRealtime() {
  const orderId = useCartStore((s) => s.orderId);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!orderId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`cart-realtime-${orderId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          const { items } = useCartStore.getState();

          if (eventType === "INSERT") {
            // Salta se è il nostro stesso ottimistic update
            if (items.some((i) => i.orderItemId === newRow.id)) return;
            const item = rowToItem(newRow);
            useCartStore.setState((s) => ({ items: [...s.items, item] }));
          } else if (eventType === "UPDATE") {
            useCartStore.setState((s) => {
              const idx = s.items.findIndex((i) => i.orderItemId === newRow.id);
              if (idx < 0) {
                // Non ce l'abbiamo localmente → aggiungi
                return { items: [...s.items, rowToItem(newRow)] };
              }
              const cur = s.items[idx];
              // Salta se già aggiornato localmente (echo della nostra mutazione)
              if (
                cur.quantity === newRow.quantity &&
                cur.portata === (newRow.portata ?? 1) &&
                cur.note === (newRow.note ?? "")
              ) return s;
              const next = [...s.items];
              next[idx] = {
                ...cur,
                quantity: newRow.quantity ?? cur.quantity,
                portata:  newRow.portata ?? cur.portata,
                note:     newRow.note ?? cur.note,
              };
              return { items: next };
            });
          } else if (eventType === "DELETE") {
            const id = oldRow?.id;
            if (!id) return;
            useCartStore.setState((s) => ({
              items: s.items.filter((i) => i.orderItemId !== id),
            }));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderId]);
}
