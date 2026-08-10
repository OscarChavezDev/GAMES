import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key. This bypasses
 * Row Level Security, so it must never be imported from client components
 * or leaked into any response — it's only used from Server Actions and
 * Route Handlers to do privileged work (creating rooms, uploading images
 * after we've validated them ourselves).
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Revisa tu .env.local (ver .env.local.example)."
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}
