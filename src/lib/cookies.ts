export function readCookie(cookies: string, name: string): string | undefined {
  return cookies
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
