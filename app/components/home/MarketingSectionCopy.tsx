import type { ReactNode } from "react";

/**
 * Public marketing-page typography contract.
 *
 * Keep the visual hierarchy in this order across landing sections:
 * title > body. The body stays the smallest supporting copy.
 */
export const MARKETING_COPY_STYLES = {

  title: "",
  body: "type-body-lg mt-5",
} as const;

type MarketingSectionCopyProps = {

  title: ReactNode;
  body?: ReactNode;
  inverted?: boolean;
  centered?: boolean;
  className?: string;
};

export function MarketingSectionCopy({

  title,
  body,
  inverted = false,
  centered = true,
  className = "",
}: MarketingSectionCopyProps) {
  const alignmentClass = centered ? "mx-auto text-center" : "text-left";

  const titleColor = inverted ? "text-white" : "text-zinc-950";
  const bodyColor = inverted ? "text-zinc-400" : "text-zinc-500";

  return (
    <div className={`${alignmentClass} ${className}`}>

      <h2 className={`type-section-title ${MARKETING_COPY_STYLES.title} ${titleColor}`}>{title}</h2>
      {body ? <p className={`${MARKETING_COPY_STYLES.body} ${bodyColor}`}>{body}</p> : null}
    </div>
  );
}
