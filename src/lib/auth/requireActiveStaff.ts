// src/lib/auth/requireActiveStaff.ts
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "./requireStaff";
import { isRestaurantActive } from "@/lib/check-access";

type StaffSession = NonNullable<Awaited<ReturnType<typeof requireStaff>>>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type RequireActiveStaffResult =
  | { session: StaffSession }
  | { error: "unauthenticated" }
  | { error: "inactive" };

/**
 * Come requireStaff(), ma verifica anche che il ristorante del chiamante non sia
 * sospeso dalla piattaforma né con abbonamento scaduto (isRestaurantActive).
 *
 * Usare SOLO sulle route che modificano configurazione e non devono operare su
 * account bloccati (es. scrittura menu, estrazione AI del menu).
 *
 * NON usare su /api/confirm-renewal: il rinnovo deve restare accessibile a un
 * account scaduto, altrimenti si crea un blocco circolare (non potrebbe rinnovare).
 * Le route puramente operative (es. avanzamento stato ordini) restano su
 * requireStaff() per non bloccare ordini già in corso.
 *
 * Fail-open in caso di errore di lettura dello stato ristorante: si preferisce
 * non bloccare un account legittimo per un errore transitorio; l'enforcement
 * primario resta comunque il gate lato /admin/dashboard.
 */
export async function requireActiveStaff(): Promise<RequireActiveStaffResult> {
  const session = await requireStaff();
  if (!session) return { error: "unauthenticated" };

  try {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: restaurant, error } = await admin
      .from("restaurants")
      .select("id, status, access_expires_at")
      .eq("id", session.restaurantId)
      .maybeSingle();
    // Fail-open: se non riusciamo a leggere lo stato, non blocchiamo.
    if (error || !restaurant) return { session };
    if (!isRestaurantActive(restaurant)) return { error: "inactive" };
  } catch {
    return { session };
  }
  return { session };
}
