import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { hitRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

// Max 5 tentativi di riscatto codice ogni ora per IP (anti brute-force).
const RL_MAX = 5;
const RL_WINDOW_MS = 60 * 60 * 1000;

// Riscatto di un codice invito staff per un utente GIÀ autenticato (es. dopo
// login con Google/Facebook). A differenza di /api/register-staff, qui l'utente
// esiste già in auth.users (creato dall'OAuth), quindi non lo creiamo né serve
// una password: colleghiamo solo il suo profilo al ristorante del codice.

const bodySchema = z.object({
  secretCode: z.string().min(1).max(32),
});

export async function POST(req: Request) {
  // Rate limit anti brute-force sui codici invito (per IP).
  const rlKey = `redeem-invite:${getClientIp(req)}`;
  const rl = hitRateLimit(rlKey, RL_MAX, RL_WINDOW_MS);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova più tardi." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const authed = await createServerSupabase();
  const {
    data: { user },
    error: userError,
  } = await authed.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Codice non valido." }, { status: 400 });
  }
  const code = parsed.secretCode.trim();

  // Se l'utente ha già un profilo, è già associato a un ristorante: non
  // sovrascriviamo (eviterebbe di "rubare" un codice o cambiare ristorante).
  const { data: existingProfile } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json(
      { error: "Questo account è già associato a un ristorante." },
      { status: 409 }
    );
  }

  // Claim atomico del codice: solo una richiesta parallela riesce a fare
  // l'update passando da used_at null → ora e ottiene la riga.
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

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || (user.email?.split("@")[0] ?? "Staff");
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const { error: profileError } = await supabaseServer.from("profiles").insert({
    id: user.id,
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    restaurant_id: claimed.restaurant_id,
    role: claimed.role,
  });

  if (profileError) {
    await releaseClaim();
    return NextResponse.json({ error: "Errore nella creazione del profilo." }, { status: 500 });
  }

  await supabaseServer
    .from("staff_invite_codes")
    .update({ used_by: user.id })
    .eq("id", claimed.id);

  // Riscatto riuscito: solo i tentativi falliti devono contare contro il limite.
  resetRateLimit(rlKey);

  return NextResponse.json({ success: true });
}
