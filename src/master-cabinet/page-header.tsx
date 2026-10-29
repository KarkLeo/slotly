"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/theme/theme";
import { MoreSheet } from "./more-sheet";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { theme: Theme; email: string | null };
}) {
  const t = useTranslations("MasterCabinet");

  return (
    <header className="flex items-start gap-2 pb-4">
      {back && (
        <div className="-ml-2 lg:hidden">
          <MoreSheet
            theme={back.theme}
            email={back.email}
            trigger={
              <Button variant="ghost" size="icon" aria-label={t("back")}>
                <ArrowLeftIcon aria-hidden className="size-5" />
              </Button>
            }
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="hidden items-center gap-2 lg:flex">{actions}</div>
      )}
    </header>
  );
}
