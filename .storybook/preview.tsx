import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
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
    viewport: { value: "mobile390", isRotated: false },
  },
};

export default preview;
