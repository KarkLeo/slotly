"use client";

import { EllipsisIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Theme } from "@/theme/theme";
import { AddSheet } from "./add-sheet";
import { MoreSheet } from "./more-sheet";
import { activeSection, isMoreActive, sections } from "./sections";

export const bottomBarSpace =
  "pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0";

const itemClass =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:font-bold aria-[current=page]:text-foreground data-active:font-bold data-active:text-foreground";

const barSections = sections.filter((s) => s.place === "bar");

export function BottomBar({
  theme,
  email,
}: {
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");
  const pathname = usePathname();
  const active = activeSection(pathname);
  const [first, second, third] = barSections;

  function barLink({ key, href, icon: Icon }: (typeof sections)[number]) {
    return (
      <Link
        key={key}
        href={href}
        aria-current={active === key ? "page" : undefined}
        className={itemClass}
      >
        <Icon aria-hidden className="size-5" />
        {t(`sections.${key}`)}
      </Link>
    );
  }

  return (
    <nav
      aria-label={t("navigation")}
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex h-16 items-center rounded-3xl bg-card px-1 shadow-lg lg:hidden"
    >
      {barLink(first)}
      {barLink(second)}
      <div className="flex flex-1 items-center justify-center">
        <AddSheet
          trigger={
            <button
              type="button"
              aria-label={t("add.title")}
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <PlusIcon aria-hidden className="size-6" />
            </button>
          }
        />
      </div>
      {barLink(third)}
      <MoreSheet
        theme={theme}
        email={email}
        trigger={
          <button
            type="button"
            data-active={isMoreActive(pathname) ? "" : undefined}
            className={itemClass}
          >
            <EllipsisIcon aria-hidden className="size-5" />
            {t("more")}
          </button>
        }
      />
    </nav>
  );
}
