// src/app/api/confirm-renewal/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { invite_id, restaurant_id, plan, max_staff, new_expiry } = await req.json();

  if (!invite_id || !restaurant_id || !plan || !new_expiry) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // 1. Ri-verifica che il codice non sia stato usato nel frattempo
  const { data: invite } = await supabaseAdmin
    .from("invite_codes")
    .select("used_at")
    .eq("id", invite_id)
    .single();

  if (invite?.used_at) {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }

  // 2. Aggiorna il ristorante
  const { error: updateError } = await supabaseAdmin
    .from("restaurants")
    .update({
      plan,
      max_staff,
      access_expires_at: new_expiry,
      status: "open",
      invite_code_id: invite_id,
    })
    .eq("id", restaurant_id);

  if (updateError) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // 3. Segna il codice come usato
  await supabaseAdmin
    .from("invite_codes")
    .update({
      used_at: new Date().toISOString(),
      used_by: restaurant_id,
    })
    .eq("id", invite_id);

  return NextResponse.json({ success: true });
}
