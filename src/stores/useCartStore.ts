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
  updateOrderItemPortata,
  cancelOrder,
  getActivePortataFloor,
  type PendingOrder,
} from "@/lib/api-service";

export type { CartItem, CartCustomization };

/** CartItem esteso con numero di portata */
export type CartItemPortata = CartItem & { portata: number };

type CartState = {
  items:          CartItemPortata[];
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
  /** Portata più alta già in corso/consegnata su un ordine attivo non pagato del tavolo. null = nessun ordine attivo. */
  activePortataFloor: number | null;

  totalCents:     () => number;
  initFromDB:     (tableId: string | null, restaurantId: string | null, restaurantSlug: string, sessionId: string | null) => Promise<void>;
  addItem:        (item: { menuItemId: string; name: string; basePriceCents: number; customizations: CartCustomization[]; portata?: number; is_drink?: boolean; portataLocked?: boolean }) => Promise<void>;
  removeItem:     (orderItemId: string) => Promise<void>;
  updateQuantity: (orderItemId: string, delta: number) => Promise<void>;
  /** Cambia portata di un item. Se qty > 1, splitta: 1 unità va nella nuova portata, il resto rimane. */
  updatePortata:  (orderItemId: string, newPortata: number) => Promise<void>;
  expireCart:     () => Promise<void>;
  updateNote:     (orderItemId: string, note: string) => Promise<void>;
  clearCart:      () => void;
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
  activePortataFloor: null,

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
  undefined,
  sessionId
);
      const rawItems: CartItem[] = await getOrderItems(order.id, sessionId ?? undefined);
      const items: CartItemPortata[] = rawItems.map(i => ({ ...i, portata: i.portata ?? 1 }));
      const activePortataFloor = await getActivePortataFloor(tableId, sessionId ?? undefined);
      // lastActivityAt rimane null finché l'utente non aggiunge/rimuove
      // un piatto nella sessione corrente. NON usiamo updated_at del DB
      // perché verrebbe toccato da altre operazioni e farebbe scadere
      // la sessione appena l'utente riapre la pagina.
      set({ orderId: order.id, items, loading: false, initialized: true, activePortataFloor });
    } catch (err) {
      console.error("[CartStore] initFromDB failed:", err);
      set({ loading: false, initialized: true });
    }
  },

  // ── ADD ───────────────────────────────────────────────────────────────────
  addItem: async ({ menuItemId, name, basePriceCents, customizations, portata = 1, is_drink = false, portataLocked = false }) => {
    // Le bevande sono escluse dalla sequenza delle portate di cibo: portata
    // fissa a 0, mai spostate in avanti dal floor delle portate già servite.
    if (is_drink) portata = 0;
    const { orderId, tableId, restaurantId } = get();

    // ── Fast path: il piatto esiste già identico in carrello ──────────────
    // Qui basta un +1 di quantity su una riga che già conosciamo: niente
    // bisogno di aspettare la rete prima di aggiornare la UI, esattamente
    // come fa updateQuantity per il "-". Aggiorniamo lo state SUBITO,
    // poi sincronizziamo col DB in background.
    const existingBeforeIdx = get().items.findIndex(
      (i) => i.menuItemId === menuItemId &&
             JSON.stringify(i.customizations) === JSON.stringify(customizations) &&
             i.portata === portata &&
             !i.portataLocked && !portataLocked
    );

    if (existingBeforeIdx >= 0 && orderId) {
      const existing = get().items[existingBeforeIdx];
      const newQty = existing.quantity + 1;
      set((state) => ({
        items: state.items.map((i) =>
          i.orderItemId === existing.orderItemId ? { ...i, quantity: newQty } : i
        ),
        ...touch(),
      }));
      try {
        await updateOrderItemQuantity(existing.orderItemId!, orderId, newQty, get().sessionId ?? undefined);
      } catch (err) {
        console.error("[CartStore] addItem (increment existing) failed:", err);
        // rollback: rileggi lo stato reale dal DB
        try {
          const restored = await getOrderItems(orderId);
          set({ items: restored.map(i => ({ ...i, portata: (i as CartItemPortata).portata ?? 1 })) });
        } catch {}
      }
      return;
    }

    // ── Slow path: piatto nuovo, serve creare la riga nel DB ──────────────
    const extraCents     = customizations.reduce((sum, c) => sum + (c.priceModifierCents ?? 0), 0);
    const totalItemCents = basePriceCents + extraCents;

    let activeOrderId = orderId;
    if (!activeOrderId) {
      try {
        const order  = await getOrCreatePendingOrder(tableId, restaurantId, get().sessionId ?? undefined, get().sessionId);
        activeOrderId = order.id;
        set({ orderId: activeOrderId });
      } catch (err) {
        console.error("[CartStore] Impossibile creare ordine:", err);
        return;
      }
    }

    // Se il tavolo ha già un ordine con portate GIÀ CONSEGNATE, i nuovi piatti
    // non possono finire lì: partono di default dalla prima portata libera.
    // Restano comunque modificabili — l'utente potrà spostarli su qualsiasi
    // altra portata non ancora consegnata. Solo i piatti aggiunti dalla card
    // upsell (portataLocked passato esplicitamente a true) restano fissi.
    let effectivePortata = portata;
    const effectivePortataLocked = portataLocked;
    if (!is_drink) {
      try {
        const floor = await getActivePortataFloor(tableId, get().sessionId ?? undefined);
        if (floor != null) {
          set({ activePortataFloor: floor });
          if (!portataLocked) effectivePortata = Math.max(portata, floor + 1);
        }
      } catch (err) {
        console.error("[CartStore] getActivePortataFloor failed:", err);
      }
    }

    // Ricontrolla (con effectivePortata aggiornata dal floor) se nel frattempo
    // esiste già una riga corrispondente — evita comunque duplicati nel caso
    // raro in cui la portata effettiva cambi rispetto a quella richiesta.
    const existingAfterFloorIdx = get().items.findIndex(
      (i) => i.menuItemId === menuItemId &&
             JSON.stringify(i.customizations) === JSON.stringify(customizations) &&
             i.portata === effectivePortata &&
             !i.portataLocked && !effectivePortataLocked
    );
    if (existingAfterFloorIdx >= 0) {
      const existing = get().items[existingAfterFloorIdx];
      const newQty = existing.quantity + 1;
      set((state) => ({
        items: state.items.map((i) =>
          i.orderItemId === existing.orderItemId ? { ...i, quantity: newQty } : i
        ),
        ...touch(),
      }));
      try {
        await updateOrderItemQuantity(existing.orderItemId!, activeOrderId, newQty, get().sessionId ?? undefined);
      } catch (err) {
        console.error("[CartStore] addItem (increment existing) failed:", err);
        try {
          const restored = await getOrderItems(activeOrderId);
          set({ items: restored.map(i => ({ ...i, portata: (i as CartItemPortata).portata ?? 1 })) });
        } catch {}
      }
      return;
    }

    try {
      const newOrderItemId = await addItemToOrder(activeOrderId, {
        menuItemId, name, priceCents: totalItemCents, quantity: 1, customizations, portata: effectivePortata, is_drink, portataLocked: effectivePortataLocked,
      }, get().sessionId ?? undefined);

      const newItem: CartItemPortata = {
        orderItemId: newOrderItemId, menuItemId, name,
        priceCents: totalItemCents, quantity: 1, customizations,
        portata: effectivePortata, portataLocked: effectivePortataLocked,
      };

      set((state) => {
        // Il realtime WebSocket può arrivare prima della HTTP response e aggiungere
        // l'item prima di noi — in quel caso lo saltiamo per evitare duplicati.
        if (state.items.some((i) => i.orderItemId === newOrderItemId)) return state;
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
        set({ items: restored.map(i => ({ ...i, portata: (i as CartItemPortata).portata ?? 1 })) });
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
        set({ items: restored.map(i => ({ ...i, portata: (i as CartItemPortata).portata ?? 1 })) });
      }
    }
  },

  // ── UPDATE PORTATA ────────────────────────────────────────────────────────
  // Se qty === 1 → cambia portata direttamente (merge se esiste già un item uguale nella portata target)
  // Se qty > 1  → splitta: 1 unità va nella nuova portata, il resto rimane
  updatePortata: async (orderItemId: string, newPortata: number) => {
    const { items, orderId } = get();
    const item = items.find((i) => i.orderItemId === orderItemId);
    if (!item || item.portata === newPortata || item.portataLocked) return;

    const customKey = JSON.stringify(item.customizations);

    // Cerca se nella portata target esiste già lo stesso piatto+customizations
    const targetIdx = items.findIndex(
      (i) => i.orderItemId !== orderItemId &&
             i.menuItemId === item.menuItemId &&
             JSON.stringify(i.customizations) === customKey &&
             i.portata === newPortata
    );

    if (item.quantity === 1) {
      // Qty 1: sposta intero
      if (targetIdx >= 0) {
        // Merge nel target: +1 qty al target, rimuovi il corrente
        const updated = items
          .filter((i) => i.orderItemId !== orderItemId)
          .map((i, idx) =>
            // idx nel nuovo array non corrisponde, usiamo orderItemId
            i.orderItemId === items[targetIdx].orderItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        set({ items: updated, ...touch() });
        // Sync DB: aggiorna qty target + rimuovi vecchio
        if (orderId) {
          try {
            await updateOrderItemQuantity(items[targetIdx].orderItemId!, orderId, items[targetIdx].quantity + 1, get().sessionId ?? undefined);
            await removeOrderItem(orderItemId, orderId, get().sessionId ?? undefined);
          } catch (err) { console.error("[CartStore] updatePortata merge failed:", err); }
        }
      } else {
        // Nessun merge: cambia solo portata
        set({
          items: items.map((i) => i.orderItemId === orderItemId ? { ...i, portata: newPortata } : i),
          ...touch(),
        });
        if (orderId) {
          try {
            await updateOrderItemPortata(orderItemId, newPortata, get().sessionId ?? undefined);
          } catch (err) { console.error("[CartStore] updatePortata DB sync failed:", err); }
        }
      }
    } else {
      // Qty > 1: splitta — decrementa corrente di 1, crea/incrementa nella target portata
      const decremented = items.map((i) =>
        i.orderItemId === orderItemId ? { ...i, quantity: i.quantity - 1 } : i
      );

      if (targetIdx >= 0) {
        // Merge split nel target esistente
        const updated = decremented.map((i) =>
          i.orderItemId === items[targetIdx].orderItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
        set({ items: updated, ...touch() });
        if (orderId) {
          try {
            await updateOrderItemQuantity(orderItemId, orderId, item.quantity - 1, get().sessionId ?? undefined);
            await updateOrderItemQuantity(items[targetIdx].orderItemId!, orderId, items[targetIdx].quantity + 1, get().sessionId ?? undefined);
          } catch (err) { console.error("[CartStore] updatePortata split-merge failed:", err); }
        }
      } else {
        // Crea nuova entry nella portata target
        try {
          const newOrderItemId = await addItemToOrder(orderId!, {
            menuItemId: item.menuItemId, name: item.name,
            priceCents: item.priceCents, quantity: 1,
            customizations: item.customizations,
            portata: newPortata,
          }, get().sessionId ?? undefined);

          const newEntry: CartItemPortata = {
            ...item, orderItemId: newOrderItemId, quantity: 1, portata: newPortata,
          };
          set({ items: [...decremented, newEntry], ...touch() });

          if (orderId) {
            await updateOrderItemQuantity(orderItemId, orderId, item.quantity - 1, get().sessionId ?? undefined);
          }
        } catch (err) { console.error("[CartStore] updatePortata split-new failed:", err); }
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
  // Oltre a cancellare l'ordine in sospeso, chiude anche la qr_session lato
  // server: senza questo, il sessionId scaduto resterebbe comunque valido e
  // permetterebbe di rientrare nel menu senza riscansionare il QR code.
  expireCart: async () => {
    const { orderId, sessionId } = get();
    if (orderId) {
      try {
        await cancelOrder(orderId, sessionId ?? undefined); // PATCH status → 'cancelled' + DELETE order_items
      } catch (err) {
        console.error("[CartStore] expireCart failed:", err);
      }
    }
    if (sessionId) {
      fetch(`/api/session/${sessionId}/close`, { method: "POST" }).catch(() => {});
    }
    set({ items: [], orderId: null, lastActivityAt: null, initialized: false });
  },

  // ── CLEAR (locale, senza toccare il DB) ──────────────────────────────────
  clearCart: () => set({ items: [], orderId: null, lastActivityAt: null, initialized: false }),
}));