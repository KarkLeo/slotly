import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth/session";
import { SignOutForm } from "@/auth/sign-out-form";
import { isMaster } from "@/client-cabinet/load";
import { buttonVariants } from "@/components/ui/button";

export default async function CabinetPage() {
  const user = await requireUser();
  // Until the master cabinet exists, only masters have anything here besides their own bookings.
  if (!(await isMaster(user.id))) redirect("/app/bookings");
  const t = await getTranslations("Cabinet");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">
        {t("signedInAs", { email: user.email ?? "" })}
      </p>
      <Link
        href="/app/bookings"
        className={buttonVariants({ variant: "outline" })}
      >
        {t("myBookings")}
      </Link>
      <SignOutForm />
    </main>
  );
}
