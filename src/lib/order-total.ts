// src/lib/order-total.ts
//
// Ricalcolo server-side, autoritativo, del totale di un ordine.
//
// Le colonne orders.total_cents e order_items.base_price sono scritte
// direttamente dal client (via REST/api-service.ts) per mostrare un totale
// live nel carrello prima della conferma, quindi NON sono attendibili come
// fonte di verità per il pagamento: un client malevolo può fare PATCH diretto
// su /rest/v1/orders o /rest/v1/order_items con qualunque valore.
//
// Questa funzione ricostruisce il totale reale partendo solo da dati che il
// client non può alterare: order_items.quantity/menu_item_id (identificano
// COSA e QUANTO, non il prezzo) incrociati con menu_items.price_cents e le
// eventuali personalizzazioni con menu_item_option_choices.price_modifier_cents.
// Fallisce chiuso (lancia OrderTotalError) se un articolo, un ristorante o una
// scelta di personalizzazione non risultano coerenti, invece di ripiegare su
// un prezzo controllato dal client.
import type { SupabaseClient } from "@supabase/supabase-js";

export class OrderTotalError extends Error {}

export async function computeAuthoritativeOrderTotal(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string | null
): Promise<number> {
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, menu_item_id, quantity")
    .eq("order_id", orderId);

  if (itemsError) {
    throw new OrderTotalError(itemsError.message);
  }
  if (!items || items.length === 0) {
    return 0;
  }
  if (items.some((i) => !i.menu_item_id)) {
    throw new OrderTotalError("Articolo dell'ordine senza riferimento valido al menu");
  }

  const menuItemIds = [...new Set(items.map((i) => i.menu_item_id as string))];
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, price_cents, restaurant_id")
    .in("id", menuItemIds);

  if (menuError) {
    throw new OrderTotalError(menuError.message);
  }
  const menuItemMap = new Map((menuItems ?? []).map((m) => [m.id as string, m]));

  const orderItemIds = items.map((i) => i.id as string);
  const { data: customizations, error: custError } = await supabase
    .from("order_item_customizations")
    .select("order_item_id, choice_id")
    .in("order_item_id", orderItemIds);

  if (custError) {
    throw new OrderTotalError(custError.message);
  }

  const choiceIds = [...new Set((customizations ?? []).map((c) => c.choice_id).filter(Boolean) as string[])];
  let choiceMap = new Map<string, { price_modifier_cents: number; item_id: string }>();
  if (choiceIds.length > 0) {
    const { data: choices, error: choiceError } = await supabase
      .from("menu_item_option_choices")
      .select("id, price_modifier_cents, menu_item_options!inner(item_id)")
      .in("id", choiceIds);

    if (choiceError) {
      throw new OrderTotalError(choiceError.message);
    }
    choiceMap = new Map(
      (choices ?? []).map((c: any) => [
        c.id as string,
        {
          price_modifier_cents: c.price_modifier_cents ?? 0,
          item_id: c.menu_item_options?.item_id as string,
        },
      ])
    );
  }

  const modifiersByOrderItem = new Map<string, number>();
  for (const c of customizations ?? []) {
    if (!c.choice_id) continue;
    const choice = choiceMap.get(c.choice_id);
    const orderItem = items.find((i) => i.id === c.order_item_id);
    if (!choice || !orderItem || choice.item_id !== orderItem.menu_item_id) {
      throw new OrderTotalError("Personalizzazione non valida per l'articolo dell'ordine");
    }
    const current = modifiersByOrderItem.get(c.order_item_id) ?? 0;
    modifiersByOrderItem.set(c.order_item_id, current + choice.price_modifier_cents);
  }

  let total = 0;
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menu_item_id as string);
    if (!menuItem) {
      throw new OrderTotalError("Articolo del menu non trovato");
    }
    if (restaurantId && menuItem.restaurant_id !== restaurantId) {
      throw new OrderTotalError("Articolo non appartenente a questo ristorante");
    }
    const unitPrice = (menuItem.price_cents ?? 0) + (modifiersByOrderItem.get(item.id) ?? 0);
    total += unitPrice * (item.quantity ?? 1);
  }

  return Math.max(0, total);
}
