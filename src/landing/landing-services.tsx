"use client";

import { useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { accent } from "@/components/accent";
import { BookingFlow } from "./booking-flow";
import { Price } from "./text";
import type { LandingView, ServiceView } from "./view";

// The services list and the booking picker share one selection, mirrored in ?service= so a link can preselect it.
export function LandingServices({
  groups,
  services,
  timeZone,
  horizonDays,
  initialServiceId,
}: Pick<LandingView, "groups" | "services" | "timeZone" | "horizonDays"> & {
  initialServiceId: string | null;
}) {
  const t = useTranslations("Landing");
  const [selected, setSelected] = useState(
    services.some((service) => service.id === initialServiceId)
      ? initialServiceId
      : null,
  );

  function select(id: string) {
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set("service", id);
    window.history.replaceState(null, "", url);
  }

  function book(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    select(id);
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  const selectedService =
    services.find((service) => service.id === selected) ?? null;
  const showGroupTitles = groups.length > 1 || groups[0]?.title !== null;

  return (
    <>
      <section aria-labelledby="services-title" className="flex flex-col gap-6">
        <h2
          id="services-title"
          className="text-2xl font-extrabold tracking-[-0.03em]"
        >
          {t.rich("servicesTitle", { accent })}
        </h2>
        {groups.map((group) => (
          <div key={group.id ?? "other"} className="flex flex-col gap-3">
            {showGroupTitles && (
              <h3 className="text-lg font-bold">
                {group.title ?? t("otherServices")}
              </h3>
            )}
            <ul className="flex flex-col divide-y divide-border">
              {group.services.map((service) => (
                <ServiceItem
                  key={service.id}
                  service={service}
                  onBook={(event) => book(event, service.id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section
        id="booking"
        aria-labelledby="booking-title"
        className="flex scroll-mt-4 flex-col gap-3"
      >
        <h2
          id="booking-title"
          className="text-2xl font-extrabold tracking-[-0.03em]"
        >
          {t.rich("bookingTitle", { accent })}
        </h2>
        <fieldset
          aria-labelledby="booking-title"
          className="flex flex-col gap-2"
        >
          {services.map((service) => (
            <label
              key={service.id}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-card has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background"
            >
              <input
                type="radio"
                name="service"
                value={service.id}
                checked={service.id === selected}
                onChange={() => select(service.id)}
                className="sr-only"
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{service.name}</span>
                <span className="text-sm text-muted-foreground">
                  {service.duration}
                </span>
              </span>
              <span className="shrink-0 font-semibold">
                <Price price={service.price} />
              </span>
            </label>
          ))}
        </fieldset>
        {selectedService && (
          <BookingFlow
            key={selectedService.id}
            service={selectedService}
            timeZone={timeZone}
            horizonDays={horizonDays}
          />
        )}
      </section>
    </>
  );
}

function ServiceItem({
  service,
  onBook,
}: {
  service: ServiceView;
  onBook: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = useTranslations("Landing");

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{service.name}</span>
        <span className="shrink-0 font-semibold">
          <Price price={service.price} />
        </span>
      </div>
      {service.description && (
        <p className="text-sm text-muted-foreground">{service.description}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {service.duration}
          {service.format !== "on_site" && (
            <Badge variant="accent">
              {service.format === "online" ? t("online") : t("atClient")}
            </Badge>
          )}
        </span>
        <a
          href={`?service=${service.id}#booking`}
          onClick={onBook}
          aria-label={t("bookService", { service: service.name })}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("book")}
        </a>
      </div>
    </li>
  );
}
