// src/components/client/order/CategoryFilter.tsx
"use client";

// Stessa interfaccia Palette esportata da page.tsx — passala come prop
export interface Palette {
  brand: string;
  bg: string;
  text: string;
  textMuted: string;
  textSoft: string;
  border: string;
  borderMid: string;
  borderStrong: string;
  bgCard: string;
  light100: string;
  light200: string;
  light300: string;
  btnBg: string;
  btnShadow: string;
  chipBg: string;
  chipBgActive: string;
  [key: string]: string;
}

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string }>;
  activeCat: string;
  onCategoryChange: (catId: string) => void;
  palette: Palette;
}

const catEmoji: Record<string, string> = {
  "tutti":       "🍽️",
  "antipasti":   "🫒",
  "primi":       "🍝",
  "secondi":     "🥩",
  "carne":       "🥩",
  "pesce":       "🐟",
  "contorni":    "🥗",
  "dolci":       "🍰",
  "dessert":     "🍰",
  "pizze":       "🍕",
  "pizza":       "🍕",
  "bevande":     "🥤",
  "vegetariano": "🌿",
  "vegano":      "🥦",
  "fritti":      "🍟",
  "zuppe":       "🍲",
  "insalate":    "🥗",
  "panini":      "🥪",
  "burger":      "🍔",
};

function getEmoji(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  for (const k of Object.keys(catEmoji)) {
    if (key.includes(k)) return catEmoji[k];
  }
  return "🍴";
}

export function CategoryFilter({ categories, activeCat, onCategoryChange, palette: T }: CategoryFilterProps) {
  const all = [{ id: "all", name: "Tutti i Piatti" }, ...categories];

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center",
      padding: "16px 0 8px",
    }}>
      {all.map((cat, i) => {
        const isActive = activeCat === cat.id;
        const emoji = getEmoji(cat.name);
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 20px",
              borderRadius: 999,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease",
              whiteSpace: "nowrap",
              outline: "none",
              // Stili dinamici basati su isActive + palette
              background: isActive ? T.btnBg : "rgba(255,255,255,0.75)",
              border: isActive ? "2px solid transparent" : `2px solid ${T.border}`,
              color: isActive ? "#fff" : T.textMuted,
              boxShadow: isActive ? T.btnShadow : `0 1px 6px ${T.border}`,
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.95)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderMid;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${T.border}`;
                (e.currentTarget as HTMLButtonElement).style.color = T.text;
              }
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.04)";
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.75)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 1px 6px ${T.border}`;
                (e.currentTarget as HTMLButtonElement).style.color = T.textMuted;
              }
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)";
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.04)";
            }}
          >
            <span style={{ fontSize: 15, display: "inline-block", transition: "transform 0.2s ease" }}>
              {emoji}
            </span>
            {cat.name}
            {isActive && (
              <span style={{
                position: "absolute",
                bottom: -5,
                left: "50%",
                transform: "translateX(-50%)",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: T.brand,
                boxShadow: `0 0 6px ${T.brand}b3`,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}