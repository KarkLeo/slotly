import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/locales";
import { LandingPage } from "@/landing/landing-page";
import { LandingUnavailable } from "@/landing/landing-unavailable";
import { findLandingSlug, getLanding } from "@/landing/load";
import { landingMetadata } from "@/landing/metadata";
import {
  resolveLandingLocale,
  pathLocale,
  resolveLandingSlug,
  retiredSlugPath,
} from "@/landing/routing";
import { toLandingView } from "@/landing/view";
import { siteUrl } from "@/lib/site-url";

type Props = PageProps<"/[slug]/[[...locale]]">;

async function load({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const query = async () => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      for (const item of [value ?? []].flat()) search.append(key, item);
    }
    return search.size > 0 ? `?${search}` : "";
  };

  const bySlug = resolveLandingSlug(slug);
  if (bySlug.kind === "notFound") notFound();
  if (bySlug.kind === "redirect") {
    redirect(`/${[bySlug.slug, ...(locale ?? [])].join("/")}${await query()}`);
  }

  const landing = await getLanding(slug);
  if (!landing) {
    const current = await findLandingSlug(slug);
    if (current === null) notFound();
    if (current !== slug) {
      permanentRedirect(retiredSlugPath(current, locale, await query()));
    }
    const fromPath = pathLocale(locale);
    if (locale && !fromPath) notFound();
    const requested = fromPath ?? (await getLocale());
    const unavailableLocale: Locale = isLocale(requested) ? requested : "uk";
    setRequestLocale(unavailableLocale);
    return { kind: "unavailable" as const, locale: unavailableLocale };
  }
  const resolved = resolveLandingLocale(locale, landing);
  if (resolved.kind === "notFound") notFound();
  if (resolved.kind === "redirect")
    redirect(`/${landing.slug}${await query()}`);
  setRequestLocale(resolved.locale);
  return { kind: "landing" as const, landing, locale: resolved.locale };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const loaded = await load(props);
  const t = await getTranslations({
    locale: loaded.locale,
    namespace: "Landing",
  });
  if (loaded.kind === "unavailable") {
    return { title: t("unavailableTitle"), robots: { index: false } };
  }
  const { landing, locale } = loaded;
  return {
    metadataBase: new URL(siteUrl()),
    ...landingMetadata(landing, locale, t),
  };
}

export default async function LandingRoute(props: Props) {
  const loaded = await load(props);
  if (loaded.kind === "unavailable") return <LandingUnavailable />;
  const { landing, locale } = loaded;
  const { service } = await props.searchParams;
  return (
    <LandingPage
      view={toLandingView(landing, locale)}
      initialServiceId={typeof service === "string" ? service : null}
    />
  );
}
