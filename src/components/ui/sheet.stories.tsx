import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import uk from "../../../messages/uk.json";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import {
  computedColor,
  intersects,
  resolvedColor,
  settle,
} from "./story-helpers";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"].UI;
}

function SheetDemo({
  withCard = false,
  title = "Your booking",
  lines = 0,
}: {
  withCard?: boolean;
  title?: string;
  lines?: number;
}) {
  return (
    <div className="p-4">
      <Sheet>
        <SheetTrigger render={<Button />}>Review booking</SheetTrigger>
        <SheetContent side="bottom" className="pb-6">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              Check the details before confirming.
            </SheetDescription>
          </SheetHeader>
          {Array.from({ length: lines }, (_, index) => (
            <p key={index} className="px-4">
              Line {index + 1} of the booking details.
            </p>
          ))}
          {withCard && (
            <Card variant="inset" className="mx-4" data-testid="summary">
              <CardHeader>
                <CardTitle>Manicure with gel polish</CardTitle>
              </CardHeader>
              <CardContent>Tomorrow, 14:00 · 90 min · 900 UAH</CardContent>
            </Card>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const meta = {
  title: "UI/Overlays/Sheet",
  component: SheetDemo,
} satisfies Meta<typeof SheetDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bottom: Story = {
  play: async ({ canvas, globals }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog", { name: "Your booking" });
    await userEvent.click(
      within(sheet).getByRole("button", { name: texts(globals.locale).close }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const SummaryCard: Story = {
  args: { withCard: true },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog");
    const card = within(sheet).getByTestId("summary");
    await expect(computedColor(card)).toBe(resolvedColor("bg-secondary"));
    await expect(computedColor(card)).not.toBe(computedColor(sheet));
  },
};

export const LongTitle: Story = {
  args: {
    title:
      "Your booking for a classic manicure with gel polish and nail strengthening",
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog");
    const close = sheet.querySelector('[data-slot="sheet-close"]')!;
    await expect(intersects(within(sheet).getByRole("heading"), close)).toBe(
      false,
    );
  },
};

export const TallContent: Story = {
  args: { lines: 60 },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog");
    settle();
    await expect(sheet.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    await expect(sheet.scrollHeight).toBeGreaterThan(sheet.clientHeight);
  },
};

export const EscapeCloses: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Review booking" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
