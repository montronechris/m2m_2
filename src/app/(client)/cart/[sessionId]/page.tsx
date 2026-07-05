// src/app/(client)/cart/[sessionId]/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { useCartRealtime } from "@/hooks/useCartRealtime";
import { getTableSession } from "@/lib/table-session";
import { getMenuItemOptions, type ModalOption, type CartCustomization } from "@/lib/api-service";
import {
  Trash2, Plus, Minus, ArrowLeft,
  Settings, CheckCircle, AlertCircle,
  ShoppingBag, StickyNote, ChefHat,
  Tag, Banknote, CreditCard, X, Loader2,
  ChevronRight, UtensilsCrossed, Sparkles, Pencil,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CustomizationModal from "@/components/client/cart/CustomizationModal";
import NoteModal from "@/components/client/cart/NoteModal";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const API_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseHeaders = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
} as const;

const formatPrice = (cents: number): string => {
  if (typeof cents !== "number" || isNaN(cents)) return "0,00";
  return (cents / 100).toFixed(2).replace(".", ",");
};

// ── Palette dinamica (stessa logica di /order) ───────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex1: string, hex2: string, t: number): string {
  const [r1,g1,b1] = hexToRgb(hex1);
  const [r2,g2,b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `#${[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("")}`;
}

function buildPalette(brand: string) {
  const [r,g,b] = hexToRgb(brand);
  const dark500  = mix(brand, "#000000", 0.45);
  const dark400  = mix(brand, "#000000", 0.35);
  const dark300  = mix(brand, "#000000", 0.20);
  const light100 = mix(brand, "#ffffff", 0.88);
  const light200 = mix(brand, "#ffffff", 0.78);
  const alpha    = (a: number) => `rgba(${r},${g},${b},${a})`;
  return {
    brand,
    bg:          light100,
    bgGradient:  `linear-gradient(160deg, #ffffff 0%, ${mix(brand,"#ffffff",0.92)} 40%, ${mix(brand,"#ffffff",0.82)} 75%, ${mix(brand,"#ffffff",0.88)} 100%)`,
    text:        dark500,
    textMuted:   dark400,
    border:      alpha(0.20),
    borderSoft:  alpha(0.12),
    bgCard:      "rgba(255,255,255,0.88)",
    accent:      brand,
    accentDark:  dark300,
    accentBg:    alpha(0.08),
    btnBg:       brand.toLowerCase() === "#ffffff" ? "linear-gradient(135deg, #1f2937, #374151)" : `linear-gradient(135deg, ${brand}, ${dark300})`,
    btnShadow:   `0 6px 24px ${alpha(0.35)}`,
    headerBg:    `${mix(brand,"#ffffff",0.92)}d9`,
    footerBg:    `${mix(brand,"#ffffff",0.90)}eb`,
    danger:      "#ef4444",
    dangerBg:    "#fef2f2",
    amber:       "#f59e0b",
    amberBg:     "rgba(245,158,11,0.08)",
  };
}

// ── Merge visuale dei duplicati ──────────────────────────────────────────────
// Più CartItemPortata con stesso menuItemId + stesse customizations + stessa
// portata vengono mostrati come una sola card con quantità somma.
// orderItemId punta sempre al PRIMO id del gruppo (riferimento "primario"):
// +/- agiscono sempre su quello; il delete rimuove tutti gli id del gruppo.
type CartItemLike = ReturnType<typeof useCartStore.getState>["items"][number];
export type MergedCartItem = CartItemLike & {
  /** Tutti gli orderItemId confluiti in questa riga, in ordine di apparizione. */
  orderItemIds: string[];
  /** Somma delle quantità di tutti gli orderItemId del gruppo. */
  totalQty: number;
};

function mergeDuplicateItems(groupItems: CartItemLike[]): MergedCartItem[] {
  const order: string[] = [];
  const map = new Map<string, MergedCartItem>();

  for (const item of groupItems) {
    // portataLocked entra nella chiave: un piatto bloccato (già in un ordine
    // attivo/consegnato) non deve mai fondersi con uno stesso piatto ancora
    // libero, altrimenti la riga unita erediterebbe i controlli sbagliati.
    const key = `${item.menuItemId}::${JSON.stringify(item.customizations)}::${item.portataLocked ? "locked" : "free"}`;
    const existing = map.get(key);
    if (existing) {
      existing.orderItemIds.push(item.orderItemId!);
      existing.totalQty += item.quantity;
      // Mantiene la nota del primo item che ne ha una (i duplicati raramente avranno note diverse).
      if (!existing.note && item.note) existing.note = item.note;
    } else {
      map.set(key, {
        ...item,
        orderItemIds: [item.orderItemId!],
        totalQty: item.quantity,
      });
      order.push(key);
    }
  }

  return order.map((key) => map.get(key)!);
}


// ── Skeleton carrello ─────────────────────────────────────────────────────────
function CartSkeleton({ T }: { T: ReturnType<typeof buildPalette> }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes skPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
        .sk { animation: skPulse 1.5s ease-in-out infinite; border-radius: 10px; background: rgba(0,0,0,0.08); }
      `}</style>

      {/* Header */}
      <div style={{
        height: 64, padding: "0 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.headerBg,
        borderBottom: `1px solid ${T.borderSoft}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sk" style={{ width: 34, height: 34, borderRadius: "50%" }} />
          <div className="sk" style={{ width: 80, height: 14 }} />
        </div>
        <div className="sk" style={{ width: 110, height: 22, borderRadius: 20 }} />
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Portata label */}
        <div className="sk" style={{ width: 100, height: 13, marginBottom: 4 }} />

        {/* 3 item cards */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: "14px 14px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            animationDelay: `${i * 0.1}s`,
          }}>
            {/* image */}
            <div className="sk" style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="sk" style={{ width: "65%", height: 14 }} />
              <div className="sk" style={{ width: "40%", height: 12 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <div className="sk" style={{ width: 80, height: 32, borderRadius: 20 }} />
                <div className="sk" style={{ width: 52, height: 14 }} />
              </div>
            </div>
          </div>
        ))}

        {/* Totale footer */}
        <div style={{
          marginTop: 8,
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="sk" style={{ width: 60, height: 13 }} />
            <div className="sk" style={{ width: 60, height: 13 }} />
          </div>
          <div className="sk" style={{ width: "100%", height: 50, borderRadius: 14, marginTop: 4 }} />
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { tr } = useI18n();
  const tCart = tr.client.cart;
  const tCommon = tr.client.common;
  const router = useRouter();
  const items          = useCartStore((s) => s.items);
  const totalCents     = useCartStore((s) => s.totalCents());
  const clearCart      = useCartStore((s) => s.clearCart);
  const addItem        = useCartStore((s) => s.addItem);
  const removeItem     = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateNote     = useCartStore((s) => s.updateNote);
  const updatePortata  = useCartStore((s) => s.updatePortata);
  const initFromDB     = useCartStore((s) => s.initFromDB);
  const initialized    = useCartStore((s) => s.initialized);

  useCartRealtime();

  // Aggiunge piatto upsell passato via query params (da /status)
  const searchParams = useSearchParams();
  const upsellAdded = useRef(false);
  const hasUpsellParam = !!searchParams.get("upsell_id");
  const [addingUpsell, setAddingUpsell] = useState(hasUpsellParam);
  useEffect(() => {
    if (!initialized || upsellAdded.current) return;
    const id      = searchParams.get("upsell_id");
    const name    = searchParams.get("upsell_name");
    const price   = searchParams.get("upsell_price");
    const portata = searchParams.get("upsell_portata");
    if (!id || !name || !price) { setAddingUpsell(false); return; }
    upsellAdded.current = true;
    addItem({
      menuItemId: id,
      name,
      basePriceCents: Number(price),
      customizations: [],
      portata: portata ? Number(portata) : 1,
      portataLocked: true,
    }).finally(() => setAddingUpsell(false));
  }, [initialized]);

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState(false);
  const submitted = React.useRef(false);
  const [session,       setSession]       = useState<ReturnType<typeof getTableSession>>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [brandColor, setBrandColor] = useState<string>(() => {
    // Lettura sincrona al mount: evita il flash di colore sbagliato
    // mentre il useEffect async carica il brand dal DB.
    if (typeof window === "undefined") return "#ffffff";
    try {
      const sess = getTableSession();
      if (sess?.restaurantId) {
        const cached = localStorage.getItem(`brand_color_${sess.restaurantId}`);
        if (cached) return cached;
      }
      // Fallback: prende l'unico brand_color in cache se ce n'è uno solo
      const keys = Object.keys(localStorage).filter(k => k.startsWith("brand_color_"));
      if (keys.length === 1) return localStorage.getItem(keys[0]) || "#ffffff";
    } catch {}
    return "#ffffff";
  });
  const [brandReady, setBrandReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const sess = getTableSession();
      if (sess?.restaurantId && localStorage.getItem(`brand_color_${sess.restaurantId}`)) return true;
      const keys = Object.keys(localStorage).filter(k => k.startsWith("brand_color_"));
      if (keys.length === 1) return true;
    } catch {}
    return false;
  });
  const [backgroundType, setBackgroundType] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const sess = getTableSession();
      if (sess?.restaurantId) {
        const cached = localStorage.getItem(`bg_type_${sess.restaurantId}`);
        if (cached) return cached;
      }
    } catch {}
    return null;
  });
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const sess = getTableSession();
      if (sess?.restaurantId) {
        const cached = localStorage.getItem(`bg_url_${sess.restaurantId}`);
        if (cached) return cached;
      }
    } catch {}
    return null;
  });

  const [showCustomization, setShowCustomization] = useState(false);
  const [customizingItem,   setCustomizingItem]   = useState<{
    menuItemId: string; name: string; basePriceCents: number; customizationsKey: string;
  } | null>(null);
  const [itemOptions, setItemOptions] = useState<ModalOption[]>([]);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteItem,      setNoteItem]      = useState<{ orderItemId: string; name: string; note: string } | null>(null);

  // Mappa menuItemId → true se ha almeno un'opzione di personalizzazione nel DB
  const [hasOptions,    setHasOptions]    = useState<Record<string, boolean>>({});

  // Mappa menuItemId → image_url dal DB
  const [itemImages,    setItemImages]    = useState<Record<string, string | null>>({});

  // ── Coupon & payment: gestiti nella pagina /confirm ─────────────────────

  // ── Portate (ordine di arrivo piatti) ─────────────────────────────────────
  const [showPortataSelector, setShowPortataSelector] = useState<string | null>(null);
  const [portataError, setPortataError] = useState<string | null>(null);
  const portataErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxExistingPortata = useMemo(() => Math.max(...items.map(i => i.portata ?? 1), 1), [items]);
  const selectablePortate = maxExistingPortata + 1;
  // Portate già CONSEGNATE su un ordine attivo del tavolo: non si può più
  // assegnare un piatto a queste. Una portata solo "riservata" (es. un piatto
  // upsell bloccato ma non ancora servito) non conta: altri piatti possono
  // ancora condividerla.
  const storeActivePortataFloor = useCartStore((s) => s.activePortataFloor);
  const portataFloor = storeActivePortataFloor ?? 0;

  const showPortataError = (msg: string) => {
    setPortataError(msg);
    if (portataErrorTimeout.current) clearTimeout(portataErrorTimeout.current);
    portataErrorTimeout.current = setTimeout(() => setPortataError(null), 3000);
  };

  const handlePortataChange = (orderItemId: string, newPortata: number, currentItem: { portata?: number; menuItemId: string; totalQty?: number }) => {
    const currentPortata = currentItem.portata ?? 1;
    if (newPortata === currentPortata) return;

    const isSplit = (currentItem.totalQty ?? 1) > 1;

    // Simula lo spostamento e verifica che non si creino buchi.
    // Se qty > 1 facciamo uno split: l'item originale resta in currentPortata
    // (con qty-1) e 1 unità va in newPortata — quindi simuliamo l'aggiunta
    // senza rimuovere l'originale.
    const simulatedItems = isSplit
      ? [...items, { ...items.find(i => i.orderItemId === orderItemId)!, portata: newPortata }]
      : items.map(i => i.orderItemId === orderItemId ? { ...i, portata: newPortata } : i);

    const portateAfterMove = new Set(simulatedItems.map(i => i.portata ?? 1));
    const maxAfter = Math.max(...portateAfterMove);
    for (let p = 1; p < maxAfter; p++) {
      if (!portateAfterMove.has(p)) {
        showPortataError(tCart.cantMoveEmpty.replace('{p}', String(p)));
        return;
      }
    }

    updatePortata(orderItemId, newPortata);
    setShowPortataSelector(null);
  };

  // Raggruppa items per portata (usa item.portata dallo store)
  const groupedByPortata = useMemo(() => {
    const groups: Record<number, typeof items> = {};
    items.forEach(item => {
      const p = item.portata ?? 1;
      if (!groups[p]) groups[p] = [];
      groups[p].push(item);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([p, groupItems]) => ({ portata: Number(p), items: mergeDuplicateItems(groupItems) }));
  }, [items]);

  const portataLabels: Record<number, string> = { 1: tCart.courseLabel1, 2: tCart.courseLabel2, 3: tCart.courseLabel3, 4: tCart.courseLabel4 };

  // Conteggio reale dei piatti: somma delle quantità, non il numero di righe/card
  // (es. "Acqua x3" + "Agnello x1" → 4 piatti, non 2).
  const totalDishesCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );




  // ── Swipe-delete animation ───────────────────────────────────────────────────
  // revealedId  = card spostata a sx, pannello rosso visibile, in attesa di conferma
  // confirmingId = tap su "Elimina" → vola via
  const [revealedId,    setRevealedId]    = useState<string | null>(null);
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null);
  const [deletedName,   setDeletedName]   = useState<string | null>(null);
  const [showEmptyAnim, setShowEmptyAnim] = useState(false);

  // ── Pre-fetch: quali piatti hanno personalizzazioni disponibili ──────────────
  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.menuItemId))];
    if (ids.length === 0) return;
    const unchecked = ids.filter((id) => !(id in hasOptions));
    if (unchecked.length === 0) return;

    (async () => {
      const inList = `(${unchecked.join(",")})`;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/menu_item_options?item_id=in.${inList}&select=item_id`,
          { headers: supabaseHeaders },
        );
        const rows: { item_id: string }[] = res.ok ? await res.json() : [];
        const withOptions = new Set(rows.map((r) => r.item_id));
        setHasOptions((prev) => {
          const next = { ...prev };
          unchecked.forEach((id) => { next[id] = withOptions.has(id); });
          return next;
        });
      } catch { /* silently fallback — button stays hidden */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── Pre-fetch: immagini dei piatti dal DB ─────────────────────────────────
  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.menuItemId))];
    if (ids.length === 0) return;
    const unchecked = ids.filter((id) => !(id in itemImages));
    if (unchecked.length === 0) return;

    (async () => {
      try {
        const res = await fetch(`/api/menu-items/images?ids=${encodeURIComponent(unchecked.join(","))}`);
        const json = res.ok ? await res.json() : { items: [] };
        const rows: { id: string; image_url: string | null }[] = json.items ?? [];
        setItemImages((prev) => {
          const next = { ...prev };
          unchecked.forEach((id) => {
            const row = rows.find((r) => r.id === id);
            next[id] = row?.image_url ?? null;
          });
          return next;
        });
      } catch { /* silently fallback — mostra iniziale */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── Stagger entrance animation ───────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const initialItemIdsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    // Memorizza gli ID dei piatti presenti al caricamento iniziale
    items.forEach(i => { if (i.orderItemId) initialItemIdsRef.current.add(i.orderItemId); });
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Button press state ───────────────────────────────────────────────────────
  // key = `${orderItemId}-nota` | `${orderItemId}-personalizza`
  const [activeBtn,   setActiveBtn]   = useState<string | null>(null);
  const [navigating,  setNavigating]  = useState(false);

  const pressBtn = (key: string, cb: () => void) => {
    setActiveBtn(key);
    setTimeout(() => { setActiveBtn(null); cb(); }, 340);
  };

  // ── Stepper quantità: animazione "slot machine" ──────────────────────────────
  // Per ogni primaryId tiene il valore precedente e la direzione del cambio,
  // così il numero vecchio scorre via e il nuovo arriva da sopra/sotto.
  // Si auto-pulisce dopo la durata della transizione CSS.
  const [qtyAnim, setQtyAnim] = useState<Record<string, { prevQty: number; direction: 1 | -1 }>>({});
  const qtyAnimTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleStepperChange = (primaryId: string, currentQty: number, delta: 1 | -1) => {
    if (qtyAnimTimers.current[primaryId]) clearTimeout(qtyAnimTimers.current[primaryId]);
    setQtyAnim(prev => ({ ...prev, [primaryId]: { prevQty: currentQty, direction: delta } }));
    updateQuantity(primaryId, delta);
    qtyAnimTimers.current[primaryId] = setTimeout(() => {
      setQtyAnim(prev => {
        const next = { ...prev };
        delete next[primaryId];
        return next;
      });
    }, 320);
  };

  useEffect(() => {
    return () => {
      Object.values(qtyAnimTimers.current).forEach(clearTimeout);
    };
  }, []);

// ── Carica sessione + brand_color ────────────────────────────────────────────
useEffect(() => {
  const sess = getTableSession();
  setSession(sess);
  setSessionLoaded(true);

  // Legge il colore brand dalla cache locale solo dopo il mount (client-only),
  // così l'HTML iniziale combacia tra server e client.
  let cachedColor: string | null = null;
  try {
    cachedColor = sess?.restaurantId
      ? localStorage.getItem(`brand_color_${sess.restaurantId}`)
      : null;
    if (cachedColor) {
      setBrandColor(cachedColor);
      setBrandReady(true);
    }
  } catch {}

  if (sess?.restaurantId) {
    (async () => {
      try {
        const res = await fetch(`/api/restaurant/${sess.restaurantId}`);
        const data = res.ok ? await res.json() : null;
        if (data?.brand_color) {
          setBrandColor(data.brand_color);
          try { localStorage.setItem(`brand_color_${sess.restaurantId}`, data.brand_color); } catch {}
        }
        if (data?.background_type) {
          setBackgroundType(data.background_type);
          try { localStorage.setItem(`bg_type_${sess.restaurantId}`, data.background_type); } catch {}
        }
        if (data?.background_image_url) {
          setBackgroundImageUrl(data.background_image_url);
          try { localStorage.setItem(`bg_url_${sess.restaurantId}`, data.background_image_url); } catch {}
        }
      } finally {
        setBrandReady(true);
      }
    })();
  } else {
    setBrandReady(true);
  }
}, []);

  // Palette sempre aggiornata al brand_color
  const T = useMemo(() => buildPalette(brandColor), [brandColor]);

  const pageBg =
    backgroundType === "image" && backgroundImageUrl
      ? `url(${backgroundImageUrl}) center/cover no-repeat fixed`
      : backgroundType === "color" && backgroundImageUrl
      ? backgroundImageUrl
      : T.bgGradient;

  const storeLoading = useCartStore((s) => s.loading);
  const orderId      = useCartStore((s) => s.orderId);

  // ── Inizializza il carrello dal DB se non è già stato fatto ──────────────
  // Necessario perché lo store Zustand non persiste tra reload: senza questo,
  // un refresh della pagina /cart troverebbe items=[] e orderId=null e
  // reindirizzerebbe erroneamente a /order anche con un ordine attivo.
  useEffect(() => {
    if (!sessionLoaded || !session) return;
    if (initialized || storeLoading) return;
    const tableId = (session as { tableId?: string | null }).tableId ?? null;
initFromDB(
  tableId,
  session.restaurantId ?? null,
  session.restaurantSlug ?? "",
  session.sessionId ?? null,   // ← corretto
);  }, [sessionLoaded, session, initialized, storeLoading, initFromDB]);

  useEffect(() => {
    if (!sessionLoaded || storeLoading || !initialized) return;
    if (!session) return;
    const sid = session.sessionId;
    if (!sid) return;
    // Piccolo debounce: lascia a Zustand il tempo di committare items e orderId
    // nello stesso batch dopo che initFromDB ha completato, evitando il redirect
    // prematuro che si verificava al F5 quando initialized=true ma items=[] ancora.
    const isUpsell = !!searchParams.get("upsell_id");
    const t = setTimeout(() => {
      if (orderId === null && items.length === 0 && !submitted.current && !isUpsell) {
        router.replace(`/order/${sid}`);
      }
    }, isUpsell ? 1500 : 80);
    return () => clearTimeout(t);
  }, [sessionLoaded, storeLoading, initialized, orderId, items.length, session, router]);

  const TIMEOUT_MS      = 15 * 60 * 1000;
  const lastActivityRef = React.useRef<number>(Date.now());

  useEffect(() => {
    const upd = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("click",      upd);
    window.addEventListener("keydown",    upd);
    window.addEventListener("touchstart", upd);
    const iv = setInterval(() => {
      if (Date.now() - lastActivityRef.current > TIMEOUT_MS) {
        clearInterval(iv);
        useCartStore.getState().clearCart();
        const oid = useCartStore.getState().orderId;
        if (oid) {
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?id=eq.${oid}`, {
            method: "PATCH",
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ status: "expired" }),
          });
        }
        router.replace("/");
      }
    }, 30_000);
    return () => {
      window.removeEventListener("click",      upd);
      window.removeEventListener("keydown",    upd);
      window.removeEventListener("touchstart", upd);
      clearInterval(iv);
    };
  }, [router]);

  const sessionId = useMemo(() => session?.sessionId || null, [session]);




  const menuHref = useMemo(() => {
    if (!sessionId) return "/";
    const slug  = session?.restaurantSlug || "";
    const table = session?.tableNumber    || "";
    const params = new URLSearchParams();
    if (slug)  params.set("slug",  slug);
    if (table) params.set("table", String(table));
    const qs = params.toString();
    return `/order/${sessionId}${qs ? `?${qs}` : ""}`;
  }, [sessionId, session]);

  // Fase 1: cestino premuto → rivela pannello rosso
  const handleRevealDelete = (orderItemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmingId) return; // animazione già in corso
    if (revealedId === orderItemId) {
      // secondo tap sul cestino = annulla
      setRevealedId(null);
    } else {
      setRevealedId(orderItemId);
    }
  };

  // Fase 2: tap su "Elimina" → conferma rimozione (rimuove tutti gli orderItemIds del gruppo unito)
  const handleConfirmDelete = (orderItemIds: string[], itemName: string, portata: number, portataItemsCount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (portataItemsCount === 1 && portata === 1) {
      showPortataError(tCart.onlyItemInCourse);
      return;
    }
    const isLast = items.length === orderItemIds.length;
    setRevealedId(null);
    setConfirmingId(orderItemIds[0]);
    setDeletedName(itemName);
    setTimeout(() => {
      orderItemIds.forEach((id) => removeItem(id));
      setConfirmingId(null);
      if (isLast) {
        setShowEmptyAnim(true);
      } else {
        setTimeout(() => setDeletedName(null), 2500);
      }
    }, 600);
  };

  // Tap fuori = annulla la rivelazione
  const handleDismissReveal = () => {
    if (revealedId) setRevealedId(null);
    if (showPortataSelector) setShowPortataSelector(null);
  };

  const handleOpenNote = (orderItemId: string, name: string, currentNote: string) => {
    setNoteItem({ orderItemId, name, note: currentNote });
    setShowNoteModal(true);
  };

  const handleSaveNote = async (note: string) => {
    if (!noteItem) return;
    await updateNote(noteItem.orderItemId, note);
    setShowNoteModal(false);
    setTimeout(() => setNoteItem(null), 350); // lascia tempo all'animazione di uscita
  };

  const handleOpenCustomization = async (menuItemId: string, customizationsKey: string) => {
    try {
      const options = await getMenuItemOptions(menuItemId);
      if (options.length === 0) { setError(tCart.noCustomizationsForItem); return; }
      const item = items.find(
        (i) => i.menuItemId === menuItemId && JSON.stringify(i.customizations) === customizationsKey
      );
      if (!item) return;
      setCustomizingItem({ menuItemId: item.menuItemId, name: item.name, basePriceCents: item.priceCents, customizationsKey });
      setItemOptions(options);
      setShowCustomization(true);
    } catch { setError(tCart.cannotLoadOptions); }
  };

  const handleCustomizationConfirm = async (customizations: CartCustomization[]) => {
    if (!customizingItem) return;
    useCartStore.setState((state) => ({
      items: state.items.filter(
        (i) => !(i.menuItemId === customizingItem.menuItemId && JSON.stringify(i.customizations) === customizingItem.customizationsKey)
      ),
    }));
    await addItem({
      menuItemId:     customizingItem.menuItemId,
      name:           customizingItem.name,
      basePriceCents: customizingItem.basePriceCents,
      customizations,
    });
    setShowCustomization(false);
    setCustomizingItem(null);
    setItemOptions([]);
  };

  

  // ── STATI ────────────────────────────────────────────────────────────────────

  // Aspetta che il brand_color sia pronto prima di qualsiasi render.
  // Mostriamo un loader branded invece di uno schermo vuoto.
  if (!brandReady) return <CartSkeleton T={buildPalette(brandColor)} />;

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 28, padding: "48px 32px", maxWidth: 380, width: "100%", textAlign: "center", backdropFilter: "blur(14px)", boxShadow: `0 24px 60px -20px ${T.border}` }}>
          <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
            <div style={{ position: "absolute", inset: -6, borderRadius: "50%", background: T.accentBg, animation: "qroPulse 2s ease-in-out infinite" }} />
            <div style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.btnShadow }}>
              <CheckCircle size={38} color="#fff" strokeWidth={2.4} />
            </div>
          </div>
          <p style={{ color: T.accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}>{tCart.orderSentEyebrow}</p>
          <h2 className="font-serif text-lift" style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: "0 0 12px" }}>{tCart.orderSentTitle}</h2>
          <p style={{ color: T.textMuted, fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
            {tCart.kitchenReceived}
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.textMuted, fontSize: 13, opacity: 0.7, marginTop: 6 }}>
            <Loader2 size={12} style={{ animation: "qroSpin 0.9s linear infinite" }} />
            Reindirizzamento in corso…
          </div>
        </div>
      </div>
    );
  }

  if (!sessionLoaded) return <CartSkeleton T={T} />;

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 28, padding: "44px 28px", maxWidth: 360, width: "100%", textAlign: "center", backdropFilter: "blur(14px)", boxShadow: `0 24px 60px -20px ${T.border}` }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.amberBg, border: `1.5px solid rgba(245,158,11,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <AlertCircle size={34} color={T.amber} strokeWidth={2} />
          </div>
          <p style={{ color: T.amber, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 6px" }}>{tCart.sessionInvalidEyebrow}</p>
          <h2 className="font-serif text-lift" style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>{tCart.sessionExpired}</h2>
          <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.55, marginBottom: 28 }}>{tCart.sessionScanAgain}</p>
          <Link href="/" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", padding: "14px", borderRadius: 14, background: T.btnBg, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: T.btnShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ArrowLeft size={16} />
              {tCart.backHome}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!initialized || storeLoading || addingUpsell) return <CartSkeleton T={T} />;

  if (items.length === 0 || showEmptyAnim) {
    const handleGoToMenu = () => {
      if (navigating) return;
      setNavigating(true);
      // dopo press + exit animation, naviga al menu corretto
      setTimeout(() => router.push(menuHref), 420);
    };

    return (
      <div
        className={navigating ? "page-exiting" : ""}
        style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}
      >
        <style>{`
          @keyframes emptyFadeIn {
            from { opacity:0; transform: scale(0.92) translateY(16px); }
            to   { opacity:1; transform: scale(1)    translateY(0);    }
          }
          @keyframes navBtnPress {
            0%   { transform: scale(1);    opacity: 1; }
            30%  { transform: scale(0.94); opacity: 0.9; }
            65%  { transform: scale(1.02); opacity: 1; }
            100% { transform: scale(1);    opacity: 1; }
          }
          @keyframes pageExit {
            0%   { opacity: 1; transform: translateX(0);     }
            100% { opacity: 0; transform: translateX(-28px); }
          }
          @keyframes qroBagFloat {
            0%, 100% { transform: translateY(0) rotate(-3deg); }
            50%      { transform: translateY(-6px) rotate(2deg); }
          }
          @keyframes qroPulse {
            0%, 100% { transform: scale(1); opacity: 0.55; }
            50%      { transform: scale(1.18); opacity: 0.9; }
          }
          .nav-btn-pressed {
            animation: navBtnPress 0.25s cubic-bezier(0.34,1.3,0.64,1) forwards !important;
            pointer-events: none;
          }
          .page-exiting {
            animation: pageExit 0.3s cubic-bezier(0.55,0,1,0.45) forwards;
          }
        `}</style>
        {/* Decorative brand blobs */}
        <div aria-hidden style={{ position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: T.accentBg, filter: "blur(40px)", pointerEvents: "none", zIndex: 0 }} />
        <div aria-hidden style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: T.accentBg, filter: "blur(50px)", opacity: 0.7, pointerEvents: "none", zIndex: 0 }} />
        <div style={{
          position: "relative", zIndex: 1,
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 28,
          padding: "44px 28px 36px", maxWidth: 360, width: "100%", textAlign: "center",
          backdropFilter: "blur(14px)",
          boxShadow: `0 24px 60px -20px ${T.border}`,
          animation: showEmptyAnim ? "emptyFadeIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
        }}>
          <div style={{
            position: "relative", width: 84, height: 84,
            margin: "0 auto 22px",
            animation: showEmptyAnim ? "emptyFadeIn 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
          }}>
            <div aria-hidden style={{ position: "absolute", inset: -8, borderRadius: "50%", background: T.accentBg, animation: "qroPulse 2.4s ease-in-out infinite" }} />
            <div style={{
              position: "relative", width: 84, height: 84, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: T.btnShadow,
              animation: "qroBagFloat 3.6s ease-in-out infinite",
            }}>
              <ShoppingBag size={34} color="#fff" strokeWidth={1.8} />
            </div>
          </div>
          <p style={{ color: T.accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 6px" }}>{tCart.emptyEyebrow}</p>
          <h2 className="font-serif text-lift" style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>{tCart.empty}</h2>
          <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.55, marginBottom: 28, padding: "0 8px" }}>{tCart.emptyLong}</p>
          <button
            className={navigating ? "nav-btn-pressed" : ""}
            onClick={handleGoToMenu}
            aria-label={tCart.browseMenu}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 14,
              background: T.btnBg, border: "none", color: "#fff",
              fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em",
              cursor: navigating ? "not-allowed" : "pointer",
              boxShadow: T.btnShadow,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "box-shadow 0.2s, transform 0.15s",
            }}
          >
            <UtensilsCrossed size={16} />
            {tCart.browseMenu}
            <ChevronRight size={16} strokeWidth={2.5} style={{ marginLeft: -2 }} />
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER PRINCIPALE ────────────────────────────────────────────────────────
  return (
    <div
      onClick={handleDismissReveal}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: pageBg,
        color: T.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
        ["--brand" as string]: T.brand,
      }}
    >
      {/* Decorative brand-tinted background blobs (fixed, behind everything) */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -10, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -140, right: -120, width: 460, height: 460, borderRadius: "50%", background: `${T.brand}22`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: -160, left: -140, width: 420, height: 420, borderRadius: "50%", background: `${T.brand}14`, filter: "blur(90px)" }} />
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Stagger entrata card ── */
        @keyframes cardEnter {
          0%   { opacity: 0; transform: translateY(18px) scale(0.97); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.005); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* ── Swipe delete ── */
        @keyframes slideReveal {
          from { transform: translateX(0); }
          to   { transform: translateX(var(--reveal-offset)); }
        }
        @keyframes slideBack {
          from { transform: translateX(var(--reveal-offset)); }
          to   { transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          0%   { transform: translateX(var(--reveal-offset)); }
          100% { transform: translateX(-115%); }
        }
        @keyframes collapseHeight {
          0%   { max-height: 300px; margin-bottom: 10px; opacity: 0; }
          100% { max-height: 0;     margin-bottom: 0;    opacity: 0; }
        }

        /* ── Press feedback bottoni azione ── */
        .btn-action {
          transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.15s ease,
                      border-color 0.15s ease,
                      color 0.15s ease,
                      box-shadow 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          touch-action: manipulation;
        }
        .btn-action:active {
          transform: scale(0.92) !important;
        }
        @media (hover: none) {
          .btn-action:active {
            transform: scale(0.88) !important;
            opacity: 0.85;
          }
        }
        .btn-stepper {
          transition: transform 0.1s ease, color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .btn-stepper:active:not(:disabled) {
          transform: scale(0.82);
        }

        /* ── Press animato via JS (Personalizza / Aggiungi nota) ── */
        @keyframes btnPress {
          0%   { transform: scale(1);    box-shadow: none; filter: brightness(1);   }
          25%  { transform: scale(0.86); box-shadow: none; filter: brightness(0.92); }
          55%  { transform: scale(1.06);                   filter: brightness(1.05); }
          100% { transform: scale(1);                      filter: brightness(1);   }
        }
        @keyframes btnPressIcon {
          0%   { transform: rotate(0deg)   scale(1); }
          30%  { transform: rotate(-16deg) scale(0.8); }
          65%  { transform: rotate(8deg)   scale(1.15); }
          100% { transform: rotate(0deg)   scale(1); }
        }
        .btn-pressed {
          animation: btnPress 0.34s cubic-bezier(0.34,1.3,0.64,1) forwards !important;
          pointer-events: none;
          background: rgba(0,0,0,0.04) !important;
        }
        .btn-pressed .btn-icon {
          animation: btnPressIcon 0.34s cubic-bezier(0.34,1.3,0.64,1) forwards;
        }

        /* ── Navigazione carrello vuoto ── */
        @keyframes navBtnPress {
          0%   { transform: scale(1);    opacity: 1; }
          30%  { transform: scale(0.94); opacity: 0.9; }
          65%  { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes pageExit {
          0%   { opacity: 1; transform: translateX(0);    }
          100% { opacity: 0; transform: translateX(-28px); }
        }
        .nav-btn-pressed {
          animation: navBtnPress 0.25s cubic-bezier(0.34,1.3,0.64,1) forwards !important;
          pointer-events: none;
        }
        .page-exiting {
          animation: pageExit 0.3s cubic-bezier(0.55,0,1,0.45) forwards;
        }

        /* ── Modal slide-up ── */
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalSheetIn {
          from { transform: translateY(100%); opacity: 0.4; }
          to   { transform: translateY(0);    opacity: 1;   }
        }

        /* ── Toast ── */
        @keyframes toastIn {
          from { opacity:0; transform: translateX(-50%) translateY(14px) scale(0.95); }
          to   { opacity:1; transform: translateX(-50%) translateY(0)    scale(1);    }
        }

        /* ── Carrello vuoto ── */
        @keyframes emptyFadeIn {
          from { opacity:0; transform: scale(0.92) translateY(16px); }
          to   { opacity:1; transform: scale(1)    translateY(0);    }
        }

        .spin-icon {
          animation: spin 0.8s linear infinite;
        }

        /* ── Menu button: stile FAB (ripple + shimmer) ── */
        @keyframes menuShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes menuRipple {
          0%   { transform: scale(1);   opacity: 0.45; }
          100% { transform: scale(2.2); opacity: 0;    }
        }
        @keyframes menuFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-2px); }
        }
        .menu-btn {
          transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .menu-btn:active {
          transform: scale(0.90) !important;
        }
        .menu-btn-icon {
          animation: menuFloat 3.2s ease-in-out infinite;
        }

        /* ── Coupon & metodo pagamento: entrata + interazione ── */
        @keyframes sectionEnter {
          0%   { opacity: 0; transform: translateY(14px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes paymentPop {
          0%   { transform: scale(1);    }
          40%  { transform: scale(0.95); }
          70%  { transform: scale(1.03); }
          100% { transform: scale(1);    }
        }
        @keyframes couponSuccessIn {
          0%   { opacity: 0; transform: scale(0.92) translateY(-4px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0);    }
          100% { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .coupon-trigger, .coupon-apply-btn, .payment-card {
          transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .coupon-trigger:active, .coupon-apply-btn:active {
          transform: scale(0.97) !important;
        }
        .payment-card:active {
          transform: scale(0.96) !important;
        }
        .payment-card.selected {
          animation: paymentPop 0.32s cubic-bezier(0.34,1.3,0.64,1);
        }

        @keyframes portataErrorIn {
          0%   { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        /* ── Portata badge ── */
        @keyframes portataPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.85); }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes portataSelectorIn {
          0%   { opacity: 0; transform: translateY(6px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .portata-badge {
          transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .portata-badge:active {
          transform: scale(0.88) !important;
        }
        .portata-badge.popped {
          animation: portataPop 0.35s cubic-bezier(0.34,1.3,0.64,1);
        }
        .portata-selector {
          animation: portataSelectorIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .portata-option {
          transition: transform 0.12s ease, background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .portata-option:active {
          transform: scale(0.9) !important;
        }

        /* ── Portata section header ── */
        @keyframes sectionHeaderIn {
          0%   { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        /* ── Stepper quantità: effetto slot machine ── */
        /* Aumento (+): il numero attuale scorre verso il basso e uscendo,
           il nuovo arriva da sopra. Diminuzione (-): l'opposto. */
        @keyframes slotOutDown {
          0%   { transform: translateY(0);      opacity: 1; }
          100% { transform: translateY(110%);   opacity: 0; }
        }
        @keyframes slotInFromTop {
          0%   { transform: translateY(-110%);  opacity: 0; }
          100% { transform: translateY(0);      opacity: 1; }
        }
        @keyframes slotOutUp {
          0%   { transform: translateY(0);      opacity: 1; }
          100% { transform: translateY(-110%);  opacity: 0; }
        }
        @keyframes slotInFromBottom {
          0%   { transform: translateY(110%);   opacity: 0; }
          100% { transform: translateY(0);      opacity: 1; }
        }
        .qty-slot-viewport {
          position: relative;
          display: inline-block;
          overflow: hidden;
          line-height: 19px;
        }
        .qty-slot-digit {
          display: block;
          line-height: 19px;
        }
        .qty-slot-digit.slot-out-down  { animation: slotOutDown 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
        .qty-slot-digit.slot-in-top    { animation: slotInFromTop 0.28s cubic-bezier(0.16,1,0.3,1) forwards; }
        .qty-slot-digit.slot-out-up    { animation: slotOutUp 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
        .qty-slot-digit.slot-in-bottom { animation: slotInFromBottom 0.28s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Header fisso in cima */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: T.headerBg,
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        borderBottom: `1px solid ${T.borderSoft}`,
        padding: "0 16px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Brand accent underline */}
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}40, ${T.accent}, ${T.accent}40, transparent)`, pointerEvents: "none" }} />
        <Link
          href={menuHref}
          className="menu-btn"
          aria-label={tCart.backToMenuAria}
          style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          <div className="menu-btn-icon" style={{
            position: "relative",
            width: 34, height: 34,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            boxShadow: `0 3px 12px ${T.accentBg}`,
            flexShrink: 0,
          }}>
            {/* Ripple rings */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: T.accent, opacity: 0,
              animation: "menuRipple 2.6s ease-out 0.4s infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: T.accent, opacity: 0,
              animation: "menuRipple 2.6s ease-out 1.7s infinite",
              pointerEvents: "none",
            }} />
            {/* Shimmer */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "menuShimmer 2.8s ease-in-out 1s infinite",
              pointerEvents: "none",
            }} />
            <ArrowLeft size={16} strokeWidth={2.5} color="#fff" style={{ position: "relative", zIndex: 1 }} />
          </div>
          <span style={{ display: "inline-block" }}>{tCart.menuLabel}</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChefHat size={15} color={T.accent} />
          </div>
          <span className="font-serif" style={{ fontWeight: 700, fontSize: 18, color: T.text, letterSpacing: "-0.02em" }}>{tCart.yourCart}</span>
        </div>
        {/* Language + dish count */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LanguageSwitcher />
        {/* Dish count badge */}
        <div
          aria-label={`${totalDishesCount} ${totalDishesCount === 1 ? tCart.dishInCart : tCart.dishesInCart}`}
          style={{
            minWidth: 32, height: 32, padding: "0 10px",
            borderRadius: 999,
            background: T.accentBg,
            border: `1px solid ${T.borderSoft}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            color: T.accent, fontSize: 12, fontWeight: 800, letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <ShoppingBag size={13} strokeWidth={2.4} />
          {totalDishesCount}
        </div>
        </div>
      </div>

      <div style={{ width: "100%", padding: "88px 10px 160px", position: "relative", zIndex: 1 }}>

        {/* Errore */}
        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 14, padding: "13px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start", animation: "cardEnter 0.3s ease forwards" }}>
            <AlertCircle size={17} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: T.danger, fontSize: 14, margin: 0, lineHeight: 1.45 }}>{error}</p>
          </div>
        )}


        {/* Lista items raggruppati per portata */}
        <div onClick={handleDismissReveal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupedByPortata.map(({ portata, items: portataItems }, groupIdx) => (
            <React.Fragment key={portata}>
              {/* Section header portata */}
              <div style={{
                marginTop: groupIdx > 0 ? 22 : 4,
                marginBottom: 6,
                animation: `sectionHeaderIn 0.35s ${groupIdx * 0.08}s cubic-bezier(0.16,1,0.3,1) both`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 14, border: `1px solid ${T.borderSoft}`, boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
                  {/* Cerchio numerato */}
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: T.btnShadow }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{portata}</span>
                  </div>
                  {/* Etichetta */}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: T.accent, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                    {portataLabels[portata] || `${portata === 1 ? tCart.courseFirst : portata === 2 ? tCart.courseSecond : portata === 3 ? tCart.courseThird : portata === 4 ? tCart.courseFourth : `${portata}ª`} ${tCart.courseWord}`}
                  </span>
                  {/* Totale portata */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.accent, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    € {formatPrice(portataItems.reduce((s, it) => s + (typeof it.priceCents === "number" ? it.priceCents : 0) * (typeof it.totalQty === "number" ? it.totalQty : 1), 0))}
                  </span>
                </div>
              </div>

              {portataItems.map((item, idx) => {
            const price    = typeof item.priceCents === "number" ? item.priceCents : 0;
            const qty      = typeof item.totalQty   === "number" ? item.totalQty   : 1;
            const lineTotal = price * qty;
            const customizationsKey = JSON.stringify(item.customizations);
            const primaryId = item.orderItemIds[0];

            const isRevealed   = revealedId   === primaryId;
            const isConfirming = confirmingId === primaryId;
            // larghezza pannello rosso: icona (20) + gap (8) + testo ~70px + padding 24*2 ≈ 120px
            const REVEAL_OFFSET = "-112px";
            const isInitialItem = initialItemIdsRef.current.has(primaryId ?? "");
            const staggerDelay = (isInitialItem && !mounted) ? `${idx * 70}ms` : "0ms";

            return (
              <div
                key={`${primaryId ?? item.menuItemId}-${customizationsKey}`}
                style={{
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  // stagger entrata: solo al primo render (mounted=false → items appena caricati)
                  // dopo mounted=true, i nuovi item non hanno lo stagger
                  opacity: isConfirming ? undefined : (isInitialItem && !mounted ? 0 : undefined),
                  animation: isConfirming
                    ? `collapseHeight 0.35s 0.55s ease forwards`
                    : `cardEnter 0.45s cubic-bezier(0.25,0.46,0.45,0.94) ${staggerDelay} forwards`,
                }}
              >
                {/* Card */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    background: "#ffffff",
                    border: "1.5px solid #dde6f5",
                    borderRadius: 20,
                    padding: "11px 13px 10px",
                    boxShadow: "0 2px 12px rgba(100,130,200,0.08)",
                    animation: isConfirming ? `slideOutLeft 0.55s cubic-bezier(0.55,0,1,0.45) forwards` : undefined,
                  }}
                >
                {/* Top row: immagine circolare + nome/prezzo + bottone nota */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* Immagine circolare */}
                  <div aria-hidden style={{
                    width: 54, height: 54,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                    border: "2px solid #edf2fb",
                  }}>
                    {itemImages[item.menuItemId] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={itemImages[item.menuItemId]!}
                        alt={item.name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="font-serif" style={{ position: "relative", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                        {item.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>

                  {/* Nome + prezzo + nota */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 2px", color: "#1a2236", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </h3>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#1a2236", fontVariantNumeric: "tabular-nums" }}>
                      {formatPrice(lineTotal)} €
                    </span>
                    {item.note ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <Pencil size={11} color="#94a3b8" strokeWidth={2} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.note}</span>
                        <button
                          onClick={() => pressBtn(`${primaryId}-nota`, () => handleOpenNote(primaryId, item.name, item.note ?? ""))}
                          style={{ fontSize: 11, color: "#93b4d8", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, textDecoration: "underline" }}
                        >{tCart.edit}</button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        <button
                          onClick={() => pressBtn(`${primaryId}-nota`, () => handleOpenNote(primaryId, item.name, ""))}
                          style={{ fontSize: 11, color: "#93b4d8", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                        >{tCart.addNote}</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divisore tratteggiato */}
                <div style={{ borderTop: "1.5px dashed #dde6f5", margin: "12px 0 10px" }} />

                {/* Bottom row: portata | qty | + | - | cestino */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  {/* Portata selector */}
                  <div style={{ position: "relative" }}>
                    <button
                      className="portata-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.portataLocked) return;
                        setShowPortataSelector(showPortataSelector === primaryId ? null : primaryId);
                      }}
                      aria-label={item.portataLocked ? `${tCart.courseWord} ${item.portata ?? 1}, ${tCart.courseNotEditable}` : `${tCart.changeCourse} ${item.portata ?? 1}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "7px 11px", borderRadius: 12,
                        background: "#f4f6fa",
                        border: `1.5px solid ${showPortataSelector === primaryId ? T.accent : "#dde6f5"}`,
                        cursor: item.portataLocked ? "default" : "pointer",
                        opacity: item.portataLocked ? 0.7 : 1,
                        fontSize: 13, fontWeight: 700, color: "#1a2236",
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>{item.portata ?? 1}</span>
                      <span style={{ fontSize: 11 }}>ª</span>
                      {!item.portataLocked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showPortataSelector === primaryId ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                          <path d="M2 3.5L5 6.5L8 3.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    {!item.portataLocked && showPortataSelector === primaryId && (
                      <div className="portata-selector" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #dde6f5", borderRadius: 14, padding: 5, boxShadow: "0 10px 36px rgba(0,0,0,0.14)", zIndex: 100, display: "flex", gap: 4, minWidth: "max-content" }}>
                        {Array.from({ length: selectablePortate }, (_, i) => i + 1).filter((p) => p > portataFloor).map((p) => (
                          <button key={p} className="portata-option" onClick={(e) => { e.stopPropagation(); handlePortataChange(primaryId, p, item); }} aria-label={`${tCart.moveToCourse} ${p}`}
                            style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", border: (item.portata ?? 1) === p ? `2px solid ${T.accent}` : "1px solid #dde6f5", background: (item.portata ?? 1) === p ? T.accentBg : "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: (item.portata ?? 1) === p ? T.accent : "#64748b" }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>


                  {/* Blocco [-] 1 [+] unificato */}
                  <div style={{ display: "flex", alignItems: "center", background: "#f1f4f8", border: "1.5px solid #dde6f5", borderRadius: 10, overflow: "hidden" }}>
                    <button className="btn-stepper" onPointerDown={(e) => { e.preventDefault(); if (qty > 1) handleStepperChange(primaryId, qty, -1); }} disabled={qty <= 1} aria-label={tCart.decreaseQty}
                      style={{ width: 34, height: 34, background: "none", border: "none", borderRight: "1.5px solid #dde6f5", cursor: qty <= 1 ? "not-allowed" : "pointer", color: qty <= 1 ? "#b0bdd0" : T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Minus size={14} strokeWidth={2.4} />
                    </button>
                    <span className="qty-slot-viewport" style={{ minWidth: 32, height: 34, textAlign: "center", fontWeight: 800, fontSize: 15, color: "#1a2236", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "0 4px", overflow: "hidden" }}>
                      {(() => {
                        const anim = qtyAnim[primaryId];
                        if (!anim) return <span className="qty-slot-digit">{qty}</span>;
                        const outClass = anim.direction === 1 ? "slot-out-down" : "slot-out-up";
                        const inClass  = anim.direction === 1 ? "slot-in-top"   : "slot-in-bottom";
                        return (
                          <>
                            <span className={`qty-slot-digit ${outClass}`} style={{ position: "absolute", left: 0, right: 0 }}>{anim.prevQty}</span>
                            <span className={`qty-slot-digit ${inClass}`}>{qty}</span>
                          </>
                        );
                      })()}
                    </span>
                    <button className="btn-stepper" onPointerDown={(e) => { e.preventDefault(); handleStepperChange(primaryId, qty, 1); }} aria-label={tCart.increaseQty}
                      style={{ width: 34, height: 34, background: "none", border: "none", borderLeft: "1.5px solid #dde6f5", cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plus size={14} strokeWidth={2.4} />
                    </button>
                  </div>

                  {/* Cestino */}
                  <button onClick={(e) => handleConfirmDelete(item.orderItemIds, item.name, portata, portataItems.length, e)} disabled={!!confirmingId} aria-label={`${tCart.deleteAria} ${item.name}`}
                    style={{ width: 34, height: 34, borderRadius: 10, background: "transparent", border: "none", cursor: confirmingId ? "not-allowed" : "pointer", color: "#e53e3e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Personalizza (se disponibile) */}
                {hasOptions[item.menuItemId] && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      className={`btn-action${activeBtn === `${primaryId}-personalizza` ? " btn-pressed" : ""}`}
                      onClick={() => pressBtn(`${primaryId}-personalizza`, () => handleOpenCustomization(item.menuItemId, customizationsKey))}
                      aria-label={tCart.customizeAria}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", background: "#f4f6fa", border: "1.5px solid #dde6f5", borderRadius: 999, color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Settings size={12} strokeWidth={2.2} /> {tCart.customize}
                    </button>
                  </div>
                )}

                </div>{/* fine card inner */}
              </div>
            );
          })}
            </React.Fragment>
          ))}
        </div>

        {/* ── fine lista portate ─────────────────────────────────────────── */}
        </div>

      {/* Toast "Piatto eliminato" */}
      <AnimatePresence>
        {deletedName && !showEmptyAnim && (
          <motion.div
            key="deleted-toast"
            initial={{ opacity: 0, y: 16, x: "-50%", scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            style={{
              position: "fixed", bottom: 130, left: "50%",
              zIndex: 200,
              background: "rgba(28, 25, 23, 0.96)",
              color: "#fff",
              padding: "11px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              pointerEvents: "none",
            }}
          >
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} color="#f87171" />
            </div>
            <span><span style={{ color: "#f87171", fontWeight: 700 }}>{deletedName}</span> {tCart.deleted}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast errore portata */}
      <AnimatePresence>
        {portataError && (
          <motion.div
            key="portata-error"
            initial={{ opacity: 0, y: 12, x: "-50%", scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            style={{
              position: "fixed", bottom: 80, left: "50%",
              zIndex: 200,
              background: "rgba(28, 25, 23, 0.96)", color: "#fbbf24",
              padding: "12px 20px", borderRadius: 16,
              fontSize: 13, fontWeight: 700,
              boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 8,
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(251,191,36,0.2)",
              width: "calc(100vw - 40px)", maxWidth: 360,
              whiteSpace: "normal",
            }}
          >
            <AlertCircle size={15} color="#fbbf24" />
            {portataError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky checkout bar — glass + safe-bottom */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            key="checkout-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
              background: T.footerBg,
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              borderTop: `1px solid ${T.border}`,
              padding: "14px 16px",
              paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              boxShadow: `0 -8px 32px ${T.borderSoft}`,
            }}
          >
            {/* Brand accent top line */}
            <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}40, ${T.accent}, ${T.accent}40, transparent)`, pointerEvents: "none" }} />
            <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
              {/* Left: dish count */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.1 }}>
                  {totalDishesCount === 1 ? tCart.dish : tCart.dishes}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.textMuted }}>
                  <ShoppingBag size={13} color={T.accent} strokeWidth={2.4} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{totalDishesCount}</span>
                </div>
              </div>
              {/* Divider */}
              <div aria-hidden style={{ width: 1, height: 32, background: T.borderSoft, flexShrink: 0 }} />
              {/* Center: Totale */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.1 }}>{tCart.total}</span>
                <span style={{ fontWeight: 900, fontSize: 24, color: T.text, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {formatPrice(totalCents)} <span style={{ fontSize: 16, fontWeight: 700, color: T.textMuted }}>€</span>
                </span>
              </div>
              {/* Right: Vai alla cassa */}
              <Link
                href={sessionId ? `/confirm/${sessionId}` : "#"}
                aria-label={tCart.checkout}
                style={{
                  padding: "14px 18px",
                  borderRadius: 999,
                  background: T.btnBg,
                  border: "none",
                  color: "#fff",
                  fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
                  boxShadow: T.btnShadow,
                  display: "flex", alignItems: "center", gap: 6,
                  textDecoration: "none",
                  flexShrink: 0,
                  transition: "transform 0.15s, box-shadow 0.2s",
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>{tCart.checkout}</span>
                <ChevronRight size={18} strokeWidth={2.6} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NoteModal
        isOpen={showNoteModal}
        itemName={noteItem?.name ?? ""}
        initialNote={noteItem?.note ?? ""}
        brandColor={brandColor}
        onClose={() => { setShowNoteModal(false); setNoteItem(null); }}
        onSave={handleSaveNote}
      />
      <CustomizationModal
        isOpen={showCustomization}
        options={itemOptions}
        itemName={customizingItem?.name ?? ""}
        brandColor={brandColor}
        onClose={() => { setShowCustomization(false); setCustomizingItem(null); setItemOptions([]); }}
        onConfirm={handleCustomizationConfirm}
      />
    </div>
  );
}