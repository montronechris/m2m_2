// src/app/api/session/[sessionId]/close/route.ts
//
// Chiude la sessione QR (is_active = false) quando il carrello scade per
// inattività (15 min senza aggiornamenti). Per ordinare di nuovo il cliente
// dovrà riscansionare il QR code del tavolo: /api/scan/[token] crea una
// nuova sessione solo se non ne trova una già attiva per quel tavolo.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  await supabase
    .from("qr_sessions")
    .update({ is_active: false })
    .eq("id", sessionId);
  return NextResponse.json({ ok: true });
}
