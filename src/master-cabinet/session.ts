import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireUser, type CurrentUser } from "@/auth/session";
import { isMaster } from "@/client-cabinet/load";

export const requireMaster = cache(async (): Promise<CurrentUser> => {
  const user = await requireUser();
  if (!(await isMaster(user.id))) redirect("/app/bookings");
  return user;
});
