import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase-server";

const schema = z.object({
  email: z.string().email(),
  phone: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const phone = parsed.data.phone?.trim();

  const [{ data: customerRow }, { data: profileRow }] = await Promise.all([
    supabaseServer.from("customer_users").select("id").ilike("email", email).maybeSingle(),
    supabaseServer.from("profiles").select("id").ilike("email", email).maybeSingle(),
  ]);

  let phoneTaken = false;
  if (phone) {
    const { data: phoneRow } = await supabaseServer
      .from("customer_users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    phoneTaken = Boolean(phoneRow);
  }

  return NextResponse.json({
    emailTaken: Boolean(customerRow || profileRow),
    phoneTaken,
  });
}
