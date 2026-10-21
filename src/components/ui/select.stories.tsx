import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { boxHeight, overflowsX } from "./story-helpers";

const services = [
  { value: "manicure", label: "Manicure" },
  { value: "pedicure", label: "Pedicure" },
  { value: "brows", label: "Brows" },
  {
    value: "gel",
    label: "Classic manicure with gel polish and nail strengthening",
  },
];

type DemoProps = {
  size?: "default" | "sm";
  invalid?: boolean;
  disabled?: boolean;
  defaultValue?: string;
};

function SelectDemo({ size, invalid, disabled, defaultValue }: DemoProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <Label id="service-label">Service</Label>
      <Select items={services} defaultValue={defaultValue} disabled={disabled}>
        <SelectTrigger
          aria-labelledby="service-label"
          aria-invalid={invalid || undefined}
          size={size}
          className="w-full"
        >
          <SelectValue placeholder="Choose a service" />
        </SelectTrigger>
        <SelectContent>
          {services.map((service) => (
            <SelectItem key={service.value} value={service.value}>
              {service.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const meta = {
  title: "UI/Inputs/Select",
  component: SelectDemo,
} satisfies Meta<typeof SelectDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Service" });
    await expect(boxHeight(trigger)).toBe(44);
    await expect(getComputedStyle(trigger).fontSize).toBe("16px");
    await userEvent.click(trigger);
    const option = await screen.findByRole("option", { name: "Pedicure" });
    await expect(boxHeight(option)).toBeGreaterThanOrEqual(44);
    await userEvent.click(option);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await expect(trigger).toHaveTextContent("Pedicure");
  },
};

export const Small: Story = {
  args: { size: "sm" },
  play: async ({ canvas }) => {
    await expect(boxHeight(canvas.getByRole("combobox"))).toBe(36);
  },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "manicure" },
};

export const LongText: Story = {
  args: { defaultValue: "gel" },
  play: async ({ canvas }) => {
    await expect(overflowsX(canvas.getByRole("combobox"))).toBe(false);
  },
};

export const EscapeThenOpen: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Service" });
    await userEvent.click(trigger);
    const listbox = await screen.findByRole("listbox");
    await waitFor(() =>
      expect(listbox).toContainElement(document.activeElement as HTMLElement),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await expect(trigger).toHaveFocus();
    // Left open so the a11y check runs on the popup.
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
  },
};
