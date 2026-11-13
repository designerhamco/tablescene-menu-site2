"use client";
import {useLayoutEffect, useRef, type CSSProperties, type ReactNode} from 'react';
import styles from './MenuPageScrollSurface.module.css';

/** Top-row is a composition; the entire composition shares one scroll surface. */
export default function MenuPageScrollSurface({enabled, background, label, children}: {enabled: boolean; background: string; label: string; children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const scroll = ref.current, shell = scroll.parentElement!;
    let frame = 0, disposed = false;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const board = scroll.querySelector<HTMLElement>('[data-scroll-brand-board]');
      const menu = board?.querySelector<HTMLElement>('[data-native-menu], [data-scroll-menu]');
      const content = menu?.querySelector<HTMLElement>('[data-native-tracks], [data-scroll-content]');
      if (!board || !menu || !content) return;
      const inset = parseFloat(getComputedStyle(board).paddingBottom) || 0;
      const actions = board.querySelector<HTMLElement>('[data-menu-page-actions]');
      const clearance = actions ? inset : 0;
      const bottom = clearance + (actions?.getBoundingClientRect().height ?? 0);
      const bounds = scroll.getBoundingClientRect(), area = menu.getBoundingClientRect();
      const end = content.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(content).paddingBottom) || 0);
      shell.dataset.more = end > bounds.bottom - bottom + 2 ? 'true' : 'false';
      shell.style.setProperty('--menu-page-fade-left', `${area.left - bounds.left}px`);
      shell.style.setProperty('--menu-page-fade-width', `${area.width}px`);
      shell.style.setProperty('--menu-page-fade-bottom', `${bottom}px`);
      shell.style.setProperty('--menu-page-bottom-clearance', `${clearance}px`);
    };
    const schedule = () => {if (!disposed && !frame) frame = requestAnimationFrame(measure);};
    const resize = new ResizeObserver(schedule);
    const observe = () => {
      resize.observe(scroll);
      for (const node of scroll.querySelectorAll('[data-scroll-brand-board], [data-native-header], [data-basic-top-row], [data-native-tracks], [data-scroll-content], [data-menu-page-actions]')) resize.observe(node);
      schedule();
    };
    const mutation = new MutationObserver(observe);
    mutation.observe(scroll, {childList:true, subtree:true});
    scroll.addEventListener('scroll', schedule, {passive:true});
    scroll.addEventListener('load', schedule, true);
    observe(); void document.fonts.ready.then(schedule);
    return () => {disposed=true;cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();scroll.removeEventListener('scroll',schedule);scroll.removeEventListener('load',schedule,true);};
  }, [enabled]);
  if (!enabled) return children;
  return <div className={styles.shell} style={{'--menu-page-background':background} as CSSProperties}>
    <div ref={ref} className={styles.scroll} data-menu-page-scroll role="region" aria-label={label} tabIndex={0}>{children}</div>
    <div className={styles.fade} aria-hidden="true" />
    <div className={styles.bottomClearance} aria-hidden="true" />
  </div>;
}
