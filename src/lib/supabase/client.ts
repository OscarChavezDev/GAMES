"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser-side Supabase client using the public anon key. There is no
 * login/session in this app (players just pick a display name), so this
 * is a plain singleton rather than a cookie-aware SSR client.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa tu .env.local (ver .env.local.example)."
    );
  }

  browserClient = createClient(url, anonKey, {
    realtime: {
      params: { eventsPerSecond: 20 },
    },
  });

  return browserClient;
}
