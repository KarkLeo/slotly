import { cn } from "cn";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, setRequestLocale } from "next-intl/server";
import { getLanding } from "@/landing/load";
import { resolveLandingLocale } from "@/landing/routing";
import { fontVariables } from "../../../fonts";
import "../../../globals.css";

export const metadata: Metadata = { title: "Slotly" };

export const viewport: Viewport = { viewportFit: "cover" };

// A landing is its own document: its language is the content's, and it has no platform theme or toasts.
export default async function LandingLayout({
  children,
  params,
}: LayoutProps<"/[slug]/[[...locale]]">) {
  const { slug, locale } = await params;
  const landing = await getLanding(slug);
  const resolved = landing && resolveLandingLocale(locale, landing);
  if (resolved?.kind === "page") setRequestLocale(resolved.locale);
  const lang = await getLocale();

  return (
    <html
      lang={lang}
      className={cn(fontVariables, "h-full scroll-pb-24 antialiased")}
    >
      <body className="flex min-h-full flex-col bg-background">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
