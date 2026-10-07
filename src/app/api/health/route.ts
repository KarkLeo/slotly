import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/db/env";
import type { Database } from "@/db/types";

export async function GET() {
  await connection();

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.rpc("health");

  return Response.json(
    { status: error ? "unavailable" : "ok" },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
