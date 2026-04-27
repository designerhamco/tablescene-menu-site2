"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./env";
import type { Database } from "./types";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
