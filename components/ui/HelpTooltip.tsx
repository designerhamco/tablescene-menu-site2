"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

type HelpTooltipProps = {
  label: string;
  children: ReactNode;
  tone?: "light" | "dark" | "brand";
  trigger?: ReactElement;
  side?: ComponentProps<typeof PopoverContent>["side"];
  align?: ComponentProps<typeof PopoverContent>["align"];
};

export default function HelpTooltip({ label, children, tone = "light", trigger, side = "bottom", align = "center" }: HelpTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? <button type="button" aria-label={label} className="site-button site-button-outline site-help-trigger">?</button>}
      </PopoverTrigger>
      <PopoverContent aria-label={label} side={side} align={align} sideOffset={8} collisionPadding={16} className={cn("site-help-content", tone !== "light" && `site-help-content-${tone}`)}>
        {children}
        {tone !== "light" ? <>
          <PopoverClose className="site-help-close" aria-label="도움말 닫기"><X size={16} aria-hidden="true" /></PopoverClose>
          <PopoverArrow className="site-help-arrow" width={14} height={7} />
        </> : null}
      </PopoverContent>
    </Popover>
  );
}
