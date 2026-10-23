import { beforeEach, describe, expect, it } from "vitest";
import { requestHeaders } from "@/test/server-mocks";
import { clientIp } from "./client-ip";

beforeEach(() => {
  requestHeaders.delete("x-forwarded-for");
  requestHeaders.delete("x-real-ip");
});

describe("clientIp", () => {
  it("takes the address the proxy appended last", async () => {
    requestHeaders.set("x-forwarded-for", "198.51.100.7, 203.0.113.5");
    await expect(clientIp()).resolves.toBe("203.0.113.5");
  });

  it("reads an IPv6 address", async () => {
    requestHeaders.set("x-forwarded-for", "2001:db8::1");
    await expect(clientIp()).resolves.toBe("2001:db8::1");
  });

  it("falls back to x-real-ip", async () => {
    requestHeaders.set("x-real-ip", "203.0.113.9");
    await expect(clientIp()).resolves.toBe("203.0.113.9");
  });

  it("ignores a value that is not an IP address", async () => {
    requestHeaders.set("x-forwarded-for", "203.0.113.5, unknown");
    await expect(clientIp()).resolves.toBeNull();
  });

  it("is null without proxy headers", async () => {
    await expect(clientIp()).resolves.toBeNull();
  });
});
