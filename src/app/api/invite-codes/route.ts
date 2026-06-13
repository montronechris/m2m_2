// src/app/api/invite-codes/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySiteOwnerToken } from "@/lib/site-owner-jwt";
import { createClient } from "@supabase/supabase-js";
import { generateInviteCode } from "@/lib/invite-code";
import { z } from "zod";

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

// ── GET /api/invite-codes ──────────────────────────────────────────────────
export async function GET() {
  const owner = await requireSiteOwner();
  if (!owner) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  const { data, error } = await adminSupabase()
    .from("invite_codes")
    .select("id, code, used_by_email, expires_at, used_at, created_at, plan, access_duration_days, max_staff, notes")
    .eq("created_by", owner.sub)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[invite-codes GET]", error);
    return NextResponse.json({ error: "Errore nel recupero dei codici." }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}

// ── POST /api/invite-codes ─────────────────────────────────────────────────
const CreateSchema = z.object({
  plan:                 z.string().default("free_trial"),
  access_duration_days: z.number().min(1).max(730).default(7),
  max_staff:            z.number().min(1).max(50).default(2),
  notes:                z.string().max(500).optional(),
  expires_hours:        z.number().min(0.1).max(720).default(0.5),
  renewal:              z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const owner = await requireSiteOwner();
  if (!owner) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  let body: unknown = {};
  try { body = await req.json(); } catch { /* body opzionale */ }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Parametri non validi." }, { status: 400 });

  const { plan, access_duration_days, max_staff, notes, expires_hours, renewal } = parsed.data;

  const code      = generateInviteCode();
  const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000);

  const { data, error } = await adminSupabase()
    .from("invite_codes")
    .insert({
      code,
      created_by:           owner.sub,
      expires_at:           expiresAt.toISOString(),
      plan,
      access_duration_days,
      max_staff,
      notes:                notes ?? null,
      is_renewal:           renewal ?? false,
    })
    .select("id, code, expires_at, created_at, plan, access_duration_days, max_staff")
    .single();

  if (error) {
    console.error("[invite-codes POST]", error);
    return NextResponse.json({ error: "Errore nella creazione del codice." }, { status: 500 });
  }

  return NextResponse.json({ code: data }, { status: 201 });
}