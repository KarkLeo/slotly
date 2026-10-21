import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "src/components/ui");
const hookCall = /(^|[^.\w])use[A-Z]\w*\(|React\.use[A-Z]\w*\(/m;

const components = readdirSync(dir).filter(
  (file) => file.endsWith(".tsx") && !file.endsWith(".stories.tsx"),
);

describe("ui primitives", () => {
  it.each(components)("%s is a client component if it calls a hook", (file) => {
    const source = readFileSync(join(dir, file), "utf8");
    if (!hookCall.test(source)) return;
    expect(source.startsWith('"use client";')).toBe(true);
  });
});
