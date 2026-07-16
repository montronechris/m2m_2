// src/hooks/useScanSession.ts
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { validateScanToken } from "@/lib/api-service";
import { saveTableSession } from "@/lib/table-session";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n/I18nProvider";

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
  logoIcon: string | undefined;
  backgroundImageUrl: string | undefined;
  backgroundType: string | undefined;
  // true once a branding fetch attempt (success or failure) has completed
  brandingLoaded: boolean;
  // Called by the instructions panel once the user is ready to see the menu
  goToMenu: () => void;
}

export function useScanSession(tableCode: string): ScanSessionResult {
  const router = useRouter();
  const { tr } = useI18n();
  const t = tr.client.scan;
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState(t.verifyingQr);
  const [error, setError] = useState<string | null>(null);

  // Branding state
  const [restaurantName, setRestaurantName] = useState<string | undefined>(undefined);
  const [tableNumber, setTableNumber] = useState<string | number | undefined>(undefined);
  const [primaryColor, setPrimaryColor] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoIcon, setLogoIcon] = useState<string | undefined>(undefined);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>(undefined);
  const [backgroundType, setBackgroundType] = useState<string | undefined>(undefined);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  const pendingNavRef = useRef<string | null>(null);

  const goToMenu = () => {
    if (pendingNavRef.current) {
      router.push(pendingNavRef.current);
      pendingNavRef.current = null;
    }
  };

  useEffect(() => {
    if (!tableCode || tableCode.length > 20) {
      setError(t.invalidToken);
      setStatus("error");
      return;
    }

    const activateSession = async () => {
      setStatus("verifying");
      setMessage(t.verifyingQr);

      try {
        const data = await validateScanToken(tableCode);

        // Set table number immediately for the UI
        setTableNumber(data.tableNumber);

        // 1. Fetch restaurant branding in parallel with session activation
        const [, brandingResult] = await Promise.all([
          supabase.rpc("start_table_session", { p_table_id: data.tableId }),
          supabase
            .from("restaurants")
            .select("name, brand_color, logo_url, logo_icon, background_image_url, background_type")
            .eq("id", data.restaurantId)
            .single(),
        ]);

        if (brandingResult.data) {
          setRestaurantName(brandingResult.data.name ?? undefined);
          setPrimaryColor(brandingResult.data.brand_color ?? undefined);
          setLogoUrl(brandingResult.data.logo_url ?? undefined);
          setLogoIcon((brandingResult.data as any).logo_icon ?? undefined);
          setBackgroundImageUrl((brandingResult.data as any).background_image_url ?? undefined);
          setBackgroundType((brandingResult.data as any).background_type ?? undefined);
        }
        setBrandingLoaded(true);

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

        pendingNavRef.current = `/order/${data.sessionId}?slug=${data.restaurantSlug}&table=${data.tableNumber}&from=scan`;

        setStatus("success");
        setMessage(t.readyEnjoy);
      } catch (err: any) {
        setStatus("error");
        setError(err.message);
        setMessage(`${tr.client.common.error}: ${err.message}`);
        try {
          const { data: tbl } = await supabase
            .from("tables")
            .select("restaurant_id")
            .eq("code", tableCode.toUpperCase())
            .maybeSingle();
          if (tbl?.restaurant_id) {
            const { data: br } = await supabase
              .from("restaurants")
              .select("name, brand_color, logo_url, logo_icon, background_image_url, background_type")
              .eq("id", tbl.restaurant_id)
              .maybeSingle();
            if (br) {
              setRestaurantName(br.name ?? undefined);
              setPrimaryColor(br.brand_color ?? undefined);
              setLogoUrl(br.logo_url ?? undefined);
              setLogoIcon((br as any).logo_icon ?? undefined);
              setBackgroundImageUrl((br as any).background_image_url ?? undefined);
              setBackgroundType((br as any).background_type ?? undefined);
            }
          }
        } catch { /* ignore */ }
        setBrandingLoaded(true);
      }
    };

    activateSession();
  }, [tableCode, router]);

  return { status, message, error, restaurantName, tableNumber, primaryColor, logoUrl, logoIcon, backgroundImageUrl, backgroundType, brandingLoaded, goToMenu };
}