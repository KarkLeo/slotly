import type { AuthEmail } from "./auth-emails";

type TakeRateLimit = (
  bucket: string,
  maxHits: number,
  windowSeconds: number,
) => Promise<boolean>;

const hour = 3600;

// Auth emails anyone who asks, so a bot asking for many codes must not use up the email quota of everyone else.
// Returns the budget that refused, or null; the IP is checked first so a refused bot does not spend its victim's budget.
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
