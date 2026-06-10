// src/app/api/restaurants/by-email/route.ts
// GET ?email=xxx  →  info complete del ristorante associato all'email
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySiteOwnerToken } from "@/lib/site-owner-jwt";
import { createClient } from "@supabase/supabase-js";

async function requireSiteOwner() {
  const cookieStore = await cookies();
  const token = cookieStore.get("site_owner_token")?.value;
  if (!token) return null;
  return verifySiteOwnerToken(token);
}

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Parametro email mancante." }, { status: 400 });
  }

  const supabase = adminSupabase();

  // Il collegamento reale è: invite_codes.id = restaurants.invite_code_id
  // (invite_codes.used_by è sempre NULL — non viene popolato al momento dell'uso)
  const { data: ic } = await supabase
    .from("invite_codes")
    .select("id, code, used_at, expires_at")
    .eq("used_by_email", email)
    .order("used_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ic) {
    return NextResponse.json({ error: "Codice invito non trovato per questa email." }, { status: 404 });
  }

  // Trova il ristorante tramite restaurants.invite_code_id
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, status, created_at")
    .eq("invite_code_id", ic.id)
    .maybeSingle();

  if (!restaurant) {
    return NextResponse.json({ error: "Ristorante non trovato." }, { status: 404 });
  }

  // Staff / profili collegati al ristorante
  const { data: profiles } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role")
    .eq("restaurant_id", restaurant.id);

  const staff = (profiles ?? []).map(p => ({
    name:  [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
    email: p.email ?? undefined,
    role:  p.role ?? "—",
  }));

  const adminProfile = staff.find(s => s.role === "admin");

  return NextResponse.json({
    name:          restaurant.name,
    slug:          restaurant.slug,
    status:        restaurant.status,
    registered_at: restaurant.created_at,
    admin_email:   adminProfile?.email ?? email,
    staff,
  });
}