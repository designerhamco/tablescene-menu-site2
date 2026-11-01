"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { X } from "lucide-react";
import { TooltipBubbleArrow, TooltipBubbleBody } from "@/app/components/ui/tooltip-bubble";
import { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

type HelpTooltipProps = {
  label: string;
  children: ReactNode;
  heading?: ReactNode;
  tone?: "light" | "dark" | "brand";
  trigger?: ReactElement;
  side?: ComponentProps<typeof PopoverContent>["side"];
  align?: ComponentProps<typeof PopoverContent>["align"];
};

export default function HelpTooltip({ label, children, heading, tone = "light", trigger, side = "bottom", align = "center" }: HelpTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? <button type="button" aria-label={label} className="site-button site-button-outline site-help-trigger">?</button>}
      </PopoverTrigger>
      <PopoverContent aria-label={label} side={side} align={align} sideOffset={8} collisionPadding={16} data-tooltip-tone={tone} data-dismissible={tone !== "light" || undefined} className="site-tooltip-surface site-help-content">
        <TooltipBubbleBody heading={heading}>{children}</TooltipBubbleBody>
        {tone !== "light" ?
          <PopoverClose className="site-help-close" aria-label="도움말 닫기"><X size={16} aria-hidden="true" /></PopoverClose>
        : null}
        <PopoverArrow asChild width={24} height={14}><TooltipBubbleArrow className="site-tooltip-arrow" /></PopoverArrow>
      </PopoverContent>
    </Popover>
  );
}
