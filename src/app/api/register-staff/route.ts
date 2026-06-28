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

  const { data: invite, error: inviteError } = await supabaseServer
    .from("staff_invite_codes")
    .select("id, restaurant_id, role, used_at, expires_at")
    .eq("code", code)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Codice non valido." }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: "Codice già utilizzato." }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Codice scaduto." }, { status: 410 });
  }

  const { data: created, error: createError } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
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
      restaurant_id: invite.restaurant_id,
      role: invite.role,
    });

  if (profileError) {
    await supabaseServer.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Errore nella creazione del profilo." }, { status: 500 });
  }

  await supabaseServer
    .from("staff_invite_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ success: true });
}
