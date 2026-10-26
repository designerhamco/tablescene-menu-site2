"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MypageNavigationRail({
  activeKey,
  children,
}: {
  activeKey: string;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;

    const revealActive = () => {
      if (nav.clientWidth === 0 || nav.scrollWidth <= nav.clientWidth) return;
      const rail = nav.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      const inset = Number.parseFloat(getComputedStyle(nav).paddingInlineStart) || 0;
      const hiddenAtStart = item.left - rail.left - inset;
      const hiddenAtEnd = item.right - rail.right + inset;

      if (hiddenAtStart < 0 || item.width > rail.width - inset * 2) {
        nav.scrollLeft += hiddenAtStart;
      } else if (hiddenAtEnd > 0) {
        nav.scrollLeft += hiddenAtEnd;
      }
    };

    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(nav);
    observer.observe(active);
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) revealActive();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [activeKey]);

  return (
    <nav ref={navRef} className="site-account-nav" aria-label="마이페이지 메뉴">
      {children}
    </nav>
  );
}
