// src/lib/supabase.ts
//
// Lazy, build-safe Supabase browser client.
//
// We intentionally do NOT call `createBrowserClient` at module load time.
// The admin/login pages import this module, and during `next build` those
// client components are server-rendered for the initial HTML. If the
// Supabase env vars are not configured (e.g. on Vercel preview deploys
// without the project's secrets), eagerly calling `createBrowserClient`
// would throw and fail the whole build.
//
// Instead we export a Proxy that instantiates the real client on first
// property access — which only happens in the browser at runtime. If the
// env vars are missing, a clear error is thrown only when something
// actually tries to use the client.

import { createBrowserClient } from "@supabase/ssr";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to use auth/admin features."
    );
  }
  // autoRefreshToken: false → la sessione muore davvero alla scadenza del JWT
  // (1 ora di default su Supabase) invece di essere rinnovata in background.
  cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: true },
  });
  return cached;
}

/**
 * Drop-in `supabase` client. Forwards every property access to the lazily
 * instantiated real client. Safe to import at build time even when env vars
 * are absent (it only throws when a method/property is actually used).
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop as keyof SupabaseClient);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
