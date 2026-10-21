import { describe, expect, it, vi } from "vitest";
import { withUnexpectedToast } from "./with-unexpected-toast";

type State = { value?: string; toast?: { type: "success"; key: "codeSent" } };

const formData = new FormData();

describe("withUnexpectedToast", () => {
  it("passes a normal result through", async () => {
    const action = withUnexpectedToast(async () => ({ value: "ok" }) as State);
    await expect(action({}, formData)).resolves.toEqual({ value: "ok" });
  });

  it("turns a thrown error into an unexpected toast on the previous state", async () => {
    const action = withUnexpectedToast<State>(async () => {
      throw new Error("network");
    });
    await expect(action({ value: "before" }, formData)).resolves.toEqual({
      value: "before",
      toast: { type: "error", key: "unexpected" },
    });
  });

  it("uses the fallback state when one is given", async () => {
    const action = withUnexpectedToast<State>(
      async () => {
        throw new Error("network");
      },
      () => ({ value: "kept" }),
    );
    await expect(action({}, formData)).resolves.toEqual({
      value: "kept",
      toast: { type: "error", key: "unexpected" },
    });
  });

  it("lets Next.js redirects through", async () => {
    const { redirect } =
      await vi.importActual<typeof import("next/navigation")>(
        "next/navigation",
      );
    let redirectError: unknown;
    try {
      redirect("/app");
    } catch (error) {
      redirectError = error;
    }
    const action = withUnexpectedToast<State>(async () => {
      throw redirectError;
    });
    await expect(action({}, formData)).rejects.toBe(redirectError);
  });
});
