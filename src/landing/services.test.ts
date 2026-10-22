import { describe, expect, it } from "vitest";
import { groupServices } from "./services";

const service = (
  id: string,
  categoryId: string | null,
  position: number,
  name: string,
) => ({
  id,
  categoryId,
  position,
  name: { uk: name },
  description: {},
  durationMinutes: 60,
  priceKind: "fixed" as const,
  price: 100,
  format: "on_site" as const,
});

describe("groupServices", () => {
  it("orders categories and their services by position, uncategorized last", () => {
    const groups = groupServices(
      [
        { id: "pedicure", position: 1, name: { uk: "Педикюр" } },
        { id: "manicure", position: 0, name: { uk: "Манікюр" } },
        { id: "empty", position: 2, name: { uk: "Порожня" } },
      ],
      [
        service("gel", "manicure", 1, "Покриття"),
        service("other", null, 0, "Консультація"),
        service("removal", "manicure", 0, "Зняття"),
        service("foot", "pedicure", 0, "Педикюр"),
      ],
    );

    expect(
      groups.map((group) => [
        group.category?.id ?? null,
        group.services.map((s) => s.id),
      ]),
    ).toEqual([
      ["manicure", ["removal", "gel"]],
      ["pedicure", ["foot"]],
      [null, ["other"]],
    ]);
  });

  it("returns no groups without services", () => {
    expect(groupServices([{ id: "a", position: 0, name: {} }], [])).toEqual([]);
  });
});
