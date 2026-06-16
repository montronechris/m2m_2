// src/app/admin/dashboard/page.tsx
//
// ─── ORCHESTRATORE SPA ────────────────────────────────────────────────────────
//
// Questo file gestisce SOLO:
//   1. Caricamento dati iniziali (profilo + ristorante)
//   2. Stato globale condiviso (tema, sidebar, sezione attiva)
//   3. Layout fisso (sidebar + topbar)
//   4. Rendering della sezione attiva tramite <SectionRenderer>
//
// Per aggiungere una nuova sezione:
//   → Crea src/app/admin/dashboard/sections/NuovaSezione.tsx
//   → Aggiungila in SectionRenderer qui sotto
//   → Aggiungila a NAV_ITEMS
//
// NON mettere logica di sezione in questo file.
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  ChefHat, ChevronLeft, ChevronRight,
  LayoutDashboard, ShoppingCart, Utensils, QrCode,
  BarChart3, Users, Palette, Settings,
  Sun, Moon, Bell,
} from "lucide-react";

// ── Sezioni ──────────────────────────────────────────────────────────────────
import { DashboardSection }  from "./sections/DashboardSection";
import { StaffSection }      from "./sections/StaffSection";
import { PlaceholderSection } from "./sections/PlaceholderSection";
import { MenuSection } from "./sections/MenuSection";
import { OrdersSection } from "./sections/OrdersSection";
import { TablesSection } from "./sections/TablesSection";
import { BrandingSection } from "./sections/BrandingSection";
import { AnalyticsSection } from "./sections/AnalyticsSection";
import { AIAnalyticsSection } from "./sections/AIAnalyticsSection";
import { SettingsSection } from "./sections/SettingsSection";
import { AIAssistantOverlay } from "./components/AIAssistantOverlay";


// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionId =
  | "dashboard"
  | "orders"
  | "menu"
  | "tables"
  | "qr"
  | "analytics"
  | "staff"
  | "branding"
  | "settings";

export type ThemeMode = "dark" | "light";

export interface RestaurantCtx {
  restaurantId:    string;
  restaurantName:  string;
  logoUrl:         string | null;
  plan:            string | null;
  accessExpiresAt: string | null;
  maxStaff:        number | null;
  userFirstName:   string;
  userEmail:       string;
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { id: "menu",      label: "Menu",         icon: Utensils        },
  { id: "orders",    label: "Ordini",       icon: ShoppingCart    },
  { id: "tables",    label: "Tavoli",       icon: QrCode          },
  { id: "analytics", label: "Analytics",   icon: BarChart3       },
  { id: "staff",     label: "Staff",        icon: Users           },
  { id: "branding",  label: "Branding",    icon: Palette         },
  { id: "settings",  label: "Impostazioni", icon: Settings        },
];

// ─── Section renderer ─────────────────────────────────────────────────────────
// Unico posto dove si decide quale componente mostrare.
// Per aggiungere una sezione: importala sopra e aggiungi il case.

function SectionRenderer({
  section,
  ctx,
  theme,
  onSectionChange,
}: {
  section:         SectionId;
  ctx:             RestaurantCtx;
  theme:           ThemeMode;
  onSectionChange: (s: SectionId) => void;
}) {
  switch (section) {
    case "dashboard":
      return <DashboardSection ctx={ctx} theme={theme} onSectionChange={onSectionChange} />;
    case "staff":
      return <StaffSection ctx={ctx} theme={theme} />;
    case "branding":
      return <BrandingSection ctx={ctx} theme={theme} />;
    case "analytics":
      return <AIAnalyticsSection ctx={ctx} theme={theme} />;
    case "settings":
      return <SettingsSection ctx={ctx} theme={theme} />;
    case "menu":
      return <MenuSection ctx={ctx} theme={theme} />;
    case "orders":
      return <OrdersSection ctx={ctx} theme={theme} />;
    case "tables":
      return <TablesSection ctx={ctx} theme={theme} />;
    case "qr":
      return <PlaceholderSection id={section} theme={theme} />;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Stato UI ────────────────────────────────────────────────────────────────
  const [activeSection,       setActiveSection]       = useState<SectionId>("dashboard");
  const [isSidebarCollapsed,  setIsSidebarCollapsed]  = useState(false);
  const [theme,               setTheme]               = useState<ThemeMode>("dark");
  const [isLoading,           setIsLoading]           = useState(true);
  const [ctx,                 setCtx]                 = useState<RestaurantCtx | null>(null);
  const [activeOrdersCount,   setActiveOrdersCount]   = useState(0);

  // ── Tema persistente ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("tavolarapida_theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("tavolarapida_theme", next);
      return next;
    });
  }, []);

  // ── Caricamento dati iniziali ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id, first_name, email")
          .eq("id", user.id)
          .single();

        if (!profile?.restaurant_id) return;
        const rid = profile.restaurant_id;

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name, logo_url, plan, access_expires_at, max_staff")
          .eq("id", rid)
          .single();

        // Solo per il badge notifiche nella topbar
        const { count: activeOrders } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", rid)
          .in("status", ["pending", "confirmed", "preparing", "cooking", "ready"]);

        setActiveOrdersCount(activeOrders ?? 0);
        setCtx({
          restaurantId:    rid,
          restaurantName:  restaurant?.name            ?? "Il tuo ristorante",
          logoUrl:         restaurant?.logo_url        ?? null,
          plan:            restaurant?.plan            ?? null,
          accessExpiresAt: restaurant?.access_expires_at ?? null,
          maxStaff:        restaurant?.max_staff       ?? null,
          userFirstName:   profile?.first_name         ?? "",
          userEmail:       profile?.email              ?? user.email ?? "",
        });
      } catch (err) {
        console.error("Errore caricamento dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Token tema ──────────────────────────────────────────────────────────────
  const dark  = theme === "dark";
  const bg    = dark ? "bg-[#0d0d14]"     : "bg-gray-50";
  const sbg   = dark ? "bg-[#0d0d14]"     : "bg-white";
  const bord  = dark ? "border-white/8"   : "border-gray-200";
  const txt   = dark ? "text-white"       : "text-gray-900";
  const muted = dark ? "text-gray-400"    : "text-gray-500";
  const hover = dark ? "hover:bg-white/5" : "hover:bg-gray-100";

  const initials = ctx?.restaurantName?.slice(0, 2).toUpperCase() ?? "TR";
  const now      = new Date();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
        <p className="text-red-400 text-sm">Errore nel caricamento del profilo.</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} ${txt} flex`}>

      {/* ════════════════════════════════════════════════════════════════════
          SIDEBAR
          Gestisce solo navigazione e collasso.
          NON contiene logica di sezione.
          ════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`
          ${sbg} border-r ${bord} flex flex-col shrink-0
          sticky top-0 h-screen z-20
          transition-all duration-300
          ${isSidebarCollapsed ? "w-16" : "w-56"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b ${bord}`}>
          <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
            {ctx.logoUrl ? (
              <img src={ctx.logoUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <ChefHat className="w-5 h-5 text-green-400" />
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className={`font-bold text-sm truncate ${txt}`}>{ctx.restaurantName}</p>
              <p className="text-xs text-green-400">● Online</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all text-left
                  ${isSidebarCollapsed ? "justify-center" : ""}
                  ${isActive
                    ? "bg-green-500/15 text-green-400 border border-green-500/20"
                    : `${muted} ${hover}`
                  }
                `}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
                {isActive && !isSidebarCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar: tema + collasso */}
        <div className={`px-2 py-3 border-t ${bord} space-y-0.5`}>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${muted} ${hover} transition-all ${isSidebarCollapsed ? "justify-center" : ""}`}
          >
            {dark
              ? <Sun  className="w-5 h-5 shrink-0" />
              : <Moon className="w-5 h-5 shrink-0" />
            }
            {!isSidebarCollapsed && (
              <span className="text-sm font-medium">
                {dark ? "Tema chiaro" : "Tema scuro"}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsSidebarCollapsed(p => !p)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${muted} ${hover} transition-all ${isSidebarCollapsed ? "justify-center" : ""}`}
          >
            {isSidebarCollapsed
              ? <ChevronRight className="w-5 h-5" />
              : <ChevronLeft  className="w-5 h-5" />
            }
            {!isSidebarCollapsed && (
              <span className="text-sm font-medium">Comprimi</span>
            )}
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN AREA
          ════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <header
          className={`
            sticky top-0 z-10 backdrop-blur-xl border-b px-6 py-3
            flex items-center justify-between
            ${dark
              ? "bg-[#0d0d14]/90 border-white/5"
              : "bg-white/90 border-gray-200"
            }
          `}
        >
          <div>
            {/* Titolo dinamico in base alla sezione attiva */}
            <h1 className={`text-base font-bold ${txt}`}>
              {NAV_ITEMS.find(n => n.id === activeSection)?.label ?? "Dashboard"}
            </h1>
            <p className={`text-xs ${muted}`}>
              {now.toLocaleDateString("it-IT", {
                weekday: "long",
                day:     "numeric",
                month:   "long",
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 ${hover} rounded-xl transition-all ${muted}`}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Badge notifiche ordini attivi */}
            <button className={`p-2 ${hover} rounded-xl transition-all relative ${muted}`}>
              <Bell className="w-4 h-4" />
              {activeOrdersCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
          </div>
        </header>

        {/* ── CONTENUTO SEZIONE ──────────────────────────────────────────── */}
        {/*
          SectionRenderer è l'unico punto dove si decide cosa renderizzare.
          Ogni sezione riceve ctx (dati ristorante) e theme.
          Le sezioni gestiscono autonomamente il proprio stato e le proprie query.
        */}
        <div className="flex-1 overflow-y-auto">
          <SectionRenderer
            section={activeSection}
            ctx={ctx}
            theme={theme}
            onSectionChange={setActiveSection}
          />
        </div>

      </main>

      {/* ════════════════════════════════════════════════════════════════════
          AI ASSISTANT — overlay floating, disponibile in tutta la dashboard
          ════════════════════════════════════════════════════════════════════ */}
      <AIAssistantOverlay ctx={ctx} theme={theme} />

    </div>
  );
}