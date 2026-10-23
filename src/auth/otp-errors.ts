import type { ActionToast } from "@/toasts/toast";

export function otpFailureToast(code: string | undefined): ActionToast {
  const rateLimited =
    code === "over_email_send_rate_limit" || code === "over_request_rate_limit";
  return { type: "error", key: rateLimited ? "rateLimited" : "unexpected" };
}

export function isWrongCode(code: string | undefined): boolean {
  return code === "otp_expired" || code === "otp_disabled";
}
