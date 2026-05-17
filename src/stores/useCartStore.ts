// src/stores/useCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { saveTableSession, getTableSession } from '@/lib/table-session';

type CartItem = {
  menuItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  customizations?: Record<string, any>;
};

type CartState = {
  items: CartItem[];
  tableId: string | null;
  restaurantSlug: string | null;
  sessionId: string | null;
  
  // Actions
  addItem: (item: Partial<CartItem> & { menuItemId: string }) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  setContext: (tableId: string, restaurantSlug: string, sessionId?: string) => void;
  getTableSession: () => ReturnType<typeof getTableSession>;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      restaurantSlug: null,
      sessionId: null,

      // Getter calcolato per il totale
      get totalCents() {
        return get().items.reduce((sum, item) => {
          const price = typeof item.priceCents === 'number' ? item.priceCents : 0;
          const qty = typeof item.quantity === 'number' ? item.quantity : 1;
          return sum + price * qty;
        }, 0);
      },

      // Salva contesto tavolo/ristorante
      setContext: (tableId, restaurantSlug, sessionId) => {
        // NON sovrascrivere tableCode: viene impostato dalla scan page con il codice QR originale
        saveTableSession({
          sessionId: sessionId || '',
          tableCode: tableId, // ← aggiungi questa riga
          tableNumber: String(tableId),
          restaurantSlug: String(restaurantSlug),
          restaurantId: '',
        });
        set({
          tableId: String(tableId),
          restaurantSlug: String(restaurantSlug),
          sessionId: sessionId || null,
        });
      },

      // Recupera sessione corrente
      getTableSession: () => {
        return getTableSession();
      },

      // ✅ AGGIUNGI ITEM - Normalizza prezzo e gestisce duplicati
      addItem: (newItem) =>
        set((state) => {
          const normalizedPrice =
            typeof newItem.priceCents === 'number'
              ? newItem.priceCents
              : typeof (newItem as any).price_cents === 'number'
              ? (newItem as any).price_cents
              : 0;

          const normalizedItem: CartItem = {
            menuItemId: newItem.menuItemId,
            name: newItem.name || '',
            priceCents: normalizedPrice,
            quantity: typeof newItem.quantity === 'number' ? newItem.quantity : 1,
            customizations: newItem.customizations || {},
          };

          // Cerca item esistente con stesso menuItemId E stesse customizations
          const existingIndex = state.items.findIndex(
            (i) => 
              i.menuItemId === normalizedItem.menuItemId &&
              JSON.stringify(i.customizations) === JSON.stringify(normalizedItem.customizations)
          );

          if (existingIndex >= 0) {
            // Incrementa quantità se esiste già
            const newItems = [...state.items];
            newItems[existingIndex].quantity += normalizedItem.quantity;
            return { items: newItems };
          }

          // Altrimenti aggiungi nuovo item
          return { items: [...state.items, normalizedItem] };
        }),

      // ✅ RIMUOVI ITEM - Usa menuItemId come chiave univoca
      removeItem: (menuItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        })),

      // ✅ AGGIORNA QUANTITÀ - Usa menuItemId come chiave, previene qty < 1
      updateQuantity: (menuItemId, delta) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.menuItemId === menuItemId) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
            }
            return item;
          }),
        })),

      // ✅ SVUOTA CARRELLO
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'tavolarapida-cart-v5',
      partialize: (state) => ({
        items: state.items,
        tableId: state.tableId,
        restaurantSlug: state.restaurantSlug,
        sessionId: state.sessionId,
      }),
    }
  )
);