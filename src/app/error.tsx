"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      onRetry={retry}
    />
  );
}
