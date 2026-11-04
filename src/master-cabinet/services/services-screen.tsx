"use client";

import { ChevronRightIcon, ScissorsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useActionState, useState } from "react";
import { accent } from "@/components/accent";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import type { Theme } from "@/theme/theme";
import { useShownToastAction } from "@/toasts/use-shown-toast-action";
import { PageHeader } from "../page-header";
import { SettingsGroup } from "../settings/settings-row";
import { MetaText } from "../today/meta-text";
import {
  reorderServices,
  restoreService,
  type ServiceActionState,
} from "./actions";
import { CategoriesSheet } from "./categories-sheet";
import { OrderList } from "./order-list";
import { ServiceSheet } from "./service-sheet";
import type { ServiceGroupView, ServiceItem, ServicesView } from "./view";

const cardClass = "overflow-hidden rounded-xl bg-card";

export function ServicesScreen({
  view,
  theme,
  email,
}: {
  view: ServicesView;
  theme: Theme;
  email: string | null;
}) {
  const t = useTranslations("MasterCabinet");
  const [ordering, setOrdering] = useState(false);
  const empty = view.groups.length === 0 && view.archived.length === 0;
  const canOrder = view.groups.some((group) => group.services.length > 1);
  const showOrder = ordering && canOrder;

  return (
    <>
      <PageHeader title={t("sections.services")} back={{ theme, email }} />
      {empty ? (
        <div className="flex flex-col gap-2">
          <EmptyState
            icon={ScissorsIcon}
            title={t.rich("services.empty.title", { accent })}
            text={t("services.empty.text")}
            action={
              <ServiceSheet
                view={view}
                trigger={<Button className="mt-2">{t("services.add")}</Button>}
              />
            }
          />
          <CategoriesSheet
            view={view}
            trigger={
              <Button variant="outline" className="self-center">
                {t("services.categories.title")}
              </Button>
            }
          />
        </div>
      ) : showOrder ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            {t("services.order.hint")}
          </p>
          {view.groups.map((group) => (
            <GroupFrame
              key={group.id ?? "none"}
              group={group}
              hasCategories={view.categories.length > 0}
            >
              <OrderList
                items={group.services}
                save={reorderServices}
                className="px-4"
              >
                {(service) => (
                  <span className="block py-2 text-base font-medium wrap-anywhere">
                    {service.title}
                  </span>
                )}
              </OrderList>
            </GroupFrame>
          ))}
          <Button onClick={() => setOrdering(false)}>
            {t("services.order.done")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <ServiceSheet
              view={view}
              trigger={
                <Button className="basis-full sm:basis-auto">
                  {t("services.add")}
                </Button>
              }
            />
            <CategoriesSheet
              view={view}
              trigger={
                <Button variant="outline" className="flex-1 sm:flex-none">
                  {t("services.categories.title")}
                </Button>
              }
            />
            {canOrder && (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setOrdering(true)}
              >
                {t("services.order.open")}
              </Button>
            )}
          </div>
          {view.groups.map((group) => (
            <GroupFrame
              key={group.id ?? "none"}
              group={group}
              hasCategories={view.categories.length > 0}
            >
              <ul className="flex flex-col divide-y divide-border">
                {group.services.map((service) => (
                  <li key={service.id}>
                    <ServiceSheet
                      view={view}
                      service={service}
                      trigger={<ServiceRow service={service} />}
                    />
                  </li>
                ))}
              </ul>
            </GroupFrame>
          ))}
          {view.archived.length > 0 && (
            <SettingsGroup title={t("services.archive.title")}>
              {view.archived.map((service) => (
                <ArchivedRow key={service.id} service={service} />
              ))}
            </SettingsGroup>
          )}
        </div>
      )}
    </>
  );
}

// Without categories there is one plain list, and a heading above it would only repeat the page title.
function GroupFrame({
  group,
  hasCategories,
  children,
}: {
  group: ServiceGroupView;
  hasCategories: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("MasterCabinet.services");
  if (!hasCategories) return <div className={cardClass}>{children}</div>;
  return (
    <SettingsGroup title={group.title ?? t("noCategory")}>
      {children}
    </SettingsGroup>
  );
}

function ServiceMeta({ service }: { service: ServiceItem }) {
  const t = useTranslations("MasterCabinet.services");
  const price =
    service.amount === null
      ? t("form.priceKinds.none")
      : service.priceKind === "from"
        ? t("priceFrom", { price: service.amount })
        : service.amount;
  return (
    <MetaText
      parts={[
        service.duration,
        service.buffer && t("bufferMeta", { duration: service.buffer }),
        price,
        t(`formats.${service.format}`),
      ]}
    />
  );
}

function ServiceRow({
  service,
  ...props
}: ComponentProps<"button"> & { service: ServiceItem }) {
  return (
    <button
      type="button"
      className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-medium wrap-anywhere">
          {service.title}
        </span>
        <span className="text-sm text-muted-foreground">
          <ServiceMeta service={service} />
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}

function ArchivedRow({ service }: { service: ServiceItem }) {
  const t = useTranslations("MasterCabinet.services");
  const online = useOnline();
  const [, action, pending] = useActionState<ServiceActionState, FormData>(
    useShownToastAction(restoreService),
    {},
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-muted-foreground">
        <span className="text-base wrap-anywhere">{service.title}</span>
        <span className="text-sm">
          <ServiceMeta service={service} />
        </span>
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={service.id} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          aria-label={t("archive.restoreLabel", { name: service.title })}
          disabled={!online}
          loading={pending}
        >
          {t("archive.restore")}
        </Button>
      </form>
    </div>
  );
}
