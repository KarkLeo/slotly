import { describe, expect, it } from "vitest";
import { decodeFlash, encodeFlash } from "./toast";

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
