import { getLocale } from "next-intl/server";
import { loadSchedule } from "@/master-cabinet/schedule/load";
import { ScheduleScreen } from "@/master-cabinet/schedule/schedule-screen";
import { toScheduleView } from "@/master-cabinet/schedule/view";
import { requireMaster } from "@/master-cabinet/session";
import { getTheme } from "@/theme/server";

export default async function Page() {
  const user = await requireMaster();
  const now = new Date();
  const [theme, locale, data] = await Promise.all([
    getTheme(),
    getLocale(),
    loadSchedule(user.id, now),
  ]);

  return (
    <ScheduleScreen
      view={toScheduleView(data, locale, now)}
      theme={theme}
      email={user.email}
    />
  );
}
