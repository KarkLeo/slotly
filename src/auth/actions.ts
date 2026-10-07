"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/db/server";
import { safeNextPath } from "./next-path";

export type SignInError =
  "invalidEmail" | "invalidCode" | "rateLimited" | "generic";

export type SignInState =
  | { step: "email"; error?: SignInError }
  | { step: "code"; email: string; error?: SignInError };

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6}$/);

function toError(code: string | undefined): SignInError {
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "rateLimited";
  if (code === "otp_expired" || code === "otp_disabled") return "invalidCode";
  return "generic";
}

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim(),
  );
  if (!email.success) return { step: "email", error: "invalidEmail" };

  const supabase = await createClient();

  if (formData.get("intent") === "verify") {
    const code = codeSchema.safeParse(
      String(formData.get("code") ?? "").trim(),
    );
    if (!code.success)
      return { step: "code", email: email.data, error: "invalidCode" };

    const { error } = await supabase.auth.verifyOtp({
      email: email.data,
      token: code.data,
      type: "email",
    });
    if (error)
      return { step: "code", email: email.data, error: toError(error.code) };

    redirect(safeNextPath(formData.get("next")));
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true, data: { locale: await getLocale() } },
  });
  if (error) return { step: "email", error: toError(error.code) };

  return { step: "code", email: email.data };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
