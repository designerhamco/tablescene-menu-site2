"use client";

import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function MypageNavigationRail({
  activeKey,
  children,
  navLabel = "마이페이지 메뉴",
  moreLabel = "다음 마이페이지 메뉴 보기",
}: {
  activeKey: string;
  children: ReactNode;
  navLabel?: string;
  moreLabel?: string;
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
    if (!nav) return;

    const revealItem = (item: HTMLElement) => {
      if (nav.clientWidth === 0) return;
      if (nav.scrollWidth <= nav.clientWidth) {
        updateOverflowHint();
        return;
      }
      const rail = nav.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const style = getComputedStyle(nav);
      const inset = Number.parseFloat(style.paddingInlineStart) || 0;
      const items = nav.querySelectorAll<HTMLElement>(".site-nav-item");
      const endInset = item === items[items.length - 1] ? inset : Number.parseFloat(style.scrollPaddingInlineEnd) || inset;
      const hiddenAtStart = itemRect.left - rail.left - inset;
      const hiddenAtEnd = itemRect.right - rail.right + endInset;

      if (hiddenAtStart < 0 || itemRect.width > rail.width - inset * 2) {
        nav.scrollLeft += hiddenAtStart;
      } else if (hiddenAtEnd > 0) {
        nav.scrollLeft += hiddenAtEnd;
      }

      updateOverflowHint();
    };

    const revealActive = () => {
      if (active) revealItem(active);
      else updateOverflowHint();
    };
    const revealFocused = (event: FocusEvent) => {
      const item = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".site-nav-item") : null;
      if (item && nav.contains(item)) revealItem(item);
    };

    revealActive();
    nav.addEventListener("scroll", updateOverflowHint, { passive: true });
    nav.addEventListener("focusin", revealFocused);
    const observer = new ResizeObserver(revealActive);
    observer.observe(nav);
    if (active) observer.observe(active);
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) revealActive();
    });

    return () => {
      cancelled = true;
      nav.removeEventListener("scroll", updateOverflowHint);
      nav.removeEventListener("focusin", revealFocused);
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
      <nav ref={navRef} className="site-account-nav" aria-label={navLabel}>
        {children}
      </nav>
      {hasMoreAtEnd ? (
        <button type="button" className="site-account-nav-more" onClick={revealMore} aria-label={moreLabel}>
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
