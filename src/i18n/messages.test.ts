import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import enErrors from "../../messages/errors/en.json";
import ruErrors from "../../messages/errors/ru.json";
import ukErrors from "../../messages/errors/uk.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { loadMessages } from "./messages";

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

  it("share the same error screen keys across locales", () => {
    const reference = keyPaths(enErrors).sort();
    expect(keyPaths(ukErrors).sort()).toEqual(reference);
    expect(keyPaths(ruErrors).sort()).toEqual(reference);
  });

  it("give next-intl the error screen texts as the Errors section", async () => {
    await expect(loadMessages("ru")).resolves.toEqual({
      ...ru,
      Errors: ruErrors,
    });
  });
});
