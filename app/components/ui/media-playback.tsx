"use client";
import type { ButtonHTMLAttributes } from "react";
import { Pause, Play } from "./site-icon";
import { cn } from "./utils";

/** One semantic hit target over a media poster, with shared playback affordance. */
export function MediaPlayback({ playing, label, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { playing: boolean; label: string }) {
  return <button {...props} type="button" className={cn("site-media-playback", className)} aria-label={`${label} ${playing ? "일시 정지" : "재생"}`} aria-pressed={playing}>
    <span className="site-media-playback-indicator" aria-hidden="true">{playing ? <Pause/> : <Play/>}</span>
  </button>;
}
