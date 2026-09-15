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
        outline: "site-button-secondary",
        secondary: "site-button-secondary",
        ghost: "site-button-ghost",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "has-[>svg]:px-4",
        sm: "site-button-sm gap-1.5 has-[>svg]:px-3",
        lg: "site-button-lg has-[>svg]:px-5",
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
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
