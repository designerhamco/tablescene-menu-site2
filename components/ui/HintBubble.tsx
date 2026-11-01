import type { ReactNode } from "react";
import { TooltipBubbleArrow } from "@/app/components/ui/tooltip-bubble";

/** Persistent supporting copy; unlike a tooltip, it needs no hover or focus. */
export default function HintBubble({ children, id, tone = "dark", tailAlign = "start" }: {
  children: ReactNode;
  id?: string;
  tone?: "light" | "dark" | "brand";
  tailAlign?: "start" | "center" | "end";
}) {
  return <span id={id} data-slot="hint-bubble" data-tooltip-tone={tone} data-density="compact" data-tail-align={tailAlign} className="site-tooltip-surface site-hint-bubble">
    {children}
    <TooltipBubbleArrow className="site-tooltip-arrow site-hint-bubble-arrow" />
  </span>;
}
