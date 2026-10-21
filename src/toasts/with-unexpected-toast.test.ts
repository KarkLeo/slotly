import { UnrecognizedActionError } from "next/dist/client/components/unrecognized-action-error";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionToast } from "./toast";
import { unexpectedToast, withUnexpectedToast } from "./with-unexpected-toast";

type State = { value?: string; toast?: ActionToast };

const formData = new FormData();

describe("withUnexpectedToast", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

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

describe("unexpectedToast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs the error and returns the unexpected toast", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("network");
    expect(unexpectedToast(error)).toEqual({
      type: "error",
      key: "unexpected",
    });
    expect(log).toHaveBeenCalledWith(error);
  });

  it("reloads the page when the action belongs to an older deployment", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });
    unexpectedToast(new UnrecognizedActionError("stale"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload for an ordinary error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });
    unexpectedToast(new Error("network"));
    expect(reload).not.toHaveBeenCalled();
  });
});
