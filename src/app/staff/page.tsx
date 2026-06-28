// src/app/staff/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile } from "@/lib/auth-service";
import { Loader2 } from "lucide-react";

export default function StaffPage() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const profile = await getUserProfile();

        if (profile.role) {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    };
    check();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Caricamento...</p>
      </div>
    </div>
  );
}