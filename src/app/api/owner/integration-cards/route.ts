// src/app/api/owner/integration-cards/route.ts
//
// CRUD (list + create) delle card della pagina /integrazioni, riservato al
// site owner (SaaS superadmin). Usa il service role → bypassa la RLS, quindi
// NON servono policy di scrittura per authenticated su integration_cards.
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

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Icone/tag ammessi (coerenti con la pagina /integrazioni). Un icon_key non in
// lista non rompe nulla: il client ripiega su "Sparkles"; qui però lo validiamo
// per evitare card che appaiono senza icona per un refuso.
const ALLOWED_ICONS = new Set([
  "Truck", "CalendarCheck", "CreditCard", "PackageCheck", "HeartHandshake",
  "Sparkles", "ShieldCheck", "MonitorSmartphone", "Star", "ShoppingBag",
]);
const ALLOWED_TAGS = new Set([
  "popular", "requested", "coming_soon", "new", "trending",
  "innovative", "compliance", "essential", "ai_powered", "practical",
]);

// ── GET /api/owner/integration-cards ──────────────────────────────────────
// Elenca TUTTE le card (anche is_active=false) ordinate per sort_order.
export async function GET() {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const supabase = adminSupabase();
  const { data, error } = await supabase
    .from("integration_cards")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[owner/integration-cards] error:", error.message);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
  return NextResponse.json({ cards: data ?? [] });
}

// ── POST /api/owner/integration-cards ─────────────────────────────────────
// Crea una nuova card. Body JSON con i campi sotto.
export async function POST(req: Request) {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const card_key = str(body.card_key);
  const icon_key = str(body.icon_key);
  const tag_key = str(body.tag_key);
  const title_it = str(body.title_it);
  const title_en = str(body.title_en);
  const description_it = str(body.description_it);
  const description_en = str(body.description_en);

  // Validazione: i campi testuali chiave sono obbligatori.
  if (!card_key || !title_it || !title_en) {
    return NextResponse.json(
      { error: "card_key, title_it e title_en sono obbligatori." },
      { status: 400 }
    );
  }
  if (icon_key && !ALLOWED_ICONS.has(icon_key)) {
    return NextResponse.json(
      { error: `icon_key non valido. Ammessi: ${[...ALLOWED_ICONS].join(", ")}` },
      { status: 400 }
    );
  }
  if (tag_key && !ALLOWED_TAGS.has(tag_key)) {
    return NextResponse.json(
      { error: `tag_key non valido. Ammessi: ${[...ALLOWED_TAGS].join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = adminSupabase();

  // sort_order: se non passato, va in coda (max + 1).
  let sort_order = Number(body.sort_order);
  if (!Number.isFinite(sort_order)) {
    const { data: last } = await supabase
      .from("integration_cards")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sort_order = (last?.sort_order ?? 0) + 1;
  }

  const votes = Number.isFinite(Number(body.votes)) ? Math.max(0, Math.trunc(Number(body.votes))) : 0;

  const { data, error } = await supabase
    .from("integration_cards")
    .insert({
      card_key,
      icon_key: icon_key || "Sparkles",
      tag_key: tag_key || "new",
      title_it,
      title_en,
      description_it,
      description_en,
      votes,
      sort_order,
      is_active: body.is_active === false ? false : true,
    })
    .select("*")
    .single();

  if (error) {
    // 23505 = unique_violation (card_key già esistente)
    const status = (error as { code?: string }).code === "23505" ? 409 : 500;
    const message =
      status === 409 ? "Esiste già una card con questo card_key." : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ card: data }, { status: 201 });
}
