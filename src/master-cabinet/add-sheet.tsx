"use client";

import { CalendarPlusIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import {
  Sheet,
  SheetBody,
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
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="text-lg font-extrabold">
            {t("add.title")}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-1 pb-2">
          <Link
            href={newBookingHref}
            onClick={() => setOpen(false)}
            className={linkClass}
          >
            <CalendarPlusIcon
              aria-hidden
              className="size-5 text-muted-foreground"
            />
            {t("add.booking")}
          </Link>
          <Link
            href={newBlockHref}
            onClick={() => setOpen(false)}
            className={linkClass}
          >
            <LockIcon aria-hidden className="size-5 text-muted-foreground" />
            {t("add.block")}
          </Link>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
