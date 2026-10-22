"use client";

import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({ retry }: { retry: () => void }) {
  const t = useTranslations("Errors");

  return (
    <ErrorScreen
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      onRetry={retry}
    />
  );
}
