// src/app/(client)/cart/[sessionId]/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
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

export default function CartPage() {
  const router = useRouter();
  const items          = useCartStore((s) => s.items);
  const totalCents     = useCartStore((s) => s.totalCents());
  const clearCart      = useCartStore((s) => s.clearCart);
  const addItem        = useCartStore((s) => s.addItem);
  const removeItem     = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateNote     = useCartStore((s) => s.updateNote);
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

  // ── Coupon ────────────────────────────────────────────────────────────────
  const [couponCode,    setCouponCode]    = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState<string | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);

  // ── Metodo di pagamento ──────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      // TODO: collegare alla validazione reale del coupon (es. tabella `coupons`)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/coupons?code=eq.${encodeURIComponent(code)}&select=*`,
        { headers: supabaseHeaders }
      );
      if (!res.ok) throw new Error("Errore di rete");
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setCouponError("Codice coupon non valido");
        setCouponApplied(null);
        return;
      }
      const coupon = data[0];
      let discountCents = 0;
      if (coupon.discount_type === "percent") {
        discountCents = Math.round((totalCents * coupon.discount_value) / 100);
      } else {
        discountCents = coupon.discount_value;
      }
      discountCents = Math.min(discountCents, totalCents);
      setCouponApplied({ code, discountCents });
    } catch {
      setCouponError("Impossibile verificare il coupon");
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError(null);
    setShowCouponInput(false);
  };

  // ── Swipe-delete animation ───────────────────────────────────────────────────
  // revealedId  = card spostata a sx, pannello rosso visibile, in attesa di conferma
  // confirmingId = tap su "Elimina" → vola via
  const [revealedId,    setRevealedId]    = useState<string | null>(null);
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null);
  const [deletedName,   setDeletedName]   = useState<string | null>(null);
  const [showEmptyAnim, setShowEmptyAnim] = useState(false);

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
    setTimeout(() => { setActiveBtn(null); cb(); }, 160);
  };

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

  const discountCents = couponApplied?.discountCents ?? 0;
  const finalTotalCents = Math.max(0, totalCents - discountCents);

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

  // Fase 2: tap su "Elimina" → conferma rimozione
  const handleConfirmDelete = (orderItemId: string, itemName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLast = items.length === 1;
    setRevealedId(null);
    setConfirmingId(orderItemId);
    setDeletedName(itemName);
    setTimeout(() => {
      removeItem(orderItemId);
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

  const handleCheckout = async () => {
    if (items.length === 0) return;
    const currentSessionId = session?.sessionId;
    if (!currentSessionId) { setError("Sessione tavolo mancante. Scansiona di nuovo il QR."); return; }
    const activeOrderId = useCartStore.getState().orderId;
    if (!activeOrderId) { setError("Ordine non trovato. Ricarica la pagina e riprova."); return; }
    setLoading(true);
    setError(null);
    try {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${activeOrderId}`, {
        method: "PATCH",
        headers: { ...supabaseHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          status:        "confirmed",
          total_cents:   finalTotalCents,
          discount_cents: discountCents,
          coupon_code:   couponApplied?.code ?? null,
          payment_method: paymentMethod,
          ordine:        items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
          confirmed_at:  new Date().toISOString(),
          updated_at:    new Date().toISOString(),
        }),
      });
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        throw new Error(`Errore conferma ordine: ${errText}`);
      }
      setSuccess(true);
      submitted.current = true;
      clearCart();
      useCartStore.setState({ orderId: null });
      setTimeout(() => router.push(`/status/${currentSessionId}`), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante l'invio.");
    } finally {
      setLoading(false);
    }
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
        }
        .btn-action:active {
          transform: scale(0.92) !important;
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
          0%   { transform: scale(1);    box-shadow: none; }
          35%  { transform: scale(0.90); box-shadow: none; }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1);    }
        }
        @keyframes btnPressIcon {
          0%   { transform: rotate(0deg)   scale(1); }
          40%  { transform: rotate(-12deg) scale(0.85); }
          75%  { transform: rotate(6deg)   scale(1.1); }
          100% { transform: rotate(0deg)   scale(1); }
        }
        .btn-pressed {
          animation: btnPress 0.32s cubic-bezier(0.34,1.3,0.64,1) forwards !important;
          pointer-events: none;
        }
        .btn-pressed .btn-icon {
          animation: btnPressIcon 0.32s cubic-bezier(0.34,1.3,0.64,1) forwards;
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
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{items.length}</span>
            </div>
            <p style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {items.length === 1 ? "piatto selezionato" : "piatti selezionati"}
            </p>
          </div>
        </div>

        {/* Lista items */}
        <div onClick={handleDismissReveal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, idx) => {
            const price    = typeof item.priceCents === "number" ? item.priceCents : 0;
            const qty      = typeof item.quantity   === "number" ? item.quantity   : 1;
            const lineTotal = price * qty;
            const customizationsKey = JSON.stringify(item.customizations);

            const isRevealed   = revealedId   === item.orderItemId;
            const isConfirming = confirmingId === item.orderItemId;
            // larghezza pannello rosso: icona (20) + gap (8) + testo ~70px + padding 24*2 ≈ 120px
            const REVEAL_OFFSET = "-112px";
            const isInitialItem = initialItemIdsRef.current.has(item.orderItemId ?? "");
            const staggerDelay = (isInitialItem && !mounted) ? `${idx * 70}ms` : "0ms";

            return (
              <div
                key={`${item.orderItemId ?? item.menuItemId}-${customizationsKey}`}
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
                    onClick={(e) => handleConfirmDelete(item.orderItemId!, item.name, e)}
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
                      onClick={(e) => handleRevealDelete(item.orderItemId!, e)}
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
                  {/* Stepper */}
                  <div style={{ display: "flex", alignItems: "center", background: T.accentBg, border: `1px solid ${T.borderSoft}`, borderRadius: 11, overflow: "hidden" }}>
                    <button
                      className="btn-stepper"
                      onClick={() => updateQuantity(item.orderItemId!, -1)}
                      disabled={qty <= 1}
                      style={{ padding: "8px 13px", background: "transparent", border: "none", cursor: qty <= 1 ? "not-allowed" : "pointer", color: qty <= 1 ? T.border : T.accent, display: "flex" }}
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span style={{ padding: "0 2px", minWidth: 30, textAlign: "center", fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.01em" }}>
                      {qty}
                    </span>
                    <button
                      className="btn-stepper"
                      onClick={() => updateQuantity(item.orderItemId!, 1)}
                      style={{ padding: "8px 13px", background: "transparent", border: "none", cursor: "pointer", color: T.accent, display: "flex" }}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Personalizza + Nota */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className={`btn-action${activeBtn === `${item.orderItemId}-personalizza` ? " btn-pressed" : ""}`}
                      onClick={() => pressBtn(`${item.orderItemId}-personalizza`, () => handleOpenCustomization(item.menuItemId, customizationsKey))}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 11px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "-0.01em" }}
                    >
                      <Settings size={12} className="btn-icon" strokeWidth={2.2} /> Personalizza
                    </button>

                    <button
                      className={`btn-action${activeBtn === `${item.orderItemId}-nota` ? " btn-pressed" : ""}`}
                      onClick={() => pressBtn(`${item.orderItemId}-nota`, () => handleOpenNote(item.orderItemId!, item.name, item.note ?? ""))}
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
        </div>

        {/* ── Coupon ─────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, animation: "sectionEnter 0.4s cubic-bezier(0.25,0.46,0.45,0.94) forwards" }}>
          {!couponApplied ? (
            <>
              {!showCouponInput ? (
                <button
                  className="coupon-trigger"
                  onClick={() => setShowCouponInput(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "13px 16px",
                    background: T.bgCard, border: `1px solid ${T.borderSoft}`,
                    borderRadius: 14, cursor: "pointer",
                    color: T.textMuted, fontSize: 13, fontWeight: 700,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <Tag size={15} color={T.accent} />
                  Hai un codice coupon?
                </button>
              ) : (
                <div style={{
                  background: T.bgCard, border: `1px solid ${T.borderSoft}`,
                  borderRadius: 14, padding: 12,
                  display: "flex", flexDirection: "column", gap: 8,
                  animation: "sectionEnter 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <Tag size={14} color={T.accent} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                        placeholder="Codice coupon"
                        autoFocus
                        style={{
                          width: "100%", padding: "11px 12px 11px 34px",
                          borderRadius: 10, border: `1px solid ${T.border}`,
                          fontSize: 14, fontWeight: 600, color: T.text,
                          background: "#fff", outline: "none",
                          letterSpacing: "0.04em", textTransform: "uppercase",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <button
                      className="coupon-apply-btn"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      style={{
                        padding: "0 18px", borderRadius: 10, border: "none",
                        background: T.btnBg, color: "#fff", fontWeight: 700, fontSize: 13,
                        cursor: couponLoading || !couponCode.trim() ? "not-allowed" : "pointer",
                        opacity: !couponCode.trim() ? 0.5 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        minWidth: 76,
                      }}
                    >
                      {couponLoading ? <Loader2 size={15} className="spin-icon" /> : "Applica"}
                    </button>
                  </div>
                  {couponError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.danger, fontSize: 12, fontWeight: 600, animation: "sectionEnter 0.25s ease forwards" }}>
                      <AlertCircle size={13} />
                      {couponError}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 14, padding: "12px 14px",
              animation: "couponSuccessIn 0.4s cubic-bezier(0.34,1.3,0.64,1) forwards",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Tag size={15} color="#16a34a" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d", letterSpacing: "0.02em" }}>
                    {couponApplied.code}
                  </div>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
                    Sconto di {formatPrice(couponApplied.discountCents)} € applicato
                  </div>
                </div>
              </div>
              <button
                onClick={handleRemoveCoupon}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#16a34a", padding: 4, display: "flex" }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ── Metodo di pagamento ───────────────────────────────────────── */}
        <div style={{ marginTop: 18, animation: "sectionEnter 0.4s 0.05s cubic-bezier(0.25,0.46,0.45,0.94) forwards" }}>
          <p style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 10px" }}>
            Come vuoi pagare?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className={`payment-card${paymentMethod === "cash" ? " selected" : ""}`}
              onClick={() => setPaymentMethod("cash")}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "14px 10px", borderRadius: 14,
                border: paymentMethod === "cash" ? `2px solid ${T.accent}` : `1px solid ${T.borderSoft}`,
                background: paymentMethod === "cash" ? T.accentBg : T.bgCard,
                boxShadow: paymentMethod === "cash" ? `0 4px 14px ${T.accentBg}` : "none",
                cursor: "pointer",
              }}
            >
              <Banknote size={20} color={paymentMethod === "cash" ? T.accent : T.textMuted} />
              <span style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === "cash" ? T.text : T.textMuted, letterSpacing: "-0.01em" }}>
                Contanti
              </span>
              <span style={{ fontSize: 11, color: T.textMuted, opacity: 0.7, textAlign: "center" }}>
                Paghi dopo aver mangiato
              </span>
            </button>

            <button
              className={`payment-card${paymentMethod === "card" ? " selected" : ""}`}
              onClick={() => setPaymentMethod("card")}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                padding: "14px 10px", borderRadius: 14,
                border: paymentMethod === "card" ? `2px solid ${T.accent}` : `1px solid ${T.borderSoft}`,
                background: paymentMethod === "card" ? T.accentBg : T.bgCard,
                boxShadow: paymentMethod === "card" ? `0 4px 14px ${T.accentBg}` : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <CreditCard size={20} color={paymentMethod === "card" ? T.accent : T.textMuted} />
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: paymentMethod === "card" ? T.text : T.textMuted, letterSpacing: "-0.01em" }}>
                Paga con carta
                <svg viewBox="0 0 24 24" width="15" height="15" fill={paymentMethod === "card" ? T.text : T.textMuted} aria-label="Apple Pay">
                  <path d="M16.5 3.5c-.9.1-1.95.65-2.55 1.35-.55.65-1 1.6-.85 2.55.95.05 1.95-.5 2.55-1.2.6-.65 1-1.55.85-2.7zM19.4 8.85c-1.4-.05-2.55.8-3.2.8-.7 0-1.7-.75-2.85-.75-1.45 0-2.8.85-3.55 2.15-1.5 2.6-.4 6.6 1.05 8.8.7 1.05 1.55 2.2 2.65 2.15 1.05-.05 1.45-.7 2.75-.7 1.3 0 1.65.7 2.8.65 1.15-.05 1.9-1.05 2.6-2.1.8-1.2 1.15-2.35 1.15-2.45-.05 0-2.25-.85-2.25-3.4 0-2.15 1.7-3.15 1.8-3.2-.95-1.4-2.45-1.6-2.95-1.95z"/>
                  <text x="11" y="20" fontSize="9" fontWeight="700" fontFamily="system-ui" fill="currentColor" textAnchor="middle">Pay</text>
                </svg>
              </span>
              <span style={{ fontSize: 11, color: T.textMuted, opacity: 0.7, textAlign: "center" }}>
                Apple Pay / Carta
              </span>
            </button>
          </div>
        </div>
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
          {couponApplied && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.textMuted }}>
              <span>Subtotale</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatPrice(totalCents)} €</span>
            </div>
          )}
          {couponApplied && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#16a34a", fontWeight: 700 }}>
              <span>Sconto ({couponApplied.code})</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>-{formatPrice(discountCents)} €</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
            <div>
              <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Totale ordine</span>
              <span style={{ fontSize: 11, color: T.textMuted, opacity: 0.6 }}>{items.length} {items.length === 1 ? "piatto" : "piatti"} · {paymentMethod === "cash" ? "Contanti" : "Carta"}</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 26, color: T.text, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              {formatPrice(finalTotalCents)} €
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading || items.length === 0}
            style={{
              width: "100%", padding: "15px",
              borderRadius: 14,
              background: loading ? `${T.accent}4d` : T.btnBg,
              border: "none",
              color: "#fff",
              fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em",
              cursor: loading || items.length === 0 ? "not-allowed" : "pointer",
              opacity: items.length === 0 ? 0.5 : 1,
              boxShadow: loading ? "none" : T.btnShadow,
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                Invio in corso…
              </>
            ) : (
              <>
                <ChefHat size={18} />
                Invia alla cucina
              </>
            )}
          </button>
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