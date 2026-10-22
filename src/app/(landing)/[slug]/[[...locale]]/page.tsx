import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { LandingPage } from "@/landing/landing-page";
import { getLanding } from "@/landing/load";
import { landingMetadata } from "@/landing/metadata";
import { resolveLandingLocale, resolveLandingSlug } from "@/landing/routing";
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
  if (!landing) notFound();
  const resolved = resolveLandingLocale(locale, landing);
  if (resolved.kind === "notFound") notFound();
  if (resolved.kind === "redirect")
    redirect(`/${landing.slug}${await query()}`);
  setRequestLocale(resolved.locale);
  return { landing, locale: resolved.locale };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { landing, locale } = await load(props);
  const t = await getTranslations({ locale, namespace: "Landing" });
  return {
    metadataBase: new URL(siteUrl()),
    ...landingMetadata(landing, locale, t),
  };
}

export default async function LandingRoute(props: Props) {
  const { landing, locale } = await load(props);
  const { service } = await props.searchParams;
  return (
    <LandingPage
      view={toLandingView(landing, locale)}
      initialServiceId={typeof service === "string" ? service : null}
    />
  );
}
