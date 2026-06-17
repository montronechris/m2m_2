// src/hooks/useScanSession.ts
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateScanToken } from "@/lib/api-service";
import { saveTableSession } from "@/lib/table-session";
import { supabase } from "@/lib/supabase";

type ScanStatus = "idle" | "verifying" | "success" | "error";

interface ScanSessionResult {
  status: ScanStatus;
  message: string;
  error: string | null;
  // Branding
  restaurantName: string | undefined;
  tableNumber: string | number | undefined;
  primaryColor: string | undefined;
  logoUrl: string | undefined;
}

export function useScanSession(tableCode: string): ScanSessionResult {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("Verifica QR Code in corso...");
  const [error, setError] = useState<string | null>(null);

  // Branding state
  const [restaurantName, setRestaurantName] = useState<string | undefined>(undefined);
  const [tableNumber, setTableNumber] = useState<string | number | undefined>(undefined);
  const [primaryColor, setPrimaryColor] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!tableCode || tableCode.length > 20) {
      setError("Token QR non valido.");
      setStatus("error");
      return;
    }

    const activateSession = async () => {
      setStatus("verifying");
      setMessage("Verifica QR Code in corso...");

      try {
        const data = await validateScanToken(tableCode);

        // Set table number immediately for the UI
        setTableNumber(data.tableNumber);

        // 1. Fetch restaurant branding in parallel with session activation
        const [, brandingResult] = await Promise.all([
          supabase.rpc("start_table_session", { p_table_id: data.tableId }),
          supabase
            .from("restaurants")
            .select("name, primary_color, logo_url")
            .eq("id", data.restaurantId)
            .single(),
        ]);

        if (brandingResult.data) {
          setRestaurantName(brandingResult.data.name ?? undefined);
          setPrimaryColor(brandingResult.data.primary_color ?? undefined);
          setLogoUrl(brandingResult.data.logo_url ?? undefined);
        }

        // 2. Save session locally
        saveTableSession({
          tableCode,
          sessionId: data.sessionId,
          tableNumber: data.tableNumber,
          restaurantSlug: data.restaurantSlug,
          restaurantId: data.restaurantId,
          tableId: data.tableId,
        });

        console.log("✅ Sessione salvata:", { tableCode, sessionId: data.sessionId });

        setStatus("success");
        setMessage("Tutto pronto. Buon appetito!");

        setTimeout(() => {
          router.push(
            `/order/${data.sessionId}?slug=${data.restaurantSlug}&table=${data.tableNumber}`
          );
        }, 2200);
      } catch (err: any) {
        setStatus("error");
        setError(err.message);
        setMessage(`Errore: ${err.message}`);
      }
    };

    activateSession();
  }, [tableCode, router]);

  return { status, message, error, restaurantName, tableNumber, primaryColor, logoUrl };
}