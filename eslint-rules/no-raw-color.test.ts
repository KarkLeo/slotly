import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import rule from "./no-raw-color.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-raw-color", rule, {
  valid: [
    'const a = "bg-primary text-primary-foreground";',
    'const a = "border-input hover:bg-accent dark:text-muted-foreground";',
    'const a = "text-destructive bg-destructive-solid bg-chart-3/50";',
    'const a = "fill-current stroke-transparent text-current";',
    'const a = <div className="rounded-full bg-card p-4" />;',
    'const a = <div style={{ color: "var(--primary)", background: "transparent" }} />;',
    'const a = <div style={{ borderColor: "currentColor", fill: "inherit" }} />;',
    'const a = <div style={{ width: "100%", display: "grid" }} />;',
    'const a = <div style={{ boxShadow: "none" }} />;',
    'const a = "/oauth/consent?authorization_id=abc#top";',
    'const a = "errors.invalidEmail";',
    "const a = `text-${tone}-foreground`;",
    'const a = "red-carpet event";',
  ],
  invalid: [
    { code: 'const a = "#fff";', errors: [{ messageId: "hex" }] },
    { code: 'const a = "#8A5652";', errors: [{ messageId: "hex" }] },
    { code: 'const a = "bg-[#ffcc00]";', errors: [{ messageId: "hex" }] },
    { code: 'const a = "#00000080";', errors: [{ messageId: "hex" }] },
    {
      code: 'const a = "rgb(0, 0, 0)";',
      errors: [{ messageId: "colorFunction" }],
    },
    {
      code: 'const a = "text-[rgba(0,0,0,0.5)]";',
      errors: [{ messageId: "colorFunction" }],
    },
    {
      code: 'const a = "hsl(10 20% 30%)";',
      errors: [{ messageId: "colorFunction" }],
    },
    {
      code: 'const a = "oklch(0.6 0.1 20)";',
      errors: [{ messageId: "colorFunction" }],
    },
    { code: 'const a = "bg-zinc-100";', errors: [{ messageId: "palette" }] },
    {
      code: 'const a = "p-2 text-red-600";',
      errors: [{ messageId: "palette" }],
    },
    { code: 'const a = "hover:bg-white";', errors: [{ messageId: "palette" }] },
    {
      code: 'const a = "dark:border-slate-700/50";',
      errors: [{ messageId: "palette" }],
    },
    {
      code: 'const a = "ring-offset-black";',
      errors: [{ messageId: "palette" }],
    },
    {
      code: "const a = `from-rose-500 ${x}`;",
      errors: [{ messageId: "palette" }],
    },
    {
      code: 'const a = <p className="text-emerald-950" />;',
      errors: [{ messageId: "palette" }],
    },
    {
      code: 'const a = <div style={{ color: "red" }} />;',
      errors: [{ messageId: "styleColor" }],
    },
    {
      code: 'const a = <div style={{ backgroundColor: "#fff" }} />;',
      errors: [{ messageId: "styleColor" }],
    },
    {
      code: 'const a = <div style={{ boxShadow: "0 0 0 1px black" }} />;',
      errors: [{ messageId: "styleColor" }],
    },
    { code: 'const a = "bg-taupe-100";', errors: [{ messageId: "palette" }] },
    { code: 'const a = "text-mauve-700";', errors: [{ messageId: "palette" }] },
    {
      code: 'const a = "inset-shadow-black/20";',
      errors: [{ messageId: "palette" }],
    },
    {
      code: 'const a = "border-s-red-500";',
      errors: [{ messageId: "palette" }],
    },
    {
      code: 'const a = "text-shadow-red-500";',
      errors: [{ messageId: "palette" }],
    },
    {
      code: 'const a = "drop-shadow-black/50";',
      errors: [{ messageId: "palette" }],
    },
    // Known false positive: anchors that look like hex need an inline disable with a reason.
    { code: 'const a = "#add";', errors: [{ messageId: "hex" }] },
  ],
});
