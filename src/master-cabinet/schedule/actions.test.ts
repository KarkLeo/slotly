import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteException,
  saveException,
  saveTemplateDays,
  setAutoConfirm,
  updateBookingParam,
} from "./actions";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const masterId = "6f1c2c1e-8a8e-4c55-9a43-2f7c5b0e1d11";

const query = {
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
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

function failure(message: string) {
  return { data: null, error: { code: "P0001", message } };
}

const unexpected = { toast: { type: "error", key: "unexpected" } };
const saved = { toast: { type: "success", key: "settingsSaved" } };
const intervalsInvalid = (submittedHours: string) => ({
  fieldError: "intervalsInvalid",
  submittedHours,
});

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockResolvedValue({ data: null, error: null });
  query.gte.mockReturnValue(query);
  query.lte.mockResolvedValue({ data: null, error: null });
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("saveTemplateDays", () => {
  it("writes the hours for the chosen weekdays", async () => {
    await expect(
      saveTemplateDays(
        {},
        form({ weekdays: ["1", "2"], hours: "{[600,1140)}" }),
      ),
    ).resolves.toEqual(saved);
    expect(rpc).toHaveBeenCalledWith("set_work_template_days", {
      weekdays: [1, 2],
      hours: "{[600,1140)}",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("writes empty hours as a day off", async () => {
    await saveTemplateDays({}, form({ weekdays: "7", hours: "{}" }));
    expect(rpc).toHaveBeenCalledWith("set_work_template_days", {
      weekdays: [7],
      hours: "{}",
    });
  });

  it("returns the field error for overlapping intervals without a call", async () => {
    const hours = "{[600,900),[800,1000)}";
    await expect(
      saveTemplateDays({}, form({ weekdays: "1", hours })),
    ).resolves.toEqual(intervalsInvalid(hours));
    expect(rpc).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["no weekdays", []],
    ["a weekday of 0", ["0"]],
    ["a weekday of 8", ["8"]],
    ["a fractional weekday", ["1.5"]],
    ["a text weekday", ["mon"]],
    ["a duplicate weekday", ["2", "2"]],
  ])("rejects %s as unexpected", async (_name, weekdays) => {
    await expect(
      saveTemplateDays({}, form({ weekdays, hours: "{[600,1140)}" })),
    ).resolves.toEqual(unexpected);
    expect(rpc).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("rejects an unparsable literal as unexpected", async () => {
    await expect(
      saveTemplateDays({}, form({ weekdays: "1", hours: "nope" })),
    ).resolves.toEqual(unexpected);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("shows the unexpected toast on a database error", async () => {
    rpc.mockResolvedValue(failure("boom"));
    await expect(
      saveTemplateDays({}, form({ weekdays: "1", hours: "{[600,1140)}" })),
    ).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("saveException", () => {
  const period = { from: "2026-12-01", to: "2026-12-03" };

  it("writes the hours of a period and passes the replaced period", async () => {
    await expect(
      saveException(
        {},
        form({
          kind: "hours",
          ...period,
          hours: "{[600,840),[900,1140)}",
          replacedFrom: "2026-12-01",
          replacedTo: "2026-12-02",
        }),
      ),
    ).resolves.toEqual(saved);
    expect(rpc).toHaveBeenCalledWith("set_schedule_exceptions", {
      from_date: "2026-12-01",
      to_date: "2026-12-03",
      hours: "{[600,840),[900,1140)}",
      replaced_from: "2026-12-01",
      replaced_to: "2026-12-02",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("omits the replaced period for a new exception", async () => {
    await saveException(
      {},
      form({ kind: "hours", ...period, hours: "{[600,840)}" }),
    );
    expect(rpc).toHaveBeenCalledWith("set_schedule_exceptions", {
      from_date: "2026-12-01",
      to_date: "2026-12-03",
      hours: "{[600,840)}",
    });
  });

  it("writes a day off as empty hours even with stale hours submitted", async () => {
    await saveException(
      {},
      form({ kind: "off", ...period, hours: "{[600,840)}" }),
    );
    expect(rpc).toHaveBeenCalledWith("set_schedule_exceptions", {
      from_date: "2026-12-01",
      to_date: "2026-12-03",
      hours: "{}",
    });
  });

  it("requires an interval for kind hours", async () => {
    await expect(
      saveException({}, form({ kind: "hours", ...period, hours: "{}" })),
    ).resolves.toEqual(intervalsInvalid("{}"));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns the field error for overlapping intervals without a call", async () => {
    const hours = "{[600,900),[800,1000)}";
    await expect(
      saveException({}, form({ kind: "hours", ...period, hours })),
    ).resolves.toEqual(intervalsInvalid(hours));
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown kind", { kind: "closed", ...period, hours: "{}" }],
    ["a malformed date", { kind: "off", from: "12/01", to: "2026-12-03" }],
    [
      "only one replaced bound",
      { kind: "off", ...period, replacedFrom: "2026-12-01" },
    ],
  ])("rejects %s as unexpected", async (_name, values) => {
    await expect(saveException({}, form(values))).resolves.toEqual(unexpected);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["invalid_range", "boom"])(
    "shows the unexpected toast for the database error %s",
    async (message) => {
      rpc.mockResolvedValue(failure(message));
      await expect(
        saveException({}, form({ kind: "off", ...period })),
      ).resolves.toEqual(unexpected);
      expect(refresh).not.toHaveBeenCalled();
    },
  );
});

describe("deleteException", () => {
  beforeEach(() => {
    query.eq.mockReturnValue(query);
  });

  it("deletes the master's rows in the shown range", async () => {
    await expect(
      deleteException({}, form({ from: "2026-12-01", to: "2026-12-03" })),
    ).resolves.toEqual({
      toast: { type: "success", key: "exceptionDeleted" },
    });
    expect(from).toHaveBeenCalledWith("schedule_exceptions");
    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("master_id", masterId);
    expect(query.gte).toHaveBeenCalledWith("day", "2026-12-01");
    expect(query.lte).toHaveBeenCalledWith("day", "2026-12-03");
    expect(refresh).toHaveBeenCalled();
  });

  it("rejects a malformed date as unexpected", async () => {
    await expect(
      deleteException({}, form({ from: "x", to: "2026-12-03" })),
    ).resolves.toEqual(unexpected);
    expect(query.delete).not.toHaveBeenCalled();
  });

  it("shows the unexpected toast on a database error", async () => {
    query.lte.mockResolvedValue(failure("boom"));
    await expect(
      deleteException({}, form({ from: "2026-12-01", to: "2026-12-03" })),
    ).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateBookingParam", () => {
  it.each([
    ["step", "slot_step_minutes", "15"],
    ["notice", "min_notice_minutes", "0"],
    ["horizon", "horizon_days", "90"],
    ["deadline", "cancel_deadline_minutes", "1440"],
  ])("maps %s to %s", async (key, column, value) => {
    await expect(updateBookingParam({}, form({ key, value }))).resolves.toEqual(
      saved,
    );
    expect(from).toHaveBeenCalledWith("masters");
    expect(query.update).toHaveBeenCalledWith({ [column]: Number(value) });
    expect(query.eq).toHaveBeenCalledWith("id", masterId);
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["an unknown key", "speed", "15"],
    ["a negative value", "step", "-5"],
    ["a fractional value", "step", "1.5"],
    ["an empty value", "step", ""],
  ])("rejects %s as unexpected", async (_name, key, value) => {
    await expect(updateBookingParam({}, form({ key, value }))).resolves.toEqual(
      unexpected,
    );
    expect(query.update).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the unexpected toast on a database error", async () => {
    query.eq.mockResolvedValue(failure("boom"));
    await expect(
      updateBookingParam({}, form({ key: "step", value: "15" })),
    ).resolves.toEqual(unexpected);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("setAutoConfirm", () => {
  it.each([true, false])("saves auto-confirm %s", async (value) => {
    await expect(
      setAutoConfirm({}, form({ autoConfirm: String(value) })),
    ).resolves.toEqual(saved);
    expect(query.update).toHaveBeenCalledWith({ auto_confirm: value });
    expect(query.eq).toHaveBeenCalledWith("id", masterId);
  });

  it("rejects another value as unexpected", async () => {
    await expect(
      setAutoConfirm({}, form({ autoConfirm: "yes" })),
    ).resolves.toEqual(unexpected);
    expect(query.update).not.toHaveBeenCalled();
  });
});
