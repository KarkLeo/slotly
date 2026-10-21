import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Toaster } from "@/components/ui/sonner";
import { boxHeight } from "@/components/ui/story-helpers";
import { ConsentForm } from "./consent-form";
import { decideAuthorization } from "./oauth-actions";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"];
}

const meta = {
  title: "Auth/ConsentForm",
  component: ConsentForm,
  args: { authorizationId: "abc" },
  render: (args) => (
    <div className="p-4">
      <Toaster />
      <ConsentForm {...args} />
    </div>
  ),
  beforeEach: () => {
    mocked(decideAuthorization).mockReset();
  },
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof ConsentForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DecisionFailed: Story = {
  beforeEach: () => {
    mocked(decideAuthorization).mockResolvedValue({
      toast: { type: "error", key: "decisionFailed" },
    });
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale);
    const approve = canvas.getByRole("button", {
      name: t.OAuthConsent.approve,
    });
    await expect(boxHeight(approve)).toBe(44);
    await userEvent.click(approve);
    await waitFor(() =>
      expect(screen.getByText(t.Toasts.decisionFailed)).toBeVisible(),
    );
    const sent = mocked(decideAuthorization).mock.calls[0][1];
    await expect(sent.get("decision")).toBe("approve");
    await expect(sent.get("authorization_id")).toBe("abc");
  },
};

export const Pending: Story = {
  beforeEach: () => {
    mocked(decideAuthorization).mockReturnValue(new Promise(() => {}));
  },
  play: async ({ canvas, userEvent, globals }) => {
    const t = texts(globals.locale).OAuthConsent;
    const deny = canvas.getByRole("button", { name: t.deny });
    await userEvent.click(deny);
    await waitFor(() => expect(deny).toHaveAttribute("aria-busy", "true"));
    await expect(
      canvas.getByRole("button", { name: t.approve }),
    ).not.toHaveAttribute("aria-busy");
  },
};
