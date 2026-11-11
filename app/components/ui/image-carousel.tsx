"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/app/components/ui/site-arrow";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "./button";

export type ImageCarouselItem = { src: string; label: string };
type ImageCarouselProps = {
  images: readonly ImageCarouselItem[];
  name: string;
  href?: string;
  presentation?: "catalog" | "gallery";
  showThumbnails?: boolean;
  sizes?: string;
};

/** Actual registered images only; navigation tools never live inside a link. */
export function ImageCarousel({ images, name, href, presentation = "catalog", showThumbnails = false, sizes }: ImageCarouselProps) {
  const multiple = images.length > 1;
  const [viewportRef, api] = useEmblaCarousel({ loop: multiple, watchDrag: multiple, breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } } });
  const [selected, setSelected] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const syncSelection = useCallback(() => {
    const next = api?.selectedScrollSnap() ?? 0;
    setSelected(next);
    const root = rootRef.current;
    const focused = document.activeElement;
    const slides = root?.querySelectorAll(".site-image-carousel-slide");
    if (root && focused && root.contains(focused) && focused.closest(".site-image-carousel-slide") && !slides?.[next]?.contains(focused)) {
      root.focus({ preventScroll: true });
    }
  }, [api]);
  useEffect(() => {
    if (!api) return;
    api.on("select", syncSelection).on("reInit", syncSelection);
    return () => { api.off("select", syncSelection).off("reInit", syncSelection); };
  }, [api, syncSelection]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!multiple || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") api?.scrollPrev();
    if (event.key === "ArrowRight") api?.scrollNext();
    if (event.key === "Home") api?.scrollTo(0);
    if (event.key === "End") api?.scrollTo(images.length - 1);
    rootRef.current?.focus({ preventScroll: true });
  };
  if (!images.length) return null;

  return <div className="site-image-carousel" data-presentation={presentation} ref={rootRef}
    role={multiple ? "region" : undefined} aria-roledescription={multiple ? "캐러셀" : undefined}
    aria-label={multiple ? `${name} 이미지` : undefined} tabIndex={multiple ? 0 : undefined} onKeyDown={onKeyDown}>
    <div className="site-image-carousel-stage">
      <div className="site-image-carousel-viewport" ref={viewportRef}>
        <div className="site-image-carousel-track">
          {images.map((image, index) => {
            const picture = <Image src={image.src} alt={`${name} ${image.label}`} fill
              sizes={sizes ?? (presentation === "gallery" ? "(min-width: 768px) 400px, 100vw" : "(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw")}
              loading={index === 0 && presentation === "gallery" ? "eager" : "lazy"} draggable={false} />;
            return <div key={image.src} className="site-image-carousel-slide" role={multiple ? "group" : undefined}
              aria-roledescription={multiple ? "슬라이드" : undefined} aria-label={multiple ? `${index + 1} / ${images.length}` : undefined}
              aria-hidden={multiple ? selected !== index : undefined}>
              {href ? <Link href={href} aria-label={`${name} 상세 보기`} tabIndex={selected === index ? 0 : -1}>{picture}</Link> : picture}
            </div>;
          })}
        </div>
      </div>
      {multiple ? <>
        <div className="site-image-carousel-arrows">
          <Button type="button" variant="media" size="icon" aria-label={`${name} 이전 이미지`} onClick={() => api?.scrollPrev()}><ChevronLeft aria-hidden="true" /></Button>
          <Button type="button" variant="media" size="icon" aria-label={`${name} 다음 이미지`} onClick={() => api?.scrollNext()}><ChevronRight aria-hidden="true" /></Button>
        </div>
        <span className="site-image-carousel-count type-caption" role="status" aria-live="polite" aria-atomic="true" aria-label={`${name} 이미지 ${selected + 1} / ${images.length}`}>
          {selected + 1}/{images.length}
        </span>
      </> : null}
    </div>
    {multiple && showThumbnails ? <div className="site-image-carousel-thumbnails" role="group" aria-label={`${name} 이미지 선택`}>
      {images.map((image, index) => <button key={image.src} type="button" className="site-image-carousel-thumbnail"
        aria-label={image.label} aria-pressed={selected === index} onClick={() => api?.scrollTo(index)}>
        <Image src={image.src} alt="" fill sizes="56px" draggable={false} />
      </button>)}
    </div> : null}
  </div>;
}
