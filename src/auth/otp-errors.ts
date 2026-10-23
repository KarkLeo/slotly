import type { ActionToast } from "@/toasts/toast";

export function otpFailureToast({
  code,
  status,
}: {
  code?: string;
  status?: number;
}): ActionToast {
  // Our email hook refuses over budget with a bare 429 that Auth passes on without an error code.
  const rateLimited =
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    status === 429;
  return { type: "error", key: rateLimited ? "rateLimited" : "unexpected" };
}

export function isWrongCode(code: string | undefined): boolean {
  return code === "otp_expired" || code === "otp_disabled";
}
