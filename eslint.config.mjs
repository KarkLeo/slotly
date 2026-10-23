import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import storybook from "eslint-plugin-storybook";
import noRawColor from "./eslint-rules/no-raw-color.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...storybook.configs["flat/recommended"],
  prettier,
  {
    // globals.css defines raw colors by design and is not JavaScript.
    files: ["src/**/*.{ts,tsx}", ".storybook/**/*.{ts,tsx}"],
    // OG images and emails render outside the CSS pipeline and need literal colors.
    ignores: ["**/opengraph-image.tsx", "src/emails/styles.ts"],
    plugins: { slotly: { rules: { "no-raw-color": noRawColor } } },
    rules: { "slotly/no-raw-color": "error" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
