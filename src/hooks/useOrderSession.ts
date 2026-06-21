// src/hooks/useOrderSession.ts
//
// NOTA: questo hook NON chiama più setContext (rimosso dal nuovo store).
// Espone tableId e restaurantId così la pagina può chiamare initFromDB.

"use client";

import { useEffect, useState } from "react";
import { validateSession, getMenuCategories, getMenuItems } from "@/lib/api-service";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tripadvisor?: string | null;
  website?: string | null;
  google_review_url?: string | null;
};

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_drink: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  price_cents: number;
  category_id: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  description?: string;
  image_url?: string;
};

type OrderSessionResult = {
  restaurant: Restaurant | null;
  tableNumber: string | null;
  tableId: string | null;
  tableCode: string | null;      // token monouso per x-session-token
  restaurantId: string | null;
  categories: Category[];
  items: MenuItem[];
  loading: boolean;
  error: string | null;
};

export function useOrderSession(
  sessionId: string,
  initialSlug: string
): OrderSessionResult {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableCode, setTableCode] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aggiorna last_activity su qr_sessions ogni 5 minuti finché la pagina è aperta.
  // Il timeout reale (15 min) viene controllato in cart/page.tsx sul client.
  useEffect(() => {
    if (!sessionId) return;
    const update = () => {
      fetch(`/api/session/${sessionId}/activity`, { method: "POST" }).catch(() => {});
    };
    update(); // subito al mount
    const interval = setInterval(update, 5 * 60 * 1000); // ogni 5 min
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Valida sessione → ottieni tableId, restaurantId, tableNumber
        const sessionData = await validateSession(sessionId);

        const actualTableNumber = sessionData.tableNumber ?? sessionData.table_number ?? null;
        const actualTableId = sessionData.tableId ?? sessionData.table_id ?? null;
        const actualRestaurantId = sessionData.restaurantId ?? sessionData.restaurant_id ?? null;

        console.log("actualRestaurantId:", actualRestaurantId, "initialSlug:", initialSlug);

        setTableNumber(actualTableNumber);
        setTableId(actualTableId);
        setTableCode(sessionData.tableCode ?? null);
        setRestaurantId(actualRestaurantId);

        // 2. Carica ristorante — priorità all'id dalla sessione,
        //    fallback allo slug solo se presente nell'URL
        const { getRestaurantBySlug } = await import("@/lib/api-service");
        let rest: Restaurant;
        if (actualRestaurantId) {
          // Usiamo Supabase direttamente per evitare dipendenza da getRestaurantById
          const { createBrowserClient } = await import("@supabase/ssr");
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: r, error: rErr } = await supabase
            .from("restaurants")
            .select("id, name, slug, brand_color, logo_url, address, phone, instagram, facebook, tripadvisor, website, google_review_url")
            .eq("id", actualRestaurantId)
            .single();
          if (rErr || !r) throw new Error("Ristorante non trovato");
          rest = r as Restaurant;
        } else if (initialSlug) {
          rest = await getRestaurantBySlug(initialSlug);
        } else {
          throw new Error("Impossibile identificare il ristorante");
        }
        setRestaurant(rest);

        // 3. Carica categorie e piatti (escludi "Non associato" — visibile solo in /admin)
        const allCats = await getMenuCategories(rest.id);
        const cats = allCats.filter(
          (c: { name: string }) => c.name.toLowerCase() !== "non associato"
        );
        setCategories(cats);

        const catIds = cats.map((c: Category) => c.id);
        const menuItems = await getMenuItems(catIds);
        setItems(menuItems);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Errore caricamento sessione";
        console.error("[useOrderSession]", message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId, initialSlug]);

  return {
    restaurant,
    tableNumber,
    tableId,
    tableCode,
    restaurantId,
    categories,
    items,
    loading,
    error,
  };
}