"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import styles from "./template-detail.module.css";

export default function TemplateDetailSidebar({ heading, gallery, children, actions, note }: {
  heading: ReactNode;
  gallery: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  note: ReactNode;
}) {
  const sidebarRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ docked: false, canScroll: false, hasMore: false });

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const scroll = scrollRef.current;
    const content = contentRef.current;
    const galleryContent = galleryRef.current;
    const footer = footerRef.current;
    if (!sidebar || !scroll || !content || !galleryContent || !footer) return;

    let active = true;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      const wasDocked = sidebar.dataset.docked === "true";
      let docked = false;
      if (desktop) {
        const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5;
        const headerBottom = document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom ?? 0;
        const scrollStyle = getComputedStyle(scroll);
        const insets = [scrollStyle.paddingTop, scrollStyle.paddingBottom, scrollStyle.marginTop, scrollStyle.marginBottom]
          .reduce((sum, value) => sum + parseFloat(value), 0);
        const galleryHeight = galleryContent.getBoundingClientRect().height;
        // The hidden gallery retains its inner geometry. Always derive the
        // trigger from the expanded column, so collapsing it cannot move the
        // trigger and repeatedly dock/undock at the same scroll position.
        const collapsedGalleryHeight = galleryHeight - gap;
        const naturalHeight = content.getBoundingClientRect().height + (wasDocked ? collapsedGalleryHeight : 0) + insets + footer.getBoundingClientRect().height;
        const naturalTop = sidebar.getBoundingClientRect().top + window.scrollY;
        const trigger = Math.max(1, naturalTop - headerBottom - gap, naturalTop + naturalHeight - window.innerHeight + gap);
        docked = window.scrollY >= trigger;
        sidebar.style.setProperty("--detail-natural-height", `${naturalHeight}px`);
      } else {
        sidebar.style.removeProperty("--detail-natural-height");
      }
      if (!docked && wasDocked) scroll.scrollTop = 0;
      if (docked && !wasDocked && galleryContent.contains(document.activeElement)) scroll.focus({ preventScroll: true });
      const canScroll = docked && wasDocked && scroll.scrollHeight > scroll.clientHeight + 1;
      const hasMore = canScroll && scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop > 1;
      setScrollState(previous => previous.docked === docked && previous.canScroll === canScroll && previous.hasMore === hasMore ? previous : { docked, canScroll, hasMore });
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scroll);
    observer.observe(content);
    observer.observe(galleryContent);
    observer.observe(footer);
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

  return <aside ref={sidebarRef} className={styles.sidebar} data-docked={scrollState.docked} aria-label="템플릿 정보 및 시작">
    <div className={styles.sidebarPanel}>
      <div ref={scrollRef} className={styles.sidebarInfo} role="region" aria-label="템플릿 상세 정보" tabIndex={scrollState.canScroll ? 0 : -1}>
        <div ref={contentRef} className={styles.sidebarScrollContent}>
          <div className={styles.sidebarContent}>
            {heading}
            <div className={styles.sidebarGallery} inert={scrollState.docked}>
              <div ref={galleryRef} className={styles.sidebarGalleryContent}>{gallery}</div>
            </div>
            {children}
          </div>
          <div className={styles.sidebarNote}>{note}</div>
        </div>
      </div>
      <div ref={footerRef} className={styles.sidebarFooter} data-template-detail-actions data-scroll-more={scrollState.hasMore}>
        <div className={styles.scrollFade} data-template-detail-fade aria-hidden="true" />
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  </aside>;
}
