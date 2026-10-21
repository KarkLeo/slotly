import { describe, expect, it } from "vitest";
import { decodeFlash, encodeFlash, readFlashCookie } from "./toast";

describe("flash toast encoding", () => {
  it("round-trips a toast", () => {
    const toast = { type: "success", key: "signedIn" } as const;
    expect(decodeFlash(encodeFlash(toast))).toEqual(toast);
  });

  it.each([
    undefined,
    "",
    "success",
    "info:signedIn",
    "error:nope",
    "error:signedIn:x",
  ])("rejects %s", (value) => {
    expect(decodeFlash(value)).toBeNull();
  });
});

describe("readFlashCookie", () => {
  it("finds the flash among other cookies", () => {
    expect(
      readFlashCookie("a=1; slotly-flash=success%3AsignedOut; b=2"),
    ).toEqual({ type: "success", key: "signedOut" });
  });

  it.each(["", "a=1", "slotly-flash=%E0", "slotly-flash=error:nope"])(
    "returns null for %s",
    (cookies) => {
      expect(readFlashCookie(cookies)).toBeNull();
    },
  );
});
