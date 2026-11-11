'use client';
import { ImageCarousel } from '@/app/components/ui/image-carousel';
import Link from 'next/link';
import { Heart } from "@/app/components/ui/site-icon";
import type { CatalogDesign } from '@/lib/catalog-designs';
export default function CatalogDesignCard({design,liked,busy,onToggle}:{design:CatalogDesign;liked:boolean;busy:boolean;onToggle:(id:string)=>void}) {
  return <article className="site-template-card site-template-selection-card" data-catalog-design={design.id}>
    <div className="site-catalog-media-wrap">
      <div className="site-template-media"><ImageCarousel images={design.images} name={design.name} href={design.detailHref} /></div>
    </div>
    <div className="site-template-details">
      <div className="site-template-title-row">
        <h2 className="type-card-title site-template-title"><Link href={design.detailHref}>{design.name}</Link></h2>
        <button type="button" className="site-icon-control site-button site-button-ghost site-button-icon site-catalog-heart" aria-label={`${design.name} 좋아요${liked?' 취소':''}`} aria-pressed={liked} disabled={busy} onClick={()=>onToggle(design.id)}><Heart size={20} strokeWidth={1.7} fill={liked?'currentColor':'none'} aria-hidden="true" /></button>
      </div>
      <p className="site-template-category mt-1">{design.kind==='standard'?'기본 디자인':design.categoryLabel} · {design.service==='basic'?'베이직':design.service==='dining'?'다이닝':'디스플레이'}</p>
      <p className="site-template-description mt-2 line-clamp-2 whitespace-pre-line">{design.description}</p>
    </div>
  </article>;
}
