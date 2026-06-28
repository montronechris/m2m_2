// src/app/staff/dashboard/page.tsx
//
// Redirect verso /admin/dashboard, l'unico orchestratore reale della SPA.
// Mantenuto per non rompere eventuali bookmark/link esistenti a questo URL.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function StaffDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d14]">
      <Loader2 className="w-8 h-8 animate-spin text-green-400" />
    </div>
  );
}
