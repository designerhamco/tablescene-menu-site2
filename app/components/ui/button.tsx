import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "site-button whitespace-nowrap disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "site-button-primary",
        destructive:
          "site-button-danger",
        outline: "site-button-outline",
        secondary: "site-button-secondary",
        ghost: "site-button-ghost",
        link: "site-button-link underline-offset-4 hover:underline",
      },
      shape: {
        pill: "",
        rounded: "site-button-rounded",
        square: "site-button-square",
      },
      size: {
        default: "has-[>svg]:px-4",
        sm: "site-button-sm gap-1.5 has-[>svg]:px-3",
        compact: "site-button-compact",
        lg: "site-button-lg has-[>svg]:px-5",
        xl: "site-button-xl has-[>svg]:px-6",
        hero: "site-button-hero has-[>svg]:px-8",
        icon: "site-button-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "pill",
    },
  },
);

function Button({
  className,
  variant,
  size,
  shape,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
