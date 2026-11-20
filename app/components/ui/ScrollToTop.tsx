import React, { useState, useEffect, useRef, type RefObject } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowUp } from "@/app/components/ui/site-arrow";

type Props = { adaptToBackdrop?: boolean; avoidActions?: RefObject<HTMLElement | null> };

const ScrollToTop = ({ adaptToBackdrop = false, avoidActions }: Props) => {
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 200);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const actions = avoidActions?.current;
    const dock = dockRef.current;
    if (!isVisible || !actions || !dock) return;

    const placeButton = () => {
      // The dock keeps the default position while the button itself moves clear.
      const button = dock.getBoundingClientRect();
      const footer = actions.getBoundingClientRect();
      const overlaps = footer.left < button.right && footer.right > button.left
        && footer.top < button.bottom && footer.bottom > button.top;
      dock.style.setProperty("--site-scroll-top-translate", overlaps
        ? `0 calc(-${button.bottom - footer.top}px - var(--site-space-copy))`
        : "none");
    };
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; placeButton(); });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(actions);
    if (actions.parentElement) observer.observe(actions.parentElement);
    placeButton();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [avoidActions, isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={dockRef}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          className="site-scroll-top fixed z-30"
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })}
            className="site-button site-button-secondary site-button-icon site-scroll-top-control"
            data-icon-appearance="framed"
            data-adapt-to-backdrop={adaptToBackdrop || undefined}
            aria-label="맨 위로 이동"
          >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default ScrollToTop;
