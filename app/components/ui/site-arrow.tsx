import type { SVGProps } from "react";
import { SITE_ARROW_PATHS, type SiteArrowName } from "@/lib/site-arrow";

type SiteArrowProps = SVGProps<SVGSVGElement> & { size?: number | string };
type Direction = "right" | "down-right" | "down" | "down-left" | "left" | "up-left" | "up" | "up-right";
type Kind = "shaft" | "chevron" | "double-chevron" | "turn" | "turn-back" | "bidirectional" | "refresh" | "rotate";

/** The official site's Remix Line arrows share SVG props and React 19 ref behavior. */
function arrow(name: SiteArrowName, direction: Direction, kind: Kind = "shaft", mirrored = false) {
  function SiteArrow({ size = 24, children, ...props }: SiteArrowProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" aria-hidden="true" focusable="false" {...props} stroke="none" strokeWidth={undefined}
      data-site-arrow={kind} data-direction={direction} data-site-icon={name} data-icon-source="remix">
      <path d={SITE_ARROW_PATHS[name]} fill="currentColor" transform={mirrored ? "translate(0 24) scale(1 -1)" : undefined} />
      {children}
    </svg>;
  }
  SiteArrow.displayName = `SiteArrow(${name})`;
  return SiteArrow;
}

export const ArrowRight = /* @__PURE__ */ arrow("arrow-right-line", "right");
export const ArrowDownRight = /* @__PURE__ */ arrow("arrow-right-down-line", "down-right");
export const ArrowDown = /* @__PURE__ */ arrow("arrow-down-line", "down");
export const ArrowDownLeft = /* @__PURE__ */ arrow("arrow-left-down-line", "down-left");
export const ArrowLeft = /* @__PURE__ */ arrow("arrow-left-line", "left");
export const ArrowUpLeft = /* @__PURE__ */ arrow("arrow-left-up-line", "up-left");
export const ArrowUp = /* @__PURE__ */ arrow("arrow-up-line", "up");
export const ArrowUpRight = /* @__PURE__ */ arrow("arrow-right-up-line", "up-right");

export const ChevronRight = /* @__PURE__ */ arrow("arrow-right-s-line", "right", "chevron");
export const ChevronDown = /* @__PURE__ */ arrow("arrow-down-s-line", "down", "chevron");
export const ChevronLeft = /* @__PURE__ */ arrow("arrow-left-s-line", "left", "chevron");
export const ChevronUp = /* @__PURE__ */ arrow("arrow-up-s-line", "up", "chevron");
export const ChevronsRight = /* @__PURE__ */ arrow("arrow-right-double-line", "right", "double-chevron");
export const ChevronsLeft = /* @__PURE__ */ arrow("arrow-left-double-line", "left", "double-chevron");

export const ArrowTurnUpRight = /* @__PURE__ */ arrow("corner-up-right-line", "right", "turn");
export const ArrowTurnRightDown = /* @__PURE__ */ arrow("corner-right-down-line", "down", "turn");
export const ArrowTurnDownLeft = /* @__PURE__ */ arrow("corner-down-left-line", "left", "turn");
export const ArrowTurnLeftUp = /* @__PURE__ */ arrow("corner-left-up-line", "up", "turn");
export const ArrowTurnDownRight = /* @__PURE__ */ arrow("corner-down-right-line", "right", "turn");
export const ArrowTurnRightUp = /* @__PURE__ */ arrow("corner-right-up-line", "up", "turn");
export const ArrowTurnUpLeft = /* @__PURE__ */ arrow("corner-up-left-line", "left", "turn");
export const ArrowTurnLeftDown = /* @__PURE__ */ arrow("corner-left-down-line", "down", "turn");
export const ArrowUTurnLeft = /* @__PURE__ */ arrow("arrow-go-back-line", "left", "turn-back");
export const ArrowUTurnRight = /* @__PURE__ */ arrow("arrow-go-forward-line", "right", "turn-back");
export const ArrowUTurnUp = /* @__PURE__ */ arrow("arrow-turn-forward-line", "up", "turn-back");
export const ArrowUTurnDown = /* @__PURE__ */ arrow("arrow-turn-back-line", "down", "turn-back");

export const ArrowLeftRight = /* @__PURE__ */ arrow("arrow-left-right-line", "right", "bidirectional");
export const ArrowUpDown = /* @__PURE__ */ arrow("arrow-up-down-line", "down", "bidirectional");
// Remix provides one refresh-line path. Reflect it for the existing counterclockwise control.
export const RefreshCcw = /* @__PURE__ */ arrow("refresh-line", "right", "refresh", true);
export const RefreshCw = /* @__PURE__ */ arrow("refresh-line", "right", "refresh");
export const RotateCcw = /* @__PURE__ */ arrow("reset-left-line", "right", "rotate");
export const RotateCw = /* @__PURE__ */ arrow("reset-right-line", "right", "rotate");

export { ChevronRight as ChevronRightIcon, ChevronDown as ChevronDownIcon, ChevronLeft as ChevronLeftIcon, ChevronUp as ChevronUpIcon };
export { ArrowUTurnLeft as Undo2, ArrowUTurnRight as Redo2 };
