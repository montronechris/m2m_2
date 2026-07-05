// src/app/api/admin/me/route.ts
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const authed = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await authed.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Utente non autenticato" },
        { status: 401 }
      );
    }

    // Bypassa RLS con service role per non dipendere dalle policy client-side
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("restaurant_id, role, first_name, last_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("[admin/me] profile error:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    }

    const { data: restaurant, error: restError } = await admin
      .from("restaurants")
      .select(
        "id, name, logo_url, status, plan, access_expires_at, max_staff, brand_color"
      )
      .eq("id", profile.restaurant_id)
      .maybeSingle();
    if (restError) {
      console.error("[admin/me] restaurant error:", restError);
      return NextResponse.json({ error: restError.message }, { status: 500 });
    }
    if (!restaurant) {
      return NextResponse.json({ error: "Ristorante non trovato" }, { status: 404 });
    }

    const userName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Utente";

    return NextResponse.json({
      ...restaurant,
      userRole: profile.role || "staff",
      userName,
      avatarUrl: (profile as any).avatar_url ?? null,
    });
  } catch (err: any) {
    console.error("[admin/me] unexpected:", err);
    return NextResponse.json(
      { error: err.message || "Errore interno" },
      { status: 500 }
    );
  }
}
