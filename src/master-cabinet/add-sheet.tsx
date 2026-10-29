"use client";

import { CalendarPlusIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactElement } from "react";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { newBlockHref, newBookingHref } from "./sections";

const linkClass =
  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

export function AddSheet({ trigger }: { trigger: ReactElement }) {
  const t = useTranslations("MasterCabinet");

  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="text-lg font-extrabold">
            {t("add.title")}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-1 pb-2">
          <SheetClose
            render={<Link href={newBookingHref} className={linkClass} />}
          >
            <CalendarPlusIcon
              aria-hidden
              className="size-5 text-muted-foreground"
            />
            {t("add.booking")}
          </SheetClose>
          <SheetClose
            render={<Link href={newBlockHref} className={linkClass} />}
          >
            <LockIcon aria-hidden className="size-5 text-muted-foreground" />
            {t("add.block")}
          </SheetClose>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
