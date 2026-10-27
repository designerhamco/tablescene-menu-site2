"use client";

import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function MypageNavigationRail({
  activeKey,
  children,
}: {
  activeKey: string;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [hasMoreAtEnd, setHasMoreAtEnd] = useState(false);

  const updateOverflowHint = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const remaining = nav.scrollWidth - nav.clientWidth - nav.scrollLeft;
    setHasMoreAtEnd(remaining > 2);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;

    const revealActive = () => {
      if (nav.clientWidth === 0) return;
      if (nav.scrollWidth <= nav.clientWidth) {
        updateOverflowHint();
        return;
      }
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

      updateOverflowHint();
    };

    revealActive();
    nav.addEventListener("scroll", updateOverflowHint, { passive: true });
    const observer = new ResizeObserver(revealActive);
    observer.observe(nav);
    observer.observe(active);
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) revealActive();
    });

    return () => {
      cancelled = true;
      nav.removeEventListener("scroll", updateOverflowHint);
      observer.disconnect();
    };
  }, [activeKey, updateOverflowHint]);

  const revealMore = () => {
    const nav = navRef.current;
    if (!nav) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollBy({
      left: Math.max(160, nav.clientWidth * 0.65),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="site-account-nav-shell" data-has-more={hasMoreAtEnd ? "true" : "false"}>
      <nav ref={navRef} className="site-account-nav" aria-label="마이페이지 메뉴">
        {children}
      </nav>
      {hasMoreAtEnd ? (
        <button type="button" className="site-account-nav-more" onClick={revealMore} aria-label="다음 마이페이지 메뉴 보기">
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
