/// <reference types="vite/client" />
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { sb } from "storybook/test";
import en from "../messages/en.json";
import ru from "../messages/ru.json";
import uk from "../messages/uk.json";
import { fontVariables } from "../src/app/fonts";
import { defaultLocale, isLocale, locales } from "../src/i18n/locales";
import "../src/app/globals.css";

sb.mock(import("../src/auth/actions.ts"));
sb.mock(import("../src/i18n/actions.ts"));

const messages = { uk, ru, en };

const defaultTheme =
  import.meta.env.VITE_STORY_THEME === "dark" ? "dark" : "light";

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const locale = isLocale(context.globals.locale)
        ? context.globals.locale
        : defaultLocale;
      document.documentElement.lang = locale;
      document.documentElement.classList.add(...fontVariables.split(" "));
      return (
        <NextIntlClientProvider
          locale={locale}
          messages={messages[locale]}
          timeZone="UTC"
        >
          <Story />
        </NextIntlClientProvider>
      );
    },
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme,
    }),
  ],
  globalTypes: {
    locale: {
      description: "Interface language",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: locales.map((locale) => ({
          value: locale,
          title: messages[locale].LocaleSwitcher[locale],
        })),
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile360: {
          name: "Mobile 360",
          styles: { width: "360px", height: "780px" },
          type: "mobile",
        },
        mobile390: {
          name: "Mobile 390",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        tablet768: {
          name: "Tablet 768",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop1280: {
          name: "Desktop 1280",
          styles: { width: "1280px", height: "800px" },
          type: "desktop",
        },
      },
    },
  },
  initialGlobals: {
    locale: defaultLocale,
    viewport: { value: "mobile390", isRotated: false },
  },
};

export default preview;
