// src/app/api/verify-invite/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const trimmed = (code || "").trim().toUpperCase();

  if (!trimmed) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  // Il codice nel DB ha prefisso "RESTO-", l'utente inserisce solo la parte dopo
  const fullCode = trimmed.startsWith("RESTO-") ? trimmed : `RESTO-${trimmed}`;

  const { data: invite, error } = await supabaseAdmin
    .from("invite_codes")
    .select("id, code, plan, access_duration_days, max_staff, restaurant_id, used_at, expires_at, is_renewal")
    .eq("code", fullCode)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (invite.used_at) {
    return NextResponse.json({ error: "already_used" }, { status: 409 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (!invite.is_renewal) {
    return NextResponse.json({ error: "not_renewal" }, { status: 422 });
  }

  return NextResponse.json(invite);
}