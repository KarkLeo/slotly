import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FlashToast } from "@/toasts/flash-toast";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slotly",
  description: "Booking pages for independent professionals",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" />
          <Suspense>
            <FlashToast />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
