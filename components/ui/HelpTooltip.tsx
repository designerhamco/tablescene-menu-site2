"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { CircleHelp, X } from "@/app/components/ui/site-icon";
import { TooltipBubbleArrow, TooltipBubbleBody, TOOLTIP_ARROW_PADDING } from "@/app/components/ui/tooltip-bubble";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverArrow, PopoverClose, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

type HelpTooltipProps = {
  label: string;
  children: ReactNode;
  heading?: ReactNode;
  tone?: "light" | "dark" | "brand";
  trigger?: ReactElement;
  side?: ComponentProps<typeof PopoverContent>["side"];
  align?: ComponentProps<typeof PopoverContent>["align"];
  alignOffset?: ComponentProps<typeof PopoverContent>["alignOffset"];
  hover?: boolean;
};

export default function HelpTooltip({ label, children, heading, tone = "light", trigger, side = "top", align = "start", alignOffset = 0, hover = false }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverOpened = useRef(false);
  const cancel = () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current); };
  const scheduleClose = () => { cancel(); closeTimer.current = setTimeout(() => { if (hoverOpened.current) setOpen(false); }, 180); };
  useEffect(() => () => { clearTimeout(openTimer.current); clearTimeout(closeTimer.current); }, []);
  return (
    <Popover open={hover ? open : undefined} onOpenChange={hover ? setOpen : undefined}>
      <span className="site-help-anchor" onPointerEnter={hover ? event => { if (event.pointerType !== "mouse") return; cancel(); openTimer.current = setTimeout(() => { hoverOpened.current = true; setOpen(true); }, 120); } : undefined} onPointerLeave={hover ? scheduleClose : undefined} onPointerDown={hover ? () => { cancel(); hoverOpened.current = false; } : undefined}>
      <PopoverTrigger asChild>
        {trigger ?? <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={label}><CircleHelp size={20} aria-hidden="true" /></Button>}
      </PopoverTrigger>
      </span>
      <PopoverContent aria-label={label} side={side} align={align} alignOffset={alignOffset} arrowPadding={TOOLTIP_ARROW_PADDING} sideOffset={8} collisionPadding={16} data-tooltip-tone={tone} data-dismissible={tone !== "light" || undefined} className="site-tooltip-surface site-help-content"
        onPointerEnter={hover ? cancel : undefined} onPointerLeave={hover ? scheduleClose : undefined}
        onOpenAutoFocus={hover ? event => { if (hoverOpened.current) event.preventDefault(); } : undefined}
        onCloseAutoFocus={hover ? event => { if (hoverOpened.current) event.preventDefault(); } : undefined}
        onEscapeKeyDown={() => { cancel(); hoverOpened.current = false; }}>
        <TooltipBubbleBody heading={heading}>{children}</TooltipBubbleBody>
        {tone !== "light" ?
          <PopoverClose className="site-icon-control site-help-close" aria-label="도움말 닫기"><X size={16} aria-hidden="true" /></PopoverClose>
        : null}
        <PopoverArrow asChild width={24} height={14}><TooltipBubbleArrow className="site-tooltip-arrow" /></PopoverArrow>
      </PopoverContent>
    </Popover>
  );
}
