"use client";

import { useTranslations } from "next-intl";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectFieldLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetBody } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LocalizedText } from "@/landing/localize";
import { useOnline } from "@/lib/use-online";
import {
  SettingsFooter,
  SettingsSheet,
  useSettingsAction,
} from "../settings/settings-sheet";
import {
  archiveService,
  saveService,
  type ServiceActionState,
} from "./actions";
import {
  descriptionMaxLength,
  nameMaxLength,
  priceKinds,
  serviceFormats,
  type ServiceField,
} from "./form";
import { LocalizedFields } from "./localized-fields";
import type { ServiceItem, ServicesView } from "./view";

type ServiceFormState = ServiceActionState & {
  submitted?: Record<string, FormDataEntryValue>;
};

const noCategory = "none";

// Remembers what was submitted, so editing a field clears its error.
async function saveServiceFor(
  state: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  return {
    ...(await saveService(state, formData)),
    submitted: Object.fromEntries(formData),
  };
}

function draftOf(service: ServiceItem | undefined) {
  return {
    name: { ...service?.name } as LocalizedText,
    description: { ...service?.description } as LocalizedText,
    categoryId: service?.categoryId ?? noCategory,
    durationMinutes: String(service?.durationMinutes ?? 60),
    bufferMinutes: String(service?.bufferMinutes ?? 0),
    priceKind: service?.priceKind ?? "fixed",
    price: service?.price === null ? "" : String(service?.price ?? ""),
    format: service?.format ?? "on_site",
  };
}

export function ServiceSheet({
  view,
  service,
  trigger,
}: {
  view: ServicesView;
  service?: ServiceItem;
  trigger: ReactElement;
}) {
  const t = useTranslations("MasterCabinet.services");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <SettingsSheet
      title={service ? t("editTitle") : t("addTitle")}
      trigger={trigger}
      open={open}
      onOpenChange={setOpen}
    >
      <ServiceForm view={view} service={service} onSaved={close} />
    </SettingsSheet>
  );
}

function ServiceForm({
  view,
  service,
  onSaved,
}: {
  view: ServicesView;
  service?: ServiceItem;
  onSaved: () => void;
}) {
  const t = useTranslations("MasterCabinet.services");
  const online = useOnline();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [initial] = useState(() => draftOf(service));
  const [draft, setDraft] = useState(initial);
  const [state, action, saving] = useSettingsAction<ServiceFormState>(
    saveServiceFor,
    onSaved,
    {},
  );
  const [, archive, archiving] = useSettingsAction<ServiceActionState>(
    archiveService,
    onSaved,
    {},
  );
  const primary = view.languages[0].locale;
  const update = (patch: Partial<typeof draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  // The field at fault may be scrolled out of the sheet.
  useEffect(() => {
    if (state.errors?.length)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [state]);

  const errorFor = (field: ServiceField, input: string, value: string) =>
    state.errors?.includes(field) && state.submitted?.[input] === value
      ? t(`form.errors.${field}`)
      : null;
  const nameError = errorFor(
    "name",
    `name.${primary}`,
    draft.name[primary] ?? "",
  );
  const descriptionError = errorFor(
    "description",
    `description.${primary}`,
    draft.description[primary] ?? "",
  );
  const durationError = errorFor(
    "duration",
    "durationMinutes",
    draft.durationMinutes,
  );
  const bufferError = errorFor("buffer", "bufferMinutes", draft.bufferMinutes);
  const priceError = errorFor("price", "price", draft.price);

  const categories = [
    { value: noCategory, label: t("noCategory") },
    ...view.categories.map((category) => ({
      value: category.id,
      label: category.title,
    })),
  ];
  const unchanged =
    service !== undefined && JSON.stringify(draft) === JSON.stringify(initial);

  return (
    <form ref={formRef} action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody tabIndex={0} className="flex flex-col gap-4">
        {service && <input type="hidden" name="id" value={service.id} />}
        <LocalizedFields
          name="name"
          label={t("form.name")}
          languages={view.languages}
          values={draft.name}
          onChange={(name) => update({ name })}
          maxLength={nameMaxLength}
          disabled={!online}
          error={nameError}
          required
        />
        <LocalizedFields
          name="description"
          label={t("form.description")}
          languages={view.languages}
          values={draft.description}
          onChange={(description) => update({ description })}
          maxLength={descriptionMaxLength}
          disabled={!online}
          error={descriptionError}
          multiline
        />

        {view.categories.length > 0 && (
          <Select
            items={categories}
            value={draft.categoryId}
            disabled={!online}
            onValueChange={(categoryId) => {
              if (categoryId) update({ categoryId });
            }}
          >
            <div className="flex flex-col gap-2">
              <SelectFieldLabel>{t("form.category")}</SelectFieldLabel>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </div>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input
          type="hidden"
          name="categoryId"
          value={draft.categoryId === noCategory ? "" : draft.categoryId}
        />

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 items-start gap-3">
            <MinutesField
              id={`${id}-duration`}
              name="durationMinutes"
              label={t("form.duration")}
              value={draft.durationMinutes}
              onChange={(durationMinutes) => update({ durationMinutes })}
              disabled={!online}
              error={durationError}
            />
            <MinutesField
              id={`${id}-buffer`}
              name="bufferMinutes"
              label={t("form.buffer")}
              value={draft.bufferMinutes}
              onChange={(bufferMinutes) => update({ bufferMinutes })}
              disabled={!online}
              error={bufferError}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("form.bufferHint")}
            {service && ` ${t("form.changeHint")}`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span id={`${id}-price-kind`} className="text-sm font-medium">
            {t("form.price")}
          </span>
          <Choice
            labelledBy={`${id}-price-kind`}
            name="priceKind"
            options={priceKinds}
            value={draft.priceKind}
            label={(kind) => t(`form.priceKinds.${kind}`)}
            onChange={(priceKind) => update({ priceKind })}
            disabled={!online}
          />
          {draft.priceKind !== "none" && (
            <Field data-invalid={priceError ? true : undefined}>
              <FieldLabel htmlFor={`${id}-amount`}>
                {t("form.amount", { currency: view.currency })}
              </FieldLabel>
              <Input
                id={`${id}-amount`}
                name="price"
                inputMode="decimal"
                autoComplete="off"
                value={draft.price}
                onChange={(event) => update({ price: event.target.value })}
                disabled={!online}
                aria-invalid={priceError ? true : undefined}
                aria-describedby={priceError ? `${id}-price-error` : undefined}
              />
              {priceError && (
                <FieldError id={`${id}-price-error`}>{priceError}</FieldError>
              )}
            </Field>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span id={`${id}-format`} className="text-sm font-medium">
            {t("form.format")}
          </span>
          <Choice
            labelledBy={`${id}-format`}
            name="format"
            options={serviceFormats}
            value={draft.format}
            label={(format) => t(`formats.${format}`)}
            onChange={(format) => update({ format })}
            disabled={!online}
          />
          {draft.format === "at_client" && (
            <p className="text-sm text-muted-foreground">
              {t("form.atClientHint")}
            </p>
          )}
        </div>

        {service && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm text-muted-foreground">{t("archive.hint")}</p>
            <Button
              type="submit"
              variant="outline"
              formAction={archive}
              formNoValidate
              disabled={!online || saving}
              loading={archiving}
            >
              {t("archive.action")}
            </Button>
          </div>
        )}
      </SheetBody>
      <SettingsFooter
        label={service ? t("form.save") : t("form.add")}
        pending={saving}
        disabled={unchanged || archiving}
      />
    </form>
  );
}

function MinutesField({
  id,
  name,
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error: string | null;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

function Choice<T extends string>({
  labelledBy,
  name,
  options,
  value,
  label,
  onChange,
  disabled,
}: {
  labelledBy: string;
  name: string;
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
  disabled: boolean;
}) {
  return (
    <>
      <ToggleGroup
        variant="outline"
        aria-labelledby={labelledBy}
        value={[value]}
        disabled={disabled}
        onValueChange={(next) => {
          if (next[0]) onChange(next[0] as T);
        }}
        className="w-full"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="min-w-0 flex-1 shrink px-1 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          >
            {label(option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <input type="hidden" name={name} value={value} />
    </>
  );
}
