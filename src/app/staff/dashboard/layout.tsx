// src/app/admin/dashboard/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { isRestaurantActive } from "@/lib/check-access";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check autenticazione (invariato)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 2. Leggi il profilo per trovare il restaurant_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) return;

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