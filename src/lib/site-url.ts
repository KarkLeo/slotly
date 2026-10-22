export function siteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value) throw new Error("Missing environment variable SITE_URL");
  return value.replace(/\/$/, "");
}
