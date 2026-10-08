export function redirectHost(redirectUri: string): string {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return redirectUri;
  }
  if (url.protocol === "http:" || url.protocol === "https:") return url.host;
  return `${url.protocol}//${url.host}`;
}
