import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message dictionaries", () => {
  it("share the same keys across locales", () => {
    const reference = keyPaths(en).sort();
    expect(keyPaths(uk).sort()).toEqual(reference);
    expect(keyPaths(ru).sort()).toEqual(reference);
  });
});
