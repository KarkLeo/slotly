import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useRef, useState } from "react";

const swatches = [
  ["background", "bg-background", "text-foreground"],
  ["card", "bg-card", "text-card-foreground"],
  ["popover", "bg-popover", "text-popover-foreground"],
  ["primary", "bg-primary", "text-primary-foreground"],
  ["secondary", "bg-secondary", "text-secondary-foreground"],
  ["muted", "bg-muted", "text-muted-foreground"],
  ["accent", "bg-accent", "text-accent-foreground"],
  [
    "destructive-solid",
    "bg-destructive-solid",
    "text-destructive-solid-foreground",
  ],
  ["border", "bg-border", "text-foreground"],
  ["input", "bg-input", "text-background"],
  ["ring", "bg-ring", "text-primary-foreground"],
  ["chart-1", "bg-chart-1", "text-background"],
  ["chart-2", "bg-chart-2", "text-background"],
  ["chart-3", "bg-chart-3", "text-background"],
  ["chart-4", "bg-chart-4", "text-background"],
  ["chart-5", "bg-chart-5", "text-background"],
] as const;

function channels(color: string) {
  return color
    .match(/\d+(\.\d+)?/g)!
    .slice(0, 3)
    .map(Number);
}

function toHex(color: string) {
  return channels(color)
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("");
}

function luminance(color: string) {
  const [r, g, b] = channels(color).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function Swatch({
  name,
  fill,
  ink,
}: {
  name: string;
  fill: string;
  ink: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState("");

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const style = getComputedStyle(ref.current);
      const [a, b] = [
        luminance(style.backgroundColor),
        luminance(style.color),
      ].sort((x, y) => y - x);
      setInfo(
        `${toHex(style.backgroundColor)} · ${((a + 0.05) / (b + 0.05)).toFixed(1)}:1`,
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={ref}
        className={`${fill} ${ink} rounded-lg p-3 text-sm font-semibold`}
      >
        Aa {name}
      </div>
      <span className="text-xs text-muted-foreground">{info}</span>
    </div>
  );
}

function Palette() {
  return (
    <div className="grid grid-cols-2 gap-3 bg-background p-4">
      {swatches.map(([name, fill, ink]) => (
        <Swatch key={name} name={name} fill={fill} ink={ink} />
      ))}
      <p className="col-span-2 text-sm text-destructive">
        destructive: Перевірте адресу email.
      </p>
    </div>
  );
}

const meta = {
  title: "Foundations/Palette",
  component: Palette,
  parameters: { a11y: { test: "todo" } },
} satisfies Meta<typeof Palette>;

export default meta;

export const Tokens: StoryObj<typeof meta> = {};
