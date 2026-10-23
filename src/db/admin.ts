import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";
import type { Database } from "./types";

// Auth counts its per-IP limits by Sb-Forwarded-For only in requests made with the secret key.
export function createAdminClient(clientIp: string | null = null) {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey)
    throw new Error("Missing environment variable SUPABASE_SECRET_KEY");
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: clientIp ? { "sb-forwarded-for": clientIp } : {} },
  });
}
