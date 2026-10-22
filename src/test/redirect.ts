import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";

// Resolves to the target of the real Next.js redirect the call threw, so unstable_rethrow treats it as it would in production.
export async function redirectTarget(call: Promise<unknown>): Promise<string> {
  const error = await call.then(
    () => new Error("Expected a redirect, but the call resolved"),
    (thrown: unknown) => thrown,
  );
  if (!isRedirectError(error)) throw error;
  return getURLFromRedirectError(error);
}
