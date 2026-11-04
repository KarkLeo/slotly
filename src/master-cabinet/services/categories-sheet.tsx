"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheetBody, SheetDescription } from "@/components/ui/sheet";
import { useOnline } from "@/lib/use-online";
import {
  SettingsFooter,
  SettingsSheet,
  useSettingsAction,
} from "../settings/settings-sheet";
import {
  type CategoryActionState,
  deleteCategory,
  reorderCategories,
  saveCategory,
} from "./actions";
import { nameMaxLength } from "./form";
import { LocalizedFields } from "./localized-fields";
import { OrderList } from "./order-list";
import type { CategoryItem, ServicesView } from "./view";

type CategoryFormState = CategoryActionState & {
  submitted?: Record<string, FormDataEntryValue>;
};

// Remembers what was submitted, so editing the field clears its error.
async function saveCategoryFor(
  state: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  return {
    ...(await saveCategory(state, formData)),
    submitted: Object.fromEntries(formData),
  };
}

type Step =
  | { kind: "list" }
  | { kind: "form"; category?: CategoryItem }
  | { kind: "delete"; category: CategoryItem };

export function CategoriesSheet({
  view,
  trigger,
}: {
  view: ServicesView;
  trigger: ReactElement;
}) {
  const t = useTranslations("MasterCabinet.services.categories");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "list" });
  const toList = () => setStep({ kind: "list" });

  const title =
    step.kind === "delete"
      ? t("deleteTitle")
      : step.kind === "form"
        ? t(step.category ? "editTitle" : "addTitle")
        : t("title");

  return (
    <SettingsSheet
      title={title}
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) toList();
      }}
    >
      {step.kind === "list" && (
        <CategoryList
          categories={view.categories}
          onAdd={() => setStep({ kind: "form" })}
          onEdit={(category) => setStep({ kind: "form", category })}
        />
      )}
      {step.kind === "form" && (
        <CategoryForm
          key={step.category?.id ?? "new"}
          view={view}
          category={step.category}
          onBack={toList}
          onDelete={(category) => setStep({ kind: "delete", category })}
        />
      )}
      {step.kind === "delete" && (
        <DeleteCategory
          category={step.category}
          onBack={() => setStep({ kind: "form", category: step.category })}
          onDeleted={toList}
        />
      )}
    </SettingsSheet>
  );
}

function CategoryList({
  categories,
  onAdd,
  onEdit,
}: {
  categories: CategoryItem[];
  onAdd: () => void;
  onEdit: (category: CategoryItem) => void;
}) {
  const t = useTranslations("MasterCabinet.services.categories");

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <SheetBody>
        <SheetDescription className="pb-2">{t("text")}</SheetDescription>
        {categories.length > 0 && (
          <OrderList items={categories} save={reorderCategories}>
            {(category) => (
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-lg py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onEdit(category)}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-medium wrap-anywhere">
                    {category.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("count", { count: category.serviceCount })}
                  </span>
                </span>
                <ChevronRightIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </button>
            )}
          </OrderList>
        )}
      </SheetBody>
      <div className="flex flex-col px-4">
        <Button type="button" onClick={onAdd}>
          {t("add")}
        </Button>
      </div>
    </div>
  );
}

function CategoryForm({
  view,
  category,
  onBack,
  onDelete,
}: {
  view: ServicesView;
  category?: CategoryItem;
  onBack: () => void;
  onDelete: (category: CategoryItem) => void;
}) {
  const t = useTranslations("MasterCabinet.services.categories");
  const online = useOnline();
  const [initial] = useState(() => ({ ...category?.name }));
  const [name, setName] = useState(initial);
  const [state, action, pending] = useSettingsAction<CategoryFormState>(
    saveCategoryFor,
    onBack,
    {},
  );
  const primary = view.languages[0].locale;
  const invalid =
    state.error === "name" &&
    state.submitted?.[`name.${primary}`] === (name[primary] ?? "");

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody className="flex flex-col gap-4">
        {category && <input type="hidden" name="id" value={category.id} />}
        <LocalizedFields
          name="name"
          label={t("name")}
          languages={view.languages}
          values={name}
          onChange={setName}
          maxLength={nameMaxLength}
          disabled={!online}
          error={invalid ? t("nameInvalid") : null}
          required
        />
        {category && (
          <Button
            type="button"
            variant="ghost"
            className="self-start px-0 text-destructive hover:bg-transparent hover:underline"
            disabled={!online}
            onClick={() => onDelete(category)}
          >
            {t("delete")}
          </Button>
        )}
      </SheetBody>
      <div className="flex flex-col gap-2">
        <SettingsFooter
          label={category ? t("save") : t("addSubmit")}
          pending={pending}
          disabled={
            category !== undefined &&
            JSON.stringify(name) === JSON.stringify(initial)
          }
        />
        <div className="flex flex-col px-4">
          <Button type="button" variant="outline" onClick={onBack}>
            {t("back")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DeleteCategory({
  category,
  onBack,
  onDeleted,
}: {
  category: CategoryItem;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("MasterCabinet.services.categories");
  const [, action, pending] = useSettingsAction<CategoryActionState>(
    deleteCategory,
    onDeleted,
    {},
  );

  return (
    <form action={action} className="flex min-h-0 flex-col gap-4">
      <SheetBody>
        <input type="hidden" name="id" value={category.id} />
        <SheetDescription className="text-base text-foreground wrap-anywhere">
          {t("deleteText", {
            name: category.title,
            count: category.serviceCount,
          })}
        </SheetDescription>
      </SheetBody>
      <div className="flex flex-col gap-2">
        <SettingsFooter
          label={t("deleteSubmit")}
          variant="destructive"
          pending={pending}
        />
        <div className="flex flex-col px-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onBack}
          >
            {t("back")}
          </Button>
        </div>
      </div>
    </form>
  );
}
