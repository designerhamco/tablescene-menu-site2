import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "site-button whitespace-nowrap [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "site-button-primary",
        destructive:
          "site-button-danger",
        outline: "site-button-outline",
        secondary: "site-button-secondary",
        ghost: "site-button-ghost",
        ai: "site-button-ai",
        kakao: "site-button-kakao",
        "outline-danger": "site-button-outline-danger",
        "danger-ghost": "site-button-danger-ghost",
        link: "site-button-link",
      },
      shape: {
        pill: "site-button-pill",
      },
      size: {
        default: "",
        compact: "site-button-compact",
        lg: "site-button-lg",
        icon: "site-button-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
