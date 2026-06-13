// src/lib/site-owner-jwt.ts
// Gestione JWT per i site owner — separato dai token dei ristoratori.
// Usa Web Crypto API nativa di Node 18+ / Edge Runtime.

const SECRET = process.env.SITE_OWNER_JWT_SECRET;

if (!SECRET) {
  throw new Error("SITE_OWNER_JWT_SECRET non impostata nelle variabili d'ambiente.");
}

const ALGORITHM = "HS256";
const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 ore

// ── Helpers base64url ──────────────────────────────────────────────────────
function base64urlEncode(data: string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return Buffer.from(pad ? padded + "=".repeat(4 - pad) : padded, "base64").toString();
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ── Payload ────────────────────────────────────────────────────────────────
export interface SiteOwnerPayload {
  sub: string;   // site_owner.id
  email: string;
  iat: number;
  exp: number;
}

// ── Firma ──────────────────────────────────────────────────────────────────
export async function signSiteOwnerToken(
  ownerId: string,
  email: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64urlEncode(JSON.stringify({ alg: ALGORITHM, typ: "JWT" }));
  const payload = base64urlEncode(
    JSON.stringify({ sub: ownerId, email, iat: now, exp: now + TOKEN_TTL_SECONDS })
  );

  const key = await getKey(SECRET!);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  const sigB64 = Buffer.from(signature)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${header}.${payload}.${sigB64}`;
}

// ── Verifica ───────────────────────────────────────────────────────────────
export async function verifySiteOwnerToken(
  token: string
): Promise<SiteOwnerPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, sig] = parts;

    // Verifica firma
    const key = await getKey(SECRET!);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!valid) return null;

    // Decodifica payload
    const data = JSON.parse(base64urlDecode(payload)) as SiteOwnerPayload;

    // Verifica scadenza
    if (data.exp < Math.floor(Date.now() / 1000)) return null;

    return data;
  } catch {
    return null;
  }
}