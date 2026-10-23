import "server-only";
import { createAdminClient } from "./admin";

export async function takeRateLimit(
  bucket: string,
  maxHits: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("take_rate_limit", {
    bucket,
    max_hits: maxHits,
    window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data;
}
