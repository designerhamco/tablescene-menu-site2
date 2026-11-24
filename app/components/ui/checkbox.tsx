"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, MinusIcon } from "@/app/components/ui/site-icon";

import { cn } from "./utils";

function Checkbox({
  className,
  shape,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { shape?: "circle" }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-shape={shape}
      className={cn(
        "peer site-checkbox",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="site-checkbox-indicator"
      >
        <CheckIcon className="site-checkbox-check" aria-hidden="true" /><MinusIcon className="site-checkbox-mixed" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
