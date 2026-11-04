import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveService,
  deleteCategory,
  reorderCategories,
  reorderServices,
  restoreService,
  saveCategory,
  saveService,
} from "./actions";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const masterId = "6f1c2c1e-8a8e-4c55-9a43-2f7c5b0e1d11";
const serviceId = "7a2d3c1e-8a8e-4c55-9a43-2f7c5b0e1d22";
const categoryId = "8b3e4d1e-8a8e-4c55-9a43-2f7c5b0e1d33";

type Result = { data?: unknown; error?: { message: string } | null };

// One chainable query per from() call, resolved with the next queued result.
const results = new Map<string, Result[]>();
const writes: { table: string; method: string; payload: unknown }[] = [];
const filters: { table: string; column: string; value: unknown }[] = [];
const rpc = vi.fn();

function from(table: string) {
  const query: Record<string, unknown> = {};
  const chain = () => query;
  for (const method of ["select", "order", "limit"]) query[method] = chain;
  query.eq = (column: string, value: unknown) => {
    filters.push({ table, column, value });
    return query;
  };
  query.is = (column: string, value: unknown) => {
    filters.push({ table, column, value });
    return query;
  };
  for (const method of ["insert", "update"]) {
    query[method] = (payload: unknown) => {
      writes.push({ table, method, payload });
      return query;
    };
  }
  query.delete = () => {
    writes.push({ table, method: "delete", payload: null });
    return query;
  };
  const next = () => results.get(table)?.shift() ?? { data: [], error: null };
  query.maybeSingle = async () => next();
  query.then = (resolve: (value: Result) => unknown) => resolve(next());
  return query;
}

vi.mock("@/db/server", () => ({ createClient: async () => ({ from, rpc }) }));
vi.mock("next/cache", () => ({ refresh }));
vi.mock("@/master-cabinet/session", () => ({
  requireMaster: async () => ({ id: masterId }),
}));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

const serviceForm = {
  "name.uk": "Манікюр",
  "description.uk": "",
  categoryId: "",
  durationMinutes: "90",
  bufferMinutes: "15",
  priceKind: "fixed",
  price: "900",
  format: "on_site",
};

const master = {
  data: { locales: ["uk"], primary_locale: "uk" },
  error: null,
};
const failure = { data: null, error: { message: "boom" } };
const unexpected = { toast: { type: "error", key: "unexpected" } };

function queue(table: string, ...items: Result[]) {
  results.set(table, items);
}

function writesTo(method: string) {
  return writes.filter((write) => write.method === method);
}

beforeEach(() => {
  vi.clearAllMocks();
  results.clear();
  writes.length = 0;
  filters.length = 0;
  queue("masters", master);
});

describe("saveService", () => {
  it("adds a new service to the end of its list", async () => {
    queue(
      "services",
      { data: [{ position: 4 }], error: null },
      { error: null },
    );

    await expect(saveService({}, form(serviceForm))).resolves.toEqual({
      toast: { type: "success", key: "serviceAdded" },
    });
    expect(writesTo("insert")[0].payload).toEqual({
      master_id: masterId,
      category_id: null,
      name: { uk: "Манікюр" },
      description: {},
      duration_minutes: 90,
      buffer_minutes: 15,
      price_kind: "fixed",
      price: 900,
      format: "on_site",
      position: 5,
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("starts a new list at position 0", async () => {
    queue("services", { data: [], error: null }, { error: null });

    await saveService({}, form({ ...serviceForm, categoryId }));

    expect(writesTo("insert")[0].payload).toMatchObject({
      category_id: categoryId,
      position: 0,
    });
    expect(filters).toContainEqual({
      table: "services",
      column: "category_id",
      value: categoryId,
    });
  });

  it("keeps the position when the category stays", async () => {
    queue(
      "services",
      {
        data: { name: { uk: "Старе" }, description: {}, category_id: null },
        error: null,
      },
      { error: null },
    );

    await expect(
      saveService({}, form({ ...serviceForm, id: serviceId })),
    ).resolves.toEqual({
      toast: { type: "success", key: "settingsSaved" },
    });
    expect(writesTo("update")[0].payload).toMatchObject({
      name: { uk: "Манікюр" },
      position: undefined,
    });
    expect(filters).toContainEqual({
      table: "services",
      column: "master_id",
      value: masterId,
    });
  });

  it("moves to the end of the new category", async () => {
    queue(
      "services",
      { data: { name: {}, description: {}, category_id: null }, error: null },
      { data: [{ position: 1 }], error: null },
      { error: null },
    );

    await saveService({}, form({ ...serviceForm, id: serviceId, categoryId }));

    expect(writesTo("update")[0].payload).toMatchObject({
      category_id: categoryId,
      position: 2,
    });
  });

  it("keeps translations of languages turned off", async () => {
    queue(
      "services",
      {
        data: {
          name: { uk: "Старе", ru: "Маникюр" },
          description: {},
          category_id: null,
        },
        error: null,
      },
      { error: null },
    );

    await saveService({}, form({ ...serviceForm, id: serviceId }));

    expect(writesTo("update")[0].payload).toMatchObject({
      name: { uk: "Манікюр", ru: "Маникюр" },
    });
  });

  it("returns field errors without writing", async () => {
    await expect(
      saveService({}, form({ ...serviceForm, durationMinutes: "7" })),
    ).resolves.toEqual({ errors: ["duration"] });
    expect(writes).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses another master's service", async () => {
    queue("services", { data: null, error: null });

    await expect(
      saveService({}, form({ ...serviceForm, id: serviceId })),
    ).resolves.toEqual(unexpected);
    expect(writes).toEqual([]);
  });

  it("refuses a malformed id before touching the database", async () => {
    await expect(
      saveService({}, form({ ...serviceForm, id: "nope" })),
    ).resolves.toEqual(unexpected);
    expect(writes).toEqual([]);
  });

  it("shows the unexpected toast when the write fails", async () => {
    queue("services", { data: [], error: null }, failure);

    await expect(saveService({}, form(serviceForm))).resolves.toEqual(
      unexpected,
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("archiveService and restoreService", () => {
  it("archives with a timestamp", async () => {
    queue("services", { data: [{ id: serviceId }], error: null });

    await expect(archiveService({}, form({ id: serviceId }))).resolves.toEqual({
      toast: { type: "success", key: "serviceArchived" },
    });
    expect(writesTo("update")[0].payload).toEqual({
      archived_at: expect.any(String),
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("restores by clearing the timestamp", async () => {
    queue("services", { data: [{ id: serviceId }], error: null });

    await expect(restoreService({}, form({ id: serviceId }))).resolves.toEqual({
      toast: { type: "success", key: "serviceRestored" },
    });
    expect(writesTo("update")[0].payload).toEqual({ archived_at: null });
  });

  it("reports a service that was not updated", async () => {
    queue("services", { data: [], error: null });

    await expect(archiveService({}, form({ id: serviceId }))).resolves.toEqual(
      unexpected,
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("saveCategory", () => {
  it("adds a new category to the end", async () => {
    queue(
      "service_categories",
      { data: [{ position: 2 }], error: null },
      { error: null },
    );

    await expect(
      saveCategory({}, form({ "name.uk": "Нігті" })),
    ).resolves.toEqual({ toast: { type: "success", key: "categoryAdded" } });
    expect(writesTo("insert")[0].payload).toEqual({
      master_id: masterId,
      name: { uk: "Нігті" },
      position: 3,
    });
  });

  it("renames, keeping translations of languages turned off", async () => {
    queue(
      "service_categories",
      { data: { name: { uk: "Старе", en: "Nails" } }, error: null },
      { error: null },
    );

    await expect(
      saveCategory({}, form({ id: categoryId, "name.uk": "Нігті" })),
    ).resolves.toEqual({ toast: { type: "success", key: "settingsSaved" } });
    expect(writesTo("update")[0].payload).toEqual({
      name: { uk: "Нігті", en: "Nails" },
    });
  });

  it("returns the field error for an empty name", async () => {
    await expect(saveCategory({}, form({ "name.uk": " " }))).resolves.toEqual({
      error: "name",
    });
    expect(writes).toEqual([]);
  });
});

describe("deleteCategory", () => {
  it("deletes own category", async () => {
    queue("service_categories", { data: [{ id: categoryId }], error: null });

    await expect(deleteCategory({}, form({ id: categoryId }))).resolves.toEqual(
      {
        toast: { type: "success", key: "categoryDeleted" },
      },
    );
    expect(writesTo("delete")).toHaveLength(1);
    expect(filters).toContainEqual({
      table: "service_categories",
      column: "master_id",
      value: masterId,
    });
  });

  it("reports nothing deleted", async () => {
    queue("service_categories", { data: [], error: null });

    await expect(deleteCategory({}, form({ id: categoryId }))).resolves.toEqual(
      unexpected,
    );
  });
});

describe("reorder", () => {
  it("sends services in the new order with no success toast", async () => {
    rpc.mockResolvedValue({ error: null });

    await expect(reorderServices([serviceId])).resolves.toEqual({});
    expect(rpc).toHaveBeenCalledWith("reorder_services", { ids: [serviceId] });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("sends categories in the new order", async () => {
    rpc.mockResolvedValue({ error: null });

    await reorderCategories([categoryId]);
    expect(rpc).toHaveBeenCalledWith("reorder_service_categories", {
      ids: [categoryId],
    });
  });

  it("shows the unexpected toast on failure", async () => {
    rpc.mockResolvedValue({ error: { message: "boom" } });

    await expect(reorderServices([serviceId])).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses malformed ids", async () => {
    await expect(reorderServices(["nope"])).resolves.toEqual(unexpected);
    expect(rpc).not.toHaveBeenCalled();
  });
});
