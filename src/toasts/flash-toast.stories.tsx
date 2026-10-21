import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { expect, mocked, screen, userEvent, waitFor } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { Toaster } from "@/components/ui/sonner";
import { FlashToast } from "./flash-toast";
import { flashCookie } from "./toast";

const dictionaries = { uk, ru, en };

function texts(locale: unknown) {
  return dictionaries[locale === "ru" || locale === "en" ? locale : "uk"]
    .Toasts;
}

function flashCookieValue() {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${flashCookie}=`));
}

const meta = {
  title: "Toasts/FlashToast",
  component: FlashToast,
  render: () => (
    <>
      <Toaster />
      <FlashToast />
    </>
  ),
  afterEach: () => {
    toast.dismiss();
  },
} satisfies Meta<typeof FlashToast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {
  beforeEach: () => {
    document.cookie = `${flashCookie}=success%3AsignedOut; path=/`;
  },
  play: async ({ globals }) => {
    const text = texts(globals.locale).signedOut;
    await waitFor(() => expect(screen.getByText(text)).toBeVisible());
    await waitFor(() => expect(flashCookieValue()).toBeUndefined());
  },
};

export const LinkExpiredRu: Story = {
  globals: { locale: "ru" },
  beforeEach: () => {
    document.cookie = `${flashCookie}=error:linkExpired; path=/`;
  },
  play: async () => {
    await waitFor(() =>
      expect(screen.getByText(ru.Toasts.linkExpired)).toBeVisible(),
    );
  },
};

export const Garbage: Story = {
  beforeEach: () => {
    document.cookie = `${flashCookie}=error:nope; path=/`;
  },
  play: async () => {
    await waitFor(() => expect(flashCookieValue()).toBeUndefined());
    await expect(document.querySelector("[data-sonner-toast]")).toBeNull();
  },
};

function Rerender() {
  const [, setCount] = useState(0);
  return (
    <>
      <Toaster />
      <FlashToast />
      <button type="button" onClick={() => setCount((count) => count + 1)}>
        Rerender
      </button>
    </>
  );
}

export const AfterNavigation: Story = {
  render: () => <Rerender />,
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/login");
  },
  play: async ({ canvas, globals }) => {
    const text = texts(globals.locale).signedIn;
    document.cookie = `${flashCookie}=success%3AsignedIn; path=/`;
    await userEvent.click(canvas.getByRole("button", { name: "Rerender" }));
    await expect(screen.queryByText(text)).toBeNull();
    mocked(usePathname).mockReturnValue("/app");
    await userEvent.click(canvas.getByRole("button", { name: "Rerender" }));
    await waitFor(() => expect(screen.getByText(text)).toBeVisible());
    await waitFor(() => expect(flashCookieValue()).toBeUndefined());
  },
};
