import { getLocale } from "next-intl/server";
import { RefreshOnVisible } from "@/lib/refresh-on-visible";
import { loadToday } from "@/master-cabinet/today/load";
import { requireMaster } from "@/master-cabinet/session";
import { TodayScreen } from "@/master-cabinet/today/today-screen";
import { toTodayView } from "@/master-cabinet/today/view";

export default async function Page() {
  const user = await requireMaster();
  const now = new Date();
  const [locale, data] = await Promise.all([
    getLocale(),
    loadToday(user.id, now),
  ]);

  return (
    <>
      <RefreshOnVisible />
      <TodayScreen view={toTodayView(data, locale, now)} />
    </>
  );
}
