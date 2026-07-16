// src/lib/admin-service.ts

import { supabase as sharedSupabase } from "@/lib/supabase";

const getSupabase = () => sharedSupabase;

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "staff" | "titolare";

export interface UserProfile {
  id: string;
  restaurant_id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
}

export interface RestaurantData {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  status: string;
  plan: string | null;
  access_expires_at: string | null;
  max_staff: number | null;
  userRole: UserRole;
  userName: string;
  avatarUrl: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price_cents: number;
  customizations: any;
  note?: string | null;
  portata: number;
  is_drink?: boolean;
  portata_completed?: boolean;
  portata_delivered?: boolean;
  prepared_by?: string | null;
  prepared_by_name?: string | null;
  prepared_at?: string | null;
  delivered_by?: string | null;
  delivered_by_name?: string | null;
  delivered_at?: string | null;
  picked_up_by?: string | null;
  picked_up_by_name?: string | null;
  picked_up_at?: string | null;
  menu_items?: {
    name: string;
    price_cents: number;
  };
}

export type PortataState = "in_preparazione" | "pronta" | "consegnata" | "ritirata";

/**
 * Deriva lo stato di una portata dai flag dei suoi item (gli item di una
 * stessa portata vengono sempre aggiornati insieme, quindi basta leggerne uno).
 */
export const getPortataState = (items: OrderItem[]): PortataState => {
  const ref = items[0];
  if (!ref) return "in_preparazione";
  if (ref.picked_up_at) return "ritirata";
  if (ref.portata_delivered) return "consegnata";
  if (ref.portata_completed) return "pronta";
  return "in_preparazione";
};

// NB: lo stato "in preparazione" nel runtime dell'app è "cooking" (usato da
// OrdersSection, WaiterSection, pagina cliente /status, API active-orders e dalle
// policy RLS realtime). "preparing" resta per retro-compatibilità con vecchi record/API.
export type OrderStatus = "pending" | "confirmed" | "cooking" | "preparing" | "ready" | "served" | "delivered" | "cancelled";

export interface Order {
  id: string;
  table_id: string;
  table_code?: string | null;
  restaurant_id: string;
  total_cents: number;
  status: OrderStatus;
  notes: string;
  ordine: string;
  created_at: string;
  cooking_by?: string | null;
  cooking_by_name?: string | null;
  cooking_at?: string | null;
  paid_by?: string | null;
  paid_by_name?: string | null;
  paid_at?: string | null;
  order_items?: OrderItem[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  is_available: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  allergens: string[];
  image_url: string | null;
  created_at: string;
}

export interface Table {
  id: string;
  restaurant_id: string;
  label: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

// ─── Restaurant & Profile ────────────────────────────────────────────────────

/**
 * Recupera ristorante + profilo utente completo (ruolo, nome, cognome)
 */
export const getRestaurantByUser = async (): Promise<RestaurantData> => {
  const res = await fetch("/api/admin/me", { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "Errore caricamento profilo") as Error & {
      status?: number;
    };
    // Propaga lo status HTTP così i chiamanti possono distinguere
    // "sessione assente / profilo mancante" (401/404 Profilo non trovato → /login)
    // da "titolare senza ristorante ancora creato" (404 Ristorante non trovato → /create).
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as RestaurantData;
};

/**
 * ✅ Verifica se l'utente corrente è un Titolare/Admin
 */
export const checkTitolareAccess = async (): Promise<boolean> => {
  try {
    const data = await getRestaurantByUser();
    // Accetta sia 'admin' che 'titolare' per compatibilità
    return data.userRole === "admin" || data.userRole === "titolare";
  } catch {
    return false;
  }
};

/**
 * Aggiorna nome ristorante
 */
export const updateRestaurantName = async (restaurantId: string, name: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("restaurants")
    .update({ name })
    .eq("id", restaurantId);
  if (error) throw error;
};

/**
 * Aggiorna URL logo ristorante
 */
export const updateRestaurantLogo = async (restaurantId: string, logoUrl: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("restaurants")
    .update({ logo_url: logoUrl })
    .eq("id", restaurantId);
  if (error) throw error;
};

/**
 * Upload logo ristorante su Supabase Storage
 */
export const uploadRestaurantLogo = async (file: File, restaurantId: string): Promise<string> => {
  const supabase = getSupabase();
  const fileExt = file.name.split(".").pop();
  const fileName = `${restaurantId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("restaurant-logos")
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("restaurant-logos").getPublicUrl(fileName);
  return data.publicUrl;
};

/**
 * Aggiorna stato ristorante (open/closed)
 */
export const updateRestaurantStatus = async (restaurantId: string, status: "open" | "closed") => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("restaurants")
    .update({ status })
    .eq("id", restaurantId);
  if (error) throw error;
};

// ─── Orders ──────────────────────────────────────────────────────────────────

/**
 * Recupera ordini del ristorante con dettagli piatti.
 * Usa due query separate (orders + order_items) invece della join nested
 * per evitare dipendenze dallo schema cache di Supabase (relationship
 * order_items → menu_items non sempre registrata).
 */
export const getOrders = async (restaurantId: string): Promise<Order[]> => {
  const supabase = getSupabase();

  // 1. Ordini
  const { data: orders, error: ordErr } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (ordErr) throw ordErr;
  if (!orders || orders.length === 0) return [];

  // 1b. Codice tavolo (lo stesso usato per lo scan QR)
  const tableIds = [...new Set(orders.map((o) => o.table_id).filter(Boolean))];
  let tableMap: Record<string, { code: string; label: string }> = {};
  if (tableIds.length > 0) {
    const { data: tables } = await supabase
      .from("tables")
      .select("id, code, label")
      .in("id", tableIds);
    for (const t of tables ?? []) {
      tableMap[t.id] = { code: t.code, label: t.label };
    }
  }

  // 2. Order items per tutti gli ordini (una sola query)
  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select(
      "id, order_id, menu_item_id, quantity, base_price, customizations, name_snapshot, name, note, portata, is_drink, portata_completed, portata_delivered, prepared_at, prepared_by, prepared_by_name, delivered_at, delivered_by, delivered_by_name, picked_up_at, picked_up_by, picked_up_by_name"
    )
    .in("order_id", orderIds);
  if (itemsErr) throw itemsErr;

  // 3. Menu items per i nomi (se servono)
  const menuItemIds = [...new Set((items ?? []).map((i) => i.menu_item_id).filter(Boolean))];
  let menuMap: Record<string, { name: string; price_cents: number }> = {};
  if (menuItemIds.length > 0) {
    const { data: menuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, name, price_cents")
      .in("id", menuItemIds);
    if (!menuErr && menuItems) {
      for (const m of menuItems) {
        menuMap[m.id] = { name: m.name, price_cents: m.price_cents };
      }
    }
  }

  // 4. Assembla gli ordini con i loro items (dal più vecchio al più recente)
  return [...orders].reverse().map((o) => ({
    ...o,
    table_code: tableMap[o.table_id]?.code ?? null,
    order_items: (items ?? [])
      .filter((it) => it.order_id === o.id)
      .map((it) => {
        // risolvi il nome: name_snapshot > name > menu_items.name
        const snapshotName = (it as any).name_snapshot || (it as any).name;
        const menuName = menuMap[(it as any).menu_item_id]?.name;
        const finalName = snapshotName || menuName || "Piatto";
        const price = (it as any).base_price ?? menuMap[(it as any).menu_item_id]?.price_cents ?? 0;
        return {
          ...it,
          unit_price_cents: price,
          menu_items: { name: finalName, price_cents: price },
        };
      }),
  }));
};

/**
 * Aggiorna stato ordine
 */
export const updateOrderStatus = async (
  orderId: string,
  status: Order["status"],
  actorId?: string | null,
  actorName?: string | null
) => {
  const supabase = getSupabase();
  const patch: Record<string, any> = { status };
  // Traccia chi ha avviato la preparazione (cucina).
  if (status === "cooking") {
    patch.cooking_by = actorId ?? null;
    patch.cooking_by_name = actorName ?? null;
    patch.cooking_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId);
  if (error) throw error;
};

/**
 * Cucina: segna come pronta tutta una portata di un ordine.
 */
export const markPortataReady = async (
  orderId: string,
  portata: number,
  profileId?: string | null,
  profileName?: string | null
) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("order_items")
    .update({
      portata_completed: true,
      prepared_by: profileId ?? null,
      prepared_by_name: profileName ?? null,
      prepared_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("portata", portata);
  if (error) throw error;

};

/**
 * Cameriere: segna una portata come consegnata al tavolo.
 */
export const markPortataDelivered = async (orderId: string, portata: number, profileId?: string, profileName?: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("order_items")
    .update({ portata_delivered: true, delivered_at: new Date().toISOString(), delivered_by: profileId ?? null, delivered_by_name: profileName ?? null })
    .eq("order_id", orderId)
    .eq("portata", portata);
  if (error) throw error;

  // NB: l'ordine NON passa a "served" qui, anche se tutte le portate sono
  // consegnate: "served" indica che tutte le portate sono state RITIRATE
  // (vedi markPortataPickedUp). Impostarlo già alla consegna faceva sparire
  // l'ordine dalla lista "da ritirare" del Cameriere prima del ritiro reale.
};

/**
 * Cameriere: segna una portata come ritirata. Se con questo aggiornamento
 * tutte le portate dell'ordine risultano ritirate, l'ordine passa a "served".
 */
export const markPortataPickedUp = async (orderId: string, portata: number, profileId?: string, profileName?: string) => {
  const supabase = getSupabase();
  const { error: itemError } = await supabase
    .from("order_items")
    .update({ picked_up_at: new Date().toISOString(), picked_up_by: profileId ?? null, picked_up_by_name: profileName ?? null })
    .eq("order_id", orderId)
    .eq("portata", portata);
  if (itemError) throw itemError;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("picked_up_at")
    .eq("order_id", orderId);
  if (itemsError) throw itemsError;

  const allPickedUp = (items ?? []).length > 0 && (items ?? []).every((it) => it.picked_up_at !== null);
  if (allPickedUp) {
    const { error: statusError } = await supabase
      .from("orders")
      .update({ status: "served", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .in("status", ["confirmed", "cooking", "ready"]); // non sovrascrivere stati già avanzati
    if (statusError) console.error("[markPortataPickedUp] status→served:", statusError);
  }
};

// ─── Menu Items ──────────────────────────────────────────────────────────────

/**
 * Recupera tutti i piatti del ristorante
 */
export const getMenuItems = async (restaurantId: string): Promise<MenuItem[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Toggle disponibilità piatto
 */
export const toggleMenuItemAvailability = async (itemId: string, available: boolean) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: available })
    .eq("id", itemId);
  if (error) throw error;
};

/**
 * Crea nuovo piatto
 */
export const createMenuItem = async (item: Omit<MenuItem, "id" | "created_at">) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("menu_items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Aggiorna piatto esistente
 */
export const updateMenuItem = async (itemId: string, updates: Partial<MenuItem>) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId);
  if (error) throw error;
};

/**
 * Elimina piatto
 */
export const deleteMenuItem = async (itemId: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", itemId);
  if (error) throw error;
};

/**
 * Elimina tutti i piatti del menu di un ristorante
 */
export const deleteAllMenuItems = async (restaurantId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
};

// ─── Tables ──────────────────────────────────────────────────────────────────

/**
 * Recupera tutti i tavoli del ristorante
 */
export const getTables = async (restaurantId: string): Promise<Table[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tables")
    .select("id, restaurant_id, label, code, is_active, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Aggiorna stato tavolo
 */
export const updateTableStatus = async (tableId: string, status: Table["status"]) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("tables")
    .update({ status })
    .eq("id", tableId);
  if (error) throw error;
};

export const setTableActive = async (tableId: string, isActive: boolean) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("tables")
    .update({ is_active: isActive })
    .eq("id", tableId);
  if (error) throw error;
};

/**
 * Crea nuovo tavolo (label + code generato)
 */
export const createTable = async (
  restaurantId: string,
  label: string,
  code: string
): Promise<Table> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tables")
    .insert({ restaurant_id: restaurantId, label, code, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as Table;
};

/**
 * Elimina tavolo
 */
export const deleteTable = async (tableId: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", tableId);
  if (error) throw error;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * Logout utente
 */
export const signOut = async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// ─── Staff (profiles + invite codes) ─────────────────────────────────────────

export interface StaffMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: "staff" | "manager" | "cameriere" | "cucina" | "admin" | "titolare";
  created_at: string;
  avatar_url: string | null;
}

export interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  used_at: string | null;
  used_by: string | null;
  expires_at: string;
  notes: string | null;
  role: "manager" | "cameriere" | "cucina";
}

export const getStaffMembers = async (restaurantId: string): Promise<StaffMember[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, created_at, avatar_url")
    .eq("restaurant_id", restaurantId)
    .in("role", ["staff", "manager", "cameriere", "cucina", "admin", "titolare"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StaffMember[]) ?? [];
};

export const getStaffCount = async (restaurantId: string): Promise<number> => {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .in("role", ["staff", "manager", "cameriere", "cucina"]);
  if (error) throw error;
  return count ?? 0;
};

export const getInviteCodes = async (restaurantId: string): Promise<InviteCode[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("staff_invite_codes")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InviteCode[]) ?? [];
};

// ─── Branding (full restaurant row) ──────────────────────────────────────────

export interface BrandingData {
  name: string;
  logo_url: string;
  logo_icon: string;
  establishment_type: string;
  establishment_type_custom: string | null;
  establishment_type_changed_at: string | null;
  cover_url: string;
  brand_color: string;
  background_image_url: string;  // ← nuovo: URL immagine o valore colore hex
  background_type: string;       // ← nuovo: 'gradient' | 'image' | 'color'
  address: string;
  city: string;
  phone: string;
  instagram: string;
  facebook: string;
  tripadvisor: string;
  website: string;
}

export const getBranding = async (restaurantId: string): Promise<BrandingData> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "name,logo_url,logo_icon,establishment_type,establishment_type_custom,establishment_type_changed_at,cover_url,brand_color,background_image_url,background_type,address,city,phone,instagram,facebook,tripadvisor,website"
    )
    .eq("id", restaurantId)
    .single();
  if (error) throw error;
  return {
    name: data.name ?? "",
    logo_url: data.logo_url ?? "",
    logo_icon: data.logo_icon ?? "chef-hat",
    establishment_type: data.establishment_type ?? "ristorante",
    establishment_type_custom: data.establishment_type_custom ?? null,
    establishment_type_changed_at: data.establishment_type_changed_at ?? null,
    cover_url: data.cover_url ?? "",
    brand_color: data.brand_color ?? "#d97706",
    background_image_url: data.background_image_url ?? "",
    background_type: data.background_type ?? "gradient",
    address: data.address ?? "",
    city: data.city ?? "",
    phone: data.phone ?? "",
    instagram: data.instagram ?? "",
    facebook: data.facebook ?? "",
    tripadvisor: data.tripadvisor ?? "",
    website: data.website ?? "",
  };
};

export const updateBranding = async (
  restaurantId: string,
  updates: Partial<BrandingData>
): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from("restaurants").update(updates).eq("id", restaurantId);
  if (error) throw error;
};

export class EstablishmentTypeCooldownError extends Error {
  constructor() {
    super("establishment_type_cooldown_active");
    this.name = "EstablishmentTypeCooldownError";
  }
}

export const updateEstablishmentType = async (
  restaurantId: string,
  establishmentType: string,
  establishmentTypeCustom?: string | null
): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("restaurants")
    .update({
      establishment_type: establishmentType,
      establishment_type_custom: establishmentType === "altro" ? (establishmentTypeCustom || null) : null,
    })
    .eq("id", restaurantId);
  if (error) {
    if (error.message?.includes("establishment_type_cooldown_active")) {
      throw new EstablishmentTypeCooldownError();
    }
    throw error;
  }
};

// ─── Menu categories (for the create-dish dropdown) ──────────────────────────

export interface MenuCategory {
  id: string;
  name: string;
  is_drink: boolean;
  sort_order: number;
}

export const getMenuCategories = async (restaurantId: string): Promise<MenuCategory[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("id, name, is_drink, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as MenuCategory[]) ?? [];
};

export const createMenuCategory = async (
  restaurantId: string,
  name: string,
  isDrink: boolean = false,
  sortOrder: number = 0
): Promise<MenuCategory> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("menu_categories")
    .insert({ restaurant_id: restaurantId, name, is_drink: isDrink, sort_order: sortOrder })
    .select("id, name, is_drink, sort_order")
    .single();
  if (error) throw error;
  return data as MenuCategory;
};

export const updateMenuCategory = async (
  categoryId: string,
  updates: { name?: string; is_drink?: boolean }
): Promise<MenuCategory> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", categoryId)
    .select("id, name, is_drink, sort_order")
    .single();
  if (error) throw error;
  return data as MenuCategory;
};

export const deleteMenuCategory = async (categoryId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.from("menu_categories").delete().eq("id", categoryId);
  if (error) throw error;
};

// ─── Menu item photo upload (Supabase Storage) ───────────────────────────────

export const uploadMenuItemPhoto = async (
  file: File,
  restaurantId: string
): Promise<string> => {
  const supabase = getSupabase();
  const ext = file.name.split(".").pop();
  const fileName = `${restaurantId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("restaurant-logos")
    .upload(fileName, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("restaurant-logos").getPublicUrl(fileName);
  return data.publicUrl;
};

// ─── Profile update (Settings → Modifica profilo) ────────────────────────────

export const updateUserProfile = async (
  userId: string,
  updates: { first_name?: string; last_name?: string; avatar_url?: string | null }
): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) throw error;
};

export const uploadUserAvatar = async (file: File, userId: string): Promise<string> => {
  const supabase = getSupabase();
  const ext = file.name.split(".").pop();
  const fileName = `avatars/${userId}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("restaurant-logos")
    .upload(fileName, file, { upsert: true });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("restaurant-logos").getPublicUrl(fileName);
  return data.publicUrl;
};

export const updateUserPassword = async (newPassword: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

// Cambia la password verificando prima quella attuale.
// Supabase non richiede la password corrente per updateUser: la validiamo noi
// ri-autenticando l'utente. In caso di password attuale errata lanciamo
// "CURRENT_PW_WRONG" così la UI può mostrare un messaggio dedicato.
export const updateUserPasswordSecure = async (
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const supabase = getSupabase();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInErr) throw new Error("CURRENT_PW_WRONG");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

// ─── Autenticazione a due fattori (TOTP MFA) ─────────────────────────────────
//
// Usa la MFA nativa di Supabase con app TOTP (Google Authenticator, Authy, …).
// Flusso: enroll → l'utente scansiona il QR → verify col codice a 6 cifre.
// Da quel momento il login richiede il codice (vedi auth-page.tsx).

export interface TwoFactorEnrollment {
  factorId: string;
  qrCode: string; // SVG data URL, renderizzabile in <img>
  secret: string; // chiave per inserimento manuale
  uri: string;
}

export const getTwoFactorStatus = async (): Promise<{
  enabled: boolean;
  factorId: string | null;
}> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const verified = data?.totp?.find((f) => f.status === "verified");
  return { enabled: !!verified, factorId: verified?.id ?? null };
};

export const enrollTwoFactor = async (): Promise<TwoFactorEnrollment> => {
  const supabase = getSupabase();
  // Rimuove eventuali fattori TOTP non ancora verificati rimasti da tentativi
  // precedenti: altrimenti la nuova enroll fallisce con "mfa_factor_name_conflict".
  // NB: listFactors().totp contiene SOLO i fattori verificati, quindi quelli in
  // sospeso vanno cercati in `all`.
  const { data: list } = await supabase.auth.mfa.listFactors();
  const stale = (list?.all ?? []).filter(
    (f) => f.factor_type === "totp" && f.status !== "verified"
  );
  for (const f of stale) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
};

export const verifyTwoFactor = async (
  factorId: string,
  code: string
): Promise<void> => {
  const supabase = getSupabase();
  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (chErr) throw chErr;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (error) throw error;
};

// Annulla un enrollment in corso (usato se l'utente chiude il modal senza
// completare la verifica) oppure disattiva un 2FA già attivo.
export const disableTwoFactor = async (factorId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
};

// ─── 2FA via email (canale applicativo, tabella user_security_prefs) ──────────
// A differenza della TOTP (fattore nativo Supabase, AAL2), questa 2FA e' gestita
// a livello applicativo: al login, dopo la password, inviamo un OTP via email.

export type SecurityPrefs = {
  email2fa: boolean;
  phone: string | null;
  phone2fa: boolean;
};

export const getSecurityPrefs = async (): Promise<SecurityPrefs> => {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { email2fa: false, phone: null, phone2fa: false };
  const { data } = await supabase
    .from("user_security_prefs")
    .select("email_2fa_enabled, phone, phone_2fa_enabled")
    .eq("user_id", uid)
    .maybeSingle();
  return {
    email2fa: !!(data as any)?.email_2fa_enabled,
    phone: ((data as any)?.phone as string | null) ?? null,
    phone2fa: !!(data as any)?.phone_2fa_enabled,
  };
};

export const setEmail2FA = async (enabled: boolean): Promise<void> => {
  const supabase = getSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Utente non autenticato");
  const { error } = await supabase.from("user_security_prefs").upsert(
    {
      user_id: uid,
      email_2fa_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
};

// ─── Staff invite (generate invite code) ─────────────────────────────────────

export const createStaffInvite = async (
  restaurantId: string,
  role: "manager" | "cameriere" | "cucina"
): Promise<string> => {
  const supabase = getSupabase();

  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("max_staff")
    .eq("id", restaurantId)
    .single();
  if (restError) throw restError;
  const maxStaff = (restaurant as any)?.max_staff as number | null;
  if (maxStaff != null) {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);
    if (countError) throw countError;
    if ((count ?? 0) >= maxStaff) {
      throw new Error(`Hai raggiunto il limite di ${maxStaff} membri staff previsto dal tuo abbonamento.`);
    }
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");
  const { error } = await supabase.from("staff_invite_codes").insert({
    code,
    restaurant_id: restaurantId,
    role,
    expires_at: expiresAt.toISOString(),
    created_by: user.id,
  });
  if (error) throw error;
  return code;
};

// ─── Shift codes & attendance (Calendar / Presenze section) ──────────────────
//
// Modello. Il manager/admin genera, nella sezione Calendario, un codice
// PERSONALE e MONOUSO per un membro staff (cameriere/cucina). Il membro lo
// inserisce dal pulsante "Presenza" in navbar per timbrare la giornata.
// Il riscatto passa SEMPRE dalla RPC `redeem_shift_code` (SECURITY DEFINER):
// le policy RLS non consentono allo staff né di leggere i codici né di
// scrivere in `attendance`, quindi la validazione (monouso, codice personale,
// scadenza) è centralizzata lato DB. Vedi migration `redeem_shift_code_function`.

export interface ShiftCode {
  id: string;
  restaurant_id: string;
  profile_id: string;
  code: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  last_used_at: string | null;
}

export interface AttendanceRow {
  id: string;
  restaurant_id: string;
  profile_id: string;
  shift_code_id: string | null;
  work_date: string; // 'YYYY-MM-DD' (giorno locale IT)
  clock_in_at: string;
}

export interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: "cameriere" | "cucina";
  avatar_url: string | null;
}

// Membri staff "timbrabili": camerieri e cucina. Sono gli unici per cui ha
// senso generare un codice presenza (manager/admin gestiscono, non timbrano).
export const getEmployees = async (restaurantId: string): Promise<Employee[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, avatar_url")
    .eq("restaurant_id", restaurantId)
    .in("role", ["cameriere", "cucina"])
    .order("first_name", { ascending: true });
  if (error) throw error;
  return (data as Employee[]) ?? [];
};

// Codici ancora ATTIVI (non consumati) del ristorante — mostrati al manager
// accanto a ciascun membro. Appena un codice viene riscattato (is_active=false)
// sparisce da questo elenco.
export const getActiveShiftCodes = async (restaurantId: string): Promise<ShiftCode[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("staff_shift_codes")
    .select("id, restaurant_id, profile_id, code, created_at, expires_at, is_active, last_used_at")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ShiftCode[]) ?? [];
};

// Presenze in un intervallo di date (inclusivo). Il calendario le usa per
// mostrare, giorno per giorno, chi ha timbrato.
export const getAttendance = async (
  restaurantId: string,
  fromDate: string,
  toDate: string
): Promise<AttendanceRow[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("attendance")
    .select("id, restaurant_id, profile_id, shift_code_id, work_date, clock_in_at")
    .eq("restaurant_id", restaurantId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("clock_in_at", { ascending: true });
  if (error) throw error;
  return (data as AttendanceRow[]) ?? [];
};

// Genera un nuovo codice PERSONALE e MONOUSO per un membro staff. Prima rimuove
// gli eventuali codici ancora attivi e non usati dello stesso membro, così ne
// resta valido soltanto uno per volta. Quei codici sono per definizione non
// referenziati da presenze, quindi la DELETE è sicura rispetto al vincolo FK
// attendance.shift_code_id. Ritorna il codice in chiaro da consegnare al membro.
export const generateShiftCode = async (
  restaurantId: string,
  profileId: string
): Promise<string> => {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato");

  // Invalida i vecchi codici attivi e non consumati del membro (ne resta uno solo).
  await supabase
    .from("staff_shift_codes")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("profile_id", profileId)
    .eq("is_active", true);

  // Codice a 6 caratteri, alfabeto senza simboli ambigui (niente 0/O, 1/I).
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

  // expires_at (+16h), is_active (true) e created_at (now) hanno default lato DB.
  const { error } = await supabase.from("staff_shift_codes").insert({
    code,
    restaurant_id: restaurantId,
    profile_id: profileId,
    created_by: user.id,
  });
  if (error) throw error;
  return code;
};

// Esito del riscatto lato staff — riflette 1:1 gli stati della RPC.
export type RedeemResult =
  | "ok"
  | "not_authenticated"
  | "not_found"
  | "wrong_user"
  | "already_used"
  | "expired"
  | "already_present";

// Riscatta un codice presenza (lato staff): delega alla RPC che valida e timbra
// server-side. Qui normalizziamo solo l'input (maiuscolo, senza spazi) e lo stato.
export const redeemShiftCode = async (code: string): Promise<RedeemResult> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("redeem_shift_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return (data as RedeemResult) ?? "not_found";
};

// Il membro corrente ha già timbrato oggi? Legge SOLO la propria riga di
// presenza del giorno (policy RLS "attendance: self legge"). Usato dal pulsante
// "Presenza" per mostrare lo stato "Presente" in modo persistente.
export const isPresentToday = async (profileId: string): Promise<boolean> => {
  const supabase = getSupabase();
  // Giorno locale IT, coerente con work_date scritto dalla RPC.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  const { data, error } = await supabase
    .from("attendance")
    .select("id")
    .eq("profile_id", profileId)
    .eq("work_date", today)
    .maybeSingle();
  if (error) throw error;
  return !!data;
};

// ─── Ready orders (Waiter section) ────────────────────────────────────────────

/**
 * Ordini con almeno una portata "pronta" (da consegnare) o "consegnata"
 * (da ritirare) — sono questi a comparire nella sezione Cameriere.
 * Gli order_items restituiti includono SOLO le portate rilevanti per il
 * cameriere (portata_completed=true e non ancora ritirata).
 */
export const getReadyOrders = async (restaurantId: string): Promise<Order[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .not("status", "in", '("served","cancelled","expired")')
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // load table codes (same code used for QR scan)
  const tableIds = [...new Set(data.map((o) => o.table_id).filter(Boolean))];
  let tableMap: Record<string, { code: string; label: string }> = {};
  if (tableIds.length > 0) {
    const { data: tables } = await supabase
      .from("tables")
      .select("id, code, label")
      .in("id", tableIds);
    for (const t of tables ?? []) {
      tableMap[t.id] = { code: t.code, label: t.label };
    }
  }

  // load items + names (same pattern as getOrders), solo portate pronte/consegnate
  const orderIds = data.map((o) => o.id);
  let itemsMap: Record<string, any[]> = {};
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, order_id, menu_item_id, quantity, base_price, name_snapshot, name, note, portata, is_drink, portata_completed, portata_delivered, prepared_at, prepared_by, prepared_by_name, delivered_at, delivered_by, delivered_by_name, picked_up_at, picked_up_by, picked_up_by_name"
    )
    .in("order_id", orderIds)
    .eq("portata_completed", true)
    .is("picked_up_at", null);
  for (const it of items ?? []) {
    if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
    itemsMap[it.order_id].push(it);
  }

  return data
    .filter((o) => (itemsMap[o.id] ?? []).length > 0)
    .map((o) => ({
      ...o,
      table_code: tableMap[o.table_id]?.code ?? null,
      order_items: (itemsMap[o.id] ?? []).map((it) => {
        const snapshotName = it.name_snapshot || it.name;
        return {
          ...it,
          unit_price_cents: it.base_price ?? 0,
          menu_items: { name: snapshotName || "Piatto", price_cents: it.base_price ?? 0 },
        };
      }),
    }));
};

// ─── History orders (delivered / cancelled) ───────────────────────────────────

export const getHistoryOrders = async (restaurantId: string): Promise<Order[]> => {
  const supabase = getSupabase();
  // Fetch orders NOT in known-active statuses. Only use enum values that
  // exist in the DB to avoid "invalid input value for enum" errors.
  // Terminal statuses (whatever the DB calls them) will pass this filter.
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .not("status", "in", '("pending","confirmed","ready")')
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const orders = (data as Order[]) ?? [];
  if (orders.length === 0) return [];

  const tableIds = [...new Set(orders.map((o) => o.table_id).filter(Boolean))];
  let tableMap: Record<string, { code: string; label: string }> = {};
  if (tableIds.length > 0) {
    const { data: tables } = await supabase
      .from("tables")
      .select("id, code, label")
      .in("id", tableIds);
    for (const t of tables ?? []) {
      tableMap[t.id] = { code: t.code, label: t.label };
    }
  }

  // Order items con gli snapshot dei nomi dello staff (chi ha preparato,
  // consegnato, ritirato), così la cronologia può mostrare le attribuzioni.
  const orderIds = orders.map((o) => o.id);
  let itemsMap: Record<string, any[]> = {};
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, order_id, menu_item_id, quantity, base_price, name_snapshot, name, note, portata, is_drink, portata_completed, portata_delivered, prepared_at, prepared_by, prepared_by_name, delivered_at, delivered_by, delivered_by_name, picked_up_at, picked_up_by, picked_up_by_name"
    )
    .in("order_id", orderIds);
  for (const it of items ?? []) {
    if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
    itemsMap[it.order_id].push(it);
  }

  return orders.map((o) => ({
    ...o,
    table_code: tableMap[o.table_id]?.code ?? null,
    order_items: (itemsMap[o.id] ?? []).map((it) => {
      const snapshotName = it.name_snapshot || it.name;
      return {
        ...it,
        unit_price_cents: it.base_price ?? 0,
        menu_items: { name: snapshotName || "Piatto", price_cents: it.base_price ?? 0 },
      };
    }),
  }));
};

// ─── Settings (restaurant settings JSON + plan) ──────────────────────────────

export interface RestaurantSettings {
  plan: string | null;
  accessExpiresAt: string | null;
  maxStaff: number | null;
  restaurantName: string;
  restaurantId: string;
  // Modalità di servizio: true = ordini inviati automaticamente in cucina;
  // false = "con cameriere" (il cliente chiama il cameriere per ordinare).
  autoOrderFlow: boolean;
}

export const getRestaurantSettings = async (restaurantId: string): Promise<RestaurantSettings> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, plan, access_expires_at, max_staff, auto_order_flow")
    .eq("id", restaurantId)
    .single();
  if (error) throw error;
  return {
    restaurantId: data.id,
    restaurantName: data.name,
    plan: (data as any).plan,
    accessExpiresAt: (data as any).access_expires_at,
    maxStaff: (data as any).max_staff,
    autoOrderFlow: (data as any).auto_order_flow ?? true,
  };
};

/**
 * Aggiorna la modalità di servizio del ristorante.
 * true  = ordini inviati automaticamente in cucina (flusso self-service);
 * false = "con cameriere" (il cliente chiama il cameriere per ordinare).
 * Update RLS-protetto: l'admin può modificare solo il proprio ristorante.
 */
export const updateOrderFlowMode = async (restaurantId: string, autoOrderFlow: boolean) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("restaurants")
    .update({ auto_order_flow: autoOrderFlow })
    .eq("id", restaurantId);
  if (error) throw error;
};

// ─── Richieste abbonamento (rinnovo / cambio piano) ─────────────────────────
//
// L'admin del ristorante invia una richiesta che il proprietario del sito
// (pagina /owner-dashboard) potrà visualizzare e gestire.

export type SubscriptionRequestType = "renew" | "plan_change";
export type SubscriptionRequestStatus = "pending" | "approved" | "rejected";

export interface SubscriptionRequest {
  id: string;
  restaurantId: string;
  type: SubscriptionRequestType;
  currentPlan: string | null;
  requestedPlan: string | null;
  status: SubscriptionRequestStatus;
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function mapSubscriptionRequest(row: any): SubscriptionRequest {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    type: row.type,
    currentPlan: row.current_plan ?? null,
    requestedPlan: row.requested_plan ?? null,
    status: row.status,
    note: row.note ?? null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

/**
 * Crea una richiesta di rinnovo o cambio piano per il ristorante.
 * Lancia un errore con messaggio "ALREADY_PENDING" se esiste già una
 * richiesta dello stesso tipo ancora in attesa.
 */
export const createSubscriptionRequest = async (input: {
  restaurantId: string;
  type: SubscriptionRequestType;
  currentPlan: string | null;
  requestedPlan?: string | null;
  note?: string | null;
}): Promise<void> => {
  const supabase = getSupabase();
  const { data: existing, error: existErr } = await supabase
    .from("subscription_requests")
    .select("id")
    .eq("restaurant_id", input.restaurantId)
    .eq("type", input.type)
    .eq("status", "pending")
    .limit(1);
  if (existErr) throw existErr;
  if (existing && existing.length > 0) throw new Error("ALREADY_PENDING");

  const { error } = await supabase.from("subscription_requests").insert({
    restaurant_id: input.restaurantId,
    type: input.type,
    current_plan: input.currentPlan,
    requested_plan: input.requestedPlan ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
};

/** Storico delle richieste abbonamento del ristorante (più recenti prima). */
export const listMySubscriptionRequests = async (
  restaurantId: string,
): Promise<SubscriptionRequest[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSubscriptionRequest);
};

// ─── Delivery platforms (external_orders + integrations) ─────────────────────

export type DeliveryPlatformId =
  | "glovo"
  | "deliveroo"
  | "ubereats"
  | "justeat"
  | "other";

export type ExternalOrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "rejected"
  | "cancelled";

export interface ExternalOrderItem {
  name: string;
  quantity: number;
  price: number | null;
  notes?: string | null;
  options?: string[];
}

export interface ExternalOrder {
  id: string;
  restaurantId: string;
  platform: DeliveryPlatformId;
  externalId: string | null;
  status: ExternalOrderStatus;
  orderType: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  items: ExternalOrderItem[];
  subtotal: number | null;
  deliveryFee: number | null;
  total: number | null;
  currency: string;
  notes: string | null;
  placedAt: string;
  estimatedAt: string | null;
  createdAt: string;
}

export interface PlatformIntegration {
  id: string;
  restaurantId: string;
  platform: DeliveryPlatformId;
  enabled: boolean;
  webhookToken: string;
  apiKey: string | null;
  storeId: string | null;
  autoAccept: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapExternalOrder(row: any): ExternalOrder {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    platform: row.platform,
    externalId: row.external_id ?? null,
    status: row.status,
    orderType: row.order_type ?? "delivery",
    customerName: row.customer_name ?? null,
    customerPhone: row.customer_phone ?? null,
    deliveryAddress: row.delivery_address ?? null,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal !== null ? Number(row.subtotal) : null,
    deliveryFee: row.delivery_fee !== null ? Number(row.delivery_fee) : null,
    total: row.total !== null ? Number(row.total) : null,
    currency: row.currency ?? "EUR",
    notes: row.notes ?? null,
    placedAt: row.placed_at,
    estimatedAt: row.estimated_at ?? null,
    createdAt: row.created_at,
  };
}

function mapIntegration(row: any): PlatformIntegration {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    platform: row.platform,
    enabled: !!row.enabled,
    webhookToken: row.webhook_token,
    apiKey: row.api_key ?? null,
    storeId: row.store_id ?? null,
    autoAccept: !!row.auto_accept,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const listExternalOrders = async (
  restaurantId: string,
): Promise<ExternalOrder[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("external_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("placed_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapExternalOrder);
};

export const updateExternalOrderStatus = async (
  orderId: string,
  status: ExternalOrderStatus,
): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("external_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
};

export const getPlatformIntegrations = async (
  restaurantId: string,
): Promise<PlatformIntegration[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("restaurant_platform_integrations")
    .select("*")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return (data ?? []).map(mapIntegration);
};

// Crea la riga di integrazione se non esiste (genera il webhook_token lato DB).
export const ensureIntegration = async (
  restaurantId: string,
  platform: DeliveryPlatformId,
): Promise<PlatformIntegration> => {
  const supabase = getSupabase();
  const { data: existing, error: exErr } = await supabase
    .from("restaurant_platform_integrations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("platform", platform)
    .maybeSingle();
  if (exErr) throw exErr;
  if (existing) return mapIntegration(existing);

  const { data, error } = await supabase
    .from("restaurant_platform_integrations")
    .insert({ restaurant_id: restaurantId, platform })
    .select("*")
    .single();
  if (error) throw error;
  return mapIntegration(data);
};

export const upsertPlatformIntegration = async (input: {
  restaurantId: string;
  platform: DeliveryPlatformId;
  enabled?: boolean;
  apiKey?: string | null;
  storeId?: string | null;
  autoAccept?: boolean;
}): Promise<PlatformIntegration> => {
  const supabase = getSupabase();
  const patch: Record<string, unknown> = {
    restaurant_id: input.restaurantId,
    platform: input.platform,
    updated_at: new Date().toISOString(),
  };
  if (input.enabled !== undefined) patch.enabled = input.enabled;
  if (input.apiKey !== undefined) patch.api_key = input.apiKey;
  if (input.storeId !== undefined) patch.store_id = input.storeId;
  if (input.autoAccept !== undefined) patch.auto_accept = input.autoAccept;

  const { data, error } = await supabase
    .from("restaurant_platform_integrations")
    .upsert(patch, { onConflict: "restaurant_id,platform" })
    .select("*")
    .single();
  if (error) throw error;
  return mapIntegration(data);
};

export const regenerateWebhookToken = async (
  restaurantId: string,
  platform: DeliveryPlatformId,
): Promise<string> => {
  const supabase = getSupabase();
  // Token generato lato client: 48 char esadecimali via due UUID.
  const token = (
    crypto.randomUUID() + crypto.randomUUID()
  ).replace(/-/g, "");
  const { data, error } = await supabase
    .from("restaurant_platform_integrations")
    .update({ webhook_token: token, updated_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId)
    .eq("platform", platform)
    .select("webhook_token")
    .single();
  if (error) throw error;
  return data.webhook_token;
};

// ─── Analytics (aggregated from orders + order_items + reviews) ──────────────

export interface AnalyticsData {
  kpis: {
    revenue: { value: string; trend: string };
    orders: { value: string; trend: string };
    avgTicket: { value: string; trend: string };
    reviews: { value: string; trend: string };
  };
  revenueByDay: { day: string; v: number }[];
  hourly: { h: string; v: number }[];
  topDishes: { name: string; v: number }[];
  payments: { name: string; v: number; color: string }[];
  avgTicketByDay: { d: string; v: number }[];
  insights: { peakHour: string | null };
}

export const getAnalytics = async (
  restaurantId: string,
  days: 7 | 30 = 7
): Promise<AnalyticsData> => {
  const supabase = getSupabase();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

  const { data: orders, error: ordErr } = await supabase
    .from("orders")
    .select("id, total_cents, created_at, status, payment_method")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", prevSince.toISOString())
    .not("status", "in", '("cancelled","expired")');
  if (ordErr) throw ordErr;

  const currentOrders = (orders ?? []).filter((o) => new Date(o.created_at) >= since);
  const previousOrders = (orders ?? []).filter((o) => new Date(o.created_at) < since);

  // revenue + count per day
  const byDay = new Map<string, number>();
  const byDayCount = new Map<string, number>();
  for (const o of currentOrders) {
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + (o.total_cents ?? 0));
    byDayCount.set(key, (byDayCount.get(key) ?? 0) + 1);
  }
  const revenueByDay: { day: string; v: number }[] = [];
  const avgTicketByDay: { d: string; v: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("it-IT", { weekday: "short" });
    const dayRev = byDay.get(key) ?? 0;
    const dayCnt = byDayCount.get(key) ?? 0;
    revenueByDay.push({ day: label, v: Math.round(dayRev / 100) });
    avgTicketByDay.push({
      d: label,
      v: dayCnt > 0 ? Math.round(dayRev / dayCnt / 100) : 0,
    });
  }

  const currentTotal = currentOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const previousTotal = previousOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const revenueTrend =
    previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0;

  // hourly
  const hourCounts = new Map<number, number>();
  for (const o of currentOrders) {
    const hour = Number(
      new Intl.DateTimeFormat("it-IT", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Europe/Rome",
      }).format(new Date(o.created_at))
    );
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const hourly: { h: string; v: number }[] = [];
  for (const h of [12, 13, 14, 15, 19, 20, 21, 22]) {
    hourly.push({ h: String(h), v: hourCounts.get(h) ?? 0 });
  }

  // top dishes from order_items
  const orderIds = currentOrders.map((o) => o.id);
  let topDishes: { name: string; v: number }[] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity, menu_items(name)")
      .in("order_id", orderIds);
    const dishCounts = new Map<string, number>();
    for (const it of items ?? []) {
      const name = (it as any).menu_items?.name ?? "Sconosciuto";
      dishCounts.set(name, (dishCounts.get(name) ?? 0) + (it.quantity ?? 0));
    }
    topDishes = Array.from(dishCounts.entries())
      .map(([name, v]) => ({ name, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);
  }

  // payments
  const payCounts = { card: 0, cash: 0, none: 0 };
  for (const o of currentOrders) {
    if (o.payment_method === "card") payCounts.card++;
    else if (o.payment_method === "cash") payCounts.cash++;
    else payCounts.none++;
  }
  const totalPay = payCounts.card + payCounts.cash + payCounts.none;
  const payments = [
    { name: "Carta", v: totalPay > 0 ? Math.round((payCounts.card / totalPay) * 100) : 0, color: "oklch(0.72 0.19 60)" },
    { name: "Contanti", v: totalPay > 0 ? Math.round((payCounts.cash / totalPay) * 100) : 0, color: "oklch(0.62 0.22 18)" },
    { name: "Apple Pay", v: totalPay > 0 ? Math.round((payCounts.none / totalPay) * 100) : 0, color: "oklch(0.55 0.2 295)" },
  ].filter((p) => p.v > 0);

  // reviews avg
  const { data: reviews } = await supabase
    .from("reviews")
    .select("stars")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", since.toISOString());
  const avgStars =
    reviews && reviews.length > 0
      ? (reviews.reduce((s, r) => s + (r.stars ?? 0), 0) / reviews.length).toFixed(1)
      : "—";

  const avgTicket = currentOrders.length > 0 ? currentTotal / currentOrders.length / 100 : 0;
  const ordersTrend =
    previousOrders.length > 0
      ? Math.round(((currentOrders.length - previousOrders.length) / previousOrders.length) * 100)
      : 0;

  return {
    kpis: {
      revenue: {
        value: `€${(currentTotal / 100).toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
        trend: `${revenueTrend >= 0 ? "+" : ""}${revenueTrend}%`,
      },
      orders: { value: String(currentOrders.length), trend: `${ordersTrend >= 0 ? "+" : ""}${ordersTrend}%` },
      avgTicket: { value: `€${avgTicket.toFixed(1)}`, trend: "" },
      reviews: { value: avgStars, trend: "" },
    },
    revenueByDay,
    hourly,
    topDishes,
    payments,
    avgTicketByDay,
    insights: {
      peakHour: hourly.some((h) => h.v > 0) ? String(hourly.reduce((a, b) => (a.v > b.v ? a : b)).h) : null,
    },
  };
};

/**
 * Top dishes with a flexible time filter (hours or days).
 * range: "1h" | "3h" | "1d" | "3d" | "7d" | "30d"
 */
export const getTopDishes = async (
  restaurantId: string,
  range: "1h" | "3h" | "1d" | "3d" | "7d" | "30d" = "7d"
): Promise<{ name: string; v: number }[]> => {
  const supabase = getSupabase();
  const now = Date.now();
  const msPerHour = 60 * 60 * 1000;
  const msPerDay = 24 * msPerHour;
  const map: Record<string, number> = {
    "1h": msPerHour,
    "3h": 3 * msPerHour,
    "1d": msPerDay,
    "3d": 3 * msPerDay,
    "7d": 7 * msPerDay,
    "30d": 30 * msPerDay,
  };
  const since = new Date(now - map[range]).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", since);
  if (error) throw error;

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return [];

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("quantity, name_snapshot, name, menu_item_id")
    .in("order_id", orderIds);
  if (itemsErr) throw itemsErr;

  // resolve menu item names
  const menuItemIds = [...new Set((items ?? []).map((i) => i.menu_item_id).filter(Boolean))];
  let menuMap: Record<string, string> = {};
  if (menuItemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name")
      .in("id", menuItemIds);
    for (const m of menuItems ?? []) menuMap[m.id] = m.name;
  }

  const counts = new Map<string, number>();
  for (const it of items ?? []) {
    const name = (it as any).name_snapshot || (it as any).name || menuMap[(it as any).menu_item_id] || "Piatto";
    counts.set(name, (counts.get(name) ?? 0) + (it.quantity ?? 0));
  }
  return Array.from(counts.entries())
    .map(([name, v]) => ({ name, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);
};

// ---------------------------------------------------------------------------
// Reviews (recensioni)
// ---------------------------------------------------------------------------

export interface DishReviewStat {
  menuItemId: string | null;
  name: string;
  count: number;
  avg: number; // media stelle (0-5)
}

export interface ReviewEntry {
  id: string;
  stars: number;
  text: string;
  dishName: string;
  tableNumber: string | null;
  createdAt: string;
}

export interface ReviewStats {
  total: number;
  avg: number;
  dishesRated: number;
  withText: number;
  distribution: { stars: number; count: number }[]; // stelle 1..5
  podium: DishReviewStat[]; // top 3 per media (poi conteggio)
  ranking: DishReviewStat[]; // tutti i piatti ordinati
  written: ReviewEntry[]; // recensioni con testo
}

/**
 * Statistiche recensioni per la sezione admin.
 * `days`: finestra temporale (7 / 30 giorni). 0 = tutte.
 */
export const getReviewStats = async (
  restaurantId: string,
  days: 7 | 30 | 0 = 7
): Promise<ReviewStats> => {
  const supabase = getSupabase();
  let query = supabase
    .from("reviews")
    .select("id, stars, text, dish_name, menu_item_id, table_number, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const total = rows.length;
  const avg = total > 0 ? rows.reduce((s, r) => s + (r.stars ?? 0), 0) / total : 0;

  const distribution = [1, 2, 3, 4, 5].map((stars) => ({
    stars,
    count: rows.filter((r) => Math.round(r.stars ?? 0) === stars).length,
  }));

  // Raggruppa per piatto (menu_item_id, fallback su dish_name)
  const groups = new Map<
    string,
    { name: string; menuItemId: string | null; sum: number; count: number }
  >();
  for (const r of rows) {
    const menuItemId = (r.menu_item_id as string | null) ?? null;
    const key = menuItemId ?? `name:${r.dish_name ?? "?"}`;
    const name = (r.dish_name as string) || "Piatto";
    const g = groups.get(key) ?? { name, menuItemId, sum: 0, count: 0 };
    g.sum += r.stars ?? 0;
    g.count += 1;
    groups.set(key, g);
  }
  const ranking: DishReviewStat[] = Array.from(groups.values())
    .map((g) => ({
      menuItemId: g.menuItemId,
      name: g.name,
      count: g.count,
      avg: g.count > 0 ? g.sum / g.count : 0,
    }))
    .sort(
      (a, b) => b.avg - a.avg || b.count - a.count || a.name.localeCompare(b.name)
    );

  const podium = ranking.slice(0, 3);

  const written: ReviewEntry[] = rows
    .filter((r) => ((r.text as string | null) ?? "").trim().length > 0)
    .map((r) => ({
      id: r.id as string,
      stars: r.stars ?? 0,
      text: (r.text as string) ?? "",
      dishName: (r.dish_name as string) || "Piatto",
      tableNumber: (r.table_number as string | null) ?? null,
      createdAt: r.created_at as string,
    }));

  return {
    total,
    avg,
    dishesRated: ranking.length,
    withText: written.length,
    distribution,
    podium,
    ranking,
    written,
  };
};