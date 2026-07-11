// src/lib/auth/requireStaff.ts
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type StaffSession = {
  userId: string;
  restaurantId: string;
  role: string;
};

/**
 * Verifies the caller is an authenticated staff member and returns their
 * restaurant_id, so admin routes can scope privileged (service-role) queries
 * to the caller's own restaurant instead of trusting client-supplied ids.
 */
export async function requireStaff(): Promise<StaffSession | null> {
  const authed = await createServerSupabase();
  const {
    data: { user },
    error: userError,
  } = await authed.auth.getUser();
  if (userError || !user) return null;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.restaurant_id) return null;

  return { userId: user.id, restaurantId: profile.restaurant_id, role: profile.role || "staff" };
}
