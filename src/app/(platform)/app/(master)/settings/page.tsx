import { getLocale } from "next-intl/server";
import { siteUrl } from "@/lib/site-url";
import { requireMaster } from "@/master-cabinet/session";
import { loadSettings } from "@/master-cabinet/settings/load";
import { SettingsScreen } from "@/master-cabinet/settings/settings-screen";
import { timeZoneOptions } from "@/master-cabinet/settings/time-zones";
import { toSettingsView } from "@/master-cabinet/settings/view";
import { getTheme } from "@/theme/server";

export default async function Page() {
  const user = await requireMaster();
  const now = new Date();
  const [theme, locale, data] = await Promise.all([
    getTheme(),
    getLocale(),
    loadSettings(user.id),
  ]);

  return (
    <SettingsScreen
      view={toSettingsView(data, locale, now)}
      timeZones={timeZoneOptions(locale, now, [data.timeZone])}
      siteHost={new URL(siteUrl()).host}
      theme={theme}
      email={user.email}
    />
  );
}
