import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { overflowsX } from "@/components/ui/story-helpers";
import { setPublished } from "./actions";
import type { SettingsData } from "./load";
import { SettingsScreen } from "./settings-screen";
import {
  dictionaries,
  formatterOf,
  localeOf,
  longSlug,
  row,
  settingsStories,
  settingsView,
  siteHost,
  storyTimeZones,
} from "./story-settings";

const textsOf = (locale: unknown) =>
  dictionaries[localeOf(locale)].MasterCabinet;

// The sentence about keeping the old address, which only a limited master sees.
const keepSentence = (format: ReturnType<typeof formatterOf>) =>
  format("slug.keep", { left: 0, date: "" }).split(".")[0];

const meta = {
  title: "MasterCabinet/SettingsScreen",
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
  },
  render: (args, { globals, parameters }) => {
    const locale = localeOf(globals.locale);
    return (
      <div className="p-4">
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

export const Published: Story = {
  play: async ({ canvasElement, globals }) => {
    const t = textsOf(globals.locale);
    const s = t.settings;
    const view = settingsView(
      settingsStories.published,
      localeOf(globals.locale),
    );
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.sections.settings }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: t.back })).toBeVisible();

    const profile = canvas.getByRole("region", { name: s.groups.profile });
    await expect(row(profile, s.name.label)).toHaveTextContent("Анна Коваль");
    await expect(row(profile, s.slug.label)).toHaveTextContent("/anna-nails");

    const page = canvas.getByRole("region", { name: s.groups.page });
    await expect(row(page, s.locales.label)).toHaveTextContent(
      view.localesSummary,
    );
    await expect(row(page, s.publication.label)).toHaveTextContent(
      s.publication.published,
    );

    const timeAndMoney = canvas.getByRole("region", {
      name: s.groups.timeAndMoney,
    });
    await expect(row(timeAndMoney, s.timeZone.label)).toHaveTextContent("Kyiv");
    await expect(row(timeAndMoney, s.currency.label)).toHaveTextContent(
      "UAH ₴",
    );

    const contact = canvas.getByRole("region", { name: s.groups.contact });
    const telegram = row(contact, s.telegram);
    await expect(telegram).toBeDisabled();
    await expect(telegram).toHaveTextContent(s.soon);
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const PublishedRussian: Story = {
  ...Published,
  globals: { locale: "ru" },
};

export const PublishedEnglish: Story = {
  ...Published,
  globals: { locale: "en" },
};

export const SlugLocked: Story = {
  parameters: { data: settingsStories.slugLocked },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).settings;
    const format = formatterOf(globals.locale);
    const view = settingsView(
      settingsStories.slugLocked,
      localeOf(globals.locale),
    );
    await userEvent.click(row(canvasElement, s.slug.label));
    const dialog = await screen.findByRole("dialog", { name: s.slug.label });
    const input = within(dialog).getByRole("textbox", { name: s.slug.label });
    await expect(input).toHaveValue("anna-kyiv");
    await expect(input).toHaveAttribute("readonly");
    await expect(dialog).toHaveTextContent(`${siteHost}/`);
    await expect(dialog).toHaveTextContent(
      format("slug.lockedUntilLast", {
        date: view.slugLock!.date,
        last: view.slugLock!.lastChangeDate!,
        count: 2,
      }),
    );
    await expect(dialog).not.toHaveTextContent(keepSentence(format));
    await expect(within(dialog).getByRole("listitem")).toHaveTextContent(
      format("slug.retired", { slug: "anna-nails" }),
    );
    await expect(
      within(dialog).getByRole("button", { name: s.slug.submit }),
    ).toBeDisabled();
  },
};

export const SlugLockedRussian: Story = {
  ...SlugLocked,
  globals: { locale: "ru" },
};

export const NeverPublished: Story = {
  parameters: { data: settingsStories.neverPublished },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).settings;
    const format = formatterOf(globals.locale);
    const page = within(canvasElement).getByRole("region", {
      name: s.groups.page,
    });
    await expect(
      within(page).queryByRole("button", {
        name: new RegExp(`^${s.publication.label}`),
      }),
    ).toBeNull();
    await expect(
      within(page).getByText(s.publication.neverPublished),
    ).toBeVisible();

    await userEvent.click(row(canvasElement, s.slug.label));
    const dialog = await screen.findByRole("dialog", { name: s.slug.label });
    await expect(
      within(dialog).getByRole("textbox", { name: s.slug.label }),
    ).not.toHaveAttribute("readonly");
    await expect(dialog).not.toHaveTextContent(keepSentence(format));
  },
};

export const NeverPublishedRussian: Story = {
  ...NeverPublished,
  globals: { locale: "ru" },
};

export const Unpublished: Story = {
  parameters: { data: settingsStories.unpublished },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).settings;
    const format = formatterOf(globals.locale);
    const publication = row(canvasElement, s.publication.label);
    await expect(publication).toHaveTextContent(s.publication.unpublished);
    await userEvent.click(publication);
    const dialog = await screen.findByRole("dialog", {
      name: s.publication.publishTitle,
    });
    await expect(dialog).toHaveAccessibleDescription(
      format("publication.publishText", { slug: "anna-nails" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: s.publication.publish }),
    );
    await waitFor(() => expect(setPublished).toHaveBeenCalledTimes(1));
    await expect(mocked(setPublished).mock.calls[0][1].get("published")).toBe(
      "true",
    );
  },
};

export const UnpublishedRussian: Story = {
  ...Unpublished,
  globals: { locale: "ru" },
};

export const LongSlug: Story = {
  parameters: { data: settingsStories.longSlug },
  globals: { locale: "ru" },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).settings;
    const slugRow = row(canvasElement, s.slug.label);
    await expect(slugRow).toHaveTextContent(`/${longSlug}`);
    await expect(overflowsX(slugRow)).toBe(false);
    await expect(overflowsX(document.body)).toBe(false);

    await userEvent.click(slugRow);
    const dialog = await screen.findByRole("dialog", { name: s.slug.label });
    await expect(
      within(dialog).getByRole("textbox", { name: s.slug.label }),
    ).toHaveValue(longSlug);
    await expect(overflowsX(dialog)).toBe(false);
    await expect(overflowsX(document.body)).toBe(false);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(row(canvasElement, s.publication.label));
    const unpublish = await screen.findByRole("dialog", {
      name: s.publication.unpublishTitle,
    });
    await expect(unpublish).toHaveTextContent(`/${longSlug}`);
    await expect(overflowsX(unpublish)).toBe(false);
    await expect(overflowsX(document.body)).toBe(false);
  },
};

export const LongSlugUkrainian: Story = {
  ...LongSlug,
  globals: { locale: "uk" },
};
