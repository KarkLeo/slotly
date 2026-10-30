"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactElement } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Theme } from "@/theme/theme";
import { AccountControls } from "./account-controls";
import { activeSection, sections } from "./sections";

const moreSections = sections.filter((s) => s.place === "more");

export function MoreSheet({
  theme,
  email,
  trigger,
}: {
  theme: Theme;
  email: string | null;
  trigger: ReactElement;
}) {
  const t = useTranslations("MasterCabinet");
  const active = activeSection(usePathname());
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="text-lg font-extrabold">
            {t("more")}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4 pb-2">
          <ul className="flex flex-col gap-1">
            {moreSections.map(({ key, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active === key ? "page" : undefined}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:font-bold"
                >
                  <Icon aria-hidden className="size-5 text-muted-foreground" />
                  {t(`sections.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t pt-4">
            <AccountControls theme={theme} email={email} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
