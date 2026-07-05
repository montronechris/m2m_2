// src/components/client/cart/SuccessState.tsx

"use client";

import { CheckCircle } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function SuccessState() {
  const { tr } = useI18n();
  const t = tr.client.cart;
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t.orderConfirmed}
        </h2>
        <p className="text-gray-600">
          {t.orderSent}
        </p>
        <p className="text-sm text-gray-400">{t.redirecting}</p>
      </div>
    </div>
  );
}
