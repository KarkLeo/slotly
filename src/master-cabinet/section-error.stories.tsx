import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/errors/en.json";
import ru from "../../messages/errors/ru.json";
import uk from "../../messages/errors/uk.json";
import { SectionError } from "./section-error";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

const meta = {
  title: "MasterCabinet/SectionError",
  component: SectionError,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile360" } },
  args: { onRetry: fn() },
} satisfies Meta<typeof SectionError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args, globals }) => {
    const t = texts(globals.locale);
    await expect(canvas.getByRole("heading", { name: t.title })).toBeVisible();
    await expect(canvas.getByText(t.description)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: t.retry }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };
