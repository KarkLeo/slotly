import { describe, expect, it } from "vitest";
import { otpFailureToast } from "./otp-errors";

describe("otpFailureToast", () => {
  it("reports an Auth rate limit", () => {
    expect(otpFailureToast({ code: "over_email_send_rate_limit" })).toEqual({
      type: "error",
      key: "rateLimited",
    });
  });

  it("reports the email budget refused by our hook as a rate limit", () => {
    expect(otpFailureToast({ code: "unknown", status: 429 })).toEqual({
      type: "error",
      key: "rateLimited",
    });
  });

  it("reports anything else as unexpected", () => {
    expect(otpFailureToast({ code: "boom", status: 500 })).toEqual({
      type: "error",
      key: "unexpected",
    });
  });
});
