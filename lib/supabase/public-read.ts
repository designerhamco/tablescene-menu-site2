import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";
import type { Database } from "./types";

/** Public menus use the anonymous RLS policy even when the visitor is a signed-in
 * owner of a different store. Never attach account cookies or privileged keys. */
export function createPublicReadClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
