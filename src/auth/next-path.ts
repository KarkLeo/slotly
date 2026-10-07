export const defaultNextPath = "/app";

export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return defaultNextPath;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return defaultNextPath;
  return value;
}

export function isAppPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}
