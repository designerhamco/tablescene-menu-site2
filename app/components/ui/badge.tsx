import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { getSiteChipTone, type SiteChipTone } from "@/lib/site-chip";

const badgeVariants = cva(
  "site-chip [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "",
        secondary: "",
        destructive: "",
        outline: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  tone,
  children,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean; tone?: SiteChipTone }) {
  const Comp = asChild ? Slot : "span";
  function textOf(node: React.ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join("");
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
    return "";
  }
  const resolvedTone = tone ?? (variant === "outline" ? "role" : variant === "destructive" ? "error" : getSiteChipTone(textOf(children)));

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), `site-chip-${resolvedTone}`, className)}
      {...props}
    >{children}</Comp>
  );
}

export { Badge, badgeVariants };
