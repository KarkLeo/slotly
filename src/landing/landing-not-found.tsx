import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { accent } from "./text";

export function LandingNotFound() {
  const t = useTranslations("Landing");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 bg-background px-4 py-16 text-center text-foreground">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
        {t.rich("notFoundTitle", { accent })}
      </h1>
      <p className="max-w-sm text-muted-foreground">{t("notFoundText")}</p>
      <Link
        href="/"
        prefetch={false}
        className={buttonVariants({ variant: "outline" })}
      >
        {t("notFoundHome")}
      </Link>
    </main>
  );
}
