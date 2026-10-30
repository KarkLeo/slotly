"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "group/badge inline-flex w-fit max-w-full min-w-0 shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent py-0.5 text-xs whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        accent: "bg-accent text-accent-foreground [a]:hover:bg-accent/80",
        destructive:
          "bg-destructive-solid text-destructive-solid-foreground focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive-solid/90",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        muted: "bg-muted text-muted-foreground",
        // Colored text keeps its contrast on the page background, also when the badge sits on a card.
        success: "border-success/30 bg-background text-success",
        warning: "border-warning/30 bg-background text-warning",
      },
      size: {
        default: "h-5 px-2 font-medium",
        status: "min-h-5 px-2.5 font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  // A text node in a flex container cannot show an ellipsis, so plain text gets its own span.
  const text = typeof children === "string" || typeof children === "number";
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
        children: text ? (
          <span className="truncate">{children}</span>
        ) : (
          children
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  });
}

export { Badge, badgeVariants };
