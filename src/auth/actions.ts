"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/db/server";
import { setFlash } from "@/toasts/flash";
import type { ActionToast } from "@/toasts/toast";
import { safeNextPath } from "./next-path";

export type SignInState =
  | {
      step: "email";
      email?: string;
      error?: "invalidEmail";
      toast?: ActionToast;
    }
  | {
      step: "code";
      email: string;
      error?: "invalidCode";
      toast?: ActionToast;
    };

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6}$/);

function failureToast(code: string | undefined): ActionToast {
  const rateLimited =
    code === "over_email_send_rate_limit" || code === "over_request_rate_limit";
  return { type: "error", key: rateLimited ? "rateLimited" : "unexpected" };
}

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const typed = String(formData.get("email") ?? "").trim();
  const email = emailSchema.safeParse(typed);
  if (!email.success)
    return { step: "email", email: typed, error: "invalidEmail" };

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
    if (error?.code === "otp_expired" || error?.code === "otp_disabled")
      return { step: "code", email: email.data, error: "invalidCode" };
    if (error)
      return {
        step: "code",
        email: email.data,
        toast: failureToast(error.code),
      };

    await setFlash({ type: "success", key: "signedIn" });
    redirect(safeNextPath(formData.get("next")));
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true, data: { locale: await getLocale() } },
  });
  if (error)
    return {
      step: "email",
      email: email.data,
      toast: failureToast(error.code),
    };

  return {
    step: "code",
    email: email.data,
    toast: { type: "success", key: "codeSent" },
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await setFlash({ type: "success", key: "signedOut" });
  redirect("/");
}
