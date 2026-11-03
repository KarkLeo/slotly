"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { SheetBody, SheetDescription } from "@/components/ui/sheet";
import { setPublished } from "./actions";
import { SettingsRow, StaticSettingsRow } from "./settings-row";
import {
  SettingsFooter,
  SettingsSheet,
  useSettingsAction,
} from "./settings-sheet";
import type { PublicationState } from "./view";

export function PublicationSheet({
  publication,
  slug,
}: {
  publication: PublicationState;
  slug: string;
}) {
  const t = useTranslations("MasterCabinet.settings.publication");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (publication === "neverPublished")
    return <StaticSettingsRow label={t("label")} value={t("neverPublished")} />;

  const publish = publication === "unpublished";
  return (
    <SettingsSheet
      title={publish ? t("publishTitle") : t("unpublishTitle")}
      trigger={<SettingsRow label={t("label")} value={t(publication)} />}
      open={open}
      onOpenChange={setOpen}
    >
      <PublicationForm publish={publish} slug={slug} onSaved={close} />
    </SettingsSheet>
  );
}

function PublicationForm({
  publish,
  slug,
  onSaved,
}: {
  publish: boolean;
  slug: string;
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.settings");
  const [, action, pending] = useSettingsAction(setPublished, onSaved, {});

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody className="flex flex-col gap-2">
        <SheetDescription className="text-base text-foreground wrap-anywhere">
          {publish
            ? t("publication.publishText", { slug })
            : t("publication.unpublishText", { slug })}
        </SheetDescription>
        {!publish && (
          <p className="text-sm text-muted-foreground">
            {t("publication.unpublishHint")}
          </p>
        )}
        <input type="hidden" name="published" value={String(publish)} />
      </SheetBody>
      <SettingsFooter
        label={publish ? t("publication.publish") : t("publication.unpublish")}
        variant={publish ? "default" : "destructive"}
        cancelLabel={t("cancel")}
        pending={pending}
      />
    </form>
  );
}
