// src/app/api/admin/menu/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireActiveStaff } from "@/lib/auth/requireActiveStaff";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ✅ In Next.js 15+, params è una Promise — va sempre awaited
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireActiveStaff();
  if ("error" in auth) {
    if (auth.error === "inactive") {
      return NextResponse.json(
        { error: "Abbonamento scaduto o account sospeso" },
        { status: 402 }
      );
    }
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const staff = auth.session;

  const { id } = await params;

  // Lo scoping a restaurant_id impedisce che uno staff di un ristorante
  // elimini una categoria di un altro ristorante.
  const { error, data } = await supabaseAdmin
    .from("menu_categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", staff.restaurantId)
    .select("id");

  if (error) {
    console.error("[admin/menu/id] error:", error.message);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Categoria non trovata" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
