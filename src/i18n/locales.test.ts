import { describe, expect, it } from "vitest";
import { browserLocale, defaultLocale, negotiateLocale } from "./locales";

describe("negotiateLocale", () => {
  it("falls back to the default locale without a header", () => {
    expect(negotiateLocale(null)).toBe(defaultLocale);
    expect(negotiateLocale("")).toBe(defaultLocale);
  });

  it("picks the first supported language by quality", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,ru;q=0.8,en;q=0.7")).toBe("ru");
    expect(negotiateLocale("en;q=0.5,uk;q=0.9")).toBe("uk");
  });

  it("matches region subtags to their language", () => {
    expect(negotiateLocale("uk-UA")).toBe("uk");
    expect(negotiateLocale("EN-gb")).toBe("en");
  });

  it("keeps header order for equal quality", () => {
    expect(negotiateLocale("ru,en")).toBe("ru");
  });

  it("ignores languages with zero quality", () => {
    expect(negotiateLocale("ru;q=0,de")).toBe(defaultLocale);
  });

  it("falls back when nothing is supported", () => {
    expect(negotiateLocale("de,fr;q=0.8,*;q=0.1")).toBe(defaultLocale);
  });
});

describe("browserLocale", () => {
  it("prefers the locale cookie", () => {
    expect(browserLocale("a=1; NEXT_LOCALE=ru", ["en-US"])).toBe("ru");
  });

  it("falls back to the browser languages", () => {
    expect(browserLocale("a=1", ["en-US", "uk"])).toBe("en");
  });

  it("ignores an unknown cookie value", () => {
    expect(browserLocale("NEXT_LOCALE=de", ["en"])).toBe("en");
    expect(browserLocale("NEXT_LOCALE=de", ["fr"])).toBe(defaultLocale);
  });
});
