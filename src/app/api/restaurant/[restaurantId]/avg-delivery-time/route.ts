import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const MIN_SAMPLES = 10;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("order_items")
    .select("delivered_at, orders!inner(confirmed_at, restaurant_id)")
    .eq("orders.restaurant_id", restaurantId)
    .not("delivered_at", "is", null)
    .not("orders.confirmed_at", "is", null)
    .limit(500);

  if (error || !rows?.length) return NextResponse.json({ avgMinutes: null });

  const deltas: number[] = [];
  for (const row of rows as { delivered_at: string; orders: { confirmed_at: string } }[]) {
    if (!row.orders?.confirmed_at) continue;
    const mins = (new Date(row.delivered_at).getTime() - new Date(row.orders.confirmed_at).getTime()) / 60000;
    if (mins > 0 && mins < 180) deltas.push(mins);
  }

  if (deltas.length < MIN_SAMPLES) return NextResponse.json({ avgMinutes: null });

  const avg = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  return NextResponse.json({ avgMinutes: avg });
}
