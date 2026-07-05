// src/components/client/cart/CustomizationModal.tsx
// Bottom-sheet dialog for picking option choices (size, extras, etc.) before
// adding an item to the cart.
//
// Props:
//   - isOpen:          boolean
//   - options:         ModalOption[]   (camelCase fields — see @/lib/api-service)
//   - itemName:        string
//   - basePriceCents?: number  (optional, defaults to 0)
//   - brandColor?:     string  (optional brand hex — used for theming)
//   - onClose:         () => void
//   - onConfirm:       (customizations: CartCustomization[]) => void | Promise<void>

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Check, SlidersHorizontal } from "lucide-react";
import type { ModalOption, CartCustomization } from "@/lib/api-service";
import { buildPalette, DEFAULT_BRAND, type Palette } from "@/components/client/order/palette";
import { useI18n } from "@/components/i18n/I18nProvider";

type CustomizationModalProps = {
  isOpen: boolean;
  options: ModalOption[];
  itemName: string;
  basePriceCents?: number;
  brandColor?: string;
  onClose: () => void;
  onConfirm: (customizations: CartCustomization[]) => void | Promise<void>;
};

/**
 * Selection state per option:
 *   - single-choice → one choiceId (or null)
 *   - multi-choice  → map of choiceId → count (default 0/1)
 */
type SingleState = { kind: "single"; choiceId: string | null };
type MultiState = { kind: "multi"; picks: Record<string, number> };
type OptionState = SingleState | MultiState;

function initialState(options: ModalOption[]): Record<string, OptionState> {
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

function formatPrice(cents: number): string {
  if (typeof cents !== "number" || isNaN(cents)) return "0,00";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function CustomizationModal({
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
  const T: Palette = useMemo(() => buildPalette(brandColor || DEFAULT_BRAND), [brandColor]);
  const [state, setState] = useState<Record<string, OptionState>>({});

  // Reset selections whenever the modal opens or the options change.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(initialState(options));
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

  /** Build the CartCustomization[] from the current selection. */
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

  /** True when every required option has at least one pick. */
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

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bottom-0 top-auto max-h-[90vh] translate-y-0 gap-0 overflow-hidden rounded-t-3xl rounded-b-none border bg-white p-0 sm:max-w-md sm:rounded-3xl sm:border"
        style={{ borderColor: T.borderSoft }}
      >
        <DialogTitle className="sr-only">{itemName}</DialogTitle>
        <DialogDescription className="sr-only">
          {t.customizeTitle}
        </DialogDescription>

        {/* Header — brand-tinted icon + serif item name */}
        <div
          className="relative flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: `1px solid ${T.borderSoft}`,
            background: `linear-gradient(135deg, ${T.accentBg}, transparent)`,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
                boxShadow: T.btnShadow,
              }}
            >
              <SlidersHorizontal className="h-4 w-4 text-white" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{ color: T.accent }}
              >
                {t.customizeTitle}
              </p>
              <h2 className="truncate font-serif text-lg font-bold leading-tight text-ink text-lift">
                {itemName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={tCommon.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-ink/60 transition hover:bg-ink/10 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — option sections */}
        <div className="max-h-[58vh] space-y-5 overflow-y-auto px-5 py-5">
          {options.length === 0 && (
            <p className="py-6 text-center text-sm text-ink/50">
              {t.noCustomizations}
            </p>
          )}
          {options.map((opt) => {
            const sel = state[opt.id];
            const isMulti = opt.isMultiple;
            return (
              <section key={opt.id}>
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <h3 className="text-sm font-bold text-ink">{opt.name}</h3>
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
                  {opt.choices.map((c) => {
                    const active =
                      sel?.kind === "single"
                        ? sel.choiceId === c.id
                        : sel?.kind === "multi"
                          ? !!sel.picks[c.id]
                          : false;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          isMulti ? toggleMulti(opt.id, c.id) : setSingle(opt.id, c.id)
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left transition active:scale-[0.98]"
                        style={{
                          borderColor: active ? T.accent : T.borderSoft,
                          background: active ? T.accentBg : "#ffffff",
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="grid h-5 w-5 shrink-0 place-items-center border-2 transition"
                            style={{
                              borderRadius: isMulti ? 6 : 999,
                              borderColor: active ? T.accent : T.borderSoft,
                              background: active
                                ? `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`
                                : "transparent",
                            }}
                          >
                            {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </span>
                          <span className="truncate text-sm font-medium text-ink">
                            {c.name}
                          </span>
                        </div>
                        {c.priceModifierCents > 0 && (
                          <span
                            className="shrink-0 text-xs font-bold tabular-nums"
                            style={{ color: T.accent }}
                          >
                            +{formatPrice(c.priceModifierCents)} €
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Sticky footer — live total + Conferma brand button */}
        <div
          className="px-5 py-4 backdrop-blur"
          style={{
            borderTop: `1px solid ${T.borderSoft}`,
            background: "rgba(255,255,255,0.96)",
          }}
        >
          <button
            type="button"
            disabled={!requiredSatisfied}
            onClick={handleConfirm}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: T.btnBg,
              boxShadow: requiredSatisfied ? T.btnShadow : "none",
            }}
          >
            <span className="flex items-center gap-2">
              <Check size={16} strokeWidth={2.6} />
              {tCommon.confirm}
            </span>
            <span className="tabular-nums text-base">{formatPrice(totalCents)} €</span>
          </button>
          {!requiredSatisfied && (
            <p className="mt-2 text-center text-xs text-ink/50">
              {t.selectRequired}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CustomizationModal;
