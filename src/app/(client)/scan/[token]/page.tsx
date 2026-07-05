// src/app/(client)/scan/[token]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useScanSession } from "@/hooks/useScanSession";
import { ScanStatus } from "@/components/client/scan/ScanStatus";
import { ScanInstructions } from "@/components/client/scan/ScanInstructions";
import { ScanError } from "@/components/client/scan/ScanError";

export default function ScanPage() {
  const params = useParams();
  const tableCode = params.token as string;

  const { status, message, error, restaurantName, tableNumber, primaryColor, logoUrl, backgroundImageUrl, backgroundType, goToMenu } =
    useScanSession(tableCode);

  if (status === "error") {
    return (
      <ScanError
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        error={error}
        tableCode={tableCode}
      />
    );
  }

  return (
    <ScanInstructions
      primaryColor={primaryColor}
      restaurantName={restaurantName}
      logoUrl={logoUrl}
      ready={status === "success"}
      onContinue={goToMenu}
    />
  );
}