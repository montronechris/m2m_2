// src/app/api/session/[sessionId]/active-orders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeStatuses = ["confirmed", "cooking", "ready", "served"];

    let ordersData: any[] | null = null;

    if (tableId) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("table_id", tableId)
        .in("status", activeStatuses)
        .not("confirmed_at", "is", null)
        .is("paid_at", null)
        .gte("confirmed_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      ordersData = data;
    }

    if (!ordersData?.length && sessionId) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("session_id", sessionId)
        .in("status", activeStatuses)
        .not("confirmed_at", "is", null)
        .is("paid_at", null)
        .gte("confirmed_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      ordersData = data;
    }

    if (!ordersData?.length) {
      return NextResponse.json({ orders: [], items: [] });
    }

    const orderIds = ordersData.map((o) => o.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "id, order_id, menu_item_id, name_snapshot, name, quantity, base_price, portata, note, customizations, portata_completed, portata_delivered, picked_up_at, delivered_at"
      )
      .in("order_id", orderIds);
    if (itemsError) throw itemsError;

    return NextResponse.json({ orders: ordersData, items: itemsData ?? [] });
  } catch (err: any) {
    console.error("[active-orders] error:", err);
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500 }
    );
  }
}
