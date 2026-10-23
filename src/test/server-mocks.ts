import { vi } from "vitest";

export const cookieSet = vi.fn();
export const cookieGet = vi.fn();
export const requestHeaders = new Headers();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet, get: cookieGet, getAll: () => [] }),
  headers: async () => requestHeaders,
}));
