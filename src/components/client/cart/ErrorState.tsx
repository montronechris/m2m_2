// src/components/client/cart/ErrorState.tsx

"use client";

import { AlertCircle } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  const { tr } = useI18n();
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-semibold">{tr.client.cart.sendError}</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );
}