// src/app/api/owner/subscription-requests/route.ts
//
// Elenco + gestione delle richieste di abbonamento (rinnovo / cambio piano)
// inviate dagli admin dei ristoranti. Riservato al site owner (SaaS superadmin).
// Usa il service role → bypassa la RLS.
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

// ── GET /api/owner/subscription-requests ──────────────────────────────────
// Elenca tutte le richieste (con nome ristorante), più recenti prima.
export async function GET() {
  const owner = await requireSiteOwner();
  if (!owner) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const supabase = adminSupabase();
  const { data, error } = await supabase
    .from("subscription_requests")
    .select(
      "id, restaurant_id, type, current_plan, requested_plan, status, note, created_at, resolved_at, restaurants(name, slug, plan, access_expires_at)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ requests: data ?? [] });
}

// ── PATCH /api/owner/subscription-requests ────────────────────────────────
// Aggiorna lo stato di una richiesta: { id, status: 'approved' | 'rejected' }.
export async function PATCH(req: Request) {
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

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  if (!id) {
    return NextResponse.json({ error: "id mancante." }, { status: 400 });
  }
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return NextResponse.json({ error: "status non valido." }, { status: 400 });
  }

  const supabase = adminSupabase();
  const { data, error } = await supabase
    .from("subscription_requests")
    .update({
      status,
      resolved_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ request: data });
}
