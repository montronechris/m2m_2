// src/app/(client)/cart/[sessionId]/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { getTableSession } from "@/lib/table-session";
import { getMenuItemOptions, type ModalOption, type CartCustomization } from "@/lib/api-service";
import {
  Trash2, Plus, Minus, ArrowLeft,
  Settings, CheckCircle, AlertCircle,
  ShoppingBag, StickyNote, ChefHat,
  Tag, Banknote, CreditCard, X, Loader2,
} from "lucide-react";
import Link from "next/link";
import CustomizationModal from "@/components/client/cart/CustomizationModal";
import NoteModal from "@/components/client/cart/NoteModal";
import { supabase } from "@/lib/supabase";

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
    const key = `${item.menuItemId}::${JSON.stringify(item.customizations)}`;
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

export default function CartPage() {
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

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState(false);
  const submitted = React.useRef(false);
  const [session,       setSession]       = useState<ReturnType<typeof getTableSession>>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [brandColor,    setBrandColor]    = useState<string>("#ffffff");
  const [brandReady, setBrandReady] = useState<boolean>(false);

  const [showCustomization, setShowCustomization] = useState(false);
  const [customizingItem,   setCustomizingItem]   = useState<{
    menuItemId: string; name: string; basePriceCents: number; customizationsKey: string;
  } | null>(null);
  const [itemOptions, setItemOptions] = useState<ModalOption[]>([]);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteItem,      setNoteItem]      = useState<{ orderItemId: string; name: string; note: string } | null>(null);

  // Mappa menuItemId → true se ha almeno un'opzione di personalizzazione nel DB
  const [hasOptions,    setHasOptions]    = useState<Record<string, boolean>>({});

  // ── Coupon & payment: gestiti nella pagina /confirm ─────────────────────

  // ── Portate (ordine di arrivo piatti) ─────────────────────────────────────
  const [showPortataSelector, setShowPortataSelector] = useState<string | null>(null);
  const [portataError, setPortataError] = useState<string | null>(null);
  const portataErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxExistingPortata = useMemo(() => Math.max(...items.map(i => i.portata ?? 1), 1), [items]);
  const selectablePortate = maxExistingPortata + 1;

  const showPortataError = (msg: string) => {
    setPortataError(msg);
    if (portataErrorTimeout.current) clearTimeout(portataErrorTimeout.current);
    portataErrorTimeout.current = setTimeout(() => setPortataError(null), 3000);
  };

  const handlePortataChange = (orderItemId: string, newPortata: number, currentItem: { portata?: number; menuItemId: string }) => {
    const currentPortata = currentItem.portata ?? 1;
    if (newPortata === currentPortata) return;

    // Simula lo spostamento e verifica che non si creino buchi
    const simulatedItems = items.map(i =>
      i.orderItemId === orderItemId ? { ...i, portata: newPortata } : i
    );
    const portateAfterMove = new Set(simulatedItems.map(i => i.portata ?? 1));
    const maxAfter = Math.max(...portateAfterMove);
    for (let p = 1; p < maxAfter; p++) {
      if (!portateAfterMove.has(p)) {
        showPortataError(`Non puoi spostare: la portata ${p} resterebbe vuota`);
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

  const portataLabels: Record<number, string> = { 1: "1ª Portata", 2: "2ª Portata", 3: "3ª Portata", 4: "4ª Portata" };

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
        const { data } = await supabase
          .from("restaurants")
          .select("brand_color")
          .eq("id", sess.restaurantId)
          .single();
        if (data?.brand_color) {
          setBrandColor(data.brand_color);
          try { localStorage.setItem(`brand_color_${sess.restaurantId}`, data.brand_color); } catch {}
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
    const t = setTimeout(() => {
      if (orderId === null && items.length === 0 && !submitted.current) {
        router.replace(`/order/${sid}`);
      }
    }, 80);
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
  const handleConfirmDelete = (orderItemIds: string[], itemName: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    setNoteItem(null);
  };

  const handleOpenCustomization = async (menuItemId: string, customizationsKey: string) => {
    try {
      const options = await getMenuItemOptions(menuItemId);
      if (options.length === 0) { setError("Nessuna personalizzazione disponibile per questo piatto"); return; }
      const item = items.find(
        (i) => i.menuItemId === menuItemId && JSON.stringify(i.customizations) === customizationsKey
      );
      if (!item) return;
      setCustomizingItem({ menuItemId: item.menuItemId, name: item.name, basePriceCents: item.priceCents, customizationsKey });
      setItemOptions(options);
      setShowCustomization(true);
    } catch { setError("Impossibile caricare le opzioni"); }
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

  // Aspetta che il brand_color sia pronto prima di qualsiasi render
  if (!brandReady) return null;

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 24, padding: "48px 32px", maxWidth: 380, width: "100%", textAlign: "center", backdropFilter: "blur(12px)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.accentBg, border: `2px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle size={36} color={T.accent} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Ordine inviato!</h2>
          <p style={{ color: T.textMuted, fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
            La cucina ha ricevuto la tua comanda. Tra poco sarà al tuo tavolo.
          </p>
          <p style={{ color: T.textMuted, fontSize: 13, opacity: 0.6 }}>Reindirizzamento in corso…</p>
        </div>
      </div>
    );
  }

  if (!sessionLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, border: `3px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 24, padding: "40px 28px", maxWidth: 360, width: "100%", textAlign: "center", backdropFilter: "blur(12px)" }}>
          <AlertCircle size={40} color={T.amber} style={{ margin: "0 auto 20px", display: "block" }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>Sessione scaduta</h2>
          <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 24 }}>Scansiona di nuovo il QR code al tavolo.</p>
          <Link href="/">
            <button style={{ width: "100%", padding: "13px", borderRadius: 12, background: T.btnBg, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Torna alla home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!initialized || storeLoading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, border: `3px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

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
        style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
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
          .nav-btn-pressed {
            animation: navBtnPress 0.25s cubic-bezier(0.34,1.3,0.64,1) forwards !important;
            pointer-events: none;
          }
          .page-exiting {
            animation: pageExit 0.3s cubic-bezier(0.55,0,1,0.45) forwards;
          }
        `}</style>
        <div style={{
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 24,
          padding: "40px 28px", maxWidth: 360, width: "100%", textAlign: "center",
          backdropFilter: "blur(12px)",
          animation: showEmptyAnim ? "emptyFadeIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: T.accentBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            animation: showEmptyAnim ? "emptyFadeIn 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
          }}>
            <ShoppingBag size={32} color={T.accent} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 10px" }}>Carrello vuoto</h2>
          <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 28 }}>Aggiungi qualche piatto dal menu per procedere.</p>
          <button
            className={navigating ? "nav-btn-pressed" : ""}
            onClick={handleGoToMenu}
            style={{
              width: "100%", padding: "13px", borderRadius: 12,
              background: T.btnBg, border: "none", color: "#fff",
              fontWeight: 700, fontSize: 15, cursor: navigating ? "not-allowed" : "pointer",
              boxShadow: T.btnShadow,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "box-shadow 0.2s",
            }}
          >
            <ShoppingBag size={16} />
            Sfoglia il menu
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER PRINCIPALE ────────────────────────────────────────────────────────
  return (
    <div onClick={handleDismissReveal} style={{ minHeight: "100vh", background: T.bgGradient, color: T.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
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

      {/* Header sticky */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: T.headerBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.borderSoft}`,
        padding: "0 20px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link
          href={menuHref}
          className="menu-btn"
          style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          <div className="menu-btn-icon" style={{
            position: "relative",
            width: 32, height: 32,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            boxShadow: `0 3px 10px ${T.accentBg}`,
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
            <ArrowLeft size={15} strokeWidth={2.5} color="#fff" style={{ position: "relative", zIndex: 1 }} />
          </div>
          Menu
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChefHat size={15} color={T.accent} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.02em" }}>Il tuo ordine</span>
        </div>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 160px" }}>

        {/* Errore */}
        {error && (
          <div style={{ background: T.dangerBg, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 14, padding: "13px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start", animation: "cardEnter 0.3s ease forwards" }}>
            <AlertCircle size={17} color={T.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: T.danger, fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Conteggio */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{totalDishesCount}</span>
            </div>
            <p style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {totalDishesCount === 1 ? "piatto" : "piatti"} · {groupedByPortata.length} {groupedByPortata.length === 1 ? "portata" : "portate"}
            </p>
          </div>
        </div>

        {/* Lista items raggruppati per portata */}
        <div onClick={handleDismissReveal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupedByPortata.map(({ portata, items: portataItems }, groupIdx) => (
            <React.Fragment key={portata}>
              {/* Section header portata */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginTop: groupIdx > 0 ? 14 : 0,
                marginBottom: 4,
                animation: `sectionHeaderIn 0.35s ${groupIdx * 0.08}s cubic-bezier(0.16,1,0.3,1) both`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: T.accentBg,
                  border: `1.5px solid ${T.borderSoft}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: T.accent,
                }}>
                  {portata}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {portataLabels[portata] || `${portata}ª Portata`}
                </span>
                <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
                <span style={{ fontSize: 11, color: T.textMuted, opacity: 0.6, fontWeight: 600 }}>
                  {(() => {
                    const portataQty = portataItems.reduce((sum, it) => sum + it.totalQty, 0);
                    return `${portataQty} ${portataQty === 1 ? "piatto" : "piatti"}`;
                  })()}
                </span>
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
                  borderRadius: 18,
                  overflow: "hidden",
                  // stagger entrata: solo al primo render (mounted=false → items appena caricati)
                  // dopo mounted=true, i nuovi item non hanno lo stagger
                  opacity: isConfirming ? undefined : (isInitialItem && !mounted ? 0 : undefined),
                  animation: isConfirming
                    ? `collapseHeight 0.35s 0.55s ease forwards`
                    : `cardEnter 0.45s cubic-bezier(0.25,0.46,0.45,0.94) ${staggerDelay} forwards`,
                }}
              >
                {/* Pannello rosso fisso dietro */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg, #dc2626, #ef4444)",
                  borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "flex-end",
                  paddingRight: 22,
                  gap: 7,
                  zIndex: 0,
                }}>
                  <button
                    onClick={(e) => handleConfirmDelete(item.orderItemIds, item.name, e)}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "8px 4px",
                    }}
                  >
                    <Trash2 size={18} color="#fff" />
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>Elimina</span>
                  </button>
                </div>

                {/* Card — scorre parzialmente o vola via */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    background: T.bgCard,
                    border: `1px solid ${T.borderSoft}`,
                    borderRadius: 18,
                    borderLeft: `3px solid ${isRevealed || isConfirming ? "#ef4444" : T.accent}`,
                    padding: "16px 16px 14px",
                    backdropFilter: "blur(8px)",
                    boxShadow: `0 2px 12px ${T.borderSoft}`,
                    // CSS custom property per le keyframe
                    ["--reveal-offset" as string]: REVEAL_OFFSET,
                    animation: isConfirming
                      ? `slideOutLeft 0.55s cubic-bezier(0.55,0,1,0.45) forwards`
                      : isRevealed
                        ? `slideReveal 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards`
                        : revealedId === null
                          ? "none"
                          : `slideBack 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards`,
                    // mantieni posizione dopo animazione completata
                    transform: isRevealed ? `translateX(${REVEAL_OFFSET})` : undefined,
                  }}
                >
                {/* Nome + prezzo + cestino */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>
                      {item.name}
                    </h3>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: T.textMuted, background: T.accentBg, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.01em" }}>
                      {formatPrice(price)} € cad.
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 18, color: T.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                      {formatPrice(lineTotal)} €
                    </span>
                    <button
                      onClick={(e) => handleRevealDelete(primaryId, e)}
                      disabled={!!confirmingId}
                      style={{
                        background: isRevealed ? "rgba(239,68,68,0.10)" : T.accentBg,
                        border: `1px solid ${isRevealed ? "rgba(239,68,68,0.25)" : T.borderSoft}`,
                        cursor: confirmingId ? "not-allowed" : "pointer",
                        color: isRevealed ? T.danger : T.textMuted,
                        padding: 6, borderRadius: 9, display: "flex",
                        transition: "color 0.15s, background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={e => { if (!isRevealed) { e.currentTarget.style.color = T.danger; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; } }}
                      onMouseLeave={e => { if (!isRevealed) { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = T.accentBg; } }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Modifiche */}
                {Array.isArray(item.customizations) && item.customizations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {item.customizations.map((c, i) => (
                      <span key={i} style={{ background: T.accentBg, border: `1px solid ${T.borderSoft}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: T.textMuted, fontWeight: 500 }}>
                        {c.choiceName}{c.priceModifierCents > 0 ? ` +${formatPrice(c.priceModifierCents)} €` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Nota */}
                {item.note && (
                  <div style={{ background: T.amberBg, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 10, padding: "7px 11px", marginBottom: 10, display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <StickyNote size={13} color={T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: "#92400e", fontStyle: "italic" }}>{item.note}</span>
                  </div>
                )}

                {/* Azioni */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  {/* Portata badge + Stepper */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Portata selector */}
                    <div style={{ position: "relative" }}>
                      <button
                        className="portata-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPortataSelector(
                            showPortataSelector === primaryId ? null : primaryId
                          );
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 10px", borderRadius: 9,
                          background: T.accentBg,
                          border: `1.5px solid ${showPortataSelector === primaryId ? T.accent : T.borderSoft}`,
                          cursor: "pointer",
                          fontSize: 11, fontWeight: 700, color: T.accent,
                          letterSpacing: "0.01em",
                          boxShadow: showPortataSelector === primaryId ? `0 0 0 3px ${T.accentBg}` : "none",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{item.portata ?? 1}</span>
                        <span>ª</span>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{
                          transform: showPortataSelector === primaryId ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}>
                          <path d="M2 3.5L5 6.5L8 3.5" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {/* Portata dropdown */}
                      {showPortataSelector === primaryId && (
                        <div
                          className="portata-selector"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 6px)", left: 0,
                            background: "#fff",
                            border: `1px solid ${T.borderSoft}`,
                            borderRadius: 12,
                            padding: 4,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                            zIndex: 100,
                            display: "flex", gap: 3,
                            minWidth: "max-content",
                          }}
                        >
                          {Array.from({ length: selectablePortate }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              className="portata-option"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePortataChange(primaryId, p, item);
                              }}
                              style={{
                                width: 36, height: 36, borderRadius: 9,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                border: (item.portata ?? 1) === p ? `2px solid ${T.accent}` : `1px solid ${T.borderSoft}`,
                                background: (item.portata ?? 1) === p ? T.accentBg : "transparent",
                                cursor: "pointer",
                                fontSize: 14, fontWeight: 800,
                                color: (item.portata ?? 1) === p ? T.accent : T.textMuted,
                              }}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stepper */}
                  <div style={{ display: "flex", alignItems: "center", background: T.accentBg, border: `1px solid ${T.borderSoft}`, borderRadius: 11, overflow: "hidden" }}>
                    <button
                      className="btn-stepper"
                      onClick={() => handleStepperChange(primaryId, qty, -1)}
                      disabled={qty <= 1}
                      style={{ padding: "8px 13px", background: "transparent", border: "none", cursor: qty <= 1 ? "not-allowed" : "pointer", color: qty <= 1 ? T.border : T.accent, display: "flex" }}
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span
                      className="qty-slot-viewport"
                      style={{ padding: "0 2px", minWidth: 30, height: 19, textAlign: "center", fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.01em" }}
                    >
                      {(() => {
                        const anim = qtyAnim[primaryId];
                        if (!anim) {
                          return <span className="qty-slot-digit">{qty}</span>;
                        }
                        // direction 1 = è stato premuto "+": il vecchio numero esce verso il basso,
                        //               il nuovo entra da sopra.
                        // direction -1 = è stato premuto "-": il vecchio numero esce verso l'alto,
                        //                il nuovo entra da sotto.
                        const outClass = anim.direction === 1 ? "slot-out-down" : "slot-out-up";
                        const inClass  = anim.direction === 1 ? "slot-in-top"   : "slot-in-bottom";
                        return (
                          <>
                            <span
                              className={`qty-slot-digit ${outClass}`}
                              style={{ position: "absolute", left: 0, right: 0 }}
                            >
                              {anim.prevQty}
                            </span>
                            <span className={`qty-slot-digit ${inClass}`}>
                              {qty}
                            </span>
                          </>
                        );
                      })()}
                    </span>
                    <button
                      className="btn-stepper"
                      onClick={() => handleStepperChange(primaryId, qty, 1)}
                      style={{ padding: "8px 13px", background: "transparent", border: "none", cursor: "pointer", color: T.accent, display: "flex" }}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                  </div>{/* fine portata + stepper wrapper */}

                  {/* Personalizza + Nota */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {hasOptions[item.menuItemId] && (
                    <button
                      className={`btn-action${activeBtn === `${primaryId}-personalizza` ? " btn-pressed" : ""}`}
                      onClick={() => pressBtn(`${primaryId}-personalizza`, () => handleOpenCustomization(item.menuItemId, customizationsKey))}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 11px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "-0.01em" }}
                    >
                      <Settings size={12} className="btn-icon" strokeWidth={2.2} /> Personalizza
                    </button>
                    )}

                    <button
                      className={`btn-action${activeBtn === `${primaryId}-nota` ? " btn-pressed" : ""}`}
                      onClick={() => pressBtn(`${primaryId}-nota`, () => handleOpenNote(primaryId, item.name, item.note ?? ""))}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "7px 11px",
                        background: item.note ? T.amberBg : "transparent",
                        border: `1px solid ${item.note ? "rgba(245,158,11,0.3)" : T.border}`,
                        borderRadius: 10,
                        color: item.note ? "#92400e" : T.textMuted,
                        fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "-0.01em",
                      }}
                    >
                      <StickyNote size={12} className="btn-icon" strokeWidth={2.2} />
                      {item.note ? "Nota" : "Nota"}
                    </button>
                  </div>
                </div>
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
      {deletedName && !showEmptyAnim && (
        <div style={{
          position: "fixed", bottom: 110, left: "50%",
          zIndex: 200,
          background: "#1f2937",
          color: "#fff",
          padding: "11px 18px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
          animation: "toastIn 0.35s cubic-bezier(0.34,1.3,0.64,1) forwards",
          pointerEvents: "none",
        }}>
          <Trash2 size={14} color="#f87171" />
          <span><span style={{ color: "#f87171" }}>{deletedName}</span> eliminato</span>
        </div>
      )}

      {/* Toast errore portata */}
      {portataError && (
        <div style={{
          position: "fixed", bottom: 140, left: "50%", transform: "translateX(-50%)",
          zIndex: 200,
          background: "#1c1917", color: "#fbbf24",
          padding: "10px 18px", borderRadius: 12,
          fontSize: 13, fontWeight: 700,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "portataErrorIn 0.25s ease",
          maxWidth: "calc(100vw - 40px)",
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          {portataError}
        </div>
      )}

      {/* Footer fisso */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: T.footerBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: `1px solid ${T.border}`,
        padding: "14px 20px",
        paddingBottom: "max(14px, env(safe-area-inset-bottom))",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
            <div>
              <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Totale ordine</span>
              <span style={{ fontSize: 11, color: T.textMuted, opacity: 0.6 }}>{totalDishesCount} {totalDishesCount === 1 ? "piatto" : "piatti"}</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 26, color: T.text, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              {formatPrice(totalCents)} €
            </span>
          </div>
          <Link
            href={sessionId ? `/confirm/${sessionId}` : "#"}
            style={{
              width: "100%", padding: "15px",
              borderRadius: 14,
              background: items.length === 0 ? `${T.accent}4d` : T.btnBg,
              border: "none",
              color: "#fff",
              fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em",
              pointerEvents: items.length === 0 ? "none" : "auto",
              opacity: items.length === 0 ? 0.5 : 1,
              boxShadow: items.length === 0 ? "none" : T.btnShadow,
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              textDecoration: "none",
            }}
          >
            <ShoppingBag size={18} />
            Riepilogo ordine
          </Link>
        </div>
      </div>

      <NoteModal
        isOpen={showNoteModal}
        itemName={noteItem?.name ?? ""}
        initialNote={noteItem?.note ?? ""}
        onClose={() => { setShowNoteModal(false); setNoteItem(null); }}
        onSave={handleSaveNote}
      />
      <CustomizationModal
        isOpen={showCustomization}
        options={itemOptions}
        itemName={customizingItem?.name ?? ""}
        onClose={() => { setShowCustomization(false); setCustomizingItem(null); setItemOptions([]); }}
        onConfirm={handleCustomizationConfirm}
      />
    </div>
  );
}