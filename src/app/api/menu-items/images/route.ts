// src/app/api/menu-items/images/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") || "";
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ items: [] });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, image_url")
      .in("id", ids);

    if (error) {
      console.error("[menu-items/images] error:", error);
      return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    console.error("[menu-items/images] unexpected:", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
