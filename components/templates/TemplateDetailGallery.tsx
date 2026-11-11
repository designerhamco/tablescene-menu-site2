"use client";

import { ImageCarousel } from "@/app/components/ui/image-carousel";
import type { CatalogImage } from "@/lib/catalog-designs";
import { Heart, Share2 } from "@/app/components/ui/site-icon";
import { useEffect } from "react";
import { toast } from "sonner";

import styles from "./template-detail.module.css";
import useTemplateFavorites from "./useTemplateFavorites";
import { ShareDialog } from "@/app/components/ui/share-dialog";

export function TemplateDetailShare() {
  return <ShareDialog title="마음에 드는 아티메뉴 디자인을 공유해 보세요." trigger={<button type="button" className="site-button site-button-ghost site-button-icon" aria-label="템플릿 공유하기"><Share2 size={18} aria-hidden="true" /></button>} />;
}

export function TemplateDetailActions({ designId, name }: { designId: string; name: string }) {
  const { favorites, toggle, busy, message } = useTemplateFavorites();
  const liked = favorites.includes(designId);
  useEffect(() => { if (message) toast.error(message); }, [message]);
  return <div className={styles.headingActions} role="group" aria-label="템플릿 좋아요와 공유">
    <button type="button" className="site-icon-control site-button site-button-ghost site-button-icon site-catalog-heart" aria-label={`${name} 좋아요${liked ? " 취소" : ""}`} aria-pressed={liked} disabled={busy} onClick={() => toggle(designId)}><Heart size={20} strokeWidth={1.7} fill={liked ? "currentColor" : "none"} aria-hidden="true" /></button>
    <TemplateDetailShare />
  </div>;
}

export default function TemplateDetailGallery({ images, name }: { images: readonly CatalogImage[]; name: string }) {
  return <section className={styles.gallery} aria-label={`${name} 디자인 갤러리`}>
    <ImageCarousel images={images} name={name} presentation="gallery" showThumbnails />
  </section>;
}
