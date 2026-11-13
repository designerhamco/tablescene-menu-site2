import type { SVGProps } from "react";
import { SITE_ARROW_PATHS, SITE_ARROW_ROTATION, SITE_CIRCULAR_ARROW_HEADS, type SiteArrowDirection, type SiteArrowKind } from "@/lib/site-arrow";

export type SiteArrowProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  direction?: SiteArrowDirection;
  kind?: SiteArrowKind;
  mirrored?: boolean;
};

/** Curved, square-ended shaft or sculpted filled chevron on a shared 24px grid.
 * Ref remains an SVG prop for React 19 / Radix asChild. Never use inside menu artwork.
 */
export function SiteArrow({ size = 24, direction = "right", kind = "shaft", mirrored = false, strokeWidth = 2, children, ...props }: SiteArrowProps) {
  const filled = kind === "chevron" || kind === "double-chevron" || kind === "refresh";
  const circularHead = kind === "rotate" ? SITE_CIRCULAR_ARROW_HEADS.rotate : null;
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
    aria-hidden="true" focusable="false" data-site-arrow={kind} data-direction={direction} data-icon-source={kind === "refresh" ? "remix" : undefined} {...props}>
    <g transform={`rotate(${SITE_ARROW_ROTATION[direction]} 12 12)`}>
      <path transform={mirrored ? "translate(0 24) scale(1 -1)" : undefined} d={SITE_ARROW_PATHS[kind]}
        fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"}
        strokeWidth={kind === "refresh" ? undefined : strokeWidth} strokeLinecap="butt" strokeLinejoin="miter" />
      {circularHead ? <path transform={mirrored ? "translate(0 24) scale(1 -1)" : undefined} d={circularHead} fill="currentColor" stroke="none" /> : null}
    </g>{children}
  </svg>;
}

function directionalIcon(direction: SiteArrowDirection, kind: SiteArrowKind = "shaft", mirrored = false) {
  return function DirectionalIcon(props: SiteArrowProps) { return <SiteArrow {...props} direction={direction} kind={kind} mirrored={mirrored} />; };
}

export const ArrowRight = directionalIcon("right");
export const ArrowDownRight = directionalIcon("down-right");
export const ArrowDown = directionalIcon("down");
export const ArrowDownLeft = directionalIcon("down-left");
export const ArrowLeft = directionalIcon("left");
export const ArrowUpLeft = directionalIcon("up-left");
export const ArrowUp = directionalIcon("up");
export const ArrowUpRight = directionalIcon("up-right");
export const ChevronRight = directionalIcon("right", "chevron");
export const ChevronDown = directionalIcon("down", "chevron");
export const ChevronLeft = directionalIcon("left", "chevron");
export const ChevronUp = directionalIcon("up", "chevron");
export const ChevronsRight = directionalIcon("right", "double-chevron");
export const ChevronsLeft = directionalIcon("left", "double-chevron");
export { ChevronRight as ChevronRightIcon, ChevronDown as ChevronDownIcon, ChevronLeft as ChevronLeftIcon, ChevronUp as ChevronUpIcon };

// Elbows name the travel before and after the bend.
export const ArrowTurnUpRight = directionalIcon("right", "turn");
export const ArrowTurnRightDown = directionalIcon("down", "turn");
export const ArrowTurnDownLeft = directionalIcon("left", "turn");
export const ArrowTurnLeftUp = directionalIcon("up", "turn");
export const ArrowTurnDownRight = directionalIcon("right", "turn", true);
export const ArrowTurnRightUp = directionalIcon("up", "turn", true);
export const ArrowTurnUpLeft = directionalIcon("left", "turn", true);
export const ArrowTurnLeftDown = directionalIcon("down", "turn", true);
export const ArrowUTurnLeft = directionalIcon("left", "turn-back", true);
export const ArrowUTurnRight = directionalIcon("right", "turn-back");
export const ArrowUTurnUp = directionalIcon("up", "turn-back");
export const ArrowUTurnDown = directionalIcon("down", "turn-back", true);
export const ArrowLeftRight = directionalIcon("right", "bidirectional");
export const ArrowUpDown = directionalIcon("down", "bidirectional");
// The Remix original turns clockwise; mirror only the counterclockwise export.
export const RefreshCcw = directionalIcon("right", "refresh", true);
export const RefreshCw = directionalIcon("right", "refresh");
export const RotateCcw = directionalIcon("right", "rotate");
export const RotateCw = directionalIcon("right", "rotate", true);
export { ArrowUTurnLeft as Undo2, ArrowUTurnRight as Redo2 };
