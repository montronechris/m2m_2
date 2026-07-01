import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { orderId, menuItemId, name, priceCents, portata } = await req.json();

  if (!orderId || !menuItemId || !name || !priceCents) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Inserisce l'item
  const { error: insertError } = await supabase.from("order_items").insert({
    order_id: orderId,
    menu_item_id: menuItemId,
    name_snapshot: name,
    quantity: 1,
    base_price: priceCents / 100,
    customizations: [],
    portata: portata ?? 1,
    is_drink: false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Ricalcola il totale dall'ordine
  const { data: items } = await supabase
    .from("order_items")
    .select("base_price, quantity")
    .eq("order_id", orderId);

  const newOriginalCents = (items ?? []).reduce(
    (sum, r) => sum + Math.round((r.base_price ?? 0) * 100) * (r.quantity ?? 1),
    0
  );

  // Recupera discount_cents dall'ordine
  const { data: order } = await supabase
    .from("orders")
    .select("discount_cents, original_total_cents")
    .eq("id", orderId)
    .single();

  const discountCents: number = order?.discount_cents ?? 0;

  await supabase.from("orders").update({
    original_total_cents: newOriginalCents,
    total_cents: Math.max(0, newOriginalCents - discountCents),
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);

  return NextResponse.json({ ok: true });
}
