import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale, type Locale } from "@/i18n/locales";
import { OfflineBanner } from "./offline-banner";

const dictionaries = { uk, ru, en };

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : "uk");

const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");

function stubOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function restoreOnLine() {
  Reflect.deleteProperty(navigator, "onLine");
  if (original) Object.defineProperty(Navigator.prototype, "onLine", original);
}

const meta = {
  title: "App/OfflineBanner",
  component: OfflineBanner,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof OfflineBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Online: Story = {
  beforeEach: () => {
    stubOnLine(true);
    return restoreOnLine;
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toBeEmptyDOMElement();
  },
};

export const Offline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvas, globals }) => {
    const t = dictionaries[localeOf(globals.locale)].MasterCabinet;
    await expect(canvas.getByRole("status")).toHaveTextContent(t.offline);
    stubOnLine(true);
    window.dispatchEvent(new Event("online"));
    await waitFor(() =>
      expect(canvas.getByRole("status")).toBeEmptyDOMElement(),
    );
  },
};

export const OfflineRussian: Story = {
  ...Offline,
  globals: { locale: "ru" },
};

export const OfflineEnglish: Story = {
  ...Offline,
  globals: { locale: "en" },
};
