// src/app/api/confirm-renewal/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/requireStaff";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Solo un admin autenticato può rinnovare, e solo per il proprio ristorante:
  // restaurant_id/plan/max_staff/scadenza non arrivano mai dal client.
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "not_authorized" }, { status: 401 });
  }

  const { invite_id } = await req.json();
  if (!invite_id) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Reclamiamo il codice atomicamente (used_at passa da null a "adesso" in un'unica
  // query condizionale): se due richieste arrivano in parallelo con lo stesso codice,
  // solo una riesce a fare l'update e ottiene la riga; l'altra riceve `invite === null`.
  const { data: invite, error: claimError } = await supabaseAdmin
    .from("invite_codes")
    .update({ used_at: new Date().toISOString(), used_by: staff.restaurantId })
    .eq("id", invite_id)
    .is("used_at", null)
    .select("id, expires_at, plan, access_duration_days, max_staff, is_renewal, restaurant_id")
    .maybeSingle();

  if (claimError) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  if (!invite) {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }

  const releaseClaim = () =>
    supabaseAdmin
      .from("invite_codes")
      .update({ used_at: null, used_by: null })
      .eq("id", invite.id);

  if (!invite.is_renewal) {
    await releaseClaim();
    return NextResponse.json({ error: "not_renewal" }, { status: 422 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    await releaseClaim();
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Se il codice è stato pre-assegnato a un ristorante specifico, deve corrispondere
  // a quello dell'admin autenticato (impedisce di "rubare" un codice altrui).
  if (invite.restaurant_id && invite.restaurant_id !== staff.restaurantId) {
    await releaseClaim();
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const { data: restaurant, error: restFetchError } = await supabaseAdmin
    .from("restaurants")
    .select("access_expires_at")
    .eq("id", staff.restaurantId)
    .single();

  if (restFetchError || !restaurant) {
    await releaseClaim();
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // plan, max_staff e durata derivano dal codice invito lato server — mai dal client.
  const base =
    restaurant.access_expires_at && new Date(restaurant.access_expires_at) > new Date()
      ? new Date(restaurant.access_expires_at)
      : new Date();
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + invite.access_duration_days);

  const { error: updateError } = await supabaseAdmin
    .from("restaurants")
    .update({
      plan: invite.plan,
      max_staff: invite.max_staff,
      access_expires_at: newExpiry.toISOString(),
      status: "open",
      invite_code_id: invite.id,
    })
    .eq("id", staff.restaurantId);

  if (updateError) {
    await releaseClaim();
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
