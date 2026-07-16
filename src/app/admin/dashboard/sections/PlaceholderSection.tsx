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
import { useI18n } from "@/components/i18n/I18nProvider";

interface Props {
  id:    SectionId;
  theme: ThemeMode;
}

const LABELS_IT: Record<SectionId, string> = {
  dashboard: "Dashboard",
  orders:    "Ordini",
  menu:      "Menu",
  tables:    "Tavoli",
  analytics: "Analytics",
  reviews:   "Recensioni",
  staff:     "Staff",
  branding:  "Branding",
  waiter:    "Cameriere",
  history:   "Cronologia",
  calendar:  "In arrivo",
  delivery:  "Delivery",
  settings:  "Impostazioni",
};

const LABELS_EN: Record<SectionId, string> = {
  dashboard: "Dashboard",
  orders:    "Orders",
  menu:      "Menu",
  tables:    "Tables",
  analytics: "Analytics",
  reviews:   "Reviews",
  staff:     "Staff",
  branding:  "Branding",
  waiter:    "Waiter",
  history:   "History",
  calendar:  "Coming soon",
  delivery:  "Delivery",
  settings:  "Settings",
};

export function PlaceholderSection({ id, theme }: Props) {
  const { lang } = useI18n();
  const dark  = theme === "dark";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const txt   = dark ? "text-white"    : "text-gray-900";
  const labels = lang === "en" ? LABELS_EN : LABELS_IT;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
          <Wrench className="w-7 h-7 text-green-500/60" />
        </div>
        <p className={`text-lg font-bold ${txt}`}>{labels[id]}</p>
        <p className={`text-sm ${muted}`}>
          {lang === "en" ? "Work in progress." : "Lavori in corso."}
        </p>
      </div>
    </div>
  );
}
