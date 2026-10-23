import { useTranslations } from "next-intl";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { LandingServices } from "./landing-services";
import type { LandingView } from "./view";

export function LandingPage({
  view,
  initialServiceId,
}: {
  view: LandingView;
  initialServiceId: string | null;
}) {
  const t = useTranslations("Landing");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col bg-background text-foreground">
      {!view.published && (
        <p
          role="status"
          className="bg-accent px-4 py-2 text-center text-sm text-accent-foreground"
        >
          {t("unpublished")}
        </p>
      )}
      <header className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar aria-hidden>
            <AvatarFallback>{view.initials}</AvatarFallback>
          </Avatar>
          <span className="truncate font-bold">{view.name}</span>
        </div>
        {view.languages.length > 0 && (
          <nav aria-label={t("languages")} className="flex shrink-0 gap-1">
            {view.languages.map((language) => (
              <a
                key={language.locale}
                href={language.href}
                hrefLang={language.locale}
                lang={language.locale}
                aria-label={language.name}
                aria-current={language.current ? "page" : undefined}
                className="flex size-11 items-center justify-center rounded-lg text-sm font-semibold text-muted-foreground uppercase hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
              >
                {language.locale}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex flex-col gap-10 px-4 pt-4 pb-8">
        <section className="flex flex-col items-start gap-3">
          <h1 className="text-4xl font-extrabold tracking-[-0.03em] break-words">
            {view.name}
          </h1>
          {view.specialties.length > 0 && (
            <p className="text-lg text-muted-foreground">
              {view.specialties.join(" · ")}
            </p>
          )}
          {view.services.length > 0 && (
            <a href="#booking" className={buttonVariants({ size: "lg" })}>
              {t("book")}
            </a>
          )}
        </section>

        {view.services.length > 0 ? (
          <LandingServices
            groups={view.groups}
            services={view.services}
            timeZone={view.timeZone}
            horizonDays={view.horizonDays}
            cancelDeadlineMinutes={view.cancelDeadlineMinutes}
            initialServiceId={initialServiceId}
          />
        ) : (
          <p className="text-muted-foreground">{t("noServices")}</p>
        )}
      </main>

      <footer className="mt-auto px-4 pt-8 pb-6 text-center text-xs text-muted-foreground">
        {t.rich("madeWith", {
          link: (chunks) => (
            <Link
              href="/"
              prefetch={false}
              className="underline underline-offset-2"
            >
              {chunks}
            </Link>
          ),
        })}
      </footer>
    </div>
  );
}
