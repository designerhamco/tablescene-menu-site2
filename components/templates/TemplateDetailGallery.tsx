"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import styles from "./template-detail.module.css";
import useTemplateFavorites from "./useTemplateFavorites";
import { ShareDialog } from "@/app/components/ui/share-dialog";

const views = [
  { label: "전체 디자인", position: "center", detail: false },
  { label: "왼쪽 디테일", position: "left", detail: true },
  { label: "오른쪽 디테일", position: "right", detail: true },
];

export function TemplateDetailShare() {
  return <ShareDialog title="마음에 드는 아티메뉴 디자인을 공유해 보세요." trigger={<button type="button" className={`site-button site-button-ghost ${styles.share}`} aria-label="템플릿 공유하기"><Share2 size={18} aria-hidden="true" /></button>} />;
}

export function TemplateDetailActions({ designId, name }: { designId: string; name: string }) {
  const { favorites, toggle, busy, message } = useTemplateFavorites();
  const liked = favorites.includes(designId);
  useEffect(() => { if (message) toast.error(message); }, [message]);
  return <div className={styles.headingActions} role="group" aria-label="템플릿 좋아요와 공유">
    <button type="button" className="site-button site-button-ghost site-catalog-heart" aria-label={`${name} 좋아요${liked ? " 취소" : ""}`} aria-pressed={liked} disabled={busy} onClick={() => toggle(designId)}><Heart size={20} strokeWidth={1.7} fill={liked ? "currentColor" : "none"} aria-hidden="true" /></button>
    <TemplateDetailShare />
  </div>;
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
