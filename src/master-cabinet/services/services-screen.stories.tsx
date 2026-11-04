import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import {
  overflowsX,
  restoreOnLine,
  settle,
  stubOnLine,
} from "@/components/ui/story-helpers";
import { reorderServices, restoreService } from "./actions";
import { ServicesScreen } from "./services-screen";
import {
  ids,
  localeOf,
  servicesStories,
  servicesView,
  textsOf,
} from "./story-services";
import type { ServicesData } from "./view";

const meta = {
  title: "MasterCabinet/ServicesScreen",
  component: ServicesScreen,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
    data: servicesStories.full,
  },
  globals: { viewport: { value: "mobile360" } },
  args: {
    view: servicesView(servicesStories.full, "uk"),
    theme: "system",
    email: "master@example.com",
  },
  beforeEach: () => {
    mocked(usePathname).mockReturnValue("/app/services");
    return () => toast.dismiss();
  },
  render: (args, { globals, parameters }) => (
    <div className="p-4">
      <Toaster />
      <ServicesScreen
        {...args}
        view={servicesView(
          parameters.data as ServicesData,
          localeOf(globals.locale),
        )}
      />
    </div>
  ),
} satisfies Meta<typeof ServicesScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, globals }) => {
    const t = textsOf(globals.locale).MasterCabinet;
    const s = t.services;
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.sections.services }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: t.back })).toBeVisible();
    await expect(canvas.getByRole("button", { name: s.add })).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: s.order.open }),
    ).toBeVisible();

    const nails = canvas.getByRole("region", {
      name: globals.locale === "en" ? "Nails" : "Нігті",
    });
    await expect(nails).toHaveTextContent(
      globals.locale === "en" ? "Gel manicure" : "Манікюр з покриттям",
    );
    await expect(nails).toHaveTextContent("900");
    await expect(nails).toHaveTextContent(s.formats.on_site);

    const other = canvas.getByRole("region", { name: s.noCategory });
    await expect(other).toHaveTextContent(s.formats.at_client);
    await expect(other).toHaveTextContent(s.form.priceKinds.none);

    const archive = canvas.getByRole("region", { name: s.archive.title });
    await expect(archive).toHaveTextContent("Френч");
    await expect(
      canvas.queryByRole("region", { name: "Брови" }),
    ).not.toBeInTheDocument();
    await expect(overflowsX(document.documentElement)).toBe(false);
  },
};

export const DefaultRussian: Story = {
  ...Default,
  globals: { locale: "ru" },
};

export const DefaultEnglish: Story = {
  ...Default,
  globals: { locale: "en" },
};

export const NoCategories: Story = {
  parameters: { data: servicesStories.noCategories },
  play: async ({ canvasElement, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.services;
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading", { level: 2 })).toBeNull();
    await expect(canvas.getByText("Манікюр вдома")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: s.categories.title }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: { data: servicesStories.empty },
  play: async ({ canvasElement, userEvent, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.services;
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: s.order.open }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: s.add }));
    await screen.findByRole("dialog", { name: s.addTitle });
  },
};

export const EmptyRussian: Story = { ...Empty, globals: { locale: "ru" } };

export const EmptyEnglish: Story = { ...Empty, globals: { locale: "en" } };

export const ArchivedOnly: Story = {
  parameters: { data: servicesStories.archivedOnly },
  play: async ({ canvasElement, globals }) => {
    const s = textsOf(globals.locale).MasterCabinet.services;
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: s.add })).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: s.order.open }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("region", { name: s.archive.title }),
    ).toBeVisible();
  },
};

export const LongTexts: Story = {
  parameters: { data: servicesStories.longTexts },
  globals: { locale: "ru" },
  play: async () => {
    await expect(overflowsX(document.documentElement)).toBe(false);
    await expect(overflowsX(document.body)).toBe(false);
  },
};

export const Restore: Story = {
  beforeEach: () => {
    mocked(restoreService).mockResolvedValue({
      toast: { type: "success", key: "serviceRestored" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.services;
    const name = s.archive.restoreLabel.replace("{name}", "Френч");
    await userEvent.click(within(canvasElement).getByRole("button", { name }));
    await waitFor(() => expect(restoreService).toHaveBeenCalledTimes(1));
    await expect(mocked(restoreService).mock.calls[0][1].get("id")).toBe(
      ids.french,
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.serviceRestored)).toBeVisible(),
    );
  },
};

const rowOrder = (region: HTMLElement) =>
  within(region)
    .getAllByRole("listitem")
    .map((item) => item.textContent);

export const Order: Story = {
  beforeEach: () => {
    mocked(reorderServices).mockResolvedValue({});
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.services;
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: s.order.open }));
    await expect(canvas.getByText(s.order.hint)).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: s.add }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("region", { name: s.archive.title }),
    ).not.toBeInTheDocument();

    const up = (name: string) =>
      canvas.getByRole("button", {
        name: s.order.up.replace("{name}", name),
      });
    const top = up("Манікюр з покриттям");
    await expect(top).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(top);
    await expect(reorderServices).not.toHaveBeenCalled();

    const moved = up("Зняття покриття");
    await userEvent.click(moved);
    await waitFor(() =>
      expect(reorderServices).toHaveBeenCalledWith([ids.removal, ids.gel]),
    );
    await expect(
      canvas.getByText(
        s.order.moved
          .replace("{name}", "Зняття покриття")
          .replace("{position}", "1")
          .replace("{total}", "2"),
      ),
    ).toBeInTheDocument();
    await expect(moved).toHaveFocus();
    await expect(screen.queryByText(texts.Toasts.settingsSaved)).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: s.order.done }));
    await expect(canvas.getByRole("button", { name: s.add })).toBeVisible();
  },
};

export const OrderRussian: Story = { ...Order, globals: { locale: "ru" } };

export const OrderFailure: Story = {
  beforeEach: () => {
    mocked(reorderServices).mockResolvedValue({
      toast: { type: "error", key: "unexpected" },
    });
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const texts = textsOf(globals.locale);
    const s = texts.MasterCabinet.services;
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: s.order.open }));
    const nails = canvas.getByRole("region", { name: "Нігті" });
    const before = rowOrder(nails);
    await userEvent.click(
      canvas.getByRole("button", {
        name: s.order.up.replace("{name}", "Зняття покриття"),
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(texts.Toasts.unexpected)).toBeVisible(),
    );
    await waitFor(() => expect(rowOrder(nails)).toEqual(before));
  },
};

export const Offline: Story = {
  beforeEach: () => {
    stubOnLine(false);
    return restoreOnLine;
  },
  play: async ({ canvasElement, userEvent, globals }) => {
    const t = textsOf(globals.locale).MasterCabinet;
    const s = t.services;
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", {
        name: s.archive.restoreLabel.replace("{name}", "Френч"),
      }),
    ).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: s.add }));
    const dialog = await screen.findByRole("dialog", { name: s.addTitle });
    await waitFor(() => {
      settle();
      return expect(within(dialog).getByText(t.offline)).toBeVisible();
    });
    await expect(
      within(dialog).getByRole("button", { name: s.form.add }),
    ).toBeDisabled();
  },
};
