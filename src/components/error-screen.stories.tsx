import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { ErrorScreen } from "./error-screen";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"]
    .Errors;
}

const meta = {
  title: "App/ErrorScreen",
  component: ErrorScreen,
  args: {
    title: uk.Errors.title,
    description: uk.Errors.description,
    retryLabel: uk.Errors.retry,
    onRetry: fn(),
  },
  render: (args, { globals }) => {
    const t = texts(globals.locale);
    return (
      <ErrorScreen
        {...args}
        title={t.title}
        description={t.description}
        retryLabel={t.retry}
      />
    );
  },
} satisfies Meta<typeof ErrorScreen>;

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
