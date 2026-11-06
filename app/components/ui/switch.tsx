"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

function Switch({
  className,
  surface,
  size = "md",
  loading = false,
  disabled,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { surface?: "light" | "dark"; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-surface={surface}
      data-size={size}
      data-loading={loading || undefined}
      className={cn("site-switch peer", className)}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      <span className="site-switch-track" aria-hidden="true">
        <SwitchPrimitive.Thumb data-slot="switch-thumb" className="site-switch-thumb">{loading ? <LoadingSpinner className="site-switch-spinner" /> : null}</SwitchPrimitive.Thumb>
      </span>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
