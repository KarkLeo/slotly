"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { SignOutForm } from "@/auth/sign-out-form";
import { buttonVariants } from "@/components/ui/button";
import { LocaleSwitcher } from "@/i18n/locale-switcher";
import type { Theme } from "@/theme/theme";
import { ThemeSwitcher } from "@/theme/theme-switcher";

export function AccountControls({
  theme,
  email,
}: {
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");

  return (
    <div className="flex flex-col items-start gap-4">
      <LocaleSwitcher />
      <ThemeSwitcher theme={theme} />
      <Link
        href="/app/bookings"
        className={buttonVariants({ variant: "outline" })}
      >
        {t("clientRole")}
      </Link>
      <div className="w-full">
        <SignOutForm />
      </div>
      {email && (
        <p className="w-full text-xs break-all text-muted-foreground">
          {email}
        </p>
      )}
    </div>
  );
}
