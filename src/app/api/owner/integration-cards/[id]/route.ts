// src/app/api/owner/integration-cards/[id]/route.ts
//
// Eliminazione di una card /integrazioni, riservata al site owner.
// I voti collegati (integration_votes) vengono rimossi in cascata (FK ON DELETE CASCADE).
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

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID mancante." }, { status: 400 });
  }

  const supabase = adminSupabase();
  const { data, error } = await supabase
    .from("integration_cards")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Card non trovata." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
