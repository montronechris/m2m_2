// src/app/api/restaurants/create/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const CreateSchema = z.object({
  name: z.string().min(1).max(128),
  city: z.string().min(1).max(128),
  logoUrl: z.string().optional().nullable(),
  logoIcon: z.string().optional().nullable(),
  establishmentType: z.string().optional().nullable(),
  establishmentTypeCustom: z.string().max(80).optional().nullable(),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body non valido." }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Dati non validi.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }
  const { name, city, logoUrl, logoIcon, establishmentType, establishmentTypeCustom } = parsed.data;

  const authed = await createServerSupabase();
  const { data: { user }, error: userError } = await authed.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Se l'utente ha già un ristorante collegato, non ne creiamo un altro
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.restaurant_id) {
    return NextResponse.json({ error: "Hai già un ristorante registrato." }, { status: 409 });
  }

  const baseSlug = name
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const accessExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: restaurant, error: restError } = await admin
    .from("restaurants")
    .insert({
      name,
      slug,
      city,
      logo_url: logoUrl || null,
      logo_icon: logoIcon || 'chef-hat',
      establishment_type: establishmentType || 'ristorante',
      establishment_type_custom: establishmentType === 'altro' ? (establishmentTypeCustom || null) : null,
      status: "open",
      plan: "free_trial",
      max_staff: 2,
      access_expires_at: accessExpiresAt,
    })
    .select("id")
    .single();

  if (restError || !restaurant) {
    return NextResponse.json({ error: restError?.message ?? "Errore durante la creazione del ristorante." }, { status: 500 });
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const [firstName, ...rest] = fullName.trim().split(" ");
  const lastName = rest.join(" ");

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      first_name: firstName || null,
      last_name: lastName || null,
      role: "admin",
      restaurant_id: restaurant.id,
    });

  if (profileError) {
    await admin.from("restaurants").delete().eq("id", restaurant.id);
    return NextResponse.json({ error: profileError.message ?? "Errore durante la creazione del profilo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, restaurantId: restaurant.id }, { status: 201 });
}
