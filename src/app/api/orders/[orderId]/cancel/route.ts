// src/app/api/orders/[orderId]/cancel/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// L'ordine è annullabile dal cliente SOLO finché la cucina non ha iniziato la
// preparazione: quindi solo negli stati 'pending' (carrello/da confermare) e
// 'confirmed' (inviato, non ancora in preparazione). Da 'cooking' in poi non più.
const CANCELLABLE_STATUSES = ["pending", "confirmed"];

type Body = {
  sessionId?: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = (await request.json().catch(() => ({}))) as Body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, session_id")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
    }

    // Ownership: se il client passa la sessione e l'ordine è legato a una sessione,
    // devono coincidere (impedisce di annullare l'ordine di un altro tavolo).
    if (body.sessionId && existing.session_id && existing.session_id !== body.sessionId) {
      return NextResponse.json({ error: "Ordine non appartiene alla sessione" }, { status: 403 });
    }

    if (!CANCELLABLE_STATUSES.includes(existing.status as string)) {
      return NextResponse.json(
        { error: "L'ordine è già in preparazione e non può essere annullato" },
        { status: 409 }
      );
    }

    // Update atomico condizionato sullo stato: se nel frattempo la cucina è passata
    // a 'cooking', la riga non viene aggiornata e restituiamo 409 (niente race).
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .in("status", CANCELLABLE_STATUSES)
      .select("id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json(
        { error: "L'ordine è già in preparazione e non può essere annullato" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[orders/cancel] error:", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
