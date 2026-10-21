"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ReactNode } from "react";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit max-w-full min-w-0 shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
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
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Text-only labels, including mixed ones like `{count} new`, can be truncated and carry their full text as a title.
function plainText(children: ReactNode): string | undefined {
  const parts = Array.isArray(children) ? children : [children];
  const textOnly = parts.every(
    (part) => typeof part === "string" || typeof part === "number",
  );
  return textOnly ? parts.join("") : undefined;
}

function Badge({
  className,
  variant = "default",
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  const text = plainText(children);
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        title: text,
        children:
          text === undefined ? (
            children
          ) : (
            <span className="truncate">{children}</span>
          ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
