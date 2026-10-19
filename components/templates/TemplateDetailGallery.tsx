"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import styles from "./template-detail.module.css";

const views = [
  { label: "전체 디자인", position: "center", detail: false },
  { label: "왼쪽 디테일", position: "left", detail: true },
  { label: "오른쪽 디테일", position: "right", detail: true },
];

export function TemplateDetailShare() {
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("템플릿 링크를 복사했습니다.");
    } catch {
      toast.error("링크를 복사하지 못했습니다. 주소창의 링크를 복사해 주세요.");
    }
  }
  return <button type="button" className={`site-button site-button-ghost ${styles.share}`} onClick={share} aria-label="템플릿 링크 복사"><Share2 size={18} aria-hidden="true" /></button>;
}

export default function TemplateDetailGallery({ image, name }: { image: string; name: string }) {
  const [selected, setSelected] = useState(0);
  const view = views[selected];
  const move = (direction: number) => setSelected(current => (current + direction + views.length) % views.length);

  return (
    <section className={styles.gallery} aria-label={`${name} 디자인 갤러리`} aria-roledescription="캐러셀"
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}>
      <div className={styles.galleryImage}>
        <Image src={image} alt={`${name} ${view.label}`} fill sizes="(min-width: 768px) 400px, 100vw" loading="eager"
          style={{ objectFit: view.detail ? "cover" : "contain", objectPosition: view.position, transform: view.detail ? "scale(1.7)" : undefined, transformOrigin: `${view.position} center` }} />
        <div className={styles.galleryArrows}>
          <button type="button" className="site-button site-button-outline" aria-label="이전 디자인 이미지" onClick={() => move(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" className="site-button site-button-outline" aria-label="다음 디자인 이미지" onClick={() => move(1)}><ChevronRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <div className={styles.galleryBottom}>
        <div className={styles.thumbnails} role="group" aria-label="디자인 이미지 선택">
          {views.map((item, index) => <button key={item.label} type="button" className={styles.thumbnail} aria-label={item.label} aria-pressed={selected === index} onClick={() => setSelected(index)}>
            <Image src={image} alt="" fill sizes="56px" style={{ objectFit: item.detail ? "cover" : "contain", objectPosition: item.position, transform: item.detail ? "scale(1.7)" : undefined, transformOrigin: `${item.position} center` }} />
          </button>)}
        </div>
        <p className="type-caption" aria-live="polite" aria-atomic="true">{view.label} <span className={styles.galleryCount}>{selected + 1} / {views.length}</span></p>
      </div>
    </section>
  );
}
