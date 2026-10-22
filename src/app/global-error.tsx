"use client";

import { cn } from "cn";
import { useSyncExternalStore } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { errorTexts } from "@/i18n/error-texts";
import { browserLocale, defaultLocale } from "@/i18n/locales";
import { browserTheme, type Theme, themeClass } from "@/theme/theme";
import { fontVariables } from "./fonts";
import "./globals.css";

function subscribe() {
  return () => {};
}

// Replaces the root layout, so the locale and theme come from the browser instead of the server.
export default function GlobalError({ retry }: { retry: () => void }) {
  const locale = useSyncExternalStore(
    subscribe,
    () => browserLocale(document.cookie, navigator.languages),
    () => defaultLocale,
  );
  const theme = useSyncExternalStore(
    subscribe,
    () => browserTheme(document.cookie),
    (): Theme => "system",
  );
  const t = errorTexts(locale);

  return (
    <html
      lang={locale}
      className={cn(fontVariables, "h-full antialiased", themeClass(theme))}
    >
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
