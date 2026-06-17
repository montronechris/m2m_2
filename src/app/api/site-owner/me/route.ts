// src/app/api/site-owner/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySiteOwnerToken } from "@/lib/site-owner-jwt";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("site_owner_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const payload = await verifySiteOwnerToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Sessione scaduta o non valida." }, { status: 401 });
  }

  return NextResponse.json({ id: payload.sub, email: payload.email });
}

export async function DELETE() {
  // Logout: cancella il cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set("site_owner_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}