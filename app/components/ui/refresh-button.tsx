"use client";

import type { ComponentProps } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/** One refresh control for list, dashboard and device status; geometry belongs to Button. */
export function RefreshButton({ label = "새로고침", loading = false, disabled, ...props }:
  Omit<ComponentProps<typeof Button>, "children" | "size" | "variant" | "className" | "style" | "asChild"> & { label?: string; loading?: boolean }) {
  return <Tooltip><TooltipTrigger asChild><span className="inline-flex">
    <Button {...props} type="button" variant="ghost" size="icon" aria-label={label} aria-busy={loading} disabled={disabled || loading}>
      <RefreshCw aria-hidden="true" className={loading ? "motion-safe:animate-spin" : undefined} />
    </Button>
  </span></TooltipTrigger><TooltipContent>{loading ? "새로고침 중" : label}</TooltipContent></Tooltip>;
}
