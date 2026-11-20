"use client";

import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { ProgressBar } from "@/app/components/ui/loading-state";
import { heroSegmentProgressAt } from "@/lib/hero-cafe-motion";
import styles from "./StoryProgress.module.css";

type Props = {
  label: string;
  chapters: readonly string[];
  active: number;
  progress: number;
  onSelect: (index: number) => void;
  skip: ReactNode;
  story: "hero" | "basic";
  className?: string;
};

export default function StoryProgress({ label, chapters, active, progress, onSelect, skip, story, className }: Props) {
  return <nav
    className={className ? `${styles.nav} ${className}` : styles.nav}
    data-hero-progress={story === "hero" ? "" : undefined}
    data-basic-progress={story === "basic" ? "" : undefined}
    aria-label={label}
  >
    <div className={styles.segments}>
      {chapters.map((chapter, index) => {
        const current = active === index;
        const name = `${index + 1}. ${chapter} · ${current ? "현재 장면" : "장면 보기"}`;
        const value = Math.round(heroSegmentProgressAt(index, active, progress) * 1000) / 10;
        return <div className={styles.segment} key={chapter}>
          <Button
            className={styles.segmentAction}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={name}
            title={name}
            aria-current={current ? "step" : undefined}
            data-hero-segment={story === "hero" ? index : undefined}
            data-basic-segment={story === "basic" ? index : undefined}
            data-active={current}
            onClick={() => onSelect(index)}
            onKeyDown={event => {
              let next: number;
              switch (event.key) {
                case "ArrowRight":
                case "ArrowDown": next = Math.min(chapters.length - 1, index + 1); break;
                case "ArrowLeft":
                case "ArrowUp": next = Math.max(0, index - 1); break;
                case "Home": next = 0; break;
                case "End": next = chapters.length - 1; break;
                default: return;
              }
              event.preventDefault();
              onSelect(next);
              event.currentTarget.closest("nav")?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus({ preventScroll:true });
            }}
          />
          <ProgressBar label={`${chapter} 장면 스크롤 진행`} value={value} appearance="media"/>
        </div>;
      })}
    </div>
    <div className={styles.skip}>{skip}</div>
  </nav>;
}
