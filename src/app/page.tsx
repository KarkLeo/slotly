import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/i18n/locale-switcher";
import { getTheme } from "@/theme/server";
import { ThemeSwitcher } from "@/theme/theme-switcher";

export default async function Home() {
  const [t, theme] = await Promise.all([getTranslations("Home"), getTheme()]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight">Slotly</h1>
      <p className="max-w-md text-lg text-muted-foreground">{t("tagline")}</p>
      <LocaleSwitcher />
      <ThemeSwitcher theme={theme} />
    </main>
  );
}
