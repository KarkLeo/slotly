import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { expect, mocked, waitFor, within } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { intersects, overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { MasterShell } from "./shell";

const dictionaries = { uk, ru, en };

const textsOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"].MasterCabinet;

const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");

function stubOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function restoreOnLine() {
  Reflect.deleteProperty(navigator, "onLine");
  if (original) Object.defineProperty(Navigator.prototype, "onLine", original);
}

const cards = Array.from({ length: 20 }, (_, i) => (
  <div key={i} className="mb-3 rounded-2xl bg-card p-4">
    Card {i + 1}
  </div>
));

const meta = {
  title: "MasterCabinet/MasterShell",
  component: MasterShell,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile360" } },
  args: { theme: "system", email: "master@example.com", children: cards },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app");
  },
} satisfies Meta<typeof MasterShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Phone: Story = {
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    const nav = canvas.getByRole("navigation", { name: t.navigation });
    const last = canvas.getByText("Card 20");
    last.scrollIntoView({ block: "end" });
    window.scrollTo(0, document.documentElement.scrollHeight);
    await waitFor(() => expect(intersects(last, nav)).toBe(false));
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const Desktop: Story = {
  globals: { viewport: { value: "desktop1280" } },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = textsOf(globals.locale);
    const sidebar = canvas.getByRole("complementary");
    await expect(sidebar).toBeVisible();
    const bar = [...canvasElement.querySelectorAll("nav")].find(
      (n) => !sidebar.contains(n),
    )!;
    await expect(bar).not.toBeVisible();
    await expect(
      within(sidebar).getByRole("link", { name: t.sections.today }),
    ).toBeVisible();
  },
};

export const Offline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvas, globals }) => {
    const t = textsOf(globals.locale);
    await expect(canvas.getByRole("status")).toHaveTextContent(t.offline);
    await waitFor(() =>
      expect(
        Number(getComputedStyle(canvas.getByRole("main")).opacity),
      ).toBeLessThan(1),
    );
    await expect(
      getComputedStyle(canvas.getByRole("navigation", { name: t.navigation }))
        .opacity,
    ).toBe("1");
  },
};
