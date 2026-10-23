"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

export default function HelpTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="site-button site-button-outline site-help-trigger">?</button>
      </PopoverTrigger>
      <PopoverContent aria-label={label} side="bottom" sideOffset={8} collisionPadding={16} className="site-help-content">
        {children}
      </PopoverContent>
    </Popover>
  );
}
