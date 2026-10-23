"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/db/server";
import { setFlash } from "@/toasts/flash";
import type { ActionToast } from "@/toasts/toast";
import { safeNextPath } from "./next-path";
import { sendOtp, verifyOtp } from "./otp";
import { isWrongCode, otpFailureToast } from "./otp-errors";

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

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const typed = String(formData.get("email") ?? "").trim();
  const email = emailSchema.safeParse(typed);
  if (!email.success)
    return { step: "email", email: typed, error: "invalidEmail" };

  if (formData.get("intent") === "verify") {
    const code = codeSchema.safeParse(
      String(formData.get("code") ?? "").trim(),
    );
    if (!code.success)
      return { step: "code", email: email.data, error: "invalidCode" };

    const error = await verifyOtp(await createClient(), {
      email: email.data,
      token: code.data,
      type: "email",
    });
    if (isWrongCode(error?.code))
      return { step: "code", email: email.data, error: "invalidCode" };
    if (error)
      return {
        step: "code",
        email: email.data,
        toast: otpFailureToast(error),
      };

    await setFlash({ type: "success", key: "signedIn" });
    redirect(safeNextPath(formData.get("next")));
  }

  const error = await sendOtp(email.data, {
    data: { locale: await getLocale() },
  });
  if (error)
    return {
      step: "email",
      email: email.data,
      toast: otpFailureToast(error),
    };

  return {
    step: "code",
    email: email.data,
    toast: { type: "success", key: "codeSent" },
  };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  // Supabase clears the local session even when revoking it on the server fails, so the user is signed out either way.
  if (error) console.error(error);
  await setFlash({ type: "success", key: "signedOut" });
  redirect("/");
}
