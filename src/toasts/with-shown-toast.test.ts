import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionToast } from "./toast";
import { withShownToast } from "./with-shown-toast";

type State = { value?: string; toast?: ActionToast };

const formData = new FormData();

describe("withShownToast", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows the result's toast before the caller gets the state", async () => {
    const order: string[] = [];
    const show = vi.fn(() => order.push("show"));
    const action = withShownToast<State>(
      async () => ({ toast: { type: "success", key: "appointmentConfirmed" } }),
      show,
    );
    const next = await action({}, formData).then((state) => {
      order.push("resolved");
      return state;
    });
    expect(show).toHaveBeenCalledWith({
      type: "success",
      key: "appointmentConfirmed",
    });
    expect(order).toEqual(["show", "resolved"]);
    expect(next.toast).toEqual({
      type: "success",
      key: "appointmentConfirmed",
    });
  });

  it("shows the unexpected toast when the action throws", async () => {
    const show = vi.fn();
    const action = withShownToast<State>(async () => {
      throw new Error("network");
    }, show);
    await expect(action({ value: "before" }, formData)).resolves.toEqual({
      value: "before",
      toast: { type: "error", key: "unexpected" },
    });
    expect(show).toHaveBeenCalledWith({ type: "error", key: "unexpected" });
  });

  it("shows nothing when the result has no toast", async () => {
    const show = vi.fn();
    const action = withShownToast<State>(async () => ({ value: "ok" }), show);
    await expect(action({}, formData)).resolves.toEqual({ value: "ok" });
    expect(show).not.toHaveBeenCalled();
  });
});
