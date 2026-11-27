"use client";
import { ImageCarousel } from "@/app/components/ui/image-carousel";
import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { SERVICE_CATEGORY_LABELS } from "@/lib/service-categories";
import { Button } from "@/app/components/ui/button";
import { Eye, Heart } from "@/app/components/ui/site-icon";
import { CATALOG_MOODS } from "@/lib/catalog-facets";
import type { CatalogDesign } from "@/lib/catalog-designs";

export default function CatalogDesignCard({design,liked,busy,onToggle}:{design:CatalogDesign;liked:boolean;busy:boolean;onToggle:(id:string)=>void}) {
  const designer = design.kind === "designer";
  const mood = CATALOG_MOODS.find(option => option.key === design.moods[0]);
  const serviceLabel = SERVICE_CATEGORY_LABELS[design.service];
  const category = designer && design.categoryLabel !== serviceLabel ? `${serviceLabel} · ${design.categoryLabel}` : serviceLabel;
  return <article className="site-template-card site-template-selection-card" data-catalog-design={design.id} data-catalog-service={design.service}>
    <div className="site-catalog-media-wrap">
      <div className="site-template-media"><ImageCarousel images={design.images} name={design.name} href={design.detailHref} controls="on-interaction" /></div>
    </div>
    <div className="site-template-details site-stack-title">
      <div className="site-stack-copy">
        <div className="site-template-title-row">
          <div className="site-stack-detail">
            <p className="site-template-category" data-catalog-category>{category}</p>
            <h2 className="type-card-title site-template-title"><Link href={design.detailHref}>{design.name}</Link></h2>
          </div>
          <button type="button" className="site-icon-control site-button site-button-ghost site-button-icon site-catalog-heart" aria-label={`${design.name} 좋아요${liked?' 취소':''}`} aria-pressed={liked} disabled={busy} onClick={()=>onToggle(design.id)}><Heart size={20} strokeWidth={1.7} fill={liked?'currentColor':'none'} aria-hidden="true" /></button>
        </div>
        {designer ? <div className="site-template-tags">
          <Badge tone="tag" data-catalog-structure>{design.structureLabel}</Badge>
          {mood ? <Badge tone="tag" data-catalog-mood>{mood.label}</Badge> : null}
        </div> : <p className="site-template-description line-clamp-2 whitespace-pre-line">{design.description}</p>}
      </div>
      <div className="site-template-actions site-action-row">
        <Button asChild variant="outline" shape="rounded"><Link href={design.previewHref} prefetch={false} target="_blank" rel="noopener noreferrer" aria-label={`${design.name} 템플릿 미리보기 (새 창)`}><Eye aria-hidden="true" />미리보기</Link></Button>
      </div>
    </div>
  </article>;
}
