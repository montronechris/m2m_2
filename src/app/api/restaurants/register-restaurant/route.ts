// src/app/api/register-restaurant/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { sanitizeCode, isCodeExpired, isCodeUsed } from "@/lib/invite-code";
import { createClient } from "@supabase/supabase-js";

const RegisterSchema = z.object({
  inviteCode:     z.string().min(1).max(32),
  email:          z.string().email(),
  password:       z.string().min(8).max(128),
  firstName:      z.string().min(1).max(64),
  lastName:       z.string().min(1).max(64),
  restaurantName: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Dati non validi.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { inviteCode, email, password, firstName, lastName, restaurantName } = parsed.data;
  const code = sanitizeCode(inviteCode);

  // 1. Verifica codice invito — ora leggiamo anche plan, access_duration_days, max_staff
  const { data: invite, error: inviteError } = await supabaseServer
    .from("invite_codes")
    .select("id, expires_at, used_at, plan, access_duration_days, max_staff")
    .eq("code", code)
    .single();

  if (inviteError || !invite)           return NextResponse.json({ error: "Codice invito non valido." }, { status: 400 });
  if (isCodeExpired(invite.expires_at)) return NextResponse.json({ error: "Codice invito scaduto." }, { status: 400 });
  if (isCodeUsed(invite.used_at))       return NextResponse.json({ error: "Codice invito già utilizzato." }, { status: 400 });

  // 2. Client admin
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 3. Crea utente Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { role: "titolare", first_name: firstName, last_name: lastName },
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
    }
    return NextResponse.json({ error: authError?.message ?? "Errore durante la creazione dell'account." }, { status: 500 });
  }

  const userId = authData.user.id;

  // 4. Crea il ristorante — copiamo plan, max_staff e calcoliamo access_expires_at
  const baseSlug = restaurantName
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  // access_expires_at = ora + giorni configurati sul codice (default 7 se non impostato)
  const durationDays = invite.access_duration_days ?? 7;
  const accessExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: restaurant, error: restError } = await supabaseAdmin
    .from("restaurants")
    .insert({
      name:             restaurantName,
      slug,
      status:           "open",
      invite_code_id:   invite.id,
      plan:             invite.plan ?? "free_trial",
      max_staff:        invite.max_staff ?? 2,
      access_expires_at: accessExpiresAt,
    })
    .select("id")
    .single();

  if (restError || !restaurant) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: restError?.message ?? "Errore durante la creazione del ristorante." }, { status: 500 });
  }

  // 5. Crea profilo via RPC
  const { error: profileError } = await supabaseAdmin.rpc("create_profile", {
    p_id:            userId,
    p_email:         email.toLowerCase(),
    p_first_name:    firstName,
    p_last_name:     lastName,
    p_role:          "admin",
    p_restaurant_id: restaurant.id,
    p_invite_code:   code,
  });

  if (profileError) {
    await supabaseAdmin.from("restaurants").delete().eq("id", restaurant.id);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message ?? "Errore durante la creazione del profilo." }, { status: 500 });
  }

  // 6. Marca il codice invito come usato
  await supabaseAdmin
    .from("invite_codes")
    .update({ used_at: new Date().toISOString(), used_by_email: email.toLowerCase() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true }, { status: 201 });
}
