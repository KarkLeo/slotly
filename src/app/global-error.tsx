"use client";

import { useSyncExternalStore } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { errorTexts } from "@/i18n/error-texts";
import { browserLocale, defaultLocale } from "@/i18n/locales";
import { fontVariables } from "./fonts";
import "./globals.css";

function subscribe() {
  return () => {};
}

// Replaces the root layout, so the locale comes from the browser instead of next-intl.
export default function GlobalError({ retry }: { retry: () => void }) {
  const locale = useSyncExternalStore(
    subscribe,
    () => browserLocale(document.cookie, navigator.languages),
    () => defaultLocale,
  );
  const t = errorTexts(locale);

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
