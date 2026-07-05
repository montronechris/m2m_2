"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { X, StickyNote, Save } from "lucide-react";
import { buildPalette, DEFAULT_BRAND, type Palette } from "@/components/client/order/palette";
import { useI18n } from "@/components/i18n/I18nProvider";

type NoteModalProps = {
  isOpen: boolean;
  itemName: string;
  initialNote: string;
  brandColor?: string;
  onClose: () => void;
  onSave: (note: string) => void | Promise<void>;
};

const MAX_LEN = 300;
const DRAG_THRESHOLD = 80;

export function NoteModal({ isOpen, itemName, initialNote, brandColor, onClose, onSave }: NoteModalProps) {
  const { tr } = useI18n();
  const t = tr.client.modal;
  const tCommon = tr.client.common;
  const T: Palette = useMemo(() => buildPalette(brandColor || DEFAULT_BRAND), [brandColor]);
  const [note, setNote] = useState(initialNote);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Solleva il modal quando la tastiera virtuale appare
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
    closeTimer.current = setTimeout(() => { onClose(); closeTimer.current = null; }, 300);
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
    if (dragY > DRAG_THRESHOLD) {
      triggerClose();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  };

  const handleSave = () => { onSave(note); };

  const remaining = MAX_LEN - note.length;
  const isLow = remaining <= 30;

  if (!isOpen) return null;

  const sheetTransform = closing
    ? "translateY(110%)"
    : dragY > 0
    ? `translateY(${dragY}px)`
    : "translateY(0)";

  return (
    <div
      onClick={triggerClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        opacity: closing ? 0 : 1,
        transition: "opacity 0.3s ease",
        pointerEvents: closing ? "none" : "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "absolute", bottom: kbOffset, left: 0, right: 0, transition: "bottom 0.2s ease",
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          transform: sheetTransform,
          transition: dragY === 0 ? "transform 0.32s cubic-bezier(0.32,0.72,0,1)" : "none",
          touchAction: "none",
          maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#dde6f5", margin: "12px auto 0", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 14px", borderBottom: `1px solid ${T.borderSoft}`, background: "linear-gradient(135deg, #fffbeb, transparent)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "linear-gradient(135deg, #fbbf24, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(245,158,11,0.32)", flexShrink: 0 }}>
              <StickyNote size={16} color="#fff" strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#b45309", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>{t.noteTitle}</p>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a2236", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemName}</h2>
            </div>
          </div>
          <button onClick={triggerClose} aria-label={tCommon.close} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={16} color="#64748b" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 20px 12px", flex: 1, overflow: "auto" }} onPointerDown={(e) => e.stopPropagation()}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "rgba(28,25,23,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            {t.noteInstructions}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_LEN))}
            rows={4}
            autoFocus
            placeholder={t.notePlaceholder}
            style={{ width: "100%", resize: "none", borderRadius: 16, border: `2px solid ${T.borderSoft}`, background: "rgba(255,255,255,0.9)", padding: "12px 14px", fontSize: 16, color: "#1a2236", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(28,25,23,0.4)" }}>{t.noteHints}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isLow ? T.danger : "rgba(28,25,23,0.4)", fontVariantNumeric: "tabular-nums" }}>{note.length}/{MAX_LEN}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "12px 20px 20px", borderTop: `1px solid ${T.borderSoft}`, background: "rgba(255,255,255,0.96)", flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={triggerClose} style={{ flex: 1, borderRadius: 16, border: `2px solid ${T.borderSoft}`, background: "#fff", padding: "12px 0", fontSize: 14, fontWeight: 700, color: "rgba(28,25,23,0.7)", cursor: "pointer" }}>
            {tCommon.cancel}
          </button>
          <button onClick={handleSave} style={{ flex: 2, borderRadius: 16, border: "none", background: T.btnBg, padding: "12px 0", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: T.btnShadow }}>
            <Save size={15} strokeWidth={2.4} />
            {t.saveNote}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteModal;
