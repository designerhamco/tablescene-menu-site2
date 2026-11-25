import { ArrowUpRight } from "@/app/components/ui/site-arrow";

/** Append to a link that opens a separate browsing context. */
export function NewWindowIndicator({ showIcon = true }: { showIcon?: boolean }) {
  return <>
    {showIcon ? <ArrowUpRight size={16} className="shrink-0" aria-hidden="true" /> : null}
    <span className="sr-only"> (새 창으로 열기)</span>
  </>;
}
