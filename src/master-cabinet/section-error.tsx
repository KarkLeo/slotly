"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function SectionError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("Errors");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Button className="w-full" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
