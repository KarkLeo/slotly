"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Theme } from "@/theme/theme";
import { AccountControls } from "./account-controls";
import { activeSection, sections } from "./sections";

export function Sidebar({
  theme,
  email,
}: {
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");
  const active = activeSection(usePathname());

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r px-3 py-5 lg:flex">
      <span className="px-3 text-xl font-extrabold tracking-[-0.03em]">
        Slotly
      </span>
      <nav aria-label={t("navigation")}>
        <ul className="flex flex-col gap-1">
          {sections.map(({ key, href, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={active === key ? "page" : undefined}
                className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-[15px] text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:font-bold aria-[current=page]:text-foreground"
              >
                <Icon aria-hidden className="size-5" />
                {t(`sections.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto border-t px-3 pt-4">
        <AccountControls theme={theme} email={email} />
      </div>
    </aside>
  );
}
