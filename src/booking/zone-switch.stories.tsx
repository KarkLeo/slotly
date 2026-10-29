import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uk from "../../messages/uk.json";
import { isLocale } from "@/i18n/locales";
import { ZoneSwitch } from "./zone-switch";

const dictionaries = { uk, ru, en };

const texts = (locale: unknown) =>
  dictionaries[isLocale(locale) ? locale : "uk"].SlotPicker;

const meta = {
  title: "Booking/ZoneSwitch",
  component: ZoneSwitch,
  args: {
    client: "America/New_York",
    master: "Europe/Kyiv",
    masterChosen: false,
    onChoose: fn(),
  },
  render: (args) => (
    <div className="p-4">
      <ZoneSwitch {...args} />
    </div>
  ),
} satisfies Meta<typeof ZoneSwitch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args, globals }) => {
    const t = texts(globals.locale);
    const own = canvas.getByRole("radio", { name: new RegExp(t.clientZone) });
    const master = canvas.getByRole("radio", {
      name: new RegExp(t.masterZone),
    });
    await expect(canvas.getByRole("group", { name: t.zones })).toBeVisible();
    await expect(own).toBeChecked();
    await userEvent.click(master);
    await expect(args.onChoose).toHaveBeenCalledWith(true);
  },
};

export const Russian: Story = { ...Default, globals: { locale: "ru" } };

export const English: Story = { ...Default, globals: { locale: "en" } };

export const MasterChosen: Story = {
  args: { masterChosen: true },
  play: async ({ canvas, userEvent, args, globals }) => {
    const t = texts(globals.locale);
    await expect(
      canvas.getByRole("radio", { name: new RegExp(t.masterZone) }),
    ).toBeChecked();
    await userEvent.click(
      canvas.getByRole("radio", { name: new RegExp(t.clientZone) }),
    );
    await expect(args.onChoose).toHaveBeenCalledWith(false);
  },
};

// The longest zone names wrap inside their half of a narrow screen.
export const LongZoneNames: Story = {
  args: { client: "America/Argentina/Buenos_Aires", master: "Asia/Kathmandu" },
};
