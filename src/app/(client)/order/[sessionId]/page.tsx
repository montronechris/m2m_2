// src/app/(client)/order/[sessionId]/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderSession } from "@/hooks/useOrderSession";
<<<<<<< HEAD
=======
import { OrderHeader } from "@/components/client/order/OrderHeader";
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
import { CategoryFilter } from "@/components/client/order/CategoryFilter";
import { MenuItemCard } from "@/components/client/order/MenuItemCard";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getMenuItemOptions, type ModalOption, type CartCustomization } from "@/lib/api-service";
import { useCartExpiry } from "@/hooks/useCartExpiry";
import CustomizationModal from "@/components/client/cart/CustomizationModal";
<<<<<<< HEAD
import { RestaurantInfo } from "@/components/client/order/RestaurantInfo";
=======

>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b

// ─── Palette dinamica dal brand_color ─────────────────────────────────────────

/** Converte #rrggbb → [r,g,b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mescola due colori (0=primo, 1=secondo) */
function mix(hex1: string, hex2: string, t: number): string {
  const [r1,g1,b1] = hexToRgb(hex1);
  const [r2,g2,b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `#${[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("")}`;
}

/** Genera tutti i colori della UI a partire dal brand_color */
function buildPalette(brand: string) {
  const [r,g,b] = hexToRgb(brand);
  const dark500  = mix(brand, "#000000", 0.45);  // tono scurissimo per testi
  const dark400  = mix(brand, "#000000", 0.35);
  const dark300  = mix(brand, "#000000", 0.20);
  const light100 = mix(brand, "#ffffff", 0.88);  // sfondo chiarissimo
  const light200 = mix(brand, "#ffffff", 0.78);
  const light300 = mix(brand, "#ffffff", 0.60);
  const alpha = (a: number) => `rgba(${r},${g},${b},${a})`;
  return {
    brand,
    bg:           light100,
    bgGradient:   `linear-gradient(160deg, #ffffff 0%, ${mix(brand,"#ffffff",0.92)} 40%, ${mix(brand,"#ffffff",0.82)} 75%, ${mix(brand,"#ffffff",0.88)} 100%)`,
    text:         dark500,
    textMuted:    dark400,
    textSoft:     dark300,
    border:       alpha(0.20),
    borderMid:    alpha(0.30),
    borderStrong: alpha(0.50),
    bgCard:       "rgba(255,255,255,0.88)",
    grid:         alpha(0.08),
    light100,
    light200,
    light300,
    // Blob backgrounds
    blob1:        `radial-gradient(circle, ${alpha(0.28)} 0%, ${alpha(0.12)} 55%, transparent 100%)`,
    blob2:        `radial-gradient(circle, ${alpha(0.22)} 0%, ${alpha(0.08)} 55%, transparent 100%)`,
    blob3:        `radial-gradient(ellipse, ${alpha(0.30)} 0%, transparent 70%)`,
    blob4:        `radial-gradient(circle, ${alpha(0.20)} 0%, transparent 70%)`,
    // Bottoni
    btnBg:        `linear-gradient(135deg, ${brand}, ${dark300})`,
    btnShadow:    `0 6px 24px ${alpha(0.35)}`,
    // Chip / filtri
    chipBg:       `rgba(${r},${g},${b},0.10)`,
    chipBgActive: `rgba(${r},${g},${b},0.12)`,
    // Glow / pulse
    glowRing:     `0 0 0 6px ${alpha(0.08)}, 0 8px 40px ${alpha(0.30)}`,
    flyDot:       `radial-gradient(circle at 35% 35%, ${light200}, ${brand} 50%, ${dark300})`,
    flyGlow:      `0 0 16px 4px ${alpha(0.5)}`,
  };
}


export default function OrderPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const sessionId    = params.sessionId as string;
  // Lo slug dall'URL è opzionale: se non c'è, lo risolviamo da Supabase
  // tramite sessionId → qr_sessions → restaurants.slug.
  // NON usare mai un fallback hardcodato a un ristorante specifico.
  const slugFromUrl  = searchParams.get("slug");
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(slugFromUrl);

  // Se lo slug non è nell'URL, lo leggiamo da Supabase una sola volta
  useEffect(() => {
    if (slugFromUrl || !sessionId || resolvedSlug) return;
    import("@supabase/ssr").then(({ createBrowserClient }) => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      supabase
        .from("qr_sessions")
        .select("restaurant_id")
        .eq("id", sessionId)
        .maybeSingle()
        .then(({ data: qr }) => {
          if (!qr?.restaurant_id) return;
          supabase
            .from("restaurants")
            .select("slug")
            .eq("id", qr.restaurant_id)
            .single()
            .then(({ data: r }) => {
              if (r?.slug) setResolvedSlug(r.slug);
            });
        });
    });
  }, [sessionId, slugFromUrl, resolvedSlug]);

  const initFromDB = useCartStore((s) => s.initFromDB);
  const addItem    = useCartStore((s) => s.addItem);
  const cartCount  = useCartStore((s) => s.items.reduce((a, i) => a + i.quantity, 0));

  const { restaurant, tableNumber, categories, items, loading, error, tableId, restaurantId } =
    useOrderSession(sessionId, resolvedSlug ?? "");

  useEffect(() => {
    if (!tableId || !restaurantId || !resolvedSlug) return;
    initFromDB(tableId, restaurantId, resolvedSlug, sessionId);
  }, [tableId, restaurantId, resolvedSlug, sessionId, initFromDB]);

  const router = useRouter();

  // ── Tutti gli useState PRIMA di qualsiasi return condizionale ─────────────
  const [expired,           setExpired]           = useState(false);
  const [activeCat,         setActiveCat]         = useState("all");
  const [showCustomization, setShowCustomization] = useState(false);  // ← fix: era mancante
  const [flyingDot,         setFlyingDot]         = useState<{ x: number; y: number; id: number } | null>(null);
  const [pendingOriginRect, setPendingOriginRect] = useState<DOMRect | null>(null); // usato per dot dopo conferma modal
  const [currentItem,       setCurrentItem]       = useState<any>(null);
  const [itemOptions,       setItemOptions]       = useState<ModalOption[]>([]);
  const [loadingOptionsId,  setLoadingOptionsId]  = useState<string | null>(null);
  const [searchQuery,       setSearchQuery]       = useState("");
  const [filterVeg,         setFilterVeg]         = useState(false);
  const [filterGF,          setFilterGF]          = useState(false);
  const [searchOpen,        setSearchOpen]        = useState(false);
  const [searchAnimating,   setSearchAnimating]   = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isWarning, secondsLeft } = useCartExpiry(() => setExpired(true));

  const cartHref = `/cart/${sessionId}?slug=${searchParams.get("slug")}&table=${searchParams.get("table")}`;

  // ── Palette dinamica dal brand_color del ristorante ─────────────────────
  const isDark = false;
  const [brandColor, setBrandColor] = useState<string>(() => {
    if (typeof window === "undefined") return "#ffffff";
    try {
      const cached = restaurantId
        ? localStorage.getItem(`brand_color_${restaurantId}`)
        : null;
      return cached || "#ffffff";
    } catch {
      return "#ffffff";
    }
  });

  // Aggiorna brandColor (e localStorage) quando arriva dal DB
  useEffect(() => {
    if (restaurant?.brand_color) {
      setBrandColor(restaurant.brand_color);
      try {
        if (restaurantId) {
          localStorage.setItem(`brand_color_${restaurantId}`, restaurant.brand_color);
        }
      } catch {}
    }
  }, [restaurant?.brand_color, restaurantId]);

  const T = buildPalette(brandColor);

  // ── Helper: lancia il pallino volante verso il carrello ──────────────────
  const triggerFlyingDot = (originRect?: DOMRect | null) => {
    if (!originRect) return;
    const cartEl = document.getElementById("cart-icon");
    if (!cartEl) return;
    setFlyingDot({ x: originRect.left + originRect.width / 2, y: originRect.top + originRect.height / 2, id: Date.now() });
    setTimeout(() => setFlyingDot(null), 1100); // durata animazione aumentata
  };

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const handleAddToCart = async (item: any, originRect?: DOMRect) => {
    setLoadingOptionsId(item.id);
    try {
      const options = await getMenuItemOptions(item.id);
      if (options.length > 0) {
        // Ha opzioni → salva rect per usarla dopo la conferma, NON lanciare il dot ora
        setPendingOriginRect(originRect ?? null);
        setCurrentItem(item);
        setItemOptions(options);
        setShowCustomization(true);
        return;
      }
    } catch (err) {
      console.warn("[OrderPage] Opzioni non disponibili:", err);
    } finally {
      setLoadingOptionsId(null);
    }
    // Nessuna opzione → aggiungi direttamente e lancia il dot subito
    await addItem({ menuItemId: item.id, name: item.name, basePriceCents: item.price_cents, customizations: [] });
    triggerFlyingDot(originRect);
  };

  const handleCustomizationConfirm = async (customizations: CartCustomization[]) => {
    if (!currentItem) return;
    await addItem({ menuItemId: currentItem.id, name: currentItem.name, basePriceCents: currentItem.price_cents, customizations });
    // Dot parte solo alla conferma del modal
    triggerFlyingDot(pendingOriginRect);
    setPendingOriginRect(null);
    setCurrentItem(null);
    setItemOptions([]);
  };

  const handleCloseModal = () => {
    setShowCustomization(false);
    setCurrentItem(null);
    setItemOptions([]);
  };

  const openSearch = () => {
    setSearchAnimating(true);
    setTimeout(() => {
      setSearchOpen(true);
      setSearchAnimating(false);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }, 320);
  };

const closeSearch = (keepQuery = false) => {
  setSearchOpen(false);
  if (!keepQuery) setSearchQuery("");
};

  const handleSuggestion = (word: string) => {
    setSearchQuery(word);
    setSearchOpen(false);
  };

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderWidth: 4, borderStyle: "solid", borderColor: `${T.brand} ${T.brand} ${T.brand} transparent`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: T.textMuted, fontWeight: 500 }}>Caricamento menu...</p>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 24, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", backdropFilter: "blur(12px)" }}>
          <AlertCircle style={{ width: 48, height: 48, color: "#ef4444", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>Ops, qualcosa è andato storto</h2>
          <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 0 }}>
            C&apos;è stato un problema nel caricamento del menu.<br />
            Riprova scansionando il QR Code sul tuo tavolo.
          </p>
        </div>
      </div>
    );
  }

  // ── Ricerca intelligente ordinata per rilevanza ─────────────────────────

  /** Normalizza: lowercase, rimuove accenti e caratteri speciali, elimina spazi doppi */
  const normalize = (s: string): string =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  /** Distanza di Levenshtein */
  const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  };

  /**
   * Verifica se una parola della query corrisponde a una parola del testo.
   * - Sottostringa: sempre valida
   * - Typo (Levenshtein ≤ 1): solo per parole query di lunghezza ≥ 5
   */
  const wordMatches = (textWord: string, queryWord: string): boolean => {
    if (textWord.includes(queryWord)) return true;
    if (queryWord.length >= 5 && levenshtein(textWord, queryWord) <= 1) return true;
    return false;
  };

  /**
   * Restituisce true se ogni parola della query trova almeno una corrispondenza
   * nelle parole del testo (sottostringa o typo).
   */
  const textFieldMatches = (raw: string, query: string, queryWords: string[]): boolean => {
    if (!raw) return false;
    const text = normalize(raw);
    if (text.includes(query)) return true;
    const textWords = text.split(/\s+/).filter(Boolean);
    return queryWords.every((qw) => textWords.some((tw) => wordMatches(tw, qw)));
  };

  /**
   * Calcola lo score di rilevanza di un item rispetto alla query.
   * Punteggi:
   *   100 → nome esatto
   *    90 → nome contiene la query
   *    80 → search_keywords
   *    60 → categoria
   *    40 → descrizione
   *     0 → nessuna corrispondenza
   */
  const getItemSearchScore = (item: any, q: string): number => {
    if (!q.trim()) return 1; // query vuota: tutti visibili con punteggio neutro

    const query = normalize(q);
    const queryWords = query.split(/\s+/).filter(Boolean);

    // Nome piatto esatto
    const normName = normalize(item.name || "");
    if (normName === query) return 100;

    // Nome piatto contiene la query
    if (textFieldMatches(item.name || "", query, queryWords)) return 90;

    // Search keywords
    if (Array.isArray(item.search_keywords)) {
      for (const kw of item.search_keywords) {
        if (textFieldMatches(kw, query, queryWords)) return 80;
      }
    }

    // Categoria
    const cat = categories.find((c: any) => c.id === item.category_id);
    if (cat && textFieldMatches(cat.name || "", query, queryWords)) return 60;

    // Descrizione
    if (textFieldMatches(item.description || "", query, queryWords)) return 40;

    return 0;
  };

  // ── Filtraggio + scoring in una sola passata ──────────────────────────────
  const filteredByCategory = activeCat === "all" ? items : items.filter((i: any) => i.category_id === activeCat);

  const filteredItems = filteredByCategory
    .filter((i: any) => {
      if (filterVeg && !i.is_vegetarian) return false;
      if (filterGF  && !i.is_gluten_free) return false;
      return true;
    })
    .map((item: any) => ({ item, score: getItemSearchScore(item, searchQuery) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bgGradient, color: T.text, fontFamily: "'Inter', 'system-ui', sans-serif", position: "relative", overflowX: "hidden",
      // @ts-ignore CSS variables for Navbar/Footer
      "--brand": T.brand, "--brand-text": T.textMuted, "--brand-dark": T.text, "--brand-border": T.border } as React.CSSProperties}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatA { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.06); } }
        @keyframes floatB { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-25px,35px) scale(1.04); } }
        @keyframes floatC { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.08); } }
        @keyframes flyToCart {
          0%   { transform: translate(0,0) scale(1.2); opacity: 1; box-shadow: 0 0 0 0 ${T.brand}99; }
          30%  { transform: translate(calc(var(--fly-dx,0px) * 0.2), calc(var(--fly-dy,0px) * 0.2 - 60px)) scale(1.5); opacity: 1; box-shadow: 0 0 20px 8px ${T.brand}66; }
          85%  { transform: translate(var(--fly-dx,0px), var(--fly-dy,0px)) scale(0.5); opacity: 0.9; }
          100% { transform: translate(var(--fly-dx,0px), var(--fly-dy,0px)) scale(0); opacity: 0; }
        }
        @keyframes dotPulse {
          0%   { box-shadow: 0 0 0 0 ${T.brand}b3; }
          70%  { box-shadow: 0 0 0 12px ${T.brand}00; }
          100% { box-shadow: 0 0 0 0 ${T.brand}00; }
        }
        @keyframes searchPulse {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 ${T.brand}80; }
          50%  { transform: scale(1.04); box-shadow: 0 0 0 14px ${T.brand}00; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 ${T.brand}00; }
        }
        @keyframes searchLaunch {
          0%   { transform: scale(1) translateY(0); opacity: 1; }
          40%  { transform: scale(1.08) translateY(-8px); opacity: 1; }
          100% { transform: scale(0.85) translateY(0); opacity: 0; }
        }
        @keyframes overlayIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(20px); }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chipOrbit {
          0%   { opacity: 0; transform: scale(0.7) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
        @keyframes emojiWiggle {
          0%,100% { transform: rotate(0deg) scale(1); }
          20%     { transform: rotate(-18deg) scale(1.25); }
          40%     { transform: rotate(14deg) scale(1.2); }
          60%     { transform: rotate(-10deg) scale(1.15); }
          80%     { transform: rotate(6deg) scale(1.1); }
        }
        @keyframes emojiLeaf {
          0%,100% { transform: rotate(0deg) scale(1); }
          25%     { transform: rotate(-20deg) scale(1.3) translateY(-2px); }
          50%     { transform: rotate(15deg) scale(1.25) translateY(-3px); }
          75%     { transform: rotate(-8deg) scale(1.15) translateY(-1px); }
        }
        @keyframes emojiWheat {
          0%,100% { transform: rotate(0deg) scale(1); }
          20%     { transform: rotate(12deg) scale(1.2) translateY(-2px); }
          40%     { transform: rotate(-15deg) scale(1.25) translateY(-4px); }
          60%     { transform: rotate(10deg) scale(1.2) translateY(-2px); }
          80%     { transform: rotate(-5deg) scale(1.1); }
        }
        @keyframes glowRing {
          0%,100% { box-shadow: 0 0 0 0 ${T.brand}4d, 0 8px 40px ${T.brand}26; }
          50%     { box-shadow: 0 0 0 6px ${T.brand}14, 0 8px 40px ${T.brand}4d; }
        }
      `}</style>

      {/* ── Griglia ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: `linear-gradient(${T.grid} 1px, transparent 1px), linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`, backgroundSize: "48px 48px" }} />

      {/* ── Blob 1: alto-sinistra ── */}
      <div style={{ position: "fixed", zIndex: 0, pointerEvents: "none", top: -180, left: -200, width: 750, height: 750, borderRadius: "50%", filter: "blur(60px)", animation: "floatA 12s ease-in-out infinite", background: T.blob1 }} />

      {/* ── Blob 2: basso-destra ── */}
      <div style={{ position: "fixed", zIndex: 0, pointerEvents: "none", bottom: -150, right: -150, width: 650, height: 650, borderRadius: "50%", filter: "blur(55px)", animation: "floatB 15s ease-in-out infinite", background: T.blob2 }} />

      {/* ── Blob 3: centro ── */}
      <div style={{ position: "fixed", zIndex: 0, pointerEvents: "none", top: "42%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 500, borderRadius: "50%", filter: "blur(80px)", animation: "floatC 18s ease-in-out infinite", background: T.blob3 }} />

      {/* ── Blob 4: alto-destra ── */}
      <div style={{ position: "fixed", zIndex: 0, pointerEvents: "none", top: "5%", right: "-80px", width: 400, height: 400, borderRadius: "50%", filter: "blur(50px)", background: T.blob4 }} />

      {/* ── Vignette ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 40%, rgba(3,70,40,0.06) 100%)" }} />

      {/* ── Cerchi decorativi ── */}
      {[
        { top: "8%",     right: "4%", size: 360, opacity: isDark ? 0.10 : 0.13, stroke: 2 },
        { top: "11%",    right: "7%", size: 230, opacity: isDark ? 0.07 : 0.09, stroke: 1 },
        { bottom: "13%", left: "2%", size: 300,  opacity: isDark ? 0.09 : 0.12, stroke: 2 },
        { bottom: "16%", left: "5%", size: 170,  opacity: isDark ? 0.06 : 0.08, stroke: 1 },
      ].map((c, i) => (
        <div key={i} style={{ position: "fixed", zIndex: 0, pointerEvents: "none", top: c.top, bottom: c.bottom, right: c.right, left: c.left, width: c.size, height: c.size, borderRadius: "50%", border: `${c.stroke}px solid ${isDark ? `rgba(${hexToRgb(T.brand).join(",")},${c.opacity})` : `rgba(${hexToRgb(T.brand).join(",")},${c.opacity})`}` }} />
      ))}

      {/* ── NAVBAR ── */}
      <Navbar tableNumber={tableNumber} sessionId={sessionId} cartCount={cartCount} cartHref={cartHref} palette={T} />

      {/* ── CONTENUTO ── */}
      <div style={{ position: "relative", zIndex: 10, paddingTop: 80 }}>
<<<<<<< HEAD
=======
<OrderHeader
  cartCount={cartCount}
  cartHref={cartHref}
  palette={T}
/>
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
        {/* ── Restaurant Header (inline, senza box tavolo) ── */}
        <div style={{ textAlign: "center", padding: "48px 16px 32px", position: "relative", zIndex: 10 }}>
          {/* Badge Ristorante Partner – più grande */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.92)",
            border: `1.5px solid ${T.borderMid}`,
            borderRadius: 999,
            padding: "10px 24px",
            marginBottom: 24,
            boxShadow: `0 4px 20px ${T.border}`,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: T.btnBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2.2} viewBox="0 0 24 24">
                <path d="M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", color: T.text, textTransform: "uppercase" }}>
              Ristorante Partner
            </span>
          </div>

          {/* Nome ristorante */}
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.8rem, 8vw, 5rem)",
            fontWeight: 900,
            color: T.text,
            margin: "0 0 8px",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
          }}>
            {restaurant?.name || "Ristorante"}
          </h1>

          {/* Tre puntini decorativi */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "14px 0 20px" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.borderStrong }} />
            ))}
          </div>

          {/* Descrizione */}
          <p style={{
            maxWidth: 480,
            margin: "0 auto",
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
            lineHeight: 1.7,
            color: T.textMuted,
            fontStyle: "italic",
          }}>
            Scegli tra i nostri piatti preparati con passione.{" "}
            <strong style={{ fontStyle: "normal", color: T.textSoft }}>Ingredienti freschi</strong>,{" "}
            <em>ricette tradizionali e servizio veloce direttamente al tuo tavolo.</em>
          </p>
        </div>

        <main style={{ maxWidth: 896, margin: "0 auto", padding: "0 16px 48px" }}>
          <CategoryFilter
  categories={categories}
  activeCat={activeCat}
  onCategoryChange={setActiveCat}
  palette={T}   // ← aggiunge questo
/>
          {/* ── Barra di ricerca (bottone prominente) ── */}
          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <button
              onClick={openSearch}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 14,
                padding: "18px 24px",
                borderRadius: 20,
                border: `2px solid ${T.borderMid}`,
                background: T.light200 + "bb",
                backdropFilter: "blur(16px)",
                cursor: "pointer",
                transition: "all 0.2s",
                animation: searchAnimating ? "searchLaunch 0.32s ease-in forwards" : "glowRing 3s ease-in-out infinite",
                boxShadow: `0 4px 30px ${T.border}, inset 0 1px 0 rgba(255,255,255,0.8)`,
              }}
            >
              {/* icona search animata */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: T.chipBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "searchPulse 2.5s ease-in-out infinite",
              }}>
                <svg width="22" height="22" fill="none" stroke={T.textSoft} strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: T.text }}>
                  Cosa hai voglia di mangiare?
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: T.brand, opacity: 0.85 }}>
                  Cerca per piatto, ingrediente o categoria…
                </p>
              </div>
              <svg width="18" height="18" fill="none" stroke={T.border} strokeWidth={2} viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {/* ── Filtri dieta + ricerca attiva ── */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 999, cursor: "pointer",
                  fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  border: `2px solid ${T.brand}`,
                  background: T.chipBg,
                  color: T.textSoft,
                  boxShadow: `0 2px 12px ${T.border}`,
                }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                {searchQuery}
                <span style={{ marginLeft: 2, fontSize: 12, opacity: 0.7 }}>✕</span>
              </button>
            )}
            {[
              { key: "veg", active: filterVeg, toggle: () => setFilterVeg(v => !v), emoji: "🌿", label: "Vegetariano", anim: "emojiLeaf" },
              { key: "gf",  active: filterGF,  toggle: () => setFilterGF(v => !v),  emoji: "🌾", label: "Senza Glutine", anim: "emojiWheat" },
            ].map(({ key, active, toggle, emoji, label, anim }) => (
              <button
                key={key}
                onClick={toggle}
                onMouseEnter={e => {
                  const span = (e.currentTarget as HTMLButtonElement).querySelector(".filter-emoji") as HTMLElement;
                  if (span) span.style.animation = `${anim} 0.6s ease-in-out`;
                }}
                onMouseLeave={e => {
                  const span = (e.currentTarget as HTMLButtonElement).querySelector(".filter-emoji") as HTMLElement;
                  if (span) { span.style.animation = "none"; span.style.transform = ""; }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 999, cursor: "pointer",
                  fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  border: `2px solid ${active
                    ? T.brand
                    : T.border}`,
                  background: active
                    ? T.chipBg
                    : "rgba(255,255,255,0.6)",
                  color: active
                    ? T.textSoft
                    : T.textMuted,
                  boxShadow: active
                    ? `0 2px 12px ${T.border}`
                    : "none",
                }}
              >
                <span
                  className="filter-emoji"
                  style={{ fontSize: 17, display: "inline-block", transformOrigin: "center bottom" }}
                >{emoji}</span>
                {label}
                {active && <span style={{ marginLeft: 2, fontSize: 12 }}>✓</span>}
              </button>
            ))}
            {(filterVeg || filterGF) && (
              <button
                onClick={() => { setFilterVeg(false); setFilterGF(false); }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 500, fontSize: 13, border: `1.5px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.3)"}`, background: "transparent", color: isDark ? "#fca5a5" : "#dc2626", transition: "all 0.2s" }}
              >
                ✕ Rimuovi filtri
              </button>
            )}
          </div>

          <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
            {filteredItems.map((item) => (
<MenuItemCard
  key={item.id}
  item={item}
  onAdd={handleAddToCart}
  isLoadingOptions={loadingOptionsId === item.id}
  palette={T}   // ← aggiungi questo
/>
            ))}
            {filteredItems.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: T.textMuted }}>
                <p style={{ fontSize: 18 }}>{searchQuery ? `Nessun piatto trovato per "${searchQuery}".` : "Nessun piatto disponibile in questa categoria."}</p>
              </div>
            )}
          </div>
<<<<<<< HEAD
</main>

        {/* ── Info ristorante (dopo il menu) ── */}
<RestaurantInfo
  name={restaurant?.name ?? ""}
  restaurantId={restaurant?.id ?? null}    
  address={restaurant?.address ?? null}
  phone={restaurant?.phone ?? null}
  instagram={restaurant?.instagram ?? null}
  facebook={restaurant?.facebook ?? null}
  tripadvisor={restaurant?.tripadvisor ?? null}
  website={restaurant?.website ?? null}
  palette={T}
/>
=======
        </main>
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b

        <Footer palette={T} />
      </div>

      {/* ── AI Search Overlay ── */}
      {searchOpen && (
        <div
          onClick={() => closeSearch(true)}
          style={{
            position: "fixed", inset: 0, zIndex: 80,
            background: `rgba(0,0,0,0.6)`,
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 16px",
            animation: "overlayIn 0.3s ease forwards",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 560,
              borderRadius: 28,
              border: `1.5px solid ${T.borderMid}`,
              background: `rgba(${hexToRgb(T.light100).join(",")},0.97)`,
              backdropFilter: "blur(24px)",
              padding: "32px 28px 28px",
              boxShadow: `0 30px 80px rgba(0,0,0,0.25), 0 0 0 1px ${T.border}`,
              animation: "modalSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            {/* Header AI */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: T.btnBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 16px ${T.border}`,
                flexShrink: 0,
              }}>
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>
                  Cosa hai voglia di mangiare?
                </p>
                {/* AI typing dots */}
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: T.brand,
                      animation: `aiDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => closeSearch(true)}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none",
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
                  color: T.textSoft,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, flexShrink: 0,
                }}
              >✕</button>
            </div>

            {/* Input ricerca */}
            <div style={{ position: "relative", marginBottom: 24 }}>
              <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, pointerEvents: "none" }} fill="none" stroke={T.brand} strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") closeSearch(true); }}
                placeholder="es. pizza, pasta al tartufo…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "15px 44px 15px 50px",
                  borderRadius: 16,
                  border: `2px solid ${T.borderStrong}`,
                  background: "rgba(255,255,255,0.9)",
                  color: T.text,
                  fontSize: 16, fontWeight: 500,
                  outline: "none",
                  boxShadow: `0 0 0 3px ${T.grid}, 0 4px 20px ${T.border}`,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: T.chipBg, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: T.textSoft, fontSize: 14, fontWeight: 700 }}
                >✕</button>
              )}
            </div>

            {/* Suggerimenti che orbitano */}
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.border }}>
                Idee per iniziare
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { emoji: "🍕", label: "Pizza" },
                  { emoji: "🍝", label: "Pasta" },
                  { emoji: "🐟", label: "Pesce" },
                  { emoji: "🥩", label: "Carne" },
                  { emoji: "🍰", label: "Dolce" },
                  { emoji: "🥗", label: "Insalata" },
                  { emoji: "🍔", label: "Burger" },
                  { emoji: "🍺", label: "Birra" },
                ].map(({ emoji, label }, i) => (
                  <button
                    key={label}
                    onClick={() => handleSuggestion(label.toLowerCase())}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: `1.5px solid ${T.border}`,
                      background: T.light200,
                      color: T.textMuted,
                      fontSize: 14, fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.18s",
                      animation: `chipOrbit 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05}s both`,
                      boxShadow: `0 2px 10px ${T.border}`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = T.chipBgActive;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = T.brand;
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = T.light200;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA cerca */}
            {searchQuery.trim() && (
              <button
                onClick={() => closeSearch(true)}
                style={{
                  marginTop: 20, width: "100%",
                  padding: "14px 0",
                  borderRadius: 14,
                  border: "none",
                  background: T.btnBg,
                  color: "#fff",
                  fontSize: 15, fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: T.btnShadow,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >
                Cerca "{searchQuery}"
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Overlay sessione scaduta ── */}
      {expired && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", padding: 16 }}>
          <div style={{ background: T.bgCard, borderRadius: 24, backdropFilter: "blur(16px)", border: `1px solid ${T.border}`, maxWidth: 360, width: "100%", textAlign: "center", padding: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 28 }}>⏱</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>Sessione scaduta</h2>
            <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Il carrello è stato eliminato per inattività.<br />
              Scansiona di nuovo il QR Code per ordinare.
            </p>
            <button onClick={() => router.push("/")} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: T.text, color: "#fff", fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer" }}>
              Torna alla home
            </button>
          </div>
        </div>
      )}

      {/* ── Warning scadenza ── */}
      {isWarning && !expired && (
        <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", zIndex: 50, pointerEvents: "none" }}>
          <div style={{ background: "#f97316", color: "#fff", padding: "12px 20px", borderRadius: 16, boxShadow: "0 8px 32px rgba(249,115,22,0.4)", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span>
              Sessione in scadenza —{" "}
              <span style={{ fontWeight: 700 }}>
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Flying dot al carrello ── */}
      {flyingDot && (() => {
        const cartEl   = document.getElementById("cart-icon");
        const cartRect = cartEl?.getBoundingClientRect();
        const dx = cartRect ? cartRect.left + cartRect.width  / 2 - flyingDot.x : 0;
        const dy = cartRect ? cartRect.top  + cartRect.height / 2 - flyingDot.y : 0;
        return (
          <div
            key={flyingDot.id}
            style={{
              position: "fixed",
              left: flyingDot.x - 14, top: flyingDot.y - 14,  // centrato (28/2)
              width: 28, height: 28, borderRadius: "50%",
              background: T.flyDot,
              border: "2px solid rgba(255,255,255,0.6)",
              boxShadow: T.flyGlow,
              zIndex: 9999, pointerEvents: "none",
              animation: "flyToCart 1.05s cubic-bezier(0.25,0.46,0.45,0.94) forwards",
              ["--fly-dx" as any]: `${dx}px`,
              ["--fly-dy" as any]: `${dy}px`,
            }}
          />
        );
      })()}

      {/* ── Modal personalizzazione ── */}
      <CustomizationModal
        isOpen={showCustomization}
        itemName={currentItem?.name ?? ""}
        options={itemOptions}
        onClose={handleCloseModal}
        onConfirm={handleCustomizationConfirm}
      />
    </div>
  );
}