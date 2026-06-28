// src/app/admin/dashboard/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isRestaurantActive } from "@/lib/check-access";
import { hasValidShiftToday } from "@/lib/auth-service";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check autenticazione (invariato)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Leggi il profilo per trovare il restaurant_id e il ruolo
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) return;

      // 2bis. Cameriere/cucina: la sessione da sola non basta, serve aver
      // validato il codice turno oggi (altrimenti aprire /admin/dashboard
      // direttamente bypasserebbe lo step "codice turno" del login).
      if (profile.role === "cameriere" || profile.role === "cucina") {
        const ok = await hasValidShiftToday();
        if (!ok) {
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }
      }

      // 3. Leggi il ristorante
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("status, access_expires_at")
        .eq("id", profile.restaurant_id)
        .single();

      // 4. Check accesso — blocca se scaduto o paused
      if (!isRestaurantActive(restaurant)) {
        router.push("/abbonamento-scaduto");
      }
    };

    checkAuth();
  }, [router, supabase]);

  return <>{children}</>;
}