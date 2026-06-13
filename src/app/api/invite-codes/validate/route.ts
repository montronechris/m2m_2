// src/app/api/invite-codes/validate/route.ts
// Usato dal form di registrazione ristorante per verificare il codice in tempo reale.
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { sanitizeCode, isCodeExpired, isCodeUsed } from "@/lib/invite-code";

const ValidateSchema = z.object({
  code: z.string().min(1).max(32),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const parsed = ValidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Codice non valido." }, { status: 400 });
  }

  const code = sanitizeCode(parsed.data.code);

  const { data, error } = await supabaseServer
    .from("invite_codes")
    .select("id, expires_at, used_at")
    .eq("code", code)
    .single();

  if (error || !data) {
    // Risposta vaga: non diciamo se il codice non esiste o è scaduto
    return NextResponse.json({ valid: false, error: "Codice non valido o scaduto." });
  }

  if (isCodeExpired(data.expires_at)) {
    return NextResponse.json({ valid: false, error: "Codice scaduto." });
  }

  if (isCodeUsed(data.used_at)) {
    return NextResponse.json({ valid: false, error: "Codice già utilizzato." });
  }

  return NextResponse.json({ valid: true });
}