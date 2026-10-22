import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/errors/en.json";
import ru from "../../messages/errors/ru.json";
import uk from "../../messages/errors/uk.json";
import ErrorPage from "./error";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

const meta = {
  title: "App/ErrorPage",
  component: ErrorPage,
  args: { retry: fn() },
} satisfies Meta<typeof ErrorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args, globals }) => {
    const t = texts(globals.locale);
    await expect(canvas.getByRole("heading", { name: t.title })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: t.retry }));
    await expect(args.retry).toHaveBeenCalledOnce();
  },
};
