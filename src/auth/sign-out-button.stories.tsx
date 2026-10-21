import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { SignOutButton } from "./sign-out-button";

let release = () => {};
let pending: Promise<void> = Promise.resolve();

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"]
    .Cabinet;
}

const meta = {
  title: "Auth/SignOutButton",
  component: SignOutButton,
  render: () => (
    <form className="p-4" action={() => pending}>
      <SignOutButton />
    </form>
  ),
  beforeEach: () => {
    pending = new Promise((resolve) => {
      release = resolve;
    });
    // React 19 entangles pending actions; a never-settling one would block later stories.
    return () => release();
  },
} satisfies Meta<typeof SignOutButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  play: async ({ canvas, userEvent, globals }) => {
    const button = canvas.getByRole("button", {
      name: texts(globals.locale).signOut,
    });
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
  },
};
