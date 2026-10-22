import { cn } from "cn";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getTheme } from "@/theme/server";
import { themeClass } from "@/theme/theme";
import { FlashToast } from "@/toasts/flash-toast";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slotly",
  description: "Booking pages for independent professionals",
};

// Lets env(safe-area-inset-*) report the iPhone notch and home indicator.
export const viewport: Viewport = { viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);

  return (
    <html
      lang={locale}
      className={cn(fontVariables, "h-full antialiased", themeClass(theme))}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" theme={theme} />
          <Suspense>
            <FlashToast />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
