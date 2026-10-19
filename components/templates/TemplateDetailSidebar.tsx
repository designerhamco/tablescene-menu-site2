"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import styles from "./template-detail.module.css";

export default function TemplateDetailSidebar({ children, actions, note }: {
  children: ReactNode;
  actions: ReactNode;
  note: ReactNode;
}) {
  const sidebarRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ canScroll: false, hasMore: false });

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!sidebar || !scroll || !content) return;

    let active = true;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      if (desktop) {
        // Before the column reaches its sticky anchor, the breadcrumb also
        // consumes viewport height. Keep the actions visible at scrollY=0.
        const top = Math.max(sidebar.getBoundingClientRect().top, parseFloat(getComputedStyle(sidebar).top));
        sidebar.style.setProperty("--detail-available-height", `calc(100dvh - ${top}px - 1.5rem)`);
      } else {
        sidebar.style.removeProperty("--detail-available-height");
      }
      const canScroll = desktop && scroll.scrollHeight > scroll.clientHeight + 1;
      const hasMore = canScroll && scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop > 1;
      setScrollState(previous => previous.canScroll === canScroll && previous.hasMore === hasMore ? previous : { canScroll, hasMore });
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scroll);
    observer.observe(content);
    scroll.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.fonts.ready.then(schedule);
    schedule();

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroll.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return <aside ref={sidebarRef} className={styles.sidebar} aria-label="템플릿 정보 및 시작">
    <div ref={scrollRef} className={styles.sidebarInfo} role="region" aria-label="템플릿 상세 정보" tabIndex={scrollState.canScroll ? 0 : undefined}>
      <div ref={contentRef} className={styles.sidebarScrollContent}>
        <div className={styles.sidebarContent}>{children}</div>
        <div className={styles.sidebarNote}>{note}</div>
      </div>
    </div>
    <div className={styles.sidebarFooter} data-template-detail-actions data-scroll-more={scrollState.hasMore}>
      <div className={styles.scrollFade} data-template-detail-fade aria-hidden="true" />
      <div className={styles.actions}>{actions}</div>
    </div>
  </aside>;
}
