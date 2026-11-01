import * as React from "react";

// Keep the tail clear of the shared 28px rounded corners.
const TOOLTIP_ARROW_PADDING = 28;

type TooltipBubbleBodyProps = {
  heading?: React.ReactNode;
  children: React.ReactNode;
};

function TooltipBubbleBody({ heading, children }: TooltipBubbleBodyProps) {
  return <>
    {heading ? <p className="site-tooltip-title">{heading}</p> : null}
    <div className="site-tooltip-body">{children}</div>
  </>;
}

// Radix positions and rotates the same rounded tail for every placement.
const TooltipBubbleArrow = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<"svg">>(
  function TooltipBubbleArrow(props, ref) {
    return <svg {...props} ref={ref} width={24} height={14} viewBox="0 0 24 14" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 0H24C21.5 0 19.8 1.1 18.6 3.3L14.4 11.4C13.4 13.4 10.6 13.4 9.6 11.4L5.4 3.3C4.2 1.1 2.5 0 0 0Z" />
    </svg>;
  },
);

export { TooltipBubbleBody, TooltipBubbleArrow, TOOLTIP_ARROW_PADDING };
