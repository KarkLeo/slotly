import type { AuthEmail } from "./auth-emails";

type TakeRateLimit = (
  bucket: string,
  maxHits: number,
  windowSeconds: number,
) => Promise<boolean>;

const hour = 3600;

// Auth emails anyone who asks, so a bot asking for many codes must not use up the email quota of everyone else.
export async function withinEmailBudget(
  emails: AuthEmail[],
  ip: string | null,
  take: TakeRateLimit,
): Promise<boolean> {
  for (const email of emails) {
    if (!(await take(`email:to:${email.to.toLowerCase()}`, 5, hour)))
      return false;
    if (!ip) continue;
    if (!(await take(`email:ip:${ip}`, 20, hour))) return false;
    if (email.kind === "signUp" && !(await take(`email:signup:${ip}`, 3, hour)))
      return false;
  }
  return true;
}
