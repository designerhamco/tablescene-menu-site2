import type { ReactNode } from "react";

/**
 * Public marketing-page typography contract.
 *
 * Keep the visual hierarchy in this order across landing sections:
 * title > body > eyebrow. The vertical rhythm mirrors that hierarchy too:
 * a compact eyebrow-to-title gap and a slightly wider title-to-body gap.
 */
export const MARKETING_COPY_STYLES = {
  eyebrow: "text-xs font-bold leading-none tracking-[-0.01em]",
  title: "mt-6 break-keep text-[2.125rem] font-bold leading-[1.14] tracking-[-0.04em] md:text-[3.5rem]",
  body: "mt-7 break-keep text-base font-medium leading-[1.75] md:text-lg",
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
