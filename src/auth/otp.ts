import "server-only";
import type { AuthError, VerifyOtpParams } from "@supabase/supabase-js";
import { createAdminClient } from "@/db/admin";
import type { createClient } from "@/db/server";
import { clientIp } from "@/lib/client-ip";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function sendOtp(
  email: string,
  options: { data: Record<string, unknown>; emailRedirectTo?: string },
): Promise<AuthError | null> {
  const admin = createAdminClient(await clientIp());
  const { error } = await admin.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, ...options },
  });
  return error;
}

// The code is checked on behalf of the client's IP, and the session it opens is then kept in the client's cookies.
export async function verifyOtp(
  supabase: ServerClient,
  params: VerifyOtpParams,
): Promise<AuthError | null> {
  const admin = createAdminClient(await clientIp());
  const { data, error } = await admin.auth.verifyOtp(params);
  if (error) return error;
  if (!data.session) return null;
  const { error: sessionError } = await supabase.auth.setSession(data.session);
  return sessionError;
}
