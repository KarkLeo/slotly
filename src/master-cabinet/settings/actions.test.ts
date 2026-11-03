import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeSlug,
  checkSlug,
  setPublished,
  updateCurrency,
  updateLocales,
  updateName,
  updateTimeZone,
} from "./actions";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const masterId = "6f1c2c1e-8a8e-4c55-9a43-2f7c5b0e1d11";

const query = {
  update: vi.fn(),
  eq: vi.fn(),
  not: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
};
const from = vi.fn();
const rpc = vi.fn();

vi.mock("@/db/server", () => ({ createClient: async () => ({ from, rpc }) }));
vi.mock("next/cache", () => ({ refresh }));
vi.mock("@/master-cabinet/session", () => ({
  requireMaster: async () => ({ id: masterId }),
}));

function form(values: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of [value].flat()) data.append(key, item);
  }
  return data;
}

function failure(message: string, code = "P0001") {
  return { data: null, error: { code, message } };
}

const unexpected = { toast: { type: "error", key: "unexpected" } };
const saved = { toast: { type: "success", key: "settingsSaved" } };

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.eq.mockResolvedValue({ data: null, error: null });
  query.select.mockResolvedValue({ data: [{ id: masterId }], error: null });
  rpc.mockResolvedValue({ data: true, error: null });
});

describe("updateName", () => {
  it("saves the trimmed name", async () => {
    await expect(updateName({}, form({ name: "  Anna  " }))).resolves.toEqual(
      saved,
    );
    expect(from).toHaveBeenCalledWith("masters");
    expect(query.update).toHaveBeenCalledWith({ name: "Anna" });
    expect(query.eq).toHaveBeenCalledWith("id", masterId);
    expect(refresh).toHaveBeenCalled();
  });

  it.each(["", "   ", "x".repeat(101)])(
    "rejects the name %j with a field error",
    async (name) => {
      await expect(updateName({}, form({ name }))).resolves.toEqual({
        fieldError: "nameInvalid",
      });
      expect(query.update).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("shows the unexpected toast on a database error", async () => {
    query.eq.mockResolvedValue(failure("boom"));
    await expect(updateName({}, form({ name: "Anna" }))).resolves.toEqual(
      unexpected,
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("changeSlug", () => {
  it("saves the trimmed lowercase slug", async () => {
    await expect(
      changeSlug({}, form({ slug: " Anna-Kyiv " })),
    ).resolves.toEqual({ toast: { type: "success", key: "slugChanged" } });
    expect(query.update).toHaveBeenCalledWith({ slug: "anna-kyiv" });
    expect(refresh).toHaveBeenCalled();
  });

  it("rejects an invalid slug without calling the database", async () => {
    await expect(changeSlug({}, form({ slug: "ab" }))).resolves.toEqual({
      fieldError: "slugInvalid",
    });
    expect(query.update).not.toHaveBeenCalled();
  });

  it.each([
    ["slug_taken", "P0001"],
    ["duplicate key value", "23505"],
  ])(
    "maps %s (%s) to slugTaken without a toast or refresh",
    async (message, code) => {
      query.eq.mockResolvedValue(failure(message, code));
      await expect(
        changeSlug({}, form({ slug: "anna-kyiv" })),
      ).resolves.toEqual({ fieldError: "slugTaken" });
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("maps slug_change_locked to slugLocked and refreshes the screen", async () => {
    query.eq.mockResolvedValue(failure("slug_change_locked"));
    await expect(changeSlug({}, form({ slug: "anna-kyiv" }))).resolves.toEqual({
      fieldError: "slugLocked",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the unexpected toast for another error", async () => {
    query.eq.mockResolvedValue(failure("boom"));
    await expect(changeSlug({}, form({ slug: "anna-kyiv" }))).resolves.toEqual(
      unexpected,
    );
  });
});

describe("updateLocales", () => {
  it("saves the locales and the primary locale", async () => {
    await expect(
      updateLocales({}, form({ locales: ["uk", "en"], primaryLocale: "en" })),
    ).resolves.toEqual(saved);
    expect(query.update).toHaveBeenCalledWith({
      locales: ["uk", "en"],
      primary_locale: "en",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    { locales: ["uk"], primaryLocale: "en" },
    { locales: [] as string[], primaryLocale: "uk" },
    { locales: ["uk", "uk"], primaryLocale: "uk" },
    { locales: ["de"], primaryLocale: "de" },
    { locales: ["uk", "de"], primaryLocale: "uk" },
  ])("refuses %j", async (input) => {
    await expect(updateLocales({}, form(input))).resolves.toEqual(unexpected);
    expect(query.update).not.toHaveBeenCalled();
  });
});

describe("updateTimeZone", () => {
  it("saves the canonical zone", async () => {
    await expect(
      updateTimeZone({}, form({ timeZone: "Europe/Kiev" })),
    ).resolves.toEqual(saved);
    expect(query.update).toHaveBeenCalledWith({ timezone: "Europe/Kyiv" });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the unexpected toast when the database rejects the zone", async () => {
    query.eq.mockResolvedValue(failure("check", "23514"));
    await expect(
      updateTimeZone({}, form({ timeZone: "Mars/Base" })),
    ).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateCurrency", () => {
  it("saves an offered currency", async () => {
    await expect(
      updateCurrency({}, form({ currency: "PLN" })),
    ).resolves.toEqual(saved);
    expect(query.update).toHaveBeenCalledWith({ currency: "PLN" });
  });

  it("refuses a currency that is not offered", async () => {
    await expect(
      updateCurrency({}, form({ currency: "JPY" })),
    ).resolves.toEqual(unexpected);
    expect(query.update).not.toHaveBeenCalled();
  });
});

describe("setPublished", () => {
  it("publishes only a page that was published before", async () => {
    query.eq.mockReturnValue(query);
    await expect(
      setPublished({}, form({ published: "true" })),
    ).resolves.toEqual({ toast: { type: "success", key: "pagePublished" } });
    expect(query.update).toHaveBeenCalledWith({
      published_at: expect.any(String),
    });
    expect(query.eq).toHaveBeenCalledWith("id", masterId);
    expect(query.not).toHaveBeenCalledWith("first_published_at", "is", null);
    expect(query.select).toHaveBeenCalledWith("id");
    expect(refresh).toHaveBeenCalled();
  });

  it("returns unexpected when publishing matches no row", async () => {
    query.eq.mockReturnValue(query);
    query.select.mockResolvedValue({ data: [], error: null });
    await expect(
      setPublished({}, form({ published: "true" })),
    ).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("unpublishes by clearing published_at", async () => {
    await expect(
      setPublished({}, form({ published: "false" })),
    ).resolves.toEqual({ toast: { type: "success", key: "pageUnpublished" } });
    expect(query.update).toHaveBeenCalledWith({ published_at: null });
    expect(query.not).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["publish", "true"],
    ["unpublish", "false"],
  ])(
    "shows the unexpected toast when the database fails to %s",
    async (_, published) => {
      query.eq.mockReturnValue(query);
      query.select.mockResolvedValue(failure("boom"));
      if (published === "false") query.eq.mockResolvedValue(failure("boom"));
      await expect(setPublished({}, form({ published }))).resolves.toEqual(
        unexpected,
      );
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("refuses a malformed value", async () => {
    await expect(setPublished({}, form({ published: "yes" }))).resolves.toEqual(
      unexpected,
    );
    expect(query.update).not.toHaveBeenCalled();
  });
});

describe("checkSlug", () => {
  beforeEach(() => {
    query.maybeSingle.mockResolvedValue({
      data: { slug: "anna-kyiv" },
      error: null,
    });
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
  });

  it("is invalid for a malformed slug without any query", async () => {
    await expect(checkSlug("ab")).resolves.toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("is current for the master's own slug without calling the RPC", async () => {
    await expect(checkSlug("anna-kyiv")).resolves.toBe("current");
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    [true, "available"],
    [false, "taken"],
  ])("asks the database: %s is %s", async (available, result) => {
    rpc.mockResolvedValue({ data: available, error: null });
    await expect(checkSlug("anna-nails")).resolves.toBe(result);
    expect(rpc).toHaveBeenCalledWith("is_slug_available", {
      slug: "anna-nails",
    });
  });

  it("throws when the database fails", async () => {
    rpc.mockResolvedValue(failure("boom"));
    await expect(checkSlug("anna-nails")).rejects.toThrow();
  });
});
