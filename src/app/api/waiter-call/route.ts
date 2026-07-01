// src/app/api/waiter-call/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId mancante" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // sessionId nell'URL client = qr_sessions.id
  const { data: session, error: sessionError } = await supabase
    .from("qr_sessions")
    .select("table_id, restaurant_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Sessione non trovata" }, { status: 404 });
  }

  const { data: call, error: insertError } = await supabase
    .from("waiter_calls")
    .insert({
      table_id: session.table_id,
      restaurant_id: session.restaurant_id,
      session_id: sessionId,
    })
    .select("id")
    .single();

  if (insertError || !call) {
    return NextResponse.json({ error: "Errore creazione chiamata" }, { status: 500 });
  }

  return NextResponse.json({ id: call.id });
}
