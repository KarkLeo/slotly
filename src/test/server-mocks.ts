import { vi } from "vitest";

export const cookieSet = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet, get: vi.fn(), getAll: () => [] }),
}));
