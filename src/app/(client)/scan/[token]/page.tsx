// src/app/(client)/scan/[token]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useScanSession } from "@/hooks/useScanSession";
import { ScanInstructions } from "@/components/client/scan/ScanInstructions";
import { ScanError } from "@/components/client/scan/ScanError";
import { ScanSkeleton } from "@/components/client/scan/ScanSkeleton";

export default function ScanPage() {
  const params = useParams();
  const tableCode = params.token as string;

  const { status, message, error, restaurantName, tableNumber, primaryColor, logoUrl, logoIcon, backgroundImageUrl, backgroundType, brandingLoaded, goToMenu } =
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

  // Finché il colore del brand (impostato in admin) non è ancora arrivato,
  // non renderizziamo gli elementi della pagina: mostriamo solo lo skeleton,
  // per evitare che il colore cambi a vista durante il caricamento.
  if (!brandingLoaded) {
    return <ScanSkeleton />;
  }

  return (
    <ScanInstructions
      primaryColor={primaryColor}
      restaurantName={restaurantName}
      logoUrl={logoUrl}
      logoIcon={logoIcon}
      tableNumber={tableNumber}
      ready={status === "success"}
      onContinue={goToMenu}
    />
  );
}