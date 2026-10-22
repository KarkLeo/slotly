import { describe, expect, it } from "vitest";
import en from "../../messages/errors/en.json";
import ru from "../../messages/errors/ru.json";
import uk from "../../messages/errors/uk.json";
import { errorTexts } from "./error-texts";

describe("errorTexts", () => {
  it.each([
    ["uk", uk],
    ["ru", ru],
    ["en", en],
  ] as const)("gives the %s error screen its own texts", (locale, texts) => {
    expect(errorTexts(locale)).toEqual(texts);
  });
});
