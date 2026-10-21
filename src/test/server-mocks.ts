import { vi } from "vitest";

export const cookieSet = vi.fn();

export function redirectError(url: string) {
  return new Error(`redirect:${url}`);
}

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet, get: vi.fn(), getAll: () => [] }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: vi.fn((url: string) => {
    throw redirectError(url);
  }),
}));
