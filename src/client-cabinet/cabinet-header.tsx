"use client";

import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { SignOutForm } from "@/auth/sign-out-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/i18n/locale-switcher";
import type { Theme } from "@/theme/theme";
import { ThemeSwitcher } from "@/theme/theme-switcher";

export function CabinetHeader({ theme }: { theme: Theme }) {
  const t = useTranslations("MyBookings");

  return (
    <header className="flex min-h-14 items-center justify-between py-2 pr-2 pl-4">
      <Link
        href="/app/bookings"
        aria-label={t("home")}
        className="rounded-lg text-xl font-extrabold tracking-[-0.03em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Slotly
      </Link>
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" aria-label={t("menu")} />}
        >
          <MenuIcon aria-hidden className="size-5" />
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle className="text-lg font-extrabold">
              {t("menu")}
            </SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col items-start gap-4">
            <LocaleSwitcher />
            <ThemeSwitcher theme={theme} />
            <SignOutForm />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </header>
  );
}
