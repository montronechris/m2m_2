// src/app/api/restaurant/[restaurantId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, brand_color, logo_url, address, phone, instagram, facebook, tripadvisor, website, google_review_url, background_image_url, background_type"
      )
      .eq("id", restaurantId)
      .maybeSingle();

    if (error || !data) {
      console.error("[restaurant route] not found:", restaurantId, error);
      return NextResponse.json(
        { error: "Ristorante non trovato" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[restaurant route] unexpected error:", err);
    return NextResponse.json(
      { error: "Errore interno del server", details: err.message },
      { status: 500 }
    );
  }
}
