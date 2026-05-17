// src/app/(client)/order/[sessionId]/page.tsx

"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderSession } from "@/hooks/useOrderSession";
import { OrderHeader } from "@/components/client/order/OrderHeader";
import { RestaurantTitle } from "@/components/client/order/RestaurantTitle";
import { CategoryFilter } from "@/components/client/order/CategoryFilter";
import { MenuItemCard } from "@/components/client/order/MenuItemCard";
import { Footer } from "@/components/layout/Footer";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

export default function OrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const initialSlug = searchParams.get("slug") || "cucinadalaghetti";

  const setContext = useCartStore((s) => s.setContext);
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) =>
    s.items.reduce((a, i) => a + i.quantity, 0)
  );

  const { restaurant, tableNumber, categories, items, loading, error } =
    useOrderSession(sessionId, initialSlug, setContext);

  const [activeCat, setActiveCat] = useState("all");
  const cartHref = `/cart/${sessionId}?slug=${searchParams.get("slug")}&table=${searchParams.get("table")}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/40 via-white to-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium">Caricamento menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50/40 via-white to-white p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-5 border border-gray-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">
            Accesso Non Consentito
          </h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-400">
            Per ordinare, devi scansionare il QR Code presente sul tuo tavolo.
          </p>
          <Link href="/scan/TAV1-X9Z2">
            <Button className="w-full bg-gray-900 hover:bg-green-600">
              Simula Scansione Tavolo 1
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter(
    (item) => activeCat === "all" || item.category_id === activeCat
  );

  return (
    // 🔧 SFONDO MIGLIORATO: Gradiente leggero + Texture sottile
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-white font-sans text-gray-900 relative">
      
      {/* ✨ Texture Noise Sottile (Aggiunge profondità senza peso) */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 🌿 Blob Decorativo (Grafica particolare ma leggerissima) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-r from-green-200/20 to-emerald-200/20 rounded-full blur-[100px] -z-0 pointer-events-none" />

      {/* Contenuto */}
      <div className="relative z-10">
        <OrderHeader cartCount={cartCount} cartHref={cartHref} />
        
        <RestaurantTitle
          name={restaurant?.name || "Ristorante"}
          tableNumber={tableNumber}
        />

        <main className="max-w-4xl mx-auto px-4 pb-12">
          <div className="text-center mb-8">
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              Scegli tra i nostri piatti preparati con passione. Ingredienti freschi,
              ricette tradizionali e servizio veloce direttamente al tuo tavolo.
            </p>
          </div>

          <CategoryFilter
            categories={categories}
            activeCat={activeCat}
            onCategoryChange={setActiveCat}
          />

          <div className="grid gap-4 mt-6">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAdd={(i) =>
                  addItem({
                    ...i,
                    menuItemId: i.id,        // 🔧 Mappa id → menuItemId
                    priceCents: i.price_cents, // 🔧 Mappa price_cents → priceCents
                    quantity: 1,
                  })
                }
              />
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Nessun piatto disponibile in questa categoria.</p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}