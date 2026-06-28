// src/components/client/order/palette.ts
// Brand-driven color palette shared by the order / cart / status pages.
//
// Each (client) page builds its own palette inline (so it can render even
// before this module loads), but they all expect the SAME shape so a
// `Palette` returned here can be passed to `<CategoryFilter palette={T} />`
// or `<Footer palette={...} />` without type errors.
//
// The full property set is the UNION of every field touched by:
//   - src/app/(client)/order/[token]/page.tsx      (uses T.brand, T.textMuted,
//     T.text, T.border, T.bgGradient, T.borderMid, T.chipBg, T.textSoft,
//     T.btnBg, T.flyDot, T.flyGlow, T.borderStrong, T.light200, …)
//   - src/app/(client)/cart/[sessionId]/page.tsx   (uses T.bg, T.bgCard,
//     T.borderSoft, T.accent, T.accentDark, T.accentBg, T.headerBg,
//     T.footerBg, T.danger, T.dangerBg, T.amber, T.amberBg, …)
//   - src/app/(client)/status/[sessionId]/page.tsx (uses T.grid, T.light100,
//     T.light300, T.blob1-4, T.chipBgActive, T.glowRing, …)

export type Palette = {
  /** Original brand hex (e.g. "#d97706"). */
  brand: string;
  /** Soft tint of the brand, used as a page background. */
  bg: string;
  /** Full-page background — gradient string ready for `background:`. */
  bgGradient: string;
  /** Darkest brand-tinted ink, used for primary text. */
  text: string;
  /** Slightly lighter than `text` — for secondary text. */
  textMuted: string;
  /** Alias of textMuted — used by the order page hero chips. */
  textSoft: string;
  /** Subtle brand-alpha border. */
  border: string;
  /** Slightly stronger brand-alpha border. */
  borderMid: string;
  /** Even stronger brand-alpha border (active/selected states). */
  borderStrong: string;
  /** Very subtle border (cart page cards). */
  borderSoft: string;
  /** Card background — translucent white for the glass effect. */
  bgCard: string;
  /** Solid brand hex (alias of `brand`). */
  accent: string;
  /** Darker brand tint (button gradient end). */
  accentDark: string;
  /** Very subtle brand tint (icon backgrounds, etc.). */
  accentBg: string;
  /** Button background — gradient string. */
  btnBg: string;
  /** Button drop-shadow. */
  btnShadow: string;
  /** Sticky header background (translucent brand tint). */
  headerBg: string;
  /** Sticky footer background (translucent brand tint). */
  footerBg: string;
  /** Danger / destructive color. */
  danger: string;
  dangerBg: string;
  /** Warning amber. */
  amber: string;
  amberBg: string;
  /** Subtle gridline color (status page). */
  grid: string;
  /** Brand mixed 88% toward white. */
  light100: string;
  /** Brand mixed 78% toward white. */
  light200: string;
  /** Brand mixed 60% toward white. */
  light300: string;
  /** Decorative blob colors (currently empty strings — pages paint their own). */
  blob1: string;
  blob2: string;
  blob3: string;
  blob4: string;
  /** Chip background (subtle brand tint). */
  chipBg: string;
  /** Chip background for the active/selected state. */
  chipBgActive: string;
  /** Glow ring box-shadow string (kept for API compat; pages usually build their own). */
  glowRing: string;
  /** Solid brand hex used for the "flying dot" add-to-cart animation. */
  flyDot: string;
  /** Box-shadow for the flying dot. */
  flyGlow: string;
};

export const DEFAULT_BRAND = "#d97706";

/** Parse a "#RRGGBB" or "#RGB" hex into [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "").replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full || "000000", 16);
  if (isNaN(n)) return [217, 119, 6]; // amber fallback
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear-interpolate between two hex colors. `t` ∈ [0,1]. */
export function mix(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Build a complete `Palette` from a brand hex.  Falls back to `DEFAULT_BRAND`
 * when the input is missing or unparsable.  White brand is special-cased so
 * buttons stay visible.
 */
export function buildPalette(brandHex: string): Palette {
  const brand = brandHex && brandHex.startsWith("#") ? brandHex : DEFAULT_BRAND;
  const [r, g, b] = hexToRgb(brand);
  const alpha = (a: number) => `rgba(${r},${g},${b},${a})`;

  const dark500 = mix(brand, "#000000", 0.45);
  const dark400 = mix(brand, "#000000", 0.35);
  const dark300 = mix(brand, "#000000", 0.20);
  const light100 = mix(brand, "#ffffff", 0.88);
  const light200 = mix(brand, "#ffffff", 0.78);
  const light300 = mix(brand, "#ffffff", 0.60);

  const isWhite = brand.toLowerCase() === "#ffffff";
  const btnBg = isWhite
    ? "linear-gradient(135deg, #1f2937, #374151)"
    : `linear-gradient(135deg, ${brand}, ${dark300})`;

  return {
    brand,
    bg: light100,
    bgGradient: `linear-gradient(160deg, #ffffff 0%, ${mix(brand, "#ffffff", 0.92)} 40%, ${mix(brand, "#ffffff", 0.82)} 75%, ${mix(brand, "#ffffff", 0.88)} 100%)`,
    text: dark500,
    textMuted: dark400,
    textSoft: dark300,
    border: alpha(0.20),
    borderMid: alpha(0.30),
    borderStrong: alpha(0.50),
    borderSoft: alpha(0.12),
    bgCard: "rgba(255,255,255,0.88)",
    accent: brand,
    accentDark: dark300,
    accentBg: alpha(0.08),
    btnBg,
    btnShadow: `0 6px 24px ${alpha(0.35)}`,
    headerBg: `${mix(brand, "#ffffff", 0.92)}d9`,
    footerBg: `${mix(brand, "#ffffff", 0.90)}eb`,
    danger: "#ef4444",
    dangerBg: "#fef2f2",
    amber: "#f59e0b",
    amberBg: "rgba(245,158,11,0.08)",
    grid: alpha(0.08),
    light100,
    light200,
    light300,
    blob1: "",
    blob2: "",
    blob3: "",
    blob4: "",
    chipBg: alpha(0.10),
    chipBgActive: alpha(0.12),
    glowRing: `0 0 0 6px ${alpha(0.08)}, 0 8px 40px ${alpha(0.30)}`,
    flyDot: brand,
    flyGlow: `0 0 18px ${alpha(0.55)}`,
  };
}

export default buildPalette;
