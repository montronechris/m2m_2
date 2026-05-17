// src/hooks/useOrderSession.ts

import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/useCartStore";
import {
  validateSession,
  getRestaurantBySlug,
  getMenuCategories,
  getMenuItems,
} from "@/lib/api-service";
import { saveTableSession } from "@/lib/table-session";

export function useOrderSession(
  sessionId: string,
  initialSlug: string,
  setContext: (table: string, slug: string, session: string) => void
) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Valida sessione
        const sessionData = await validateSession(sessionId);
        const actualTableNumber = sessionData.tableNumber;
        const actualRestaurantId = sessionData.restaurantId;

        // 2. Salva sessione persistente
        saveTableSession({
          tableCode: sessionId,
          sessionId: sessionId,
          tableNumber: String(actualTableNumber),
          restaurantSlug: initialSlug,
          restaurantId: actualRestaurantId,
        });

        setTableNumber(actualTableNumber);
        setContext(String(actualTableNumber), initialSlug, sessionId);

        // 3. Carica ristorante
        const rest = await getRestaurantBySlug(initialSlug);
        setRestaurant(rest);

        // 4. Carica categorie
        const cats = await getMenuCategories(actualRestaurantId);
        setCategories(cats || []);

        // 5. Carica items
        if (cats && cats.length > 0) {
          const catIds = cats.map((c: any) => c.id);
          const menuItems = await getMenuItems(catIds);
          setItems(
            menuItems.map((item: any) => ({
              ...item,
              allergens: item.allergens || [],
              options: [],
              is_vegetarian: item.is_vegetarian ?? false,
              is_gluten_free: item.is_gluten_free ?? false,
            }))
          );
        }
      } catch (err: any) {
        console.error("💥 Errore:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) loadData();
  }, [sessionId, initialSlug, setContext]);

  return { restaurant, tableNumber, categories, items, loading, error };
}