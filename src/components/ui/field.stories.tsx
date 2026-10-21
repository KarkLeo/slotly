import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";
import { boxHeight, computedColor, resolvedColor } from "./story-helpers";
import { Switch } from "./switch";

const meta = {
  title: "UI/Forms/Field",
  component: Field,
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-4">
      <Field>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input id="phone" aria-describedby="phone-hint" />
        <FieldDescription id="phone-hint">
          We send the booking confirmation here.
        </FieldDescription>
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Phone")).toHaveAccessibleDescription(
      "We send the booking confirmation here.",
    );
    await expect(getComputedStyle(canvas.getByText("Phone")).fontSize).toBe(
      "16px",
    );
  },
};

export const Invalid: Story = {
  render: () => (
    <div className="p-4">
      <Field data-invalid>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input id="phone" aria-invalid defaultValue="12" />
        <FieldError>Enter a phone number</FieldError>
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    const error = canvas.getByRole("alert");
    await expect(error).toHaveTextContent("Enter a phone number");
    await expect(computedColor(error, "color")).toBe(
      resolvedColor("text-destructive", "color"),
    );
  },
};

export const Horizontal: Story = {
  render: () => (
    <div className="p-4">
      <Field orientation="horizontal" data-testid="row">
        <FieldLabel htmlFor="reminders">Send reminders</FieldLabel>
        <Switch id="reminders" />
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(boxHeight(canvas.getByTestId("row"))).toBeGreaterThanOrEqual(
      44,
    );
  },
};
