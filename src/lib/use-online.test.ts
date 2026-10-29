import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerSnapshot, getSnapshot, subscribe } from "./use-online";

afterEach(() => vi.unstubAllGlobals());

describe("useOnline store", () => {
  it("assumes online on the server", () => {
    expect(getServerSnapshot()).toBe(true);
  });

  it("follows navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(getSnapshot()).toBe(false);
    vi.stubGlobal("navigator", { onLine: true });
    expect(getSnapshot()).toBe(true);
  });

  it("notifies on online and offline events until unsubscribed", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const callback = vi.fn();
    const unsubscribe = subscribe(callback);

    target.dispatchEvent(new Event("offline"));
    target.dispatchEvent(new Event("online"));
    expect(callback).toHaveBeenCalledTimes(2);

    unsubscribe();
    target.dispatchEvent(new Event("offline"));
    target.dispatchEvent(new Event("online"));
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
