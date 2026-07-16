// src/app/api/orders/[orderId]/coupon/route.ts
// Salva sull'ordine "pending" il coupon applicato PRIMA della conferma, così che
// altri dispositivi collegati allo stesso tavolo (via Supabase Realtime su questa
// riga) vedano lo sconto già applicato. Non tocca total_cents/status: la conferma
// definitiva del totale scontato resta a carico di /api/orders/[orderId]/confirm.
//
// Il coupon e lo sconto vengono ricalcolati qui lato server (stessa formula usata
// dal client in confirm/[sessionId]/page.tsx) invece di fidarsi dei valori inviati
// dal client, per evitare che una richiesta HTTP creata a mano possa impostare uno
// sconto arbitrario.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeAuthoritativeOrderTotal, OrderTotalError } from "@/lib/order-total";
import { hitRateLimit, getClientIp } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const OPEN_STATUSES = ["pending", "preparing", "cooking", "ready", "served"];

// Anti-abuso: applicare/rimuovere coupon è un'operazione a basso costo ma va
// limitata per impedire brute-force di codici sconto su un ordine.
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 1000;

type Body = {
  couponCode: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const rl = hitRateLimit(`coupon:${getClientIp(request)}`, RATE_MAX, RATE_WINDOW_MS);
    if (rl.limited) {
      return NextResponse.json(
        { error: "too_many_requests" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const { orderId } = await params;
    const body = (await request.json()) as Body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, restaurant_id, coupon_code")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[/api/orders/coupon] fetch order failed:", fetchError.message);
      return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
    }
    if (!OPEN_STATUSES.includes(order.status as string)) {
      return NextResponse.json({ error: "Ordine non modificabile" }, { status: 409 });
    }

    const rawCode = body.couponCode?.trim();

    if (!rawCode) {
      const { error } = await supabase
        .from("orders")
        .update({
          discount_cents: null,
          original_total_cents: null,
          coupon_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        console.error("[/api/orders/coupon] remove coupon failed:", error.message);
        return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, removed: true });
    }

    const normalizedCode = rawCode.toUpperCase();

    if (order.coupon_code && order.coupon_code !== normalizedCode) {
      return NextResponse.json(
        { error: "Un coupon è già applicato a questo ordine" },
        { status: 409 }
      );
    }

    const restaurantFilter = order.restaurant_id
      ? `restaurant_id.eq.${order.restaurant_id},restaurant_id.is.null`
      : "restaurant_id.is.null";

    const { data: coupon, error: couponError } = await supabase
      .from("coupons")
      .select("discount_type, discount_value")
      .eq("code", normalizedCode)
      .eq("active", true)
      .or(restaurantFilter)
      .maybeSingle();

    if (couponError) {
      console.error("[/api/orders/coupon] coupon lookup failed:", couponError.message);
      return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
    }
    if (!coupon) {
      return NextResponse.json({ error: "Coupon non valido" }, { status: 400 });
    }

    let total: number;
    try {
      total = await computeAuthoritativeOrderTotal(supabase, orderId, order.restaurant_id);
    } catch (e) {
      const message = e instanceof OrderTotalError ? e.message : "Errore nel calcolo del totale";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const value = Number(coupon.discount_value);
    let discountCents: number;
    if (coupon.discount_type === "percent") {
      const discounted = Math.round(total * (1 - value / 100));
      discountCents = total - discounted;
    } else {
      discountCents = Math.min(total, Math.round(value * 100));
    }
    discountCents = Math.max(0, discountCents);

    const { data, error } = await supabase
      .from("orders")
      .update({
        discount_cents: discountCents,
        original_total_cents: total,
        coupon_code: normalizedCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("id, discount_cents, original_total_cents, coupon_code")
      .maybeSingle();

    if (error) {
      console.error("[orders/coupon] update error:", error);
      return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error("[orders/coupon] unexpected:", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
