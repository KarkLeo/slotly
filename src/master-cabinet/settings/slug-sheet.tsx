"use client";

import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetBody } from "@/components/ui/sheet";
import { isValidSlug } from "@/domain/slugs";
import { useOnline } from "@/lib/use-online";
import {
  changeSlug,
  checkSlug,
  type SettingsActionState,
  type SettingsFieldError,
  type SlugCheck,
} from "./actions";
import { SettingsRow } from "./settings-row";
import {
  SettingsFooter,
  SettingsSheet,
  useSettingsAction,
} from "./settings-sheet";
import type { SettingsView } from "./view";

type SlugStatus = SlugCheck | "checking" | "failed";

type SlugFormState = SettingsActionState & { slug?: string };

const checkDelay = 400;
const changeInterval = 30 * 24 * 60 * 60 * 1000;

// Remembers which slug the field error belongs to, so editing the field clears it.
async function changeSlugFor(
  state: SlugFormState,
  formData: FormData,
): Promise<SlugFormState> {
  const slug = String(formData.get("slug"));
  return { ...(await changeSlug(state, formData)), slug };
}

const fieldErrorKey = {
  nameInvalid: "invalid",
  slugInvalid: "invalid",
  slugTaken: "taken",
  slugLocked: "locked",
} as const satisfies Record<SettingsFieldError, string>;

export function SlugSheet({
  view,
  siteHost,
}: {
  view: SettingsView;
  siteHost: string;
}) {
  const t = useTranslations("MasterCabinet.settings.slug");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={t("label")}
      trigger={<SettingsRow label={t("label")} value={`/${view.slug}`} />}
      open={open}
      onOpenChange={setOpen}
    >
      <SlugForm view={view} siteHost={siteHost} onSaved={close} />
    </SettingsSheet>
  );
}

function SlugForm({
  view,
  siteHost,
  onSaved,
}: {
  view: SettingsView;
  siteHost: string;
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.settings.slug");
  const format = useFormatter();
  const now = useNow();
  const online = useOnline();
  const statusId = useId();
  const hintId = useId();
  const [slug, setSlug] = useState(view.slug);
  const [check, setCheck] = useState<{ slug: string; status: SlugStatus }>({
    slug: view.slug,
    status: "current",
  });
  const [state, action, pending] = useSettingsAction<SlugFormState>(
    changeSlugFor,
    onSaved,
    {},
  );
  const locked = view.slugLock !== null;

  useEffect(() => {
    if (slug === view.slug || !isValidSlug(slug)) return;
    let latest = true;
    const timer = setTimeout(() => {
      checkSlug(slug).then(
        (status) => {
          if (latest) setCheck({ slug, status });
        },
        () => {
          if (latest) setCheck({ slug, status: "failed" });
        },
      );
    }, checkDelay);
    return () => {
      latest = false;
      clearTimeout(timer);
    };
  }, [slug, view.slug]);

  const fieldError =
    state.fieldError && state.slug === slug ? state.fieldError : null;
  const status: SlugStatus =
    slug === view.slug
      ? "current"
      : !isValidSlug(slug)
        ? "invalid"
        : check.slug === slug
          ? check.status
          : "checking";
  const error = fieldError
    ? fieldErrorKey[fieldError]
    : status === "taken" || status === "invalid"
      ? status
      : null;
  const hint = view.slugLock
    ? view.slugLock.lastChangeDate
      ? t("lockedUntilLast", {
          date: view.slugLock.date,
          last: view.slugLock.lastChangeDate,
          count: view.changesLeft ?? 0,
        })
      : t("lockedUntil", {
          date: view.slugLock.date,
          count: view.changesLeft ?? 0,
        })
    : view.changesLeft !== null
      ? t("keep", {
          left: Math.max(0, view.changesLeft - 1),
          date: format.dateTime(new Date(now.getTime() + changeInterval), {
            timeZone: view.timeZone.id,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        })
      : null;

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody className="flex flex-col gap-2">
        <div
          data-invalid={error ? true : undefined}
          className={cn(
            "flex flex-wrap items-center rounded-lg border border-input px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 data-invalid:border-destructive",
            locked || !online ? "bg-muted" : "bg-background",
          )}
        >
          <span className="text-base text-muted-foreground">{siteHost}/</span>
          <Input
            name="slug"
            value={locked ? view.slug : slug}
            onChange={(event) =>
              setSlug(event.target.value.trim().toLowerCase())
            }
            readOnly={locked}
            disabled={!online}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-label={t("label")}
            aria-invalid={error ? true : undefined}
            aria-describedby={hint ? `${statusId} ${hintId}` : statusId}
            className="h-11 min-w-0 flex-1 basis-[12ch] rounded-none border-0 bg-transparent px-0 font-semibold focus-visible:ring-0 aria-invalid:ring-0 disabled:bg-transparent"
          />
        </div>
        <div id={statusId} aria-live="polite">
          {error ? (
            <FieldError>{t(error)}</FieldError>
          ) : locked ? null : status === "available" ? (
            <p className="flex items-center gap-1 text-sm text-success">
              <CheckIcon aria-hidden className="size-4" />
              {t("available")}
            </p>
          ) : status === "checking" ? (
            <p className="text-sm text-muted-foreground">{t("checking")}</p>
          ) : status === "failed" ? (
            <p className="text-sm text-muted-foreground">{t("checkFailed")}</p>
          ) : null}
        </div>
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        {view.retiredSlugs.length > 0 && (
          <section className="flex flex-col gap-1 pt-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("retiredTitle")}
            </h3>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {view.retiredSlugs.map((retired) => (
                <li key={retired} className="wrap-anywhere">
                  {t("retired", { slug: retired })}
                </li>
              ))}
            </ul>
          </section>
        )}
      </SheetBody>
      <SettingsFooter
        label={t("submit")}
        pending={pending}
        disabled={locked || error !== null || status !== "available"}
      />
    </form>
  );
}
