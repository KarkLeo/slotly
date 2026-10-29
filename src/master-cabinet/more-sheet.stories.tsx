import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import {
  expect,
  mocked,
  screen,
  spyOn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Button } from "@/components/ui/button";
import { boxWidth, overflowsX } from "@/components/ui/story-helpers";
import { isLocale, type Locale } from "@/i18n/locales";
import { MoreSheet } from "./more-sheet";
import { sections } from "./sections";

const dictionaries = { uk, ru, en };

const dictionaryOf = (locale: unknown) =>
  dictionaries[isLocale(locale) ? (locale as Locale) : "uk"];

const meta = {
  title: "MasterCabinet/MoreSheet",
  component: MoreSheet,
  globals: { viewport: { value: "mobile360" } },
  args: {
    theme: "system",
    email: "master@example.com",
    trigger: <Button>Open</Button>,
  },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/agents");
  },
} satisfies Meta<typeof MoreSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas, args, globals }) => {
    const t = dictionaryOf(globals.locale);
    const consoleError = spyOn(console, "error");
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", {
      name: t.MasterCabinet.more,
    });
    const more = sections.filter((s) => s.place === "more");
    await waitFor(() =>
      expect(
        within(dialog).getByRole("link", {
          name: t.MasterCabinet.sections.agents,
        }),
      ).toBeVisible(),
    );
    const links = within(dialog)
      .getAllByRole("link")
      .filter((link) => more.some((s) => s.href === link.getAttribute("href")));
    await expect(links.map((l) => l.getAttribute("href"))).toEqual(
      more.map((s) => s.href),
    );
    await expect(links.map((l) => l.textContent)).toEqual(
      more.map((s) => t.MasterCabinet.sections[s.key]),
    );
    await expect(
      within(dialog).getByRole("link", {
        name: t.MasterCabinet.sections.agents,
      }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      within(dialog).getByRole("link", { name: t.MasterCabinet.clientRole }),
    ).toHaveAttribute("href", "/app/bookings");
    await expect(
      within(dialog).getByRole("button", { name: t.Cabinet.signOut }),
    ).toBeVisible();
    await expect(within(dialog).getByText(args.email!)).toBeVisible();
    await expect(overflowsX(dialog)).toBe(false);
    for (const link of links) await expect(link).not.toHaveAttribute("type");
    const clientRole = within(dialog).getByRole("link", {
      name: t.MasterCabinet.clientRole,
    });
    await expect(boxWidth(clientRole)).toBe(
      boxWidth(within(dialog).getByRole("button", { name: t.Cabinet.signOut })),
    );
    await userEvent.click(
      within(dialog).getByRole("link", {
        name: t.MasterCabinet.sections.services,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("nativeButton"),
    );
    consoleError.mockRestore();
  },
};

export const Russian: Story = { ...Open, globals: { locale: "ru" } };

export const English: Story = { ...Open, globals: { locale: "en" } };

export const NoEmail: Story = {
  ...Open,
  args: { email: null },
  play: async ({ canvas, globals }) => {
    const t = dictionaryOf(globals.locale);
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", {
      name: t.MasterCabinet.more,
    });
    await expect(within(dialog).queryByText(/@/)).toBeNull();
  },
};
