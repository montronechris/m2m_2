// src/app/(client)/scan/[token]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useScanSession } from "@/hooks/useScanSession";
import { ScanStatus } from "@/components/client/scan/ScanStatus";
import { ScanInstructions } from "@/components/client/scan/ScanInstructions";

export default function ScanPage() {
  const params = useParams();
  const tableCode = params.token as string;

  const { status, message, error, restaurantName, tableNumber, primaryColor, logoUrl, goToMenu } =
    useScanSession(tableCode);

  if (status === "error") {
    return (
      <ScanStatus
        status={status}
        message={message}
        error={error}
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        primaryColor={primaryColor}
        logoUrl={logoUrl}
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