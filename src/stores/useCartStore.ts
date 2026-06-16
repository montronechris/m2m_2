// src/stores/useCartStore.ts
import { create } from "zustand";
import type { CartItem, CartCustomization } from "@/lib/api-service";
import {
  getOrCreatePendingOrder,
  addItemToOrder,
  getOrderItems,
  removeOrderItem,
  updateOrderItemQuantity,
  updateOrderItemNote,
  cancelOrder,
  type PendingOrder,
} from "@/lib/api-service";

export type { CartItem, CartCustomization };

type CartState = {
  items:          CartItem[];
  orderId:        string | null;
  tableId:        string | null;
  restaurantId:   string | null;
  restaurantSlug: string | null;
  sessionId:      string | null;
  loading:        boolean;
  /** true dopo che initFromDB ha completato (con successo o errore) almeno una volta. */
  initialized:    boolean;
  /** Epoch ms dell'ultima mutazione. null = nessuna attività ancora. */
  lastActivityAt: number | null;

  totalCents:   () => number;
  initFromDB:   (tableId: string | null, restaurantId: string | null, restaurantSlug: string, sessionId: string | null) => Promise<void>;
  addItem:      (item: { menuItemId: string; name: string; basePriceCents: number; customizations: CartCustomization[] }) => Promise<void>;
  removeItem:   (orderItemId: string) => Promise<void>;
  updateQuantity:(orderItemId: string, delta: number) => Promise<void>;
  expireCart:    () => Promise<void>;
  updateNote:    (orderItemId: string, note: string) => Promise<void>;
  clearCart:     () => void;
};

/** Aggiorna lastActivityAt ad ogni mutazione del carrello */
const touch = () => ({ lastActivityAt: Date.now() });

export const useCartStore = create<CartState>()((set, get) => ({
  items:          [],
  orderId:        null,
  tableId:        null,
  restaurantId:   null,
  restaurantSlug: null,
  sessionId:      null,
  loading:        false,
  initialized:    false,
  lastActivityAt: null,

  totalCents: () =>
    get().items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),

  // ── INIT ──────────────────────────────────────────────────────────────────
  initFromDB: async (tableId, restaurantId, restaurantSlug, sessionId: string | null) => {
    const state = get();
    // Evita re-init se già fatto per questa stessa sessione (es. navigazione cart ↔ order)
    if (state.initialized && state.sessionId === sessionId && !state.loading) return;
    set({ loading: true, tableId, restaurantId, restaurantSlug, sessionId });
    try {
      const order: PendingOrder = await getOrCreatePendingOrder(
  tableId,
  restaurantId,
  sessionId ?? undefined  // ✅ converte null → undefined
);
      const items: CartItem[]   = await getOrderItems(order.id, sessionId ?? undefined);
      // lastActivityAt rimane null finché l'utente non aggiunge/rimuove
      // un piatto nella sessione corrente. NON usiamo updated_at del DB
      // perché verrebbe toccato da altre operazioni e farebbe scadere
      // la sessione appena l'utente riapre la pagina.
      set({ orderId: order.id, items, loading: false, initialized: true });
    } catch (err) {
      console.error("[CartStore] initFromDB failed:", err);
      set({ loading: false, initialized: true });
    }
  },

  // ── ADD ───────────────────────────────────────────────────────────────────
  addItem: async ({ menuItemId, name, basePriceCents, customizations }) => {
    const { orderId, tableId, restaurantId } = get();
    const extraCents     = customizations.reduce((sum, c) => sum + (c.priceModifierCents ?? 0), 0);
    const totalItemCents = basePriceCents + extraCents;

    let activeOrderId = orderId;
    if (!activeOrderId) {
      try {
        const order  = await getOrCreatePendingOrder(tableId, restaurantId, get().sessionId ?? undefined);
        activeOrderId = order.id;
        set({ orderId: activeOrderId });
      } catch (err) {
        console.error("[CartStore] Impossibile creare ordine:", err);
        return;
      }
    }

    try {
        console.log("[addItem] orderId:", activeOrderId, "sessionId:", get().sessionId); // ← aggiungi
      const newOrderItemId = await addItemToOrder(activeOrderId, {
        menuItemId, name, priceCents: totalItemCents, quantity: 1, customizations,
      }, get().sessionId ?? undefined);

      const newItem: CartItem = {
        orderItemId: newOrderItemId, menuItemId, name,
        priceCents: totalItemCents, quantity: 1, customizations,
      };

      set((state) => {
        const existingIdx = state.items.findIndex(
          (i) => i.menuItemId === menuItemId &&
                 JSON.stringify(i.customizations) === JSON.stringify(customizations)
        );
        if (existingIdx >= 0) {
          const updated = [...state.items];
          updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
          return { items: updated, ...touch() };
        }
        return { items: [...state.items, newItem], ...touch() };
      });
    } catch (err) {
      console.error("[CartStore] addItem failed:", err);
    }
  },

  // ── REMOVE ────────────────────────────────────────────────────────────────
  removeItem: async (orderItemId: string) => {
    const { orderId, items } = get();
    set({ items: items.filter((i) => i.orderItemId !== orderItemId), ...touch() });
    if (orderId && orderItemId) {
      try {
        await removeOrderItem(orderItemId, orderId, get().sessionId ?? undefined);
      } catch (err) {
        console.error("[CartStore] removeItem failed:", err);
        const restored = await getOrderItems(orderId);
        set({ items: restored });
      }
    }
  },

  // ── UPDATE QTY ────────────────────────────────────────────────────────────
  updateQuantity: async (orderItemId: string, delta: number) => {
    const { orderId, items } = get();
    const item   = items.find((i) => i.orderItemId === orderItemId);
    if (!item) return;
    const newQty = item.quantity + delta;

    if (newQty <= 0) { await get().removeItem(orderItemId); return; }

    set({
      items: items.map((i) => i.orderItemId === orderItemId ? { ...i, quantity: newQty } : i),
      ...touch(),
    });

    if (orderId && orderItemId) {
      try {
        await updateOrderItemQuantity(orderItemId, orderId, newQty, get().sessionId ?? undefined);
      } catch (err) {
        console.error("[CartStore] updateQuantity failed:", err);
        const restored = await getOrderItems(orderId);
        set({ items: restored });
      }
    }
  },

  // ── NOTE ─────────────────────────────────────────────────────────────────
  updateNote: async (orderItemId: string, note: string) => {
    // Aggiorna subito in locale
    set((state) => ({
      items: state.items.map((i) =>
        i.orderItemId === orderItemId ? { ...i, note } : i
      ),
    }));
    try {
      await updateOrderItemNote(orderItemId, note, get().sessionId ?? undefined);
    } catch (err) {
      console.error("[CartStore] updateNote failed:", err);
    }
  },

  // ── EXPIRE (chiamato da useCartExpiry dopo 15min di inattività) ───────────
  expireCart: async () => {
    const { orderId } = get();
    if (orderId) {
      try {
        await cancelOrder(orderId, get().sessionId ?? undefined); // PATCH status → 'cancelled' + DELETE order_items
      } catch (err) {
        console.error("[CartStore] expireCart failed:", err);
      }
    }
    set({ items: [], orderId: null, lastActivityAt: null, initialized: false });
  },

  // ── CLEAR (locale, senza toccare il DB) ──────────────────────────────────
  clearCart: () => set({ items: [], orderId: null, lastActivityAt: null }),
}));