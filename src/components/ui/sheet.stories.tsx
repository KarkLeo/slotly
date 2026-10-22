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
  SheetFooter,
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
  contentClassName,
  withFooter = false,
}: {
  withCard?: boolean;
  title?: string;
  lines?: number;
  contentClassName?: string;
  withFooter?: boolean;
}) {
  return (
    <div className="p-4">
      <Sheet>
        <SheetTrigger render={<Button />}>Review booking</SheetTrigger>
        <SheetContent side="bottom" className={contentClassName}>
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
          {withFooter && (
            <SheetFooter data-testid="footer">
              <Button>Confirm</Button>
            </SheetFooter>
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
  args: { lines: 60, contentClassName: "pb-6" },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog");
    settle();
    await expect(sheet.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    const last = within(sheet).getByText("Line 60 of the booking details.");
    const close = within(sheet).getByRole("button", { name: uk.UI.close });
    await waitFor(() => {
      settle();
      expect(sheet.getAnimations()).toHaveLength(0);
    });
    // The sticky close button takes no room: the header starts at the top edge.
    await expect(
      sheet.querySelector("[data-slot=sheet-header]")!.getBoundingClientRect()
        .top - sheet.getBoundingClientRect().top,
    ).toBe(0);
    const closeTop = close.getBoundingClientRect().top;
    // Scrolling is ignored until the opening transition has laid the sheet out, so retry it.
    await waitFor(() => {
      settle();
      sheet.scrollTop = sheet.scrollHeight;
      expect(sheet.scrollTop).toBeGreaterThan(0);
      expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight,
      );
    });
    // The close button stays where it was while the content scrolls under it.
    await expect(close.getBoundingClientRect().top).toBeCloseTo(closeTop, 0);
    // The caller's own padding wins over the default.
    await expect(getComputedStyle(sheet).paddingBottom).toBe("24px");
  },
};

export const EscapeCloses: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Review booking" });
    await userEvent.click(trigger);
    const sheet = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(sheet).toContainElement(document.activeElement as HTMLElement),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const DefaultBottomSpacing: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog");
    await expect(getComputedStyle(sheet).paddingBottom).toBe("16px");
  },
};

export const FooterSpacing: Story = {
  args: { withFooter: true },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Review booking" }),
    );
    const sheet = await screen.findByRole("dialog");
    // The footer brings its own padding; the sheet adds none after it.
    await expect(getComputedStyle(sheet).paddingBottom).toBe("0px");
  },
};
