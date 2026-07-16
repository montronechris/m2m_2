// src/app/api/waiter-call/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { sessionId, tableCode, type: rawType } = await req.json();

  if (!sessionId && !tableCode) {
    return NextResponse.json({ error: "sessionId o tableCode mancante" }, { status: 400 });
  }

  // Tipo chiamata: 'call' (generica), 'payment' (conto), 'order' (il tavolo vuole
  // ordinare, modalità "con cameriere"). Default 'call'. Valore non fidato dal client.
  const type: "call" | "payment" | "order" =
    rawType === "payment" || rawType === "order" ? rawType : "call";

  const supabase = getSupabaseAdmin();

  let tableId: string | null = null;
  let restaurantId: string | null = null;
  let sessionIdOrNull: string | null = null;

  if (sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("qr_sessions")
      .select("table_id, restaurant_id")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
    }
    tableId = session.table_id;
    restaurantId = session.restaurant_id;
    sessionIdOrNull = sessionId;
  } else {
    const { data: tbl, error: tblErr } = await supabase
      .from("tables")
      .select("id, restaurant_id")
      .eq("code", String(tableCode).toUpperCase())
      .maybeSingle();
    if (tblErr || !tbl) {
      return NextResponse.json({ error: "Tavolo non trovato" }, { status: 404 });
    }
    tableId = tbl.id;
    restaurantId = tbl.restaurant_id;
  }

  const { data: call, error: insertError } = await supabase
    .from("waiter_calls")
    .insert({
      table_id: tableId,
      restaurant_id: restaurantId,
      session_id: sessionIdOrNull,
      type,
    })
    .select("id")
    .single();

  if (insertError || !call) {
    return NextResponse.json({ error: "Errore creazione chiamata" }, { status: 500 });
  }

  return NextResponse.json({ id: call.id });
}
