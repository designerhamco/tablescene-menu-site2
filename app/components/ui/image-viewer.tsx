"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { ChevronLeft, ChevronRight } from "./site-arrow";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";

export type ImageViewerItem = { src: string; label: string };

/** Shared full-screen media dialog; original images load only while open. */
export function ImageViewer({ images, name, initialIndex = 0, children }: {
  images: readonly ImageViewerItem[]; name: string; initialIndex?: number; children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const image = images[index] ?? images[0];
  const multiple = images.length > 1;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = viewport.current;
      if (element) element.scrollTo({ left: zoomed ? (element.scrollWidth - element.clientWidth) / 2 : 0, top: zoomed ? (element.scrollHeight - element.clientHeight) / 2 : 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomed, index, open]);
  if (!image) return null;
  const select = (next: number) => { setIndex((next + images.length) % images.length); setZoomed(false); };

  return <Dialog open={open} onOpenChange={next => {
    if (next) { setIndex(Math.min(initialIndex, images.length - 1)); setZoomed(false); }
    setOpen(next);
  }}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="site-image-viewer" aria-describedby={undefined} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.stopPropagation();
      if (zoomed || !multiple || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      select(event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : index + (event.key === "ArrowLeft" ? -1 : 1));
    }}>
      <DialogHeader reserveCloseButton><DialogTitle>{name} · {image.label}</DialogTitle></DialogHeader>
      <div ref={viewport} className="site-image-viewer-viewport" data-zoomed={zoomed || undefined} tabIndex={0} role="region" aria-label={`${image.label} 이미지${zoomed ? " · 스크롤하여 이동" : ""}`}>
        <div className="site-image-viewer-canvas">
          <Image src={image.src} alt={`${name} ${image.label}`} fill unoptimized loading="eager" draggable={false} />
        </div>
      </div>
      <div className="site-image-viewer-tools">
        <span className="type-caption" role="status" aria-live="polite" aria-atomic="true">{index + 1} / {images.length}</span>
        {multiple ? <div className="site-action-row" role="group" aria-label="확대 이미지 선택">
          <Button type="button" variant="outline" size="icon" aria-label="이전 확대 이미지" onClick={() => select(index - 1)}><ChevronLeft aria-hidden="true" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="다음 확대 이미지" onClick={() => select(index + 1)}><ChevronRight aria-hidden="true" /></Button>
        </div> : null}
        <Button type="button" variant="outline" aria-pressed={zoomed} onClick={() => setZoomed(current => !current)}>{zoomed ? "화면에 맞춤" : "확대"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
