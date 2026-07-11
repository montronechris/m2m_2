// src/app/api/admin/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/lib/auth/requireStaff";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff();
  if (!staff) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;

  // Soft delete: segna l'ordine come cancellato invece di eliminarlo fisicamente,
  // così rimane visibile in cronologia nella sezione "Eliminati".
  // Lo scoping a restaurant_id impedisce che uno staff di un ristorante
  // annulli l'ordine di un altro tavolo/ristorante.
  const { error, data } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", staff.restaurantId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}