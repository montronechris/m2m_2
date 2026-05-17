// src/lib/api-service.ts

import { supabaseFetch, supabasePost, supabaseHeaders } from "./supabase-client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// === RESTAURANT ===
export const getRestaurantBySlug = async (slug: string) => {
  const rests = await supabaseFetch("restaurants", `?slug=eq.${slug}`);
  if (!rests || rests.length === 0) throw new Error("Ristorante non trovato");
  return rests[0];
};

// === TABLE ===
export const getTableByToken = async (restaurantId: string, token: string) => {
  const encodedToken = encodeURIComponent(token);
  const tables = await supabaseFetch(
    "tables",
    `?restaurant_id=eq.${restaurantId}&qr_payload=eq.${encodedToken}&is_active=eq.true`
  );
  if (!tables || tables.length === 0) {
    throw new Error(`Tavolo "${token}" non disponibile o non attivo`);
  }
  return tables[0];
};

// === MENU ===
export const getMenuCategories = async (restaurantId: string) => {
  return await supabaseFetch(
    "menu_categories",
    `?restaurant_id=eq.${restaurantId}&is_visible=eq.true&order=sort_order.asc`
  );
};

export const getMenuItems = async (categoryIds: string[]) => {
  const allItems = await supabaseFetch("menu_items", `?is_available=eq.true`);
  const catIdsStr = categoryIds.join(",");
  return (allItems || []).filter((item: any) =>
    catIdsStr.includes(item.category_id)
  );
};

// === ORDER ===
export const createOrder = async (orderData: {
  table_id: string;
  restaurant_id: string;
  total_cents: number;
  status: string;
  notes: string;
  ordine: string;
}) => {
  const orders = await supabasePost("orders", orderData);
  return orders[0];
};

export const createOrderItems = async (
  orderId: string,
  items: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price_cents: number;
    customizations: any;
  }>
) => {
  try {
    await supabasePost(
      "order_items",
      items.map((item) => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        customizations: item.customizations ?? {},
      }))
    );
  } catch {
    console.warn("Order items non salvati (controlla RLS Supabase)");
  }
};

// === SESSION ===
export const validateSession = async (sessionId: string) => {
  const res = await fetch(`/api/session/${sessionId}`);
  if (!res.ok) {
    let errMsg = "Sessione non valida o scaduta.";
    try {
      const errData = await res.json();
      errMsg = errData.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return await res.json();
};

export const validateScanToken = async (token: string) => {
  const res = await fetch(`/api/scan/${token}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Token non valido");
  return data;
};