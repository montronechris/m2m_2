import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DELIVERY_PLATFORMS,
  normalizeOrder,
  type DeliveryPlatform,
} from "@/lib/delivery/normalize";

// Endpoint pubblico di ingestione: le piattaforme delivery inviano qui gli
// ordini via webhook. L'autenticazione avviene per-ristorante tramite il
// token `x-webhook-token` (o querystring ?token=) configurato in Settings.
// L'inserimento usa il service role e salta la RLS in modo controllato.

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service env mancante");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform: rawPlatform } = await params;
  const platform = rawPlatform?.toLowerCase() as DeliveryPlatform;

  if (!DELIVERY_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: "Piattaforma non supportata" },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const token =
    req.headers.get("x-webhook-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("token") ||
    "";

  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const supabase = serviceClient();

  // Risolvi il ristorante dal token (per la piattaforma indicata).
  const { data: integration, error: intErr } = await supabase
    .from("restaurant_platform_integrations")
    .select("restaurant_id, enabled, auto_accept")
    .eq("platform", platform)
    .eq("webhook_token", token)
    .maybeSingle();

  if (intErr) {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
  if (!integration) {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }
  if (!integration.enabled) {
    return NextResponse.json(
      { error: "Integrazione disabilitata" },
      { status: 403 },
    );
  }

  const normalized = normalizeOrder(platform, payload);

  const row = {
    restaurant_id: integration.restaurant_id,
    platform,
    external_id: normalized.externalId,
    status: integration.auto_accept ? "accepted" : "new",
    order_type: normalized.orderType,
    customer_name: normalized.customerName,
    customer_phone: normalized.customerPhone,
    delivery_address: normalized.deliveryAddress,
    items: normalized.items,
    subtotal: normalized.subtotal,
    delivery_fee: normalized.deliveryFee,
    total: normalized.total,
    currency: normalized.currency,
    notes: normalized.notes,
    placed_at: normalized.placedAt,
    estimated_at: normalized.estimatedAt,
    raw: payload,
    updated_at: new Date().toISOString(),
  };

  // Upsert idempotente: la stessa piattaforma può reinviare lo stesso ordine.
  const { data: saved, error: upErr } = await supabase
    .from("external_orders")
    .upsert(row, { onConflict: "restaurant_id,platform,external_id" })
    .select("id")
    .maybeSingle();

  if (upErr) {
    return NextResponse.json(
      { error: "Salvataggio fallito" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: saved?.id ?? null }, { status: 201 });
}
