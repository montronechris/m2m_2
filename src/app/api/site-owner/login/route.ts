// src/app/api/site-owner/login/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { signSiteOwnerToken } from "@/lib/site-owner-jwt";

// bcryptjs è pure-JS, funziona senza binari nativi
// npm install bcryptjs @types/bcryptjs
import bcrypt from "bcryptjs";

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8).max(128),
});

// Risposta generica per non rivelare se l'email esiste o meno
const GENERIC_ERROR = "Credenziali non valide.";

export async function POST(req: Request) {
  // 1. Parse + validazione input
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const { email, password } = parsed.data;

  // 2. Cerca il site owner nel DB (via service_role, bypassa RLS)
  const { data: owner, error: dbError } = await supabaseServer
    .from("site_owners")
    .select("id, email, password_hash")
    .eq("email", email.toLowerCase())
    .single();

  // 3. Timing-safe: esegui sempre bcrypt.compare anche se l'utente non esiste,
  //    per prevenire timing attacks che rivelano se l'email è registrata.
  const hashToCompare = owner?.password_hash ?? "$2a$12$invalidhashfortimingsafety000000000000000000000000000";
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (dbError || !owner || !passwordMatch) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // 4. Genera JWT
  const token = await signSiteOwnerToken(owner.id, owner.email);

  // 5. Imposta cookie HttpOnly — non accessibile da JS client
  const response = NextResponse.json({ ok: true });
  response.cookies.set("site_owner_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 ore
  });

  return response;
}