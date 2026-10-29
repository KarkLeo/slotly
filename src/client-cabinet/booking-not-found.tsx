import { useTranslations } from "next-intl";
import Link from "next/link";
import { accent } from "@/components/accent";
import { buttonVariants } from "@/components/ui/button";

export function BookingNotFound() {
  const t = useTranslations("MyBookings");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
        {t.rich("notFoundTitle", { accent })}
      </h1>
      <p className="text-muted-foreground">{t("notFoundText")}</p>
      <Link href="/app/bookings" className={buttonVariants()}>
        {t("toList")}
      </Link>
    </main>
  );
}
