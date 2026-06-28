// src/lib/supabase-server.ts
// Client Supabase con SERVICE_ROLE KEY — usare SOLO in API routes server-side.
// Non importare mai questo file in componenti client o in codice accessibile dal browser.

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY non impostata nelle variabili d'ambiente.");
}

// Singleton: un'unica istanza per tutto il processo Node
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Disabilitiamo la persistenza della sessione lato server
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);