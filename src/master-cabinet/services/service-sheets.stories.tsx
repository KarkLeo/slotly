import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import { overflowsX, settle } from "@/components/ui/story-helpers";
import {
  archiveService,
  deleteCategory,
  reorderCategories,
  saveCategory,
  saveService,
} from "./actions";
import { ServicesScreen } from "./services-screen";
import {
  ids,
  localeOf,
  servicesStories,
  servicesView,
  textsOf,
} from "./story-services";
import type { ServicesData } from "./view";

const meta = {
  title: "MasterCabinet/ServiceSheets",
  component: ServicesScreen,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    data: servicesStories.full,
  },
  globals: { viewport: { value: "mobile360" } },
  args: {
    view: servicesView(servicesStories.full, "uk"),
    theme: "system",
    email: "master@example.com",
  },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/services");
    return () => toast.dismiss();
  },
  render: (args, { globals, parameters }) => (
    <div className="p-4">
      <Toaster />
      <ServicesScreen
        {...args}
        view={servicesView(
          parameters.data as ServicesData,
          localeOf(globals.locale),
        )}
      />
    </div>
  ),
} satisfies Meta<typeof ServicesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

type User = { click: (element: Element) => Promise<void> };

const opened = async (name: string) => {
  const dialog = await screen.findByRole("dialog", { name });
  await waitFor(() => {
    settle();
    return expect(dialog).toBeVisible();
  });
  return dialog;
};

const openAdd = async (canvas: HTMLElement, user: User, locale: unknown) => {
  const s = textsOf(locale).MasterCabinet.services;
  await user.click(within(canvas).getByRole("button", { name: s.add }));
  return opened(s.addTitle);
};

const openEdit = async (
  canvas: HTMLElement,
  user: User,
  locale: unknown,
  name: RegExp,
) => {
  const s = textsOf(locale).MasterCabinet.services;
  await user.click(within(canvas).getByRole("button", { name }));
  return opened(s.editTitle);
};

const openCategories = async (
  canvas: HTMLElement,
  user: User,
  locale: unknown,
) => {
  const c = textsOf(locale).MasterCabinet.services.categories;
  await user.click(within(canvas).getByRole("button", { name: c.title }));
  return opened(c.title);
};

export const AddService: Story = {
  beforeEach: () => {
    mocked(saveService).mockResolvedValue({
      toast: { type: "success", key: "serviceAdded" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const f = texts.MasterCabinet.services.form;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const inside = within(dialog);
    await expect(overflowsX(dialog)).toBe(false);

    const primaryName = inside.getByRole("textbox", {
      name: `${f.name} · Українська`,
    });
    await expect(primaryName).toBeRequired();
    await expect(
      inside.getByRole("textbox", {
        name: `${f.name} · English ${f.optional}`,
      }),
    ).not.toBeRequired();
    await expect(inside.getByRole("textbox", { name: f.duration })).toHaveValue(
      "60",
    );

    await userEvent.type(primaryName, "Педикюр");
    await userEvent.type(
      inside.getByRole("textbox", {
        name: f.amount.replace("{currency}", "₴"),
      }),
      "1100",
    );
    await userEvent.click(inside.getByRole("button", { name: f.add }));

    await waitFor(() => expect(saveService).toHaveBeenCalledTimes(1));
    const sent = mocked(saveService).mock.calls[0][1];
    await expect(sent.get("id")).toBeNull();
    await expect(sent.get("name.uk")).toBe("Педикюр");
    await expect(sent.get("name.en")).toBe("");
    await expect(sent.get("categoryId")).toBe("");
    await expect(sent.get("durationMinutes")).toBe("60");
    await expect(sent.get("bufferMinutes")).toBe("0");
    await expect(sent.get("priceKind")).toBe("fixed");
    await expect(sent.get("price")).toBe("1100");
    await expect(sent.get("format")).toBe("on_site");
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.serviceAdded)).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const AddServiceEnglish: Story = {
  ...AddService,
  globals: { locale: "en" },
};

export const FieldErrors: Story = {
  beforeEach: () => {
    mocked(saveService).mockResolvedValue({ errors: ["duration", "price"] });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const f = textsOf(globals.locale).MasterCabinet.services.form;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const inside = within(dialog);
    await userEvent.type(
      inside.getByRole("textbox", { name: `${f.name} · Українська` }),
      "Педикюр",
    );
    const duration = inside.getByRole("textbox", { name: f.duration });
    await userEvent.clear(duration);
    await userEvent.type(duration, "7");
    await userEvent.click(inside.getByRole("button", { name: f.add }));

    await waitFor(() =>
      expect(inside.getByText(f.errors.duration)).toBeVisible(),
    );
    await expect(inside.getByText(f.errors.price)).toBeVisible();
    await expect(duration).toHaveAttribute("aria-invalid", "true");
    await expect(duration).toHaveAccessibleDescription(f.errors.duration);
    await waitFor(() => expect(duration).toHaveFocus());
    await expect(screen.getByRole("dialog")).toBeVisible();

    await userEvent.type(duration, "5");
    await expect(inside.queryByText(f.errors.duration)).toBeNull();
    await expect(inside.getByText(f.errors.price)).toBeVisible();
    await expect(overflowsX(dialog)).toBe(false);
  },
};

export const FieldErrorsRussian: Story = {
  ...FieldErrors,
  globals: { locale: "ru" },
};

export const UnexpectedFailure: Story = {
  beforeEach: () => {
    mocked(saveService).mockRejectedValue(new Error("network"));
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const f = texts.MasterCabinet.services.form;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const inside = within(dialog);
    const name = inside.getByRole("textbox", {
      name: `${f.name} · Українська`,
    });
    await userEvent.type(name, "Педикюр");
    await userEvent.click(inside.getByRole("button", { name: f.add }));
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.unexpected)).toBeVisible(),
    );
    await expect(screen.getByRole("dialog")).toBeVisible();
    await expect(name).toHaveValue("Педикюр");
  },
};

export const PriceAndFormat: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const f = textsOf(globals.locale).MasterCabinet.services;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const inside = within(dialog);
    const amount = f.form.amount.replace("{currency}", "₴");
    await expect(inside.getByRole("textbox", { name: amount })).toBeVisible();
    await userEvent.click(
      inside.getByRole("button", { name: f.form.priceKinds.none }),
    );
    await expect(inside.queryByRole("textbox", { name: amount })).toBeNull();
    // A tap on the chosen option must not leave the group without a value.
    await userEvent.click(
      inside.getByRole("button", { name: f.form.priceKinds.none }),
    );
    await expect(
      inside.getByRole("button", { name: f.form.priceKinds.none }),
    ).toHaveAttribute("aria-pressed", "true");

    await expect(inside.queryByText(f.form.atClientHint)).toBeNull();
    await userEvent.click(
      inside.getByRole("button", { name: f.formats.at_client }),
    );
    await expect(inside.getByText(f.form.atClientHint)).toBeVisible();
    await expect(overflowsX(dialog)).toBe(false);
  },
};

export const PriceAndFormatRussian: Story = {
  ...PriceAndFormat,
  globals: { locale: "ru" },
};

export const EditService: Story = {
  beforeEach: () => {
    mocked(saveService).mockResolvedValue({
      toast: { type: "success", key: "settingsSaved" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const f = texts.MasterCabinet.services.form;
    const dialog = await openEdit(
      canvasElement,
      userEvent,
      globals.locale,
      /Манікюр з покриттям/,
    );
    const inside = within(dialog);
    await expect(
      inside.getByRole("textbox", { name: `${f.name} · Українська` }),
    ).toHaveValue("Манікюр з покриттям");
    const english = inside.getByRole("textbox", {
      name: `${f.name} · English ${f.optional}`,
    });
    await expect(english).toHaveValue("Gel manicure");
    await expect(inside.getByRole("textbox", { name: f.duration })).toHaveValue(
      "90",
    );
    await expect(
      inside.getByRole("textbox", {
        name: f.amount.replace("{currency}", "₴"),
      }),
    ).toHaveValue("900");
    await expect(inside.getByText(new RegExp(f.changeHint))).toBeVisible();

    const save = inside.getByRole("button", { name: f.save });
    await expect(save).toBeDisabled();
    await userEvent.clear(english);
    await userEvent.type(english, "Manicure");
    await expect(save).toBeEnabled();
    await userEvent.click(save);

    await waitFor(() => expect(saveService).toHaveBeenCalledTimes(1));
    const sent = mocked(saveService).mock.calls[0][1];
    await expect(sent.get("id")).toBe(ids.gel);
    await expect(sent.get("categoryId")).toBe(ids.nails);
    await expect(sent.get("name.en")).toBe("Manicure");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const OneLanguage: Story = {
  parameters: { data: servicesStories.noCategories },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.services;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const inside = within(dialog);
    await expect(
      inside.getByRole("textbox", { name: s.form.name }),
    ).toBeRequired();
    await expect(inside.queryByText(s.form.category)).toBeNull();
  },
};

export const CategoryChoice: Story = {
  beforeEach: () => {
    mocked(saveService).mockResolvedValue({
      toast: { type: "success", key: "serviceAdded" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.services;
    const dialog = await openAdd(canvasElement, userEvent, globals.locale);
    const inside = within(dialog);
    await userEvent.type(
      inside.getByRole("textbox", { name: `${s.form.name} · Українська` }),
      "Педикюр",
    );
    await userEvent.click(
      inside.getByRole("combobox", { name: s.form.category }),
    );
    await userEvent.click(await screen.findByRole("option", { name: "Брови" }));
    await userEvent.click(inside.getByRole("button", { name: s.form.add }));
    await waitFor(() => expect(saveService).toHaveBeenCalledTimes(1));
    await expect(mocked(saveService).mock.calls[0][1].get("categoryId")).toBe(
      ids.brows,
    );
  },
};

export const Archive: Story = {
  beforeEach: () => {
    mocked(archiveService).mockResolvedValue({
      toast: { type: "success", key: "serviceArchived" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.services;
    const dialog = await openEdit(
      canvasElement,
      userEvent,
      globals.locale,
      /Манікюр з покриттям/,
    );
    const inside = within(dialog);
    await expect(inside.getByText(s.archive.hint)).toBeVisible();
    // Archiving must work whatever state the form's fields are in.
    await userEvent.clear(
      inside.getByRole("textbox", { name: `${s.form.name} · Українська` }),
    );
    await userEvent.click(
      inside.getByRole("button", { name: s.archive.action }),
    );
    await waitFor(() => expect(archiveService).toHaveBeenCalledTimes(1));
    await expect(saveService).not.toHaveBeenCalled();
    await expect(mocked(archiveService).mock.calls[0][1].get("id")).toBe(
      ids.gel,
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.serviceArchived)).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const ArchiveRussian: Story = {
  ...Archive,
  globals: { locale: "ru" },
};

export const LongTexts: Story = {
  parameters: { data: servicesStories.longTexts },
  play: async ({ canvasElement, userEvent, globals }) => {
    const dialog = await openCategories(
      canvasElement,
      userEvent,
      globals.locale,
    );
    await expect(overflowsX(dialog)).toBe(false);
    await expect(overflowsX(document.body)).toBe(false);
  },
};

export const Categories: Story = {
  beforeEach: () => {
    mocked(reorderCategories).mockResolvedValue({});
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const c = textsOf(globals.locale).MasterCabinet.services;
    const dialog = await openCategories(
      canvasElement,
      userEvent,
      globals.locale,
    );
    const inside = within(dialog);
    await expect(dialog).toHaveTextContent(c.categories.text);
    await userEvent.click(
      inside.getByRole("button", {
        name: c.order.up.replace("{name}", "Брови"),
      }),
    );
    await waitFor(() =>
      expect(reorderCategories).toHaveBeenCalledWith([ids.brows, ids.nails]),
    );
    await expect(screen.getByRole("dialog")).toBeVisible();
    await expect(overflowsX(dialog)).toBe(false);
  },
};

export const CategoriesRussian: Story = {
  ...Categories,
  globals: { locale: "ru" },
};

export const CategoriesEmpty: Story = {
  parameters: { data: servicesStories.empty },
  beforeEach: () => {
    mocked(saveCategory).mockResolvedValue({
      toast: { type: "success", key: "categoryAdded" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const c = texts.MasterCabinet.services.categories;
    const dialog = await openCategories(
      canvasElement,
      userEvent,
      globals.locale,
    );
    const inside = within(dialog);
    await expect(inside.queryByRole("list")).toBeNull();
    await userEvent.click(inside.getByRole("button", { name: c.add }));
    const form = await screen.findByRole("dialog", { name: c.addTitle });
    const name = within(form).getByRole("textbox", {
      name: `${c.name} · Українська`,
    });
    await userEvent.type(name, "Нігті");
    await userEvent.click(
      within(form).getByRole("button", { name: c.addSubmit }),
    );
    await waitFor(() => expect(saveCategory).toHaveBeenCalledTimes(1));
    await expect(mocked(saveCategory).mock.calls[0][1].get("name.uk")).toBe(
      "Нігті",
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.categoryAdded)).toBeVisible(),
    );
    await screen.findByRole("dialog", { name: c.title });
  },
};

export const CategoryNameError: Story = {
  beforeEach: () => {
    mocked(saveCategory).mockResolvedValue({ error: "name" });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const c = textsOf(globals.locale).MasterCabinet.services.categories;
    const dialog = await openCategories(
      canvasElement,
      userEvent,
      globals.locale,
    );
    await userEvent.click(within(dialog).getByRole("button", { name: c.add }));
    const form = await screen.findByRole("dialog", { name: c.addTitle });
    const name = within(form).getByRole("textbox", {
      name: `${c.name} · Українська`,
    });
    await userEvent.type(name, " ");
    await userEvent.click(
      within(form).getByRole("button", { name: c.addSubmit }),
    );
    await waitFor(() =>
      expect(within(form).getByText(c.nameInvalid)).toBeVisible(),
    );
    await userEvent.type(name, "Н");
    await expect(within(form).queryByText(c.nameInvalid)).toBeNull();
  },
};

export const CategoryDelete: Story = {
  beforeEach: () => {
    mocked(deleteCategory).mockResolvedValue({
      toast: { type: "success", key: "categoryDeleted" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const c = texts.MasterCabinet.services.categories;
    const locale = localeOf(globals.locale);
    const nails = locale === "en" ? "Nails" : "Нігті";
    const dialog = await openCategories(
      canvasElement,
      userEvent,
      globals.locale,
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: new RegExp(`^${nails}`) }),
    );
    const form = await screen.findByRole("dialog", { name: c.editTitle });
    await expect(
      within(form).getByRole("button", { name: c.save }),
    ).toBeDisabled();
    await userEvent.click(within(form).getByRole("button", { name: c.delete }));

    const confirm = await screen.findByRole("dialog", { name: c.deleteTitle });
    await expect(confirm).toHaveTextContent(nails);
    await expect(confirm).toHaveTextContent("2");
    await expect(deleteCategory).not.toHaveBeenCalled();

    await userEvent.click(
      within(confirm).getByRole("button", { name: c.back }),
    );
    await screen.findByRole("dialog", { name: c.editTitle });
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: c.delete,
      }),
    );
    const again = await screen.findByRole("dialog", { name: c.deleteTitle });
    await userEvent.click(
      within(again).getByRole("button", { name: c.deleteSubmit }),
    );
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledTimes(1));
    await expect(mocked(deleteCategory).mock.calls[0][1].get("id")).toBe(
      ids.nails,
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.categoryDeleted)).toBeVisible(),
    );
    await screen.findByRole("dialog", { name: c.title });
  },
};

export const CategoryDeleteRussian: Story = {
  ...CategoryDelete,
  globals: { locale: "ru" },
};

export const CategoryDeleteEnglish: Story = {
  ...CategoryDelete,
  globals: { locale: "en" },
};
