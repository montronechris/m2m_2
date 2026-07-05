// src/app/api/orders/[orderId]/confirm/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Body = {
  paymentMethod: "cash" | "card";
  sessionId?: string | null;
  discountedTotal?: number | null;
  originalTotalCents?: number | null;
  discountCents?: number | null;
  couponCode?: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = (await request.json()) as Body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status: "confirmed",
      payment_method: body.paymentMethod,
      confirmed_at: now,
      updated_at: now,
      session_id: body.sessionId ?? null,
    };
    if (body.discountedTotal !== null && body.discountedTotal !== undefined) {
      payload.original_total_cents = body.originalTotalCents ?? null;
      payload.total_cents = body.discountedTotal;
      payload.discount_cents = body.discountCents ?? 0;
      payload.coupon_code = body.couponCode ?? null;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)
      .select("id, status, confirmed_at")
      .maybeSingle();

    if (error) {
      console.error("[orders/confirm] update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "Ordine non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error("[orders/confirm] unexpected:", err);
    return NextResponse.json(
      { error: "Errore interno del server", details: err.message },
      { status: 500 }
    );
  }
}
