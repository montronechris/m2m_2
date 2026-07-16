// src/app/api/orders/[orderId]/confirm/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeAuthoritativeOrderTotal, OrderTotalError } from "@/lib/order-total";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const CONFIRMABLE_STATUSES = ["pending", "preparing", "cooking", "ready", "served"];

type Body = {
  paymentMethod: "cash" | "card";
  sessionId?: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = (await request.json()) as Body;

    if (body.paymentMethod !== "cash" && body.paymentMethod !== "card") {
      return NextResponse.json({ error: "Metodo di pagamento non valido" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, restaurant_id, discount_cents")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[orders/confirm] fetch failed:", fetchError.message);
      return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
    }
    if (!CONFIRMABLE_STATUSES.includes(existing.status as string)) {
      return NextResponse.json(
        { error: "Ordine già confermato o non confermabile" },
        { status: 409 }
      );
    }

    // Il totale finale è ricalcolato da zero da order_items/menu_items (mai da
    // orders.total_cents, scrivibile direttamente dal client via REST, né dai
    // valori di sconto/totale inviati dal client in questa richiesta): altrimenti
    // chiunque potrebbe confermare un ordine al prezzo che preferisce.
    let realTotal: number;
    try {
      realTotal = await computeAuthoritativeOrderTotal(supabase, orderId, existing.restaurant_id);
    } catch (e) {
      const message = e instanceof OrderTotalError ? e.message : "Errore nel calcolo del totale";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const finalTotal = Math.max(0, realTotal - (existing.discount_cents ?? 0));

    const now = new Date().toISOString();
    const payload = {
      status: "confirmed",
      payment_method: body.paymentMethod,
      confirmed_at: now,
      updated_at: now,
      session_id: body.sessionId ?? null,
      total_cents: finalTotal,
    };

    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)
      .eq("status", existing.status)
      .select("id, status, confirmed_at")
      .maybeSingle();

    if (error) {
      console.error("[orders/confirm] update error:", error);
      return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "Ordine già confermato da un'altra richiesta" },
        { status: 409 }
      );
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error("[orders/confirm] unexpected:", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
