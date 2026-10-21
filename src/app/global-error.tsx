"use client";

import { useEffect, useSyncExternalStore } from "react";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { ErrorScreen } from "@/components/error-screen";
import { browserLocale, defaultLocale } from "@/i18n/locales";
import { fontVariables } from "./fonts";
import "./globals.css";

const errors = { uk: uk.Errors, ru: ru.Errors, en: en.Errors };

function subscribe() {
  return () => {};
}

// Replaces the root layout, so the locale comes from the browser instead of next-intl.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const locale = useSyncExternalStore(
    subscribe,
    () => browserLocale(document.cookie, navigator.languages),
    () => defaultLocale,
  );
  const t = errors[locale];

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>{t.title}</title>
        <ErrorScreen
          title={t.title}
          description={t.description}
          retryLabel={t.retry}
          onRetry={retry}
        />
      </body>
    </html>
  );
}
