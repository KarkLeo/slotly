import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeVisible } from "./use-refresh-on-visible";

afterEach(() => vi.unstubAllGlobals());

function stubDocument(visibilityState: string) {
  const target = Object.assign(new EventTarget(), { visibilityState });
  vi.stubGlobal("document", target);
  return target;
}

function stubWindow() {
  const target = new EventTarget();
  vi.stubGlobal("window", target);
  return target;
}

function stubOnLine(onLine: boolean) {
  const navigator = { onLine };
  vi.stubGlobal("navigator", navigator);
  return navigator;
}

describe("subscribeVisible", () => {
  it("ignores visibilitychange while the page is hidden", () => {
    const doc = stubDocument("hidden");
    stubWindow();
    stubOnLine(true);
    const callback = vi.fn();
    subscribeVisible(callback);

    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls back when the page becomes visible, until unsubscribed", () => {
    const doc = stubDocument("hidden");
    stubWindow();
    stubOnLine(true);
    const callback = vi.fn();
    const unsubscribe = subscribeVisible(callback);

    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("skips a page that becomes visible while offline", () => {
    const doc = stubDocument("visible");
    stubWindow();
    stubOnLine(false);
    const callback = vi.fn();
    subscribeVisible(callback);

    doc.dispatchEvent(new Event("visibilitychange"));
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls back when the connection returns, until unsubscribed", () => {
    stubDocument("visible");
    const win = stubWindow();
    const navigator = stubOnLine(false);
    const callback = vi.fn();
    const unsubscribe = subscribeVisible(callback);

    navigator.onLine = true;
    win.dispatchEvent(new Event("online"));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    win.dispatchEvent(new Event("online"));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
