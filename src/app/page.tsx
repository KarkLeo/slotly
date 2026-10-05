import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/i18n/locale-switcher";

export default async function Home() {
  const t = await getTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Slotly</h1>
      <p className="max-w-md text-lg">{t("tagline")}</p>
      <LocaleSwitcher />
    </main>
  );
}
