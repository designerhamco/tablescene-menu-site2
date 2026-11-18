"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/** Scroll-linked entrance only: semantic type, spacing and document flow stay intact. */
export default function MarketingCopyReveal({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: root, offset: ["start 0.92", "start 0.6"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const transform = useTransform(scrollYProgress, value => `translateY(calc(${1 - value} * var(--site-space-copy)))`);

  return <motion.div ref={root} className={className} data-marketing-copy-reveal style={reduced ? undefined : { opacity, transform }}>
    {children}
  </motion.div>;
}
