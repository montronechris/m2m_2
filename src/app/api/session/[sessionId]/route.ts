// src/app/api/session/[sessionId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Trova la sessione QR — join diretto con tables tramite table_id
    const { data: session, error: sessionError } = await supabase
      .from("qr_sessions")
      .select("id, token, restaurant_id, table_id, is_active, tables(id, label, code)")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("[session route] not found:", sessionId, sessionError);
      return NextResponse.json(
        { error: "Sessione non valida o scaduta." },
        { status: 404 }
      );
    }

    if (!session.is_active) {
      return NextResponse.json(
        { error: "Sessione scaduta. Scansiona di nuovo il QR code." },
        { status: 403 }
      );
    }

    const table = session.tables as any;

    return NextResponse.json({
      tableId:      table?.id     ?? session.table_id ?? null,
      tableNumber:  table?.label  ?? session.token    ?? null,
      tableCode:    table?.code   ?? session.token    ?? null,
      restaurantId: session.restaurant_id,
    });

  } catch (err: any) {
    console.error("[session route] unexpected error:", err);
    return NextResponse.json(
      { error: "Errore interno del server", details: err.message },
      { status: 500 }
    );
  }
}