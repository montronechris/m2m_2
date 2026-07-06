// src/app/api/register-staff/route.ts
// Registra un nuovo membro dello staff tramite un codice invito (staff_invite_codes).
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";

const RegisterSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(8).max(128),
  firstName:  z.string().min(1).max(64),
  lastName:   z.string().min(1).max(64),
  secretCode: z.string().min(1).max(32),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { email, password, firstName, lastName, secretCode } = parsed.data;
  const code = secretCode.trim().toUpperCase();

  // Reclamiamo il codice atomicamente (used_at passa da null a "adesso" in un'unica
  // query condizionale): se due richieste arrivano in parallelo con lo stesso codice,
  // solo una riesce a fare l'update e ottiene la riga; l'altra riceve `claimed === null`.
  const { data: claimed, error: claimError } = await supabaseServer
    .from("staff_invite_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_at", null)
    .select("id, restaurant_id, role, expires_at")
    .maybeSingle();

  if (claimError) {
    return NextResponse.json({ error: "Errore nella verifica del codice." }, { status: 500 });
  }

  if (!claimed) {
    const { data: existing } = await supabaseServer
      .from("staff_invite_codes")
      .select("used_at")
      .eq("code", code)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Codice non valido." }, { status: 404 });
    }
    return NextResponse.json({ error: "Codice già utilizzato." }, { status: 410 });
  }

  const releaseClaim = () =>
    supabaseServer.from("staff_invite_codes").update({ used_at: null }).eq("id", claimed.id);

  if (new Date(claimed.expires_at) < new Date()) {
    await releaseClaim();
    return NextResponse.json({ error: "Codice scaduto." }, { status: 410 });
  }

  const { data: created, error: createError } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    await releaseClaim();
    return NextResponse.json({ error: createError?.message ?? "Errore nella creazione dell'utente." }, { status: 400 });
  }

  const userId = created.user.id;

  const { error: profileError } = await supabaseServer
    .from("profiles")
    .insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      restaurant_id: claimed.restaurant_id,
      role: claimed.role,
    });

  if (profileError) {
    await supabaseServer.auth.admin.deleteUser(userId);
    await releaseClaim();
    return NextResponse.json({ error: "Errore nella creazione del profilo." }, { status: 500 });
  }

  await supabaseServer
    .from("staff_invite_codes")
    .update({ used_by: userId })
    .eq("id", claimed.id);

  return NextResponse.json({ success: true });
}
