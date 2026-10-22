import { describe, expect, it } from "vitest";
import { formatDuration, formatMoney, initials } from "./format";

describe("formatDuration", () => {
  it("writes hours and minutes in the landing language", () => {
    expect(formatDuration(90, "uk")).toBe("1 год і 30 хв");
    expect(formatDuration(120, "uk")).toBe("2 год");
    expect(formatDuration(45, "en")).toBe("45 min");
  });
});

describe("formatMoney", () => {
  it("drops kopecks from whole amounts", () => {
    expect(formatMoney(1100, "UAH", "uk")).toBe("1 100 ₴");
  });

  it("keeps cents when there are any", () => {
    expect(formatMoney(99.5, "USD", "en")).toBe("$99.50");
  });
});

describe("initials", () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("Олена Мельник")).toBe("ОМ");
    expect(initials("  Mark  ")).toBe("M");
    expect(initials("Anna Maria Lopez")).toBe("AM");
  });
});
