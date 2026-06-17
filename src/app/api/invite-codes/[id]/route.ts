// src/app/api/invite-codes/[id]/route.ts
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

// Client con service role: bypassa RLS (solo server-side)
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── DELETE /api/invite-codes/[id] ─────────────────────────────────────────
// Supporta sia la revoca (codice attivo) che l'eliminazione vera e propria
// (codice già usato o scaduto), così "elimina selezionati" funziona sempre.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = adminSupabase();

  // Recupera il codice
  const { data: existing, error: fetchError } = await supabase
    .from("invite_codes")
    .select("id, created_by, used_at")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Codice non trovato." }, { status: 404 });
  }

  if (existing.created_by !== owner.sub) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  // Se il codice è usato da un ristorante (FK restaurants.invite_code_id),
  // rimuoviamo prima il riferimento per evitare errore di foreign key
  await supabase
    .from("restaurants")
    .update({ invite_code_id: null })
    .eq("invite_code_id", id);

  // Elimina il codice definitivamente (funziona sia per attivi, usati, scaduti)
  const { error: deleteError } = await supabase
    .from("invite_codes")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[invite-codes DELETE]", deleteError);
    return NextResponse.json({ error: "Errore nell'eliminazione del codice." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}