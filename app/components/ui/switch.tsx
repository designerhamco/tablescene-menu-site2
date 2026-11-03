"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  surface,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { surface?: "light" | "dark" }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-surface={surface}
      className={cn("site-switch peer", className)}
      {...props}
    >
      <span className="site-switch-track" aria-hidden="true">
        <SwitchPrimitive.Thumb data-slot="switch-thumb" className="site-switch-thumb" />
      </span>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
