// src/app/api/owner/restaurants/route.ts
//
// Overview di TUTTI i ristoranti registrati, riservato al site owner.
// Ritorna: nome, tipo abbonamento (plan), stato, scadenza, data creazione,
// numero di membri dello staff. Aggregazione lato DB via
// owner_restaurants_overview() (SECURITY DEFINER, EXECUTE solo a service_role).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySiteOwnerToken } from "@/lib/site-owner-jwt";
import { createClient } from "@supabase/supabase-js";

async function requireSiteOwner() {
  const cookieStore = await cookies();
  const token = cookieStore.get("site_owner_token")?.value;
  if (!token) return null;
  return verifySiteOwnerToken(token);
}

export async function GET() {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.rpc("owner_restaurants_overview");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restaurants: data ?? [] });
}
