import "server-only";
import { redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "@/auth/session";
import { isMaster } from "@/client-cabinet/load";

export async function requireMaster(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(await isMaster(user.id))) redirect("/app/bookings");
  return user;
}
