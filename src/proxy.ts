// src/middleware.ts
// Protegge tutte le route sotto /(site-owner)/ e /api/invite-codes/
// Redirige al login se il cookie non è presente o il JWT è invalido.

import { NextRequest, NextResponse } from "next/server";
import { verifySiteOwnerToken } from "@/lib/site-owner-jwt";

// Route che richiedono autenticazione site owner
const PROTECTED_PATHS = [
  "/owner-dashboard",
  "/api/invite-codes",
  "/api/site-owner/me",
];

// Route pubbliche anche se matcha un prefisso protetto
const PUBLIC_EXCEPTIONS = [
  "/api/site-owner/login",
  "/api/invite-codes/validate", // usato dai ristoratori al momento della registrazione
  "/owner-login",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isException = PUBLIC_EXCEPTIONS.some((p) => pathname.startsWith(p));

  if (!isProtected || isException) {
    return NextResponse.next();
  }

  const token = req.cookies.get("site_owner_token")?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  const payload = await verifySiteOwnerToken(token);
  if (!payload) {
    return redirectToLogin(req);
  }

  // Inietta l'owner id nell'header per uso nelle API routes (opzionale ma utile)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-site-owner-id",    payload.sub);
  requestHeaders.set("x-site-owner-email", payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToLogin(req: NextRequest) {
  // Per le API routes restituiamo 401, non un redirect
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/owner-login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/owner-dashboard/:path*",
    "/api/invite-codes/:path*",
    "/api/site-owner/:path*",
  ],
};