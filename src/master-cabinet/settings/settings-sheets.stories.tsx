import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { useBrowserTimeZone } from "@/booking/browser-time-zone";
import { Toaster } from "@/components/ui/sonner";
import { restoreOnLine, stubOnLine } from "@/components/ui/story-helpers";
import type { Locale } from "@/i18n/locales";
import {
  changeSlug,
  checkSlug,
  setPublished,
  type SlugCheck,
  updateCurrency,
  updateLocales,
  updateName,
  updateTimeZone,
} from "./actions";
import type { SettingsData } from "./load";
import { SettingsScreen } from "./settings-screen";
import {
  dictionaries,
  formatterOf,
  localeOf,
  row,
  settingsStories,
  settingsView,
  siteHost,
  storyTimeZones,
} from "./story-settings";

const textsOf = (locale: unknown) => dictionaries[localeOf(locale)];

const openSheet = async (
  canvas: HTMLElement,
  user: { click: (element: Element) => Promise<void> },
  label: string,
  title = label,
) => {
  await user.click(row(canvas, label));
  return screen.findByRole("dialog", { name: title });
};

const saved = { toast: { type: "success", key: "settingsSaved" } } as const;

const meta = {
  title: "MasterCabinet/SettingsSheets",
  component: SettingsScreen,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    data: settingsStories.published,
  },
  globals: { viewport: { value: "mobile360" } },
  args: {
    view: settingsView(settingsStories.published, "uk"),
    timeZones: [],
    siteHost,
    theme: "system",
    email: "master@example.com",
  },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/settings");
    return () => toast.dismiss();
  },
  render: (args, { globals, parameters }) => {
    const locale = localeOf(globals.locale);
    return (
      <div className="p-4">
        <Toaster />
        <SettingsScreen
          {...args}
          view={settingsView(parameters.data as SettingsData, locale)}
          timeZones={storyTimeZones(locale)}
        />
      </div>
    );
  },
} satisfies Meta<typeof SettingsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Name: Story = {
  beforeEach: () => {
    mocked(updateName).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.name.label);
    const input = within(dialog).getByRole("textbox", { name: s.name.label });
    await expect(input).toHaveValue("Анна Коваль");
    await expect(input).toBeRequired();
    await expect(input).toHaveAttribute("maxlength", "100");
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeDisabled();
    await userEvent.type(input, " ");
    await expect(save).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, "Анна Шевчук");
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.settingsSaved)).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(mocked(updateName).mock.calls[0][1].get("name")).toBe(
      "Анна Шевчук",
    );
  },
};

export const NameRussian: Story = { ...Name, globals: { locale: "ru" } };

export const NameInvalid: Story = {
  beforeEach: () => {
    mocked(updateName).mockResolvedValue({ fieldError: "nameInvalid" });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.name.label);
    const input = within(dialog).getByRole("textbox", { name: s.name.label });
    await userEvent.clear(input);
    await userEvent.type(input, "   ");
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.name.invalid,
    );
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveValue("   ");
    await expect(screen.getByRole("dialog")).toBe(dialog);
    await userEvent.type(input, "A");
    await expect(within(dialog).queryByRole("alert")).toBeNull();
    await expect(input).not.toHaveAttribute("aria-invalid");
  },
};

export const Saving: Story = {
  beforeEach: () => {
    const settle = { now: () => {} };
    mocked(updateName).mockImplementation(
      () => new Promise((resolve) => (settle.now = () => resolve({}))),
    );
    // React holds every later transition on the page until a pending action settles.
    return () => settle.now();
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.name.label);
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: s.name.label }),
      "-Шевчук",
    );
    const save = within(dialog).getByRole("button", { name: s.save });
    await userEvent.click(save);
    await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await expect(updateName).toHaveBeenCalledTimes(1);
  },
};

export const SlugAvailable: Story = {
  beforeEach: () => {
    mocked(changeSlug).mockResolvedValue({
      toast: { type: "success", key: "slugChanged" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const format = formatterOf(globals.locale);
    const dialog = await openSheet(canvasElement, userEvent, s.slug.label);
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    const submit = within(dialog).getByRole("button", { name: s.slug.submit });
    await expect(submit).toBeDisabled();
    const nextChange = new Intl.DateTimeFormat(localeOf(globals.locale), {
      timeZone: "Europe/Kyiv",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    await expect(dialog).toHaveTextContent(
      format("slug.keep", { left: 2, date: nextChange }),
    );

    await userEvent.clear(input);
    await userEvent.type(input, " Anna-Kyiv ");
    await expect(input).toHaveValue("anna-kyiv");
    await waitFor(() => expect(dialog).toHaveTextContent(s.slug.available));
    await expect(checkSlug).toHaveBeenLastCalledWith("anna-kyiv");
    await expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.slugChanged)).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(mocked(changeSlug).mock.calls[0][1].get("slug")).toBe(
      "anna-kyiv",
    );
  },
};

export const SlugAvailableRussian: Story = {
  ...SlugAvailable,
  globals: { locale: "ru" },
};

export const SlugTaken: Story = {
  beforeEach: () => {
    mocked(checkSlug).mockResolvedValue("taken");
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.slug.label);
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    await userEvent.clear(input);
    await userEvent.type(input, "anna-kyiv");
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.slug.taken,
    );
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(
      within(dialog).getByRole("button", { name: s.slug.submit }),
    ).toBeDisabled();
  },
};

export const SlugTakenRussian: Story = {
  ...SlugTaken,
  globals: { locale: "ru" },
};

export const SlugInvalid: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.slug.label);
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    await userEvent.clear(input);
    await userEvent.type(input, "app");
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.slug.invalid,
    );
    await expect(dialog).not.toHaveTextContent(s.slug.checking);
    await expect(checkSlug).not.toHaveBeenCalled();
    await expect(
      within(dialog).getByRole("button", { name: s.slug.submit }),
    ).toBeDisabled();
  },
};

export const SlugCheckFailed: Story = {
  beforeEach: () => {
    mocked(checkSlug).mockRejectedValue(new TypeError("Failed to fetch"));
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.slug.label);
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    await userEvent.clear(input);
    await userEvent.type(input, "anna-kyiv");
    await waitFor(() => expect(dialog).toHaveTextContent(s.slug.checkFailed));
    await expect(
      within(dialog).getByRole("button", { name: s.slug.submit }),
    ).toBeDisabled();
  },
};

export const SlugCheckFailedRussian: Story = {
  ...SlugCheckFailed,
  globals: { locale: "ru" },
};

// Resolves the first, slower check after a newer one has answered.
const staleCheck: { resolve?: (result: SlugCheck) => void } = {};

export const SlugStaleCheck: Story = {
  beforeEach: () => {
    mocked(checkSlug).mockImplementation((slug) =>
      slug === "anna-k"
        ? new Promise((resolve) => (staleCheck.resolve = resolve))
        : Promise.resolve("taken"),
    );
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.slug.label);
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    await userEvent.clear(input);
    await userEvent.type(input, "anna-k");
    await waitFor(() => expect(checkSlug).toHaveBeenCalledWith("anna-k"));
    await userEvent.type(input, "yiv");
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.slug.taken,
    );
    staleCheck.resolve?.("available");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(dialog).not.toHaveTextContent(s.slug.available);
    await expect(within(dialog).getByRole("alert")).toHaveTextContent(
      s.slug.taken,
    );
    await expect(
      within(dialog).getByRole("button", { name: s.slug.submit }),
    ).toBeDisabled();
  },
};

export const SlugLockedOnSave: Story = {
  beforeEach: () => {
    mocked(changeSlug).mockResolvedValue({ fieldError: "slugLocked" });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.slug.label);
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    const submit = within(dialog).getByRole("button", { name: s.slug.submit });
    await userEvent.clear(input);
    await userEvent.type(input, "anna-kyiv");
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      s.slug.locked,
    );
    await expect(screen.getByRole("dialog")).toBe(dialog);
    await expect(submit).toBeDisabled();
    await expect(screen.queryByText(texts.Toasts.slugChanged)).toBeNull();
  },
};

export const SlugLockedOnSaveRussian: Story = {
  ...SlugLockedOnSave,
  globals: { locale: "ru" },
};

export const Locales: Story = {
  beforeEach: () => {
    mocked(updateLocales).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const names = texts.LocaleSwitcher;
    const format = formatterOf(globals.locale);
    const dialog = await openSheet(
      canvasElement,
      userEvent,
      s.locales.label,
      s.locales.title,
    );
    const toggle = (locale: Locale) =>
      within(dialog).getByRole("switch", {
        name: new RegExp(`^${names[locale]}`),
      });
    await expect(toggle("uk")).toBeChecked();
    await expect(toggle("uk")).toHaveAttribute("aria-disabled", "true");
    await expect(toggle("uk")).toHaveAccessibleName(
      expect.stringContaining(s.locales.primaryBadge),
    );
    await expect(toggle("en")).toBeChecked();
    await expect(toggle("ru")).not.toBeChecked();
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeDisabled();
    await userEvent.click(toggle("en"));
    await expect(save).toBeEnabled();
    await userEvent.click(toggle("en"));
    await expect(save).toBeDisabled();

    await userEvent.click(toggle("uk"));
    await expect(toggle("uk")).toBeChecked();

    await userEvent.click(toggle("en"));
    await expect(toggle("en")).not.toBeChecked();
    await expect(dialog).toHaveTextContent(
      format("locales.turnOff", { languages: names.en, count: 1 }),
    );
    const primary = within(dialog).getByRole("radiogroup", {
      name: s.locales.primaryLabel,
    });
    await expect(within(primary).getAllByRole("radio")).toHaveLength(1);

    await userEvent.click(toggle("ru"));
    await userEvent.click(
      within(primary).getByRole("radio", { name: names.ru }),
    );
    await expect(toggle("ru")).toHaveAttribute("aria-disabled", "true");
    await expect(toggle("uk")).not.toHaveAttribute("aria-disabled");

    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.settingsSaved)).toBeVisible(),
    );
    const data = mocked(updateLocales).mock.calls[0][1];
    await expect(data.getAll("locales")).toEqual(["uk", "ru"]);
    await expect(data.get("primaryLocale")).toBe("ru");
  },
};

export const LocalesRussian: Story = { ...Locales, globals: { locale: "ru" } };

export const TimeZone: Story = {
  beforeEach: () => {
    mocked(useBrowserTimeZone).mockReturnValue("Europe/Warsaw");
    mocked(updateTimeZone).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const format = formatterOf(globals.locale);
    const dialog = await openSheet(canvasElement, userEvent, s.timeZone.label);
    const radios = within(dialog).getAllByRole("radio");
    await expect(radios[0]).toHaveAccessibleName(
      expect.stringContaining(format("timeZone.phone", { city: "Warsaw" })),
    );
    await expect(radios[1]).toHaveAccessibleName(
      expect.stringMatching(new RegExp(`^Kyiv.*${s.timeZone.current}$`)),
    );
    await expect(radios[1]).toBeChecked();
    await expect(radios.length).toBeLessThanOrEqual(52);
    await expect(dialog).not.toHaveTextContent(s.timeZone.warning);
    const save = within(dialog).getByRole("button", { name: s.save });
    await expect(save).toBeDisabled();

    await userEvent.type(
      within(dialog).getByRole("searchbox", { name: s.timeZone.search }),
      "Berlin",
    );
    await userEvent.click(
      within(dialog).getByRole("radio", { name: /^Berlin/ }),
    );
    await expect(dialog).toHaveTextContent(s.timeZone.warning);
    await expect(save).toBeEnabled();
    const search = within(dialog).getByRole("searchbox", {
      name: s.timeZone.search,
    });
    await userEvent.clear(search);
    await userEvent.type(search, "Tokyo");
    await expect(
      within(dialog).getByRole("radio", { name: /^Berlin/ }),
    ).toBeChecked();
    await userEvent.click(save);
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.settingsSaved)).toBeVisible(),
    );
    await expect(mocked(updateTimeZone).mock.calls[0][1].get("timeZone")).toBe(
      "Europe/Berlin",
    );
  },
};

export const TimeZoneRussian: Story = {
  ...TimeZone,
  globals: { locale: "ru" },
};

// On a phone, the keyboard's search key is how the master hides the keyboard.
export const TimeZoneSearchEnter: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.timeZone.label);
    const search = within(dialog).getByRole("searchbox", {
      name: s.timeZone.search,
    });
    await userEvent.type(search, "Berlin{Enter}");
    await expect(updateTimeZone).not.toHaveBeenCalled();
    await expect(screen.getByRole("dialog")).toBe(dialog);

    await userEvent.click(
      within(dialog).getByRole("radio", { name: /^Berlin/ }),
    );
    await userEvent.type(search, "{Enter}");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(updateTimeZone).not.toHaveBeenCalled();
    await expect(screen.getByRole("dialog")).toBe(dialog);
    await expect(
      within(dialog).getByRole("radio", { name: /^Berlin/ }),
    ).toBeChecked();
  },
};

export const TimeZoneSearchMiss: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.timeZone.label);
    await userEvent.type(
      within(dialog).getByRole("searchbox", { name: s.timeZone.search }),
      "Atlantis",
    );
    await expect(dialog).toHaveTextContent(s.timeZone.nothingFound);
    await expect(within(dialog).getAllByRole("radio")).toHaveLength(1);
  },
};

export const TimeZoneSearchCurrentOnly: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(canvasElement, userEvent, s.timeZone.label);
    await userEvent.type(
      within(dialog).getByRole("searchbox", { name: s.timeZone.search }),
      "Kyiv",
    );
    await expect(dialog).not.toHaveTextContent(s.timeZone.nothingFound);
    await expect(within(dialog).getAllByRole("radio")).toHaveLength(1);
  },
};

// A phone that reports the old name of the master's zone is the same zone.
export const TimeZonePhoneRenamed: Story = {
  beforeEach: () => {
    mocked(useBrowserTimeZone).mockReturnValue("Europe/Kiev");
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const format = formatterOf(globals.locale);
    const dialog = await openSheet(canvasElement, userEvent, s.timeZone.label);
    await expect(dialog).not.toHaveTextContent(
      format("timeZone.phone", { city: "" }),
    );
    await expect(within(dialog).getAllByRole("radio")[0]).toBeChecked();
  },
};

export const Currency: Story = {
  beforeEach: () => {
    mocked(updateCurrency).mockResolvedValue(saved);
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const format = formatterOf(globals.locale);
    const dialog = await openSheet(canvasElement, userEvent, s.currency.label);
    await expect(
      within(dialog).getByRole("radio", {
        name: new RegExp(`^${s.currency.names.UAH}.*UAH ₴$`),
      }),
    ).toBeChecked();
    await expect(within(dialog).getAllByRole("radio")).toHaveLength(4);
    await expect(
      within(dialog).getByRole("button", { name: s.save }),
    ).toBeDisabled();
    await userEvent.click(
      within(dialog).getByRole("radio", {
        name: new RegExp(`^${s.currency.names.EUR}.*EUR €$`),
      }),
    );
    await expect(dialog).toHaveTextContent(
      format("currency.warning", { from: "₴", to: "€" }),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: s.save }));
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.settingsSaved)).toBeVisible(),
    );
    await expect(mocked(updateCurrency).mock.calls[0][1].get("currency")).toBe(
      "EUR",
    );
  },
};

export const CurrencyRussian: Story = {
  ...Currency,
  globals: { locale: "ru" },
};

export const Unpublish: Story = {
  beforeEach: () => {
    mocked(setPublished).mockResolvedValue({
      toast: { type: "success", key: "pageUnpublished" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.settings;
    const format = formatterOf(globals.locale);
    const dialog = await openSheet(
      canvasElement,
      userEvent,
      s.publication.label,
      s.publication.unpublishTitle,
    );
    await expect(dialog).toHaveAccessibleDescription(
      format("publication.unpublishText", { slug: "anna-nails" }),
    );
    await expect(dialog).toHaveTextContent(s.publication.unpublishHint);
    await expect(
      within(dialog).getByRole("button", { name: s.cancel }),
    ).toBeEnabled();
    await userEvent.click(
      within(dialog).getByRole("button", { name: s.publication.unpublish }),
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.pageUnpublished)).toBeVisible(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(mocked(setPublished).mock.calls[0][1].get("published")).toBe(
      "false",
    );
  },
};

export const UnpublishRussian: Story = {
  ...Unpublish,
  globals: { locale: "ru" },
};

export const UnpublishCancelled: Story = {
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.settings;
    const dialog = await openSheet(
      canvasElement,
      userEvent,
      s.publication.label,
      s.publication.unpublishTitle,
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: s.cancel }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(setPublished).not.toHaveBeenCalled();
  },
};

export const Offline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const t = textsOf(globals.locale).MasterCabinet;
    const s = t.settings;
    const sheets = [
      [s.name.label, s.name.label, s.save],
      [s.slug.label, s.slug.label, s.slug.submit],
      [s.locales.label, s.locales.title, s.save],
      [
        s.publication.label,
        s.publication.unpublishTitle,
        s.publication.unpublish,
      ],
      [s.timeZone.label, s.timeZone.label, s.save],
      [s.currency.label, s.currency.label, s.save],
    ];
    for (const [label, title, submit] of sheets) {
      const dialog = await openSheet(canvasElement, userEvent, label, title);
      await expect(dialog).toHaveTextContent(t.offline);
      await expect(
        within(dialog).getByRole("button", { name: submit }),
      ).toBeDisabled();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  },
};

export const OfflineRussian: Story = { ...Offline, globals: { locale: "ru" } };
