import type { AuthEmail } from "./auth-emails";

type TakeRateLimit = (
  bucket: string,
  maxHits: number,
  windowSeconds: number,
) => Promise<boolean>;

const hour = 3600;

// Returns the budget that refused, or null; the IP goes first so a bot over its budget does not spend its victim's.
export async function overEmailBudget(
  emails: AuthEmail[],
  ip: string | null,
  take: TakeRateLimit,
): Promise<string | null> {
  for (const email of emails) {
    if (ip && !(await take(`email:ip:${ip}`, 20, hour))) return "email:ip";
    if (
      ip &&
      email.kind === "signUp" &&
      !(await take(`email:signup:${ip}`, 3, hour))
    )
      return "email:signup";
    if (!(await take(`email:to:${email.to.toLowerCase()}`, 5, hour)))
      return "email:to";
  }
  return null;
}
