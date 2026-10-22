import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import type { Landing } from "./landing";
import { LandingPage } from "./landing-page";
import { toLandingView } from "./view";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const plain = (message: string) => message.replace(/<\/?\w+>/g, "");

const olena: Landing = {
  id: "olena",
  slug: "olena-nails",
  name: "Олена Мельник",
  primaryLocale: "uk",
  locales: ["uk", "en"],
  currency: "UAH",
  published: true,
  categories: [
    {
      id: "manicure",
      position: 0,
      name: { uk: "Манікюр", en: "Manicure", ru: "Маникюр" },
    },
    {
      id: "pedicure",
      position: 1,
      name: { uk: "Педикюр", en: "Pedicure", ru: "Педикюр" },
    },
  ],
  services: [
    {
      id: "gel",
      categoryId: "manicure",
      position: 0,
      name: {
        uk: "Манікюр з покриттям",
        en: "Gel manicure",
        ru: "Маникюр с покрытием",
      },
      description: {
        uk: "Догляд, форма та покриття гель-лаком. Дизайн обговорюємо на місці.",
        en: "Care, shaping and gel polish. We agree on the design on site.",
      },
      durationMinutes: 90,
      priceKind: "fixed",
      price: 900,
      format: "on_site",
    },
    {
      id: "removal",
      categoryId: "manicure",
      position: 1,
      name: { uk: "Зняття покриття", en: "Gel removal" },
      description: {},
      durationMinutes: 30,
      priceKind: "fixed",
      price: 250,
      format: "on_site",
    },
    {
      id: "pedicure",
      categoryId: "pedicure",
      position: 0,
      name: { uk: "Педикюр", en: "Pedicure" },
      description: {
        uk: "Ціна залежить від стану стоп.",
        en: "The price depends on the condition of the feet.",
      },
      durationMinutes: 120,
      priceKind: "from",
      price: 1100,
      format: "at_client",
    },
    {
      id: "consultation",
      categoryId: null,
      position: 0,
      name: { uk: "Онлайн-консультація", en: "Online consultation" },
      description: {},
      durationMinutes: 30,
      priceKind: "none",
      price: null,
      format: "online",
    },
  ],
};

const meta = {
  title: "Landing/LandingPage",
  component: LandingPage,
  parameters: { layout: "fullscreen" },
  args: { view: toLandingView(olena, "uk"), initialServiceId: null },
  render: (_args, { globals, parameters }) => {
    const landing = (parameters.landing as Landing | undefined) ?? olena;
    const selected = (parameters.selected as string | undefined) ?? null;
    return (
      <LandingPage
        view={toLandingView(landing, localeOf(globals.locale))}
        initialServiceId={selected}
      />
    );
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].Landing;
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Олена Мельник" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: t.book })).toHaveAttribute(
      "href",
      "#booking",
    );

    const languages = canvas.getByRole("navigation", { name: t.languages });
    await expect(
      within(languages).getByRole("link", { name: "English" }),
    ).toHaveAttribute("href", "/olena-nails/en");

    const booking = within(
      canvas.getByRole("group", { name: plain(t.bookingTitle) }),
    );
    const [first, second] = booking.getAllByRole("radio");
    await expect(first).not.toBeChecked();
    await userEvent.click(first);
    await expect(first).toBeChecked();
    await userEvent.click(second);
    await expect(first).not.toBeChecked();
    await expect(second).toBeChecked();

    const pedicure = olena.services.find((s) => s.id === "pedicure")!;
    const name = pedicure.name[localeOf(globals.locale)] ?? pedicure.name.uk!;
    await userEvent.click(
      canvas.getByRole("link", {
        name: t.bookService.replace("{service}", name),
      }),
    );
    await expect(
      booking.getByRole("radio", { name: new RegExp(name) }),
    ).toBeChecked();
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const ServiceChosen: Story = {
  parameters: { selected: "pedicure" },
  play: async ({ canvas }) => {
    const checked = canvas
      .getAllByRole("radio")
      .filter((radio) => (radio as HTMLInputElement).checked);
    await expect(checked).toHaveLength(1);
    await expect(checked[0]).toHaveAttribute("value", "pedicure");
  },
};

export const NoCategories: Story = {
  parameters: { landing: { ...olena, categories: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("heading", { level: 3 })).toBeNull();
  },
};

export const SingleLanguage: Story = {
  parameters: { landing: { ...olena, locales: ["uk"] } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("navigation")).toBeNull();
  },
};

export const NoServices: Story = {
  parameters: { landing: { ...olena, categories: [], services: [] } },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].Landing;
    await expect(canvas.getByText(t.noServices)).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t.book })).toBeNull();
    await expect(canvas.queryByRole("radio")).toBeNull();
  },
};

export const Unpublished: Story = {
  parameters: { landing: { ...olena, published: false } },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].Landing;
    await expect(canvas.getByRole("status")).toHaveTextContent(t.unpublished);
  },
};

export const LongTexts: Story = {
  parameters: {
    landing: {
      ...olena,
      name: "Олександра-Катерина Вишневецька-Константинопольська",
      services: olena.services.map((service) => ({
        ...service,
        name: {
          uk: `${service.name.uk} з дуже довгою назвою, що не вміщується в один рядок`,
        },
      })),
    },
  },
};
