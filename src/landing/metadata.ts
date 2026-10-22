import type { Metadata } from "next";
import type { Locale } from "@/i18n/locales";
import type { Landing } from "./landing";
import { landingPath } from "./routing";
import { toLandingView } from "./view";

type Translate = (
  key: "metaTitle" | "metaDescription" | "metaDescriptionPlain",
  values: Record<string, string>,
) => string;

export function landingMetadata(
  landing: Landing,
  locale: Locale,
  t: Translate,
): Metadata {
  const view = toLandingView(landing, locale);
  const path = (code: Locale) =>
    landingPath(landing.slug, code, landing.primaryLocale);

  return {
    title: t("metaTitle", { name: view.name }),
    description:
      view.specialties.length > 0
        ? t("metaDescription", {
            name: view.name,
            specialties: view.specialties.join(", "),
          })
        : t("metaDescriptionPlain", { name: view.name }),
    alternates: {
      canonical: path(locale),
      languages: {
        ...Object.fromEntries(
          landing.locales.map((code) => [code, path(code)]),
        ),
        "x-default": path(landing.primaryLocale),
      },
    },
    robots: landing.published ? undefined : { index: false, follow: false },
  };
}
