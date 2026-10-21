import { zodResolver } from "@hookform/resolvers/zod";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { z } from "zod";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./field";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Switch } from "./switch";
import { Textarea } from "./textarea";

const services = [
  { value: "manicure", label: "Manicure" },
  { value: "pedicure", label: "Pedicure" },
];

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  phone: z.string().min(7, "Enter a phone number"),
  service: z.enum(["manicure", "pedicure"], "Choose a service"),
  notes: z.string().max(200, "Keep it under 200 characters").optional(),
  reminders: z.boolean(),
  terms: z.literal(true, "Accept the booking terms"),
});

type Values = z.input<typeof schema>;

function BookingDemoForm({
  onSubmit,
}: {
  onSubmit: (values: Values) => Promise<void>;
}) {
  const formId = useId();
  const errorId = (field: keyof Values) => `${formId}-${field}-error`;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", notes: "", reminders: true },
  });

  return (
    <form className="p-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                {...field}
                id="name"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? errorId("name") : undefined
                }
              />
              <FieldError id={errorId("name")} errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                {...field}
                id="phone"
                type="tel"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? errorId("phone") : undefined
                }
              />
              <FieldError id={errorId("phone")} errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="service"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel id="service-label">Service</FieldLabel>
              <Select
                items={services}
                value={field.value ?? null}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  ref={field.ref}
                  aria-describedby={
                    fieldState.invalid ? errorId("service") : undefined
                  }
                  aria-labelledby="service-label"
                  aria-invalid={fieldState.invalid}
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
              <FieldError id={errorId("service")} errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                {...field}
                id="notes"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? errorId("notes") : undefined
                }
              />
              <FieldError id={errorId("notes")} errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="reminders"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldLabel htmlFor="reminders">Send reminders</FieldLabel>
              <Switch
                id="reminders"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Field>
          )}
        />
        <Controller
          name="terms"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                ref={field.ref}
                id="terms"
                checked={field.value === true}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? errorId("terms") : undefined
                }
              />
              <FieldContent>
                <FieldLabel htmlFor="terms">
                  I accept the booking terms
                </FieldLabel>
                <FieldError id={errorId("terms")} errors={[fieldState.error]} />
              </FieldContent>
            </Field>
          )}
        />
        <Button type="submit" loading={form.formState.isSubmitting}>
          Book
        </Button>
      </FieldGroup>
    </form>
  );
}

const meta = {
  title: "UI/Forms/Form",
  component: BookingDemoForm,
  args: { onSubmit: fn(async () => {}) },
} satisfies Meta<typeof BookingDemoForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Book" }));
    await waitFor(() =>
      expect(canvas.getByLabelText("Name")).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    await expect(canvas.getByLabelText("Phone")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(canvas.getByText("Enter your name")).toBeVisible();
    await expect(canvas.getByLabelText("Name")).toHaveAccessibleDescription(
      "Enter your name",
    );
    await expect(canvas.getByLabelText("Name")).toHaveFocus();
    await expect(canvas.getByText("Enter a phone number")).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.type(canvas.getByLabelText("Name"), "Anna");
    await userEvent.type(canvas.getByLabelText("Phone"), "+380670000000");
    await userEvent.click(canvas.getByRole("combobox", { name: "Service" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "Pedicure" }),
    );
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "I accept the booking terms" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Book" }));

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
    await expect(args.onSubmit).toHaveBeenCalledWith(
      {
        name: "Anna",
        phone: "+380670000000",
        service: "pedicure",
        notes: "",
        reminders: true,
        terms: true,
      },
      expect.anything(),
    );
  },
};

export const FocusFirstError: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText("Name"), "Anna");
    await userEvent.type(canvas.getByLabelText("Phone"), "+380670000000");
    await userEvent.click(canvas.getByRole("button", { name: "Book" }));
    await waitFor(() =>
      expect(canvas.getByRole("combobox", { name: "Service" })).toHaveFocus(),
    );
    await expect(
      canvas.getByRole("combobox", { name: "Service" }),
    ).toHaveAccessibleDescription("Choose a service");
    await userEvent.click(canvas.getByRole("combobox", { name: "Service" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "Pedicure" }),
    );
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await userEvent.click(canvas.getByRole("button", { name: "Book" }));
    await waitFor(() =>
      expect(
        canvas.getByRole("checkbox", { name: "I accept the booking terms" }),
      ).toHaveFocus(),
    );
    await expect(
      canvas.getByRole("checkbox", { name: "I accept the booking terms" }),
    ).toHaveAccessibleDescription("Accept the booking terms");
    await expect(canvas.getByLabelText("Name")).not.toHaveAttribute(
      "aria-describedby",
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
