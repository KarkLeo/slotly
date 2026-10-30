import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeVisible } from "./use-refresh-on-visible";

afterEach(() => vi.unstubAllGlobals());

function stubDocument(visibilityState: string) {
  const target = Object.assign(new EventTarget(), { visibilityState });
  vi.stubGlobal("document", target);
  return target;
}

describe("subscribeVisible", () => {
  it("ignores visibilitychange while the page is hidden", () => {
    const doc = stubDocument("hidden");
    const callback = vi.fn();
    subscribeVisible(callback);

    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls back when the page becomes visible, until unsubscribed", () => {
    const doc = stubDocument("hidden");
    const callback = vi.fn();
    const unsubscribe = subscribeVisible(callback);

    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
