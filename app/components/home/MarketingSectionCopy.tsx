import type { ReactNode } from "react";

/**
 * Public marketing-page typography contract.
 *
 * Keep the visual hierarchy in this order across landing sections:
 * title > eyebrow > body. The body stays the smallest supporting copy.
 */
export const MARKETING_COPY_STYLES = {
  eyebrow: "text-base font-bold leading-[1.35] tracking-[-0.02em] md:text-lg",
  title: "mt-[1.125rem] break-keep text-[2.125rem] font-bold leading-[1.14] tracking-[-0.04em] md:text-[3.5rem]",
  body: "mt-[1.375rem] break-keep text-sm font-medium leading-[1.75] md:text-base",
} as const;

type MarketingSectionCopyProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  inverted?: boolean;
  centered?: boolean;
  className?: string;
};

export function MarketingSectionCopy({
  eyebrow,
  title,
  body,
  inverted = false,
  centered = false,
  className = "",
}: MarketingSectionCopyProps) {
  const alignmentClass = centered ? "mx-auto text-center" : "text-left";
  const eyebrowColor = inverted ? "text-zinc-400" : "text-zinc-500";
  const titleColor = inverted ? "text-white" : "text-zinc-950";
  const bodyColor = inverted ? "text-zinc-400" : "text-zinc-500";

  return (
    <div className={`${alignmentClass} ${className}`}>
      <p className={`${MARKETING_COPY_STYLES.eyebrow} ${eyebrowColor}`}>{eyebrow}</p>
      <h2 className={`${MARKETING_COPY_STYLES.title} ${titleColor}`}>{title}</h2>
      {body ? <p className={`${MARKETING_COPY_STYLES.body} ${bodyColor}`}>{body}</p> : null}
    </div>
  );
}
