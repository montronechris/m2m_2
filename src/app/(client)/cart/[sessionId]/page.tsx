// src/app/(client)/cart/[sessionId]/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  ChevronRight, UtensilsCrossed, Sparkles, Pencil, Save, Check, SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/components/i18n/I18nProvider";

// ─── BACKEND CONSTANTS (INTACT) ───────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const API_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseHeaders = {
  apikey: API_KEY,
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
} as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatPrice = (cents: number): string => {
  if (typeof cents !== "number" || isNaN(cents)) return "0,00";
  return (cents / 100).toFixed(2).replace(".", ",");
};

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

type Palette = ReturnType<typeof buildPalette>;

// ─── MERGE DUPLICATES (BACKEND LOGIC, INTACT) ─────────────────────────────────
type CartItemLike = ReturnType<typeof useCartStore.getState>["items"][number];
export type MergedCartItem = CartItemLike & {
  orderItemIds: string[];
  totalQty: number;
};

function mergeDuplicateItems(groupItems: CartItemLike[]): MergedCartItem[] {
  const order: string[] = [];
  const map = new Map<string, MergedCartItem>();

  for (const item of groupItems) {
    const key = `${item.menuItemId}::${JSON.stringify(item.customizations)}::${item.portataLocked ? "locked" : "free"}`;
    const existing = map.get(key);
    if (existing) {
      existing.orderItemIds.push(item.orderItemId!);
      existing.totalQty += item.quantity;
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PREMIUM ANIMATION PRESETS ────────────────────────────────────────────────
// Easing curves shared across all sections — same as ThankYouScreen
const EASE_OUT =     [0.22, 1, 0.36, 1] as const;
const EASE_SPRING =  [0.34, 1.56, 0.64, 1] as const;

// Fade + slide up entrance
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -12 },
  transition: { duration: 0.5, ease: EASE_OUT },
};

// Spring pop (icons, badges)
const springPop = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit:    { scale: 0.5, opacity: 0 },
  transition: { duration: 0.55, ease: EASE_SPRING },
};

// Ring pulse — expanding ring around success icons (like ThankYouScreen checkmark)
function RingPulse({ color, delay = 0.3 }: { color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 1, opacity: 0.4 }}
      animate={{ scale: 1.6, opacity: 0 }}
      transition={{ duration: 1.2, delay, repeat: Infinity, repeatDelay: 1, ease: "easeOut" }}
      style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `2px solid ${color}`,
        pointerEvents: "none",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── NOTE MODAL (inlined, premium style with in/out animations) ───────────────
// ═══════════════════════════════════════════════════════════════════════════════

type NoteModalProps = {
  isOpen: boolean;
  itemName: string;
  initialNote: string;
  brandColor?: string;
  onClose: () => void;
  onSave: (note: string) => void | Promise<void>;
};

const NOTE_MAX_LEN = 300;
const NOTE_DRAG_THRESHOLD = 80;

function NoteModal({ isOpen, itemName, initialNote, brandColor, onClose, onSave }: NoteModalProps) {
  const { tr } = useI18n();
  const t = tr.client.modal;
  const tCommon = tr.client.common;
  const T: Palette = useMemo(() => buildPalette(brandColor || "#ffffff"), [brandColor]);
  const [note, setNote] = useState(initialNote);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard offset (INTACT) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKbOffset(Math.max(0, offset));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKbOffset(0);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setClosing(false);
      setDragY(0);
      dragStartY.current = null;
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    }
  }, [isOpen, initialNote]);

  const triggerClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => { onClose(); closeTimer.current = null; }, 320);
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    if (delta > 8 && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setDragY(delta);
  };

  const handlePointerUp = () => {
    if (dragY > NOTE_DRAG_THRESHOLD) {
      triggerClose();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  };

  const handleSave = () => { onSave(note); };

  const remaining = NOTE_MAX_LEN - note.length;
  const isLow = remaining <= 30;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="note-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE_OUT }}
          onClick={triggerClose}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            pointerEvents: closing ? "none" : "auto",
          }}
        >
          <motion.div
            key="note-sheet"
            initial={{ y: "100%" }}
            animate={{ y: closing ? "110%" : dragY > 0 ? dragY : 0 }}
            exit={{ y: "110%" }}
            transition={dragY === 0
              ? { duration: 0.45, ease: EASE_OUT }
              : { duration: 0 }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: "absolute", bottom: kbOffset, left: 0, right: 0,
              transition: "bottom 0.2s ease",
              background: "#fff",
              borderRadius: "32px 32px 0 0",
              touchAction: "none",
              maxHeight: "88vh",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -16px 48px -8px rgba(0,0,0,0.25)",
            }}
          >
            {/* Decorative glow blob */}
            <div aria-hidden style={{
              position: "absolute", top: -40, right: -20,
              width: 160, height: 160, borderRadius: "50%",
              background: "rgba(251,191,36,0.15)", filter: "blur(50px)",
              pointerEvents: "none",
            }} />

            {/* Drag handle */}
            <div style={{ width: 44, height: 5, borderRadius: 99, background: "#e7e5e4", margin: "14px auto 0", flexShrink: 0, position: "relative", zIndex: 1 }} />

            {/* Header — gradient icon like ThankYouScreen */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 20px 16px", borderBottom: `1px solid ${T.borderSoft}`,
                background: "linear-gradient(135deg, rgba(251,191,36,0.10), transparent)",
                flexShrink: 0,
                position: "relative", zIndex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.55, delay: 0.15, ease: EASE_SPRING }}
                  style={{
                    width: 46, height: 46, borderRadius: 15,
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 10px 24px -4px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <StickyNote size={20} color="#fff" strokeWidth={2.4} />
                </motion.div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "#b45309", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>{t.noteTitle}</p>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2236", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>{itemName}</h2>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={triggerClose}
                aria-label={tCommon.close}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <X size={16} color="#64748b" />
              </motion.button>
            </motion.div>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
              style={{ padding: "20px 20px 12px", flex: 1, overflow: "auto", position: "relative", zIndex: 1 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "rgba(28,25,23,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                {t.noteInstructions}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LEN))}
                rows={4}
                autoFocus
                placeholder={t.notePlaceholder}
                style={{
                  width: "100%", resize: "none", borderRadius: 16,
                  border: `2px solid ${T.borderSoft}`, background: "rgba(255,255,255,0.9)",
                  padding: "14px 16px", fontSize: 16, color: "#1a2236", outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.55,
                  transition: "border-color 0.2s",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(28,25,23,0.4)" }}>{t.noteHints}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isLow ? T.danger : "rgba(28,25,23,0.4)", fontVariantNumeric: "tabular-nums", fontFamily: "'Space Grotesk', sans-serif" }}>{note.length}/{NOTE_MAX_LEN}</span>
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: EASE_OUT }}
              style={{
                display: "flex", gap: 10, padding: "12px 20px 20px",
                borderTop: `1px solid ${T.borderSoft}`, background: "rgba(255,255,255,0.96)",
                flexShrink: 0, position: "relative", zIndex: 1,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={triggerClose}
                style={{
                  flex: 1, borderRadius: 16, border: `2px solid ${T.borderSoft}`,
                  background: "#fff", padding: "14px 0", fontSize: 14, fontWeight: 700,
                  color: "rgba(28,25,23,0.7)", cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {tCommon.cancel}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                style={{
                  flex: 2, borderRadius: 16, border: "none",
                  background: T.btnBg, padding: "14px 0", fontSize: 14, fontWeight: 700,
                  color: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8, boxShadow: T.btnShadow,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Save size={16} strokeWidth={2.4} />
                {t.saveNote}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CUSTOMIZATION MODAL (inlined, premium style with in/out animations) ──────
// ═══════════════════════════════════════════════════════════════════════════════

type CustomizationModalProps = {
  isOpen: boolean;
  options: ModalOption[];
  itemName: string;
  basePriceCents?: number;
  brandColor?: string;
  onClose: () => void;
  onConfirm: (customizations: CartCustomization[]) => void | Promise<void>;
};

type SingleState = { kind: "single"; choiceId: string | null };
type MultiState = { kind: "multi"; picks: Record<string, number> };
type OptionState = SingleState | MultiState;

function customizationInitialState(options: ModalOption[]): Record<string, OptionState> {
  const map: Record<string, OptionState> = {};
  for (const opt of options) {
    if (opt.isMultiple) {
      map[opt.id] = { kind: "multi", picks: {} };
    } else {
      const def = opt.choices.find((c) => c.isDefault);
      map[opt.id] = { kind: "single", choiceId: def ? def.id : null };
    }
  }
  return map;
}

function formatPriceCents(cents: number): string {
  if (typeof cents !== "number" || isNaN(cents)) return "0,00";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function CustomizationModal({
  isOpen,
  options,
  itemName,
  basePriceCents = 0,
  brandColor,
  onClose,
  onConfirm,
}: CustomizationModalProps) {
  const { tr } = useI18n();
  const t = tr.client.modal;
  const tCommon = tr.client.common;
  const T: Palette = useMemo(() => buildPalette(brandColor || "#ffffff"), [brandColor]);
  const [state, setState] = useState<Record<string, OptionState>>({});

  useEffect(() => {
    if (isOpen) {
      setState(customizationInitialState(options));
    }
  }, [isOpen, options]);

  const setSingle = (optId: string, choiceId: string | null) => {
    setState((prev) => ({ ...prev, [optId]: { kind: "single", choiceId } }));
  };
  const toggleMulti = (optId: string, choiceId: string) => {
    setState((prev) => {
      const cur = prev[optId];
      if (!cur || cur.kind !== "multi") return prev;
      const picks = { ...cur.picks };
      if (picks[choiceId]) delete picks[choiceId];
      else picks[choiceId] = 1;
      return { ...prev, [optId]: { kind: "multi", picks } };
    });
  };

  const customizations: CartCustomization[] = useMemo(() => {
    const out: CartCustomization[] = [];
    for (const opt of options) {
      const sel = state[opt.id];
      if (!sel) continue;
      if (sel.kind === "single" && sel.choiceId) {
        const choice = opt.choices.find((c) => c.id === sel.choiceId);
        if (choice) {
          out.push({
            optionId: opt.id,
            optionName: opt.name,
            choiceId: choice.id,
            choiceName: choice.name,
            priceModifierCents: choice.priceModifierCents,
          });
        }
      } else if (sel.kind === "multi") {
        for (const [choiceId, count] of Object.entries(sel.picks)) {
          if (!count) continue;
          const choice = opt.choices.find((c) => c.id === choiceId);
          if (!choice) continue;
          for (let i = 0; i < count; i++) {
            out.push({
              optionId: opt.id,
              optionName: opt.name,
              choiceId: choice.id,
              choiceName: choice.name,
              priceModifierCents: choice.priceModifierCents,
            });
          }
        }
      }
    }
    return out;
  }, [options, state]);

  const requiredSatisfied = useMemo(() => {
    for (const opt of options) {
      if (!opt.isRequired) continue;
      const sel = state[opt.id];
      if (!sel) return false;
      if (sel.kind === "single" && !sel.choiceId) return false;
      if (sel.kind === "multi" && Object.values(sel.picks).every((v) => !v)) return false;
    }
    return true;
  }, [options, state]);

  const totalCents = useMemo(() => {
    return (
      basePriceCents +
      customizations.reduce((s, c) => s + c.priceModifierCents, 0)
    );
  }, [basePriceCents, customizations]);

  const handleConfirm = () => {
    if (!requiredSatisfied) return;
    onConfirm(customizations);
  };

  const brandAlphaFn = (hex: string, a: number) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bottom-0 top-auto max-h-[90vh] translate-y-0 gap-0 overflow-hidden rounded-t-[32px] rounded-b-none border bg-white p-0 sm:max-w-md sm:rounded-[32px] sm:border"
        style={{ borderColor: T.borderSoft, boxShadow: "0 -16px 48px -8px rgba(0,0,0,0.25)" }}
      >
        <DialogTitle className="sr-only">{itemName}</DialogTitle>
        <DialogDescription className="sr-only">
          {t.customizeTitle}
        </DialogDescription>

        {/* Header — gradient icon + glow blob */}
        <div
          className="relative flex items-center justify-between overflow-hidden px-5 py-4"
          style={{
            borderBottom: `1px solid ${T.borderSoft}`,
            background: `linear-gradient(135deg, ${T.accentBg}, transparent)`,
          }}
        >
          {/* Decorative glow */}
          <div aria-hidden style={{
            position: "absolute", top: -30, right: -20,
            width: 120, height: 120, borderRadius: "50%",
            background: brandAlphaFn(T.brand, 0.12), filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          <div className="flex min-w-0 items-center gap-3" style={{ position: "relative", zIndex: 1 }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: EASE_SPRING }}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                boxShadow: `0 10px 24px -4px ${brandAlphaFn(T.brand, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            >
              <SlidersHorizontal className="h-5 w-5 text-white" strokeWidth={2.4} />
            </motion.div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{ color: T.accent }}
              >
                {t.customizeTitle}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-ink" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>
                {itemName}
              </h2>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label={tCommon.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-ink/60 transition hover:bg-ink/10 active:scale-90"
            style={{ position: "relative", zIndex: 1 }}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Body — options with staggered entrance */}
        <div className="max-h-[58vh] space-y-5 overflow-y-auto px-5 py-5">
          {options.length === 0 && (
            <p className="py-6 text-center text-sm text-ink/50">
              {t.noCustomizations}
            </p>
          )}
          {options.map((opt, optIdx) => {
            const sel = state[opt.id];
            const isMulti = opt.isMultiple;
            return (
              <motion.section
                key={opt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + optIdx * 0.08, ease: EASE_OUT }}
              >
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="text-sm font-bold text-ink" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{opt.name}</h3>
                    {opt.isRequired ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: T.dangerBg, color: T.danger }}
                      >
                        {t.required}
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/40">
                        {t.optional}
                      </span>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: T.accentBg, color: T.accent }}
                  >
                    {isMulti ? t.multiple : t.single}
                  </span>
                </div>
                <div className="space-y-2">
                  {opt.choices.map((c, choiceIdx) => {
                    const active =
                      sel?.kind === "single"
                        ? sel.choiceId === c.id
                        : sel?.kind === "multi"
                          ? !!sel.picks[c.id]
                          : false;
                    return (
                      <motion.button
                        key={c.id}
                        type="button"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 + optIdx * 0.08 + choiceIdx * 0.04, ease: EASE_OUT }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          isMulti ? toggleMulti(opt.id, c.id) : setSingle(opt.id, c.id)
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition"
                        style={{
                          borderColor: active ? T.accent : T.borderSoft,
                          background: active ? T.accentBg : "#ffffff",
                          boxShadow: active ? `0 6px 16px -4px ${brandAlphaFn(T.brand, 0.18)}` : "none",
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <motion.span
                            animate={{ scale: active ? 1.05 : 1 }}
                            transition={{ duration: 0.25, ease: EASE_SPRING }}
                            className="grid h-6 w-6 shrink-0 place-items-center border-2 transition"
                            style={{
                              borderRadius: isMulti ? 7 : 999,
                              borderColor: active ? T.accent : T.borderSoft,
                              background: active
                                ? `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`
                                : "transparent",
                              boxShadow: active ? `0 3px 10px ${brandAlphaFn(T.brand, 0.35)}` : "none",
                            }}
                          >
                            <AnimatePresence>
                              {active && (
                                <motion.span
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: EASE_SPRING }}
                                >
                                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.span>
                          <span className="truncate text-sm font-medium text-ink">
                            {c.name}
                          </span>
                        </div>
                        {c.priceModifierCents > 0 && (
                          <span
                            className="shrink-0 text-xs font-bold tabular-nums"
                            style={{ color: T.accent, fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            +{formatPriceCents(c.priceModifierCents)} €
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* Sticky footer — animated button */}
        <div
          className="px-5 py-4 backdrop-blur"
          style={{
            borderTop: `1px solid ${T.borderSoft}`,
            background: "rgba(255,255,255,0.96)",
          }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: requiredSatisfied ? 0.97 : 1 }}
            disabled={!requiredSatisfied}
            onClick={handleConfirm}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: T.btnBg,
              boxShadow: requiredSatisfied ? T.btnShadow : "none",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span className="flex items-center gap-2">
              <Check size={16} strokeWidth={2.6} />
              {tCommon.confirm}
            </span>
            <span className="tabular-nums text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatPriceCents(totalCents)} €</span>
          </motion.button>
          <AnimatePresence>
            {!requiredSatisfied && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 text-center text-xs text-ink/50"
              >
                {t.selectRequired}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CART SKELETON (premium with staggered entrance) ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function CartSkeleton({ T }: { T: Palette }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bgGradient, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes skPulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
        .sk { animation: skPulse 1.5s ease-in-out infinite; border-radius: 10px; background: rgba(0,0,0,0.08); }
      `}</style>

      {/* Decorative blobs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
        aria-hidden
        style={{ position: "absolute", top: -100, right: -80, width: 320, height: 320, borderRadius: "50%", background: `${T.brand}14`, filter: "blur(70px)", pointerEvents: "none" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
        aria-hidden
        style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: `${T.brand}10`, filter: "blur(60px)", pointerEvents: "none" }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{
          height: 64, padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: T.headerBg,
          borderBottom: `1px solid ${T.borderSoft}`,
          position: "relative", zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="sk" style={{ width: 34, height: 34, borderRadius: "50%" }} />
          <div className="sk" style={{ width: 80, height: 14 }} />
        </div>
        <div className="sk" style={{ width: 110, height: 22, borderRadius: 20 }} />
      </motion.div>

      {/* Content */}
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
          className="sk"
          style={{ width: 100, height: 13, marginBottom: 4 }}
        />

        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: EASE_OUT }}
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: "14px 14px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              boxShadow: "0 6px 20px -6px rgba(0,0,0,0.08)",
            }}
          >
            <div className="sk" style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="sk" style={{ width: "65%", height: 14 }} />
              <div className="sk" style={{ width: "40%", height: 12 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <div className="sk" style={{ width: 80, height: 32, borderRadius: 20 }} />
                <div className="sk" style={{ width: 52, height: 14 }} />
              </div>
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE_OUT }}
          style={{
            marginTop: 8,
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow: "0 6px 20px -6px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="sk" style={{ width: 60, height: 13 }} />
            <div className="sk" style={{ width: 60, height: 13 }} />
          </div>
          <div className="sk" style={{ width: "100%", height: 50, borderRadius: 14, marginTop: 4 }} />
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function CartPage() {
  const { tr } = useI18n();
  const tCart = tr.client.cart;
  const tCommon = tr.client.common;
  const router = useRouter();

  // ── BACKEND: Cart store hooks (INTACT) ──────────────────────────────────────
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

  // ── BACKEND: Upsell from query params (INTACT) ──────────────────────────────
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
      portataLocked: false,
    }).finally(() => setAddingUpsell(false));
  }, [initialized]);

  // ── STATE (INTACT) ──────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState(false);
  const submitted = React.useRef(false);
  const [session,       setSession]       = useState<ReturnType<typeof getTableSession>>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [brandColor, setBrandColor] = useState<string>("#ffffff");
  const [brandReady, setBrandReady] = useState<boolean>(false);
  const [backgroundType, setBackgroundType] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  const [showCustomization, setShowCustomization] = useState(false);
  const [customizingItem,   setCustomizingItem]   = useState<{
    menuItemId: string; name: string; basePriceCents: number; customizationsKey: string;
  } | null>(null);
  const [itemOptions, setItemOptions] = useState<ModalOption[]>([]);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteItem,      setNoteItem]      = useState<{ orderItemId: string; name: string; note: string } | null>(null);

  const [hasOptions,    setHasOptions]    = useState<Record<string, boolean>>({});
  const [itemImages,    setItemImages]    = useState<Record<string, string | null>>({});
  // Immagini il cui caricamento è fallito (es. URL rotto/irraggiungibile): si mostra
  // l'iniziale del piatto al posto di lasciare il quadrato vuoto.
  const [brokenImages,  setBrokenImages]  = useState<Record<string, boolean>>({});

  // ── Portate (INTACT) ────────────────────────────────────────────────────────
  const [showPortataSelector, setShowPortataSelector] = useState<string | null>(null);
  const [portataError, setPortataError] = useState<string | null>(null);
  const portataErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxExistingPortata = useMemo(() => Math.max(...items.map(i => i.portata ?? 1), 1), [items]);
  const selectablePortate = maxExistingPortata + 1;
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

    const simulatedItems = isSplit
      ? [...items, { ...items.find(i => i.orderItemId === orderItemId)!, portata: newPortata }]
      : items.map(i => i.orderItemId === orderItemId ? { ...i, portata: newPortata } : i);

    const portateAfterMove = new Set(simulatedItems.map(i => i.portata ?? 1));
    const maxAfter = Math.max(...portateAfterMove);
    for (let p = portataFloor + 1; p < maxAfter; p++) {
      if (!portateAfterMove.has(p)) {
        showPortataError(tCart.cantMoveEmpty.replace('{p}', String(p)));
        return;
      }
    }

    updatePortata(orderItemId, newPortata);
    setShowPortataSelector(null);
  };

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

  const totalDishesCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  // ── Swipe-delete (INTACT) ───────────────────────────────────────────────────
  const [revealedId,    setRevealedId]    = useState<string | null>(null);
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null);
  const [deletedName,   setDeletedName]   = useState<string | null>(null);
  const [showEmptyAnim, setShowEmptyAnim] = useState(false);

  // ── BACKEND: Pre-fetch personalizzazioni (INTACT) ───────────────────────────
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

  // ── BACKEND: Pre-fetch immagini (INTACT) ────────────────────────────────────
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

  // ── Stagger entrance (INTACT) ───────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const initialItemIdsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    items.forEach(i => { if (i.orderItemId) initialItemIdsRef.current.add(i.orderItemId); });
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Button press state (INTACT) ─────────────────────────────────────────────
  const [activeBtn,   setActiveBtn]   = useState<string | null>(null);
  const [navigating,  setNavigating]  = useState(false);

  const pressBtn = (key: string, cb: () => void) => {
    setActiveBtn(key);
    setTimeout(() => { setActiveBtn(null); cb(); }, 340);
  };

  // ── Stepper slot-machine (INTACT) ───────────────────────────────────────────
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

  // ── BACKEND: Carica sessione + brand_color (INTACT) ─────────────────────────
  useEffect(() => {
    const sess = getTableSession();
    setSession(sess);
    setSessionLoaded(true);

    let cachedColor: string | null = null;
    try {
      if (sess?.restaurantId) {
        cachedColor = localStorage.getItem(`brand_color_${sess.restaurantId}`);
        const cachedBgType = localStorage.getItem(`bg_type_${sess.restaurantId}`);
        const cachedBgUrl  = localStorage.getItem(`bg_url_${sess.restaurantId}`);
        if (cachedBgType) setBackgroundType(cachedBgType);
        if (cachedBgUrl)  setBackgroundImageUrl(cachedBgUrl);
      }
      if (!cachedColor) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("brand_color_"));
        if (keys.length === 1) cachedColor = localStorage.getItem(keys[0]);
      }
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

  const T = useMemo(() => buildPalette(brandColor), [brandColor]);

  const pageBg =
    backgroundType === "image" && backgroundImageUrl
      ? `url(${backgroundImageUrl}) center/cover no-repeat`
      : backgroundType === "color" && backgroundImageUrl
      ? backgroundImageUrl
      : T.bgGradient;

  const storeLoading = useCartStore((s) => s.loading);
  const orderId      = useCartStore((s) => s.orderId);

  // ── BACKEND: initFromDB (INTACT) ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoaded || !session) return;
    if (initialized || storeLoading) return;
    const tableId = (session as { tableId?: string | null }).tableId ?? null;
    initFromDB(
      tableId,
      session.restaurantId ?? null,
      session.restaurantSlug ?? "",
      session.sessionId ?? null,
    );
  }, [sessionLoaded, session, initialized, storeLoading, initFromDB]);

  // ── BACKEND: Redirect empty cart (INTACT) ───────────────────────────────────
  useEffect(() => {
    if (!sessionLoaded || storeLoading || !initialized) return;
    if (!session) return;
    const sid = session.sessionId;
    if (!sid) return;
    const isUpsell = !!searchParams.get("upsell_id");
    const t = setTimeout(() => {
      if (orderId === null && items.length === 0 && !submitted.current && !isUpsell) {
        router.replace(`/order/${sid}`);
      }
    }, isUpsell ? 1500 : 80);
    return () => clearTimeout(t);
  }, [sessionLoaded, storeLoading, initialized, orderId, items.length, session, router]);

  // ── BACKEND: Inactivity timeout (INTACT) ────────────────────────────────────
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

  // ── Handlers (INTACT) ───────────────────────────────────────────────────────
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
    setTimeout(() => setNoteItem(null), 350);
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

  // ═════════════════════════════════════════════════════════════════════════════
  // ─── RENDER: Early returns (skeleton, success, session invalid, empty) ───────
  // ═════════════════════════════════════════════════════════════════════════════

  if (!brandReady) return <CartSkeleton T={buildPalette(brandColor)} />;

  // ── SUCCESS SCREEN (premium ThankYouScreen style with ring pulse) ───────────
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}
      >
        {/* Blob decorativi stile ThankYouScreen */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          aria-hidden
          style={{ position: "absolute", top: "-20%", right: "-15%", width: 380, height: 380, borderRadius: "50%", background: `${T.accent}14`, filter: "blur(80px)", pointerEvents: "none" }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
          aria-hidden
          style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 280, height: 280, borderRadius: "50%", background: `${T.accent}10`, filter: "blur(60px)", pointerEvents: "none" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{ position: "relative", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 32, padding: "48px 32px", maxWidth: 380, width: "100%", textAlign: "center", backdropFilter: "blur(14px)", boxShadow: `0 24px 60px -20px ${T.border}` }}
        >
          {/* Icona animata con RING PULSE come ThankYouScreen */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_SPRING }}
            style={{ position: "relative", width: 88, height: 88, margin: "0 auto 24px" }}
          >
            <RingPulse color={T.accent} delay={0.3} />
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: EASE_SPRING }}
              style={{ position: "relative", width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 16px 40px -8px ${T.accent}66, inset 0 1px 0 rgba(255,255,255,0.3)` }}
            >
              <CheckCircle size={40} color="#fff" strokeWidth={2.4} />
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
            style={{ color: T.accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}
          >
            {tCart.orderSentEyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, ease: EASE_OUT }}
            style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            {tCart.orderSentTitle}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: EASE_OUT }}
            style={{ color: T.textMuted, fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}
          >
            {tCart.kitchenReceived}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.textMuted, fontSize: 13, marginTop: 6 }}
          >
            <Loader2 size={12} style={{ animation: "spin 0.9s linear infinite" }} />
            Reindirizzamento in corso…
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (!sessionLoaded) return <CartSkeleton T={T} />;

  // ── SESSION INVALID (premium style with ring pulse + gradient) ──────────────
  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          aria-hidden
          style={{ position: "absolute", top: "-20%", right: "-15%", width: 320, height: 320, borderRadius: "50%", background: `${T.amber}14`, filter: "blur(80px)", pointerEvents: "none" }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
          aria-hidden
          style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 240, height: 240, borderRadius: "50%", background: `${T.amber}10`, filter: "blur(60px)", pointerEvents: "none" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{ position: "relative", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 32, padding: "44px 28px", maxWidth: 360, width: "100%", textAlign: "center", backdropFilter: "blur(14px)", boxShadow: `0 24px 60px -20px ${T.border}` }}
        >
          {/* Icona ambra con gradiente + ring pulse */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_SPRING }}
            style={{ position: "relative", width: 80, height: 80, margin: "0 auto 20px" }}
          >
            <RingPulse color={T.amber} delay={0.3} />
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: EASE_SPRING }}
              style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #fef3c7, #f59e0b)", border: `1.5px solid rgba(245,158,11,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 40px -8px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.3)" }}
            >
              <AlertCircle size={36} color="#b45309" strokeWidth={2} />
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
            style={{ color: T.amber, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 6px" }}
          >
            {tCart.sessionInvalidEyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, ease: EASE_OUT }}
            style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: "0 0 10px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            {tCart.sessionExpired}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: EASE_OUT }}
            style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.55, marginBottom: 28 }}
          >
            {tCart.sessionScanAgain}
          </motion.p>
          <Link href="/" style={{ textDecoration: "none" }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "14px", borderRadius: 14, background: T.btnBg, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: T.btnShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <ArrowLeft size={16} />
              {tCart.backHome}
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  if (!initialized || storeLoading || addingUpsell) return <CartSkeleton T={T} />;

  // ── EMPTY CART (premium style with ring pulse + float animation) ────────────
  if (items.length === 0 || showEmptyAnim) {
    const handleGoToMenu = () => {
      if (navigating) return;
      setNavigating(true);
      setTimeout(() => router.push(menuHref), 420);
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
          .nav-btn-pressed {
            animation: navBtnPress 0.25s cubic-bezier(0.34,1.3,0.64,1) forwards !important;
            pointer-events: none;
          }
          .page-exiting {
            animation: pageExit 0.3s cubic-bezier(0.55,0,1,0.45) forwards;
          }
        `}</style>

        {/* Blob decorativi animati */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          aria-hidden
          style={{ position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: T.accentBg, filter: "blur(40px)", pointerEvents: "none", zIndex: 0 }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
          aria-hidden
          style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: T.accentBg, filter: "blur(50px)", opacity: 0.7, pointerEvents: "none", zIndex: 0 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          style={{
            position: "relative", zIndex: 1,
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 32,
            padding: "44px 28px 36px", maxWidth: 360, width: "100%", textAlign: "center",
            backdropFilter: "blur(14px)",
            boxShadow: `0 24px 60px -20px ${T.border}`,
            animation: showEmptyAnim ? "emptyFadeIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
          }}
        >
          {/* Icona ShoppingBag con RING PULSE + gradient + float */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE_SPRING }}
            style={{
              position: "relative", width: 88, height: 88,
              margin: "0 auto 22px",
            }}
          >
            <RingPulse color={T.accent} delay={0.4} />
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: EASE_SPRING }}
              style={{
                position: "relative", width: 88, height: 88, borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 16px 40px -8px ${T.accent}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
                animation: "qroBagFloat 3.6s ease-in-out infinite",
              }}
            >
              <ShoppingBag size={36} color="#fff" strokeWidth={1.8} />
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: EASE_OUT }}
            style={{ color: T.accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 6px" }}
          >
            {tCart.emptyEyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: EASE_OUT }}
            style={{ fontSize: 26, fontWeight: 700, color: T.text, margin: "0 0 10px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            {tCart.empty}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4, ease: EASE_OUT }}
            style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.55, marginBottom: 28, padding: "0 8px" }}
          >
            {tCart.emptyLong}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.45, ease: EASE_OUT }}
            whileTap={{ scale: 0.97 }}
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
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <UtensilsCrossed size={16} />
            {tCart.browseMenu}
            <ChevronRight size={16} strokeWidth={2.5} style={{ marginLeft: -2 }} />
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ─── RENDER PRINCIPALE ────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* Sfondo fisso alla viewport */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: pageBg,
          pointerEvents: "none",
        }}
      />
      <div
        onClick={handleDismissReveal}
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          color: T.text,
          fontFamily: "system-ui, -apple-system, sans-serif",
          zIndex: 1,
          ["--brand" as string]: T.brand,
        }}
      >
      {/* Decorative brand-tinted background blobs (animated entrance, ThankYouScreen style) */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          style={{ position: "absolute", top: -140, right: -120, width: 460, height: 460, borderRadius: "50%", background: `${T.brand}22`, filter: "blur(80px)" }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
          style={{ position: "absolute", bottom: -160, left: -140, width: 420, height: 420, borderRadius: "50%", background: `${T.brand}14`, filter: "blur(90px)" }}
        />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        html, body {
          overscroll-behavior-y: none;
          overscroll-behavior-x: none;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes cardEnter {
          0%   { opacity: 0; transform: translateY(18px) scale(0.97); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.005); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }

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

        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalSheetIn {
          from { transform: translateY(100%); opacity: 0.4; }
          to   { transform: translateY(0);    opacity: 1;   }
        }

        @keyframes toastIn {
          from { opacity:0; transform: translateX(-50%) translateY(14px) scale(0.95); }
          to   { opacity:1; transform: translateX(-50%) translateY(0)    scale(1);    }
        }

        @keyframes emptyFadeIn {
          from { opacity:0; transform: scale(0.92) translateY(16px); }
          to   { opacity:1; transform: scale(1)    translateY(0);    }
        }

        .spin-icon {
          animation: spin 0.8s linear infinite;
        }

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

        @keyframes sectionEnter {
          0%   { opacity: 0; transform: translateY(14px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
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

        @keyframes sectionHeaderIn {
          0%   { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }

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

      {/* ── HEADER (premium entrance + brand underline + ripple icon) ────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: T.headerBg,
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          borderBottom: `1px solid ${T.borderSoft}`,
          padding: "0 16px",
          height: 64,
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand accent underline */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
          style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}40, ${T.accent}, ${T.accent}40, transparent)`, pointerEvents: "none", transformOrigin: "center" }}
        />
        {/* Slot SINISTRO: Link menu — dimensionato al contenuto (il centro è absolute, non serve più bilanciare con flex:1) */}
        <Link
          href={menuHref}
          className="menu-btn"
          aria-label={tCart.backToMenuAria}
          style={{ display: "flex", alignItems: "center", gap: 8, color: T.textMuted, textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", flex: "0 0 auto", minWidth: 0 }}
        >
          <motion.div
            className="menu-btn-icon"
            initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: EASE_SPRING }}
            style={{
              position: "relative",
              width: 36, height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              boxShadow: `0 4px 14px ${T.accentBg}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              flexShrink: 0,
            }}
          >
            {/* Ripple rings */}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.accent, opacity: 0, animation: "menuRipple 2.6s ease-out 0.4s infinite", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.accent, opacity: 0, animation: "menuRipple 2.6s ease-out 1.7s infinite", pointerEvents: "none" }} />
            {/* Shimmer */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)", backgroundSize: "200% 100%", animation: "menuShimmer 2.8s ease-in-out 1s infinite", pointerEvents: "none" }} />
            <ArrowLeft size={16} strokeWidth={2.5} color="#fff" style={{ position: "relative", zIndex: 1 }} />
          </motion.div>
          <span style={{ display: "inline-block" }}>{tCart.menuLabel}</span>
        </Link>
        {/* Slot CENTRALE: "Il tuo carrello" — wrapper statico per il centraggio (position/transform), motion.div solo per l'animazione di scala/opacità.
            Nota: framer-motion gestisce internamente la proprietà CSS "transform" per animare scale/x/y, quindi sovrascriverebbe
            un transform di posizionamento (translate(-50%,-50%)) messo sullo stesso motion.div. */}
        <div
          style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(calc(-50% + 24px), -50%)",
            pointerEvents: "none",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
          >
            <span style={{ position: "relative", display: "inline-block", fontWeight: 700, fontSize: 18, color: T.text, letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>
              <div style={{ position: "absolute", right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: 9, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChefHat size={15} color={T.accent} />
              </div>
              {tCart.yourCart}
            </span>
          </motion.div>
        </div>
        {/* Slot DESTRO: Dish count badge — dimensionato al contenuto (il centro è absolute, non serve più bilanciare con flex:1) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE_SPRING }}
          style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto", justifyContent: "flex-end", minWidth: 0 }}
        >
          {/* Dish count badge con spring pop */}
          <div
            aria-label={`${totalDishesCount} ${totalDishesCount === 1 ? tCart.dishInCart : tCart.dishesInCart}`}
            style={{
              minWidth: 32, height: 32, padding: "0 10px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${T.accentBg}, ${T.accentBg})`,
              border: `1px solid ${T.borderSoft}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              color: T.accent, fontSize: 12, fontWeight: 800, letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: `0 4px 12px ${T.accentBg}`,
            }}
          >
            <ShoppingBag size={13} strokeWidth={2.4} />
            {totalDishesCount}
          </div>
        </motion.div>
      </motion.div>

      {/* ── CONTENT WRAPPER ───────────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "88px 10px 160px",
          position: "relative",
          zIndex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "none",
        }}
      >

        {/* Errore — premium in/out animation */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              style={{
                background: T.dangerBg,
                border: `1px solid rgba(239,68,68,0.2)`,
                borderRadius: 16,
                padding: "14px 16px",
                marginBottom: 16,
                display: "flex", gap: 10, alignItems: "flex-start",
                boxShadow: "0 6px 20px -4px rgba(239,68,68,0.15)",
              }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.4, ease: EASE_SPRING }}
                style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}
              >
                <AlertCircle size={14} color={T.danger} />
              </motion.div>
              <p style={{ color: T.danger, fontSize: 14, margin: 0, lineHeight: 1.45, fontFamily: "'Space Grotesk', sans-serif" }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LISTA ITEMS RAGGRUPPATI PER PORTATA ──────────────────────────────── */}
        <div onClick={handleDismissReveal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupedByPortata.map(({ portata, items: portataItems }, groupIdx) => (
            <React.Fragment key={portata}>
              {/* Section header portata — premium staggered entrance */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: groupIdx * 0.08, ease: EASE_OUT }}
                style={{
                  marginTop: groupIdx > 0 ? 22 : 4,
                  marginBottom: 8,
                }}
              >
                {/* ── CARD 1 REDESIGN: Header portata stile /status ───────────────────
                    rounded-2xl bg-white/85 backdrop-blur, bordo black/5,
                    shadow-2xl soft. Layout: badge pill gradient (numero) +
                    label uppercase + prezzo in pill semi-trasparente. */}
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 16px",
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(16px) saturate(140%)",
                    WebkitBackdropFilter: "blur(16px) saturate(140%)",
                    borderRadius: 18,
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 10px 30px -12px rgba(0,0,0,0.18)",
                    overflow: "hidden",
                  }}
                >
                  {/* Glow brand in alto a destra */}
                  <div aria-hidden style={{
                    position: "absolute", top: -28, right: -20,
                    width: 90, height: 90, borderRadius: "50%",
                    background: `${T.accent}14`, filter: "blur(18px)",
                    pointerEvents: "none",
                  }} />
                  {/* Badge pill gradient con numero portata */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ duration: 0.55, delay: groupIdx * 0.08 + 0.1, ease: EASE_SPRING }}
                    style={{
                      position: "relative",
                      minWidth: 40, height: 40, padding: "0 10px",
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
                      flexShrink: 0,
                      boxShadow: `0 6px 18px ${T.accent}40, inset 0 1px 0 rgba(255,255,255,0.35)`,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>{portata}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.85)", marginLeft: 1 }}>ª</span>
                  </motion.div>
                  {/* Label portata */}
                  <span style={{
                    flex: 1, fontSize: 12, fontWeight: 800,
                    color: T.text, letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "'Space Grotesk', sans-serif",
                    minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {portataLabels[portata] || `${portata === 1 ? tCart.courseFirst : portata === 2 ? tCart.courseSecond : portata === 3 ? tCart.courseThird : portata === 4 ? tCart.courseFourth : `${portata}ª`} ${tCart.courseWord}`}
                  </span>
                  {/* Prezzo totale portata in pill semi-trasparente */}
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: T.accent,
                    fontVariantNumeric: "tabular-nums", flexShrink: 0,
                    padding: "5px 12px", borderRadius: 999,
                    background: T.accentBg,
                    border: `1px solid ${T.borderSoft}`,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    € {formatPrice(portataItems.reduce((s, it) => s + (typeof it.priceCents === "number" ? it.priceCents : 0) * (typeof it.totalQty === "number" ? it.totalQty : 1), 0))}
                  </span>
                </motion.div>
              </motion.div>

              {portataItems.map((item, idx) => {
            const price    = typeof item.priceCents === "number" ? item.priceCents : 0;
            const qty      = typeof item.totalQty   === "number" ? item.totalQty   : 1;
            const lineTotal = price * qty;
            const customizationsKey = JSON.stringify(item.customizations);
            const primaryId = item.orderItemIds[0];

            const isRevealed   = revealedId   === primaryId;
            const isConfirming = confirmingId === primaryId;
            const REVEAL_OFFSET = "-112px";
            const isInitialItem = initialItemIdsRef.current.has(primaryId ?? "");
            const staggerDelay = (isInitialItem && !mounted) ? `${idx * 70}ms` : "0ms";

            return (
              <div
                key={`${primaryId ?? item.menuItemId}-${customizationsKey}`}
                style={{
                  position: "relative",
                  borderRadius: 22,
                  overflow: "hidden",
                  opacity: isConfirming ? undefined : (isInitialItem && !mounted ? 0 : undefined),
                  animation: isConfirming
                    ? `collapseHeight 0.35s 0.55s ease forwards`
                    : `cardEnter 0.45s cubic-bezier(0.25,0.46,0.45,0.94) ${staggerDelay} forwards`,
                }}
              >
                {/* Card */}
                {/* ── CARD 2 REDESIGN: card piatto stile /status ──────────────────────
                    rounded-2xl bg-white/90 backdrop-blur, ombra soft deep,
                    immagine quadrata arrotondata (non più cerchio piccolo),
                    prezzo come pill brand in alto a destra, stepper più
                    generoso e con colori brand pieni, cestino in pill soft,
                    "Aggiungi nota" diventa chip grigio discreto (non più
                    link blu invadente). */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(18px) saturate(140%)",
                    WebkitBackdropFilter: "blur(18px) saturate(140%)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 20,
                    padding: "14px 14px 12px",
                    boxShadow: "0 12px 32px -10px rgba(0,0,0,0.18)",
                    animation: isConfirming ? `slideOutLeft 0.55s cubic-bezier(0.55,0,1,0.45) forwards` : undefined,
                  }}
                >
                {/* Top row: immagine + nome + prezzo + nota */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {/* Immagine quadrata arrotondata con ring brand */}
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    aria-hidden
                    style={{
                      width: 64, height: 64,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: `0 8px 20px ${T.accentBg}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}
                  >
                    {itemImages[item.menuItemId] && !brokenImages[item.menuItemId] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={itemImages[item.menuItemId]!}
                        alt={item.name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        onError={() => setBrokenImages((prev) => ({ ...prev, [item.menuItemId]: true }))}
                      />
                    ) : (
                      <span style={{ position: "relative", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {item.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </motion.div>

                  {/* Nome + nota */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <h3 className="font-serif text-lift" style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px", color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>
                      {item.name}
                    </h3>
                    {item.note ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <Pencil size={11} color={T.textMuted} strokeWidth={2} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: T.textMuted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Space Grotesk', sans-serif" }}>{item.note}</span>
                        <button
                          onClick={() => pressBtn(`${primaryId}-nota`, () => handleOpenNote(primaryId, item.name, item.note ?? ""))}
                          style={{ fontSize: 11, color: T.accent, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, textDecoration: "underline" }}
                        >{tCart.edit}</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => pressBtn(`${primaryId}-nota`, () => handleOpenNote(primaryId, item.name, ""))}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          marginTop: 2, padding: "4px 10px",
                          fontSize: 11, fontWeight: 700, color: T.textMuted,
                          background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.05)",
                          borderRadius: 999, cursor: "pointer",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        <Pencil size={10} strokeWidth={2.2} />
                        {tCart.addNote}
                      </button>
                    )}
                  </div>

                  {/* Prezzo in pill brand (alto a destra) */}
                  <span style={{
                    flexShrink: 0,
                    fontSize: 15, fontWeight: 800, color: T.accent,
                    fontVariantNumeric: "tabular-nums",
                    padding: "5px 11px", borderRadius: 999,
                    background: T.accentBg, border: `1px solid ${T.borderSoft}`,
                    fontFamily: "'Space Grotesk', sans-serif",
                    alignSelf: "flex-start",
                  }}>
                    {formatPrice(lineTotal)} €
                  </span>
                </div>

                {/* Divisore soft (non più tratteggiato) */}
                <div style={{ borderTop: `1px solid ${T.borderSoft}`, margin: "12px 0 10px" }} />

                {/* Bottom row: portata | qty | + | - | cestino */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  {/* Portata selector — pill soft brand-tinted */}
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
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "8px 12px", borderRadius: 12,
                        background: showPortataSelector === primaryId ? T.accentBg : "rgba(0,0,0,0.04)",
                        border: `1px solid ${showPortataSelector === primaryId ? T.accent : "rgba(0,0,0,0.06)"}`,
                        cursor: item.portataLocked ? "default" : "pointer",
                        opacity: item.portataLocked ? 0.65 : 1,
                        fontSize: 13, fontWeight: 800, color: showPortataSelector === primaryId ? T.accent : T.text,
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>{item.portata ?? 1}</span>
                      <span style={{ fontSize: 10, opacity: 0.8 }}>ª</span>
                      {!item.portataLocked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showPortataSelector === primaryId ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <AnimatePresence>
                      {!item.portataLocked && showPortataSelector === primaryId && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.92 }}
                          transition={{ duration: 0.25, ease: EASE_OUT }}
                          className="portata-selector"
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: 5, boxShadow: "0 16px 40px rgba(0,0,0,0.18)", zIndex: 100, display: "flex", gap: 4, minWidth: "max-content" }}
                        >
                          {Array.from({ length: selectablePortate }, (_, i) => i + 1).filter((p) => p > portataFloor).map((p) => (
                            <motion.button
                              key={p}
                              whileTap={{ scale: 0.9 }}
                              className="portata-option"
                              onClick={(e) => { e.stopPropagation(); handlePortataChange(primaryId, p, item); }}
                              aria-label={`${tCart.moveToCourse} ${p}`}
                              style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", border: (item.portata ?? 1) === p ? "none" : "1px solid rgba(0,0,0,0.06)", background: (item.portata ?? 1) === p ? `linear-gradient(135deg, ${T.accent}, ${T.accentDark})` : "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: (item.portata ?? 1) === p ? "#fff" : T.textMuted, fontFamily: "'Space Grotesk', sans-serif", boxShadow: (item.portata ?? 1) === p ? `0 4px 12px ${T.accent}40` : "none" }}
                            >
                              {p}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Blocco [-] qty [+] unificato — pill brand-tinted con icone colorate */}
                  <div style={{ display: "flex", alignItems: "center", background: T.accentBg, border: `1px solid ${T.borderSoft}`, borderRadius: 12, overflow: "hidden" }}>
                    <button className="btn-stepper" onPointerDown={(e) => { e.preventDefault(); if (qty > 1) handleStepperChange(primaryId, qty, -1); }} disabled={qty <= 1} aria-label={tCart.decreaseQty}
                      style={{ width: 36, height: 36, background: "none", border: "none", borderRight: `1px solid ${T.borderSoft}`, cursor: qty <= 1 ? "not-allowed" : "pointer", color: qty <= 1 ? T.textMuted : T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: qty <= 1 ? 0.4 : 1 }}>
                      <Minus size={15} strokeWidth={2.6} />
                    </button>
                    <span className="qty-slot-viewport" style={{ minWidth: 34, height: 36, textAlign: "center", fontWeight: 800, fontSize: 15, color: T.text, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "0 4px", overflow: "hidden", fontFamily: "'Space Grotesk', sans-serif" }}>
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
                      style={{ width: 36, height: 36, background: "none", border: "none", borderLeft: `1px solid ${T.borderSoft}`, cursor: "pointer", color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plus size={15} strokeWidth={2.6} />
                    </button>
                  </div>

                  {/* Cestino — pill soft rossa con whileTap */}
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={(e) => handleConfirmDelete(item.orderItemIds, item.name, portata, portataItems.length, e)}
                    disabled={!!confirmingId}
                    aria-label={`${tCart.deleteAria} ${item.name}`}
                    style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      cursor: confirmingId ? "not-allowed" : "pointer",
                      color: "#e53e3e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <Trash2 size={15} strokeWidth={2.2} />
                  </motion.button>
                </div>

                {/* Personalizza (se disponibile) — chip soft brand */}
                <AnimatePresence>
                  {hasOptions[item.menuItemId] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      style={{ marginTop: 10, overflow: "hidden" }}
                    >
                      <button
                        className={`btn-action${activeBtn === `${primaryId}-personalizza` ? " btn-pressed" : ""}`}
                        onClick={() => pressBtn(`${primaryId}-personalizza`, () => handleOpenCustomization(item.menuItemId, customizationsKey))}
                        aria-label={tCart.customizeAria}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.accentBg, border: `1px solid ${T.borderSoft}`, borderRadius: 999, color: T.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        <Settings size={12} strokeWidth={2.2} /> {tCart.customize}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                </div>{/* fine card inner */}
              </div>
            );
          })}
            </React.Fragment>
          ))}
        </div>

        {/* ── fine lista portate ─────────────────────────────────────────── */}
        </div>

      {/* ── TOAST "Piatto eliminato" (premium spring in/out) ──────────────────── */}
      <AnimatePresence>
        {deletedName && !showEmptyAnim && (
          <motion.div
            key="deleted-toast"
            initial={{ opacity: 0, y: 24, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 12, x: "-50%", scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            style={{
              position: "fixed", bottom: 130, left: "50%",
              zIndex: 200,
              background: "rgba(28, 25, 23, 0.96)",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.08)",
              pointerEvents: "none",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.4, ease: EASE_SPRING }}
              style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Trash2 size={12} color="#f87171" />
            </motion.div>
            <span><span style={{ color: "#f87171", fontWeight: 700 }}>{deletedName}</span> {tCart.deleted}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ERRORE PORTATA (premium spring in/out) ──────────────────────── */}
      <AnimatePresence>
        {portataError && (
          <motion.div
            key="portata-error"
            initial={{ opacity: 0, y: 16, x: "-50%", scale: 0.92 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 12, x: "-50%", scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            style={{
              position: "fixed", bottom: 80, left: "50%",
              zIndex: 200,
              background: "rgba(28, 25, 23, 0.96)", color: "#fbbf24",
              padding: "14px 22px", borderRadius: 18,
              fontSize: 13, fontWeight: 700,
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              display: "flex", alignItems: "center", gap: 10,
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(251,191,36,0.25)",
              width: "calc(100vw - 40px)", maxWidth: 360,
              whiteSpace: "normal",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_SPRING }}
              style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(251,191,36,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <AlertCircle size={13} color="#fbbf24" />
            </motion.div>
            {portataError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sfumato leggero dietro la sticky checkout bar (stesso effetto/altezza di /order) */}
      {items.length > 0 && (
        <div
          aria-hidden
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
            height: 110, pointerEvents: "none",
            background: "linear-gradient(0deg, rgba(255,255,255,0.95) 55%, rgba(255,255,255,0) 100%)",
          }}
        />
      )}

      {/* ── STICKY CHECKOUT BAR (premium glass + brand gradient + spring in) ──── */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            key="checkout-bar"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
              background: T.footerBg,
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              borderTop: `1px solid ${T.border}`,
              padding: "14px 16px",
              paddingBottom: "max(14px, env(safe-area-inset-bottom))",
              boxShadow: `0 -12px 40px ${T.borderSoft}`,
            }}
          >
            {/* Brand accent top line con entrance scaleX */}
            <motion.div
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
              style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent}40, ${T.accent}, ${T.accent}40, transparent)`, pointerEvents: "none", transformOrigin: "center" }}
            />
            <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
              {/* Left: dish count */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.1, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {totalDishesCount === 1 ? tCart.dish : tCart.dishes}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.textMuted }}>
                  <ShoppingBag size={13} color={T.accent} strokeWidth={2.4} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.text, fontVariantNumeric: "tabular-nums", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>{totalDishesCount}</span>
                </div>
              </div>
              {/* Divider */}
              <div aria-hidden style={{ width: 1, height: 32, background: T.borderSoft, flexShrink: 0 }} />
              {/* Center: Totale */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.1, fontFamily: "'Space Grotesk', sans-serif" }}>{tCart.total}</span>
                <span style={{ fontWeight: 900, fontSize: 24, color: T.text, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {formatPrice(totalCents)} <span style={{ fontSize: 16, fontWeight: 700, color: T.textMuted }}>€</span>
                </span>
              </div>
              {/* Right: Vai alla cassa con whileTap */}
              <motion.div whileTap={{ scale: 0.96 }}>
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
                    fontFamily: "'Space Grotesk', sans-serif",
                    transition: "transform 0.15s, box-shadow 0.2s",
                  }}
                >
                  <span style={{ whiteSpace: "nowrap" }}>{tCart.checkout}</span>
                  <ChevronRight size={18} strokeWidth={2.6} />
                </Link>
              </motion.div>
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
    </>
  );
}
