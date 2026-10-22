import { beforeEach, describe, expect, it } from "vitest";
import { cookieGet } from "@/test/server-mocks";
import { localeCookie } from "./locales";
import { requestConfig as getConfig } from "./request-config";

beforeEach(() => {
  cookieGet.mockImplementation((name: string) =>
    name === localeCookie ? { name, value: "ru" } : undefined,
  );
});

describe("request config", () => {
  it("uses an explicitly passed locale", async () => {
    const config = await getConfig({
      locale: "en",
      requestLocale: Promise.resolve("uk"),
    });
    expect(config.locale).toBe("en");
  });

  it("uses the locale a landing set for the request", async () => {
    const config = await getConfig({ requestLocale: Promise.resolve("en") });
    expect(config.locale).toBe("en");
    expect(config.messages?.Landing).toBeDefined();
  });

  it("falls back to the visitor's interface language", async () => {
    const config = await getConfig({
      requestLocale: Promise.resolve(undefined),
    });
    expect(config.locale).toBe("ru");
  });
});
