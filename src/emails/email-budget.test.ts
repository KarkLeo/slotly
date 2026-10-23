import { describe, expect, it, vi } from "vitest";
import type { AuthEmail } from "./auth-emails";
import { overEmailBudget } from "./email-budget";

function counter() {
  const hits = new Map<string, number>();
  const take = vi.fn(async (bucket: string, maxHits: number) => {
    const count = (hits.get(bucket) ?? 0) + 1;
    hits.set(bucket, count);
    return count <= maxHits;
  });
  return take;
}

function email(kind: "signIn" | "signUp", to = "anna@example.com"): AuthEmail {
  return { kind, to, locale: "uk", code: "123456", link: "https://x" };
}

async function sendMany(
  times: number,
  make: (i: number) => AuthEmail,
  ip: string | null,
  take: ReturnType<typeof counter>,
) {
  const results = [];
  for (let i = 0; i < times; i++)
    results.push((await overEmailBudget([make(i)], ip, take)) === null);
  return results;
}

describe("withinEmailBudget", () => {
  it("allows five emails an hour to one address", async () => {
    const take = counter();
    const results = await sendMany(
      6,
      () => email("signIn"),
      "203.0.113.5",
      take,
    );
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(take).toHaveBeenCalledWith("email:to:anna@example.com", 5, 3600);
  });

  it("counts the address regardless of case", async () => {
    const take = counter();
    await overEmailBudget([email("signIn", "Anna@Example.com")], null, take);
    expect(take).toHaveBeenCalledWith("email:to:anna@example.com", 5, 3600);
  });

  it("allows twenty emails an hour from one IP", async () => {
    const take = counter();
    const results = await sendMany(
      21,
      (i) => email("signIn", `user${i}@example.com`),
      "203.0.113.5",
      take,
    );
    expect(results.filter(Boolean)).toHaveLength(20);
    expect(results.at(-1)).toBe(false);
    expect(take).toHaveBeenCalledWith("email:ip:203.0.113.5", 20, 3600);
  });

  it("allows three new users without a booking an hour from one IP", async () => {
    const take = counter();
    const results = await sendMany(
      4,
      (i) => email("signUp", `new${i}@example.com`),
      "203.0.113.5",
      take,
    );
    expect(results).toEqual([true, true, true, false]);
    expect(take).toHaveBeenCalledWith("email:signup:203.0.113.5", 3, 3600);
  });

  it("does not spend the new user budget on sign-ins", async () => {
    const take = counter();
    await overEmailBudget([email("signIn")], "203.0.113.5", take);
    expect(take).not.toHaveBeenCalledWith(
      "email:signup:203.0.113.5",
      expect.anything(),
      expect.anything(),
    );
  });

  it("names the budget that refused", async () => {
    const take = vi.fn(
      async (bucket: string) => !bucket.startsWith("email:ip:"),
    );
    await expect(
      overEmailBudget([email("signIn")], "203.0.113.5", take),
    ).resolves.toBe("email:ip");
  });

  it("does not spend the address budget once the IP is over its own", async () => {
    const take = vi.fn(
      async (bucket: string) => !bucket.startsWith("email:ip:"),
    );
    await overEmailBudget([email("signIn")], "203.0.113.5", take);
    expect(take).not.toHaveBeenCalledWith(
      "email:to:anna@example.com",
      expect.anything(),
      expect.anything(),
    );
  });

  it("counts only the address without an IP", async () => {
    const take = counter();
    await overEmailBudget([email("signUp")], null, take);
    expect(take.mock.calls.map(([bucket]) => bucket)).toEqual([
      "email:to:anna@example.com",
    ]);
  });
});
