"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

export default function HelpTooltip({ label, children, tone = "light" }: { label: string; children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="site-button site-button-outline site-help-trigger">?</button>
      </PopoverTrigger>
      <PopoverContent aria-label={label} side="bottom" sideOffset={8} collisionPadding={16} className={tone === "dark" ? "site-help-content site-help-content-dark" : "site-help-content"}>
        {children}
        {tone === "dark" ? <>
          <PopoverClose className="site-help-close" aria-label="도움말 닫기"><X size={16} aria-hidden="true" /></PopoverClose>
          <PopoverArrow className="site-help-arrow" width={14} height={7} />
        </> : null}
      </PopoverContent>
    </Popover>
  );
}
