import Link from "next/link";
import { cn } from "./utils";

type NavigationTab = {
  label: string;
  href: string;
  active?: boolean;
  count?: number;
  statusLabel?: string;
  disabledReason?: string;
};

/** URL navigation stays links; selection tabs retain their separate Radix contract. */
export function NavigationTabs({ label, items, className }: {
  label: string; items: NavigationTab[]; className?: string;
}) {
  return <nav aria-label={label} className={cn("site-topic-tabs site-topic-tabs-lg", className)}>
    {items.map(item => {
      const content = <>{item.label}{item.count !== undefined && !item.disabledReason ? <span className="site-tab-count">{item.count.toLocaleString("ko-KR")}<span className="sr-only">개</span></span> : null}{item.statusLabel && !item.disabledReason ? <span className="type-caption ml-1">{item.statusLabel}</span> : null}</>;
      return item.disabledReason ? <span key={item.href} className="site-topic-tab" aria-disabled="true" title={item.disabledReason} aria-label={`${item.label} 권한 없음: ${item.disabledReason}`}>
        {content}<span className="type-caption ml-2">권한 없음</span>
      </span> : <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className="site-topic-tab">{content}</Link>;
    })}
  </nav>;
}
