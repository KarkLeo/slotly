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
    // globals.css and supabase/templates/ define raw colors by design and are not JavaScript.
    files: ["src/**/*.{ts,tsx}", ".storybook/**/*.{ts,tsx}"],
    // OG images render outside the CSS pipeline and need literal colors.
    ignores: ["**/opengraph-image.tsx"],
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
