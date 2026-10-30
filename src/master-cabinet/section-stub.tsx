"use client";

import { CalendarPlusIcon, LockIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { accent } from "@/components/accent";
import { EmptyState } from "@/components/empty-state";
import type { Theme } from "@/theme/theme";
import { AddActions, PageHeader } from "./page-header";
import { sections, type SectionKey } from "./sections";

type StubKey = Exclude<SectionKey, "today"> | "newBooking" | "newBlock";

export function SectionStub({
  section,
  theme,
  email,
}: {
  section: StubKey;
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");
  const found = sections.find((s) => s.key === section);
  const Icon: LucideIcon =
    found?.icon ?? (section === "newBlock" ? LockIcon : CalendarPlusIcon);
  const title = found
    ? t(`sections.${found.key}`)
    : t(section === "newBlock" ? "add.block" : "add.booking");
  const hasActions = section === "calendar";

  return (
    <>
      <PageHeader
        title={title}
        back={found?.place === "more" ? { theme, email } : undefined}
        actions={hasActions && <AddActions />}
      />
      <EmptyState
        icon={Icon}
        title={t.rich(`stub.${section}.title`, { accent })}
        text={t(`stub.${section}.text`)}
      />
    </>
  );
}
