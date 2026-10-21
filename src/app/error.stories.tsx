import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import ErrorPage from "./error";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"]
    .Errors;
}

const meta = {
  title: "App/ErrorPage",
  component: ErrorPage,
  args: { error: new Error("boom"), retry: fn() },
  beforeEach: () => {
    const log = console.error;
    console.error = () => {};
    return () => {
      console.error = log;
    };
  },
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
