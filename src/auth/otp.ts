import "server-only";
import { AuthError, type VerifyOtpParams } from "@supabase/supabase-js";
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

// Opens a session for a user we already trust, such as the owner of a signed notification link.
export async function signInAs(
  supabase: ServerClient,
  userId: string,
): Promise<AuthError | null> {
  const admin = createAdminClient(await clientIp());
  const { data: found, error: userError } =
    await admin.auth.admin.getUserById(userId);
  if (userError) return userError;
  if (!found.user.email) return new AuthError("User has no email");
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: found.user.email,
  });
  if (linkError) return linkError;
  return verifyOtp(supabase, {
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
}
