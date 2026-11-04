import { getLocale } from "next-intl/server";
import { loadServices } from "@/master-cabinet/services/load";
import { ServicesScreen } from "@/master-cabinet/services/services-screen";
import { toServicesView } from "@/master-cabinet/services/view";
import { requireMaster } from "@/master-cabinet/session";
import { getTheme } from "@/theme/server";

export default async function Page() {
  const user = await requireMaster();
  const [theme, locale, data] = await Promise.all([
    getTheme(),
    getLocale(),
    loadServices(user.id),
  ]);

  return (
    <ServicesScreen
      view={toServicesView(data, locale)}
      theme={theme}
      email={user.email}
    />
  );
}
