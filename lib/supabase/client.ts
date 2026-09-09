"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "./env";
import type { Database } from "./types";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createPasswordVerificationClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
