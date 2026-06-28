// src/app/admin/dashboard/sections/PlaceholderSection.tsx
//
// ─── SEZIONE: PLACEHOLDER ─────────────────────────────────────────────────────
//
// Mostrata per le sezioni non ancora implementate.
// Sostituisci questo file con il componente reale man mano che sviluppi.
//
// Per implementare una sezione:
//   1. Crea NomeSezione.tsx in questa cartella
//   2. Importalo in page.tsx e aggiungi il case in SectionRenderer
//   3. Rimuovi il case "placeholder" corrispondente da SectionRenderer
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import React from "react";
import { Wrench } from "lucide-react";
import type { SectionId, ThemeMode } from "../types";

interface Props {
  id:    SectionId;
  theme: ThemeMode;
}

const LABELS: Record<SectionId, string> = {
  dashboard: "Dashboard",
  orders:    "Ordini",
  menu:      "Menu",
  tables:    "Tavoli",
  analytics: "Analytics",
  staff:     "Staff",
  branding:  "Branding",
  waiter:    "Cameriere",
  history:   "Cronologia",
  calendar:  "Presenze",
  settings:  "Impostazioni",
};

export function PlaceholderSection({ id, theme }: Props) {
  const dark  = theme === "dark";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const txt   = dark ? "text-white"    : "text-gray-900";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
          <Wrench className="w-7 h-7 text-green-500/60" />
        </div>
        <p className={`text-lg font-bold ${txt}`}>{LABELS[id]}</p>
        <p className={`text-sm ${muted}`}>
          Sezione in costruzione — disponibile a breve.
        </p>
      </div>
    </div>
  );
}
