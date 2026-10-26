"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { TabsSize } from "./tabs";
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
export function NavigationTabs({ label, items, className, size = "md", variant = "folder" }: {
  label: string; items: NavigationTab[]; className?: string; size?: TabsSize; variant?: "folder" | "flow";
}) {
  const navRef = useRef<HTMLElement>(null);
  const activeHref = items.find(item => item.active && !item.disabledReason)?.href;

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    if (!nav || !active) return;

    const revealActive = () => {
      if (nav.clientWidth === 0 || nav.scrollWidth <= nav.clientWidth) return;
      const rail = nav.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      const inset = Number.parseFloat(getComputedStyle(nav).paddingInlineStart) || 0;
      const left = tab.left - rail.left - inset;
      const right = tab.right - rail.right + inset;
      if (left < 0 || tab.width > rail.width - inset * 2) nav.scrollLeft += left;
      else if (right > 0) nav.scrollLeft += right;
    };

    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(nav);
    observer.observe(active);
    let cancelled = false;
    void document.fonts.ready.then(() => { if (!cancelled) revealActive(); });
    return () => { cancelled = true; observer.disconnect(); };
  }, [activeHref]);

  return <nav ref={navRef} aria-label={label} data-size={size} data-variant={variant} className={cn(`site-${variant}-tabs`, `site-tab-size-${size}`, className)}>
    {items.map(item => {
      const content = <>{item.label}{item.count !== undefined && !item.disabledReason ? <span className="site-tab-count">{item.count.toLocaleString("ko-KR")}<span className="sr-only">개</span></span> : null}{item.statusLabel && !item.disabledReason ? <span className="type-caption ml-1">{item.statusLabel}</span> : null}</>;
      return item.disabledReason ? <span key={item.href} className={`site-${variant}-tab`} aria-disabled="true" title={item.disabledReason} aria-label={`${item.label} 권한 없음: ${item.disabledReason}`}>
        <span className="site-shaped-tab-label">{content}<span className="type-caption ml-2">권한 없음</span></span>
      </span> : <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={`site-${variant}-tab`}><span className="site-shaped-tab-label">{content}</span></Link>;
    })}
  </nav>;
}
