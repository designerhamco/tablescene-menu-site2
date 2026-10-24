'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, ZoomIn } from 'lucide-react';
import type { CatalogDesign } from '@/lib/catalog-designs';
export default function CatalogDesignCard({design,liked,busy,onToggle}:{design:CatalogDesign;liked:boolean;busy:boolean;onToggle:(id:string)=>void}) {
  return <article className="site-template-card site-template-selection-card" data-catalog-design={design.id}>
    <div className="site-catalog-media-wrap">
      <Link href={design.detailHref} className="site-catalog-media-link" aria-label={`${design.name} 상세 보기`}>
        <div className="site-template-media"><Image src={design.image} alt={`${design.name} 메뉴판 디자인`} width={1200} height={900} sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw" className="site-catalog-image" /></div>
      </Link>
    </div>
    <div className="site-template-details">
      <div className="site-template-title-row">
        <h2 className="type-content-title site-template-title"><Link href={design.detailHref}>{design.name}</Link></h2>
        <button type="button" className="site-button site-button-ghost site-catalog-heart" aria-label={`${design.name} 좋아요${liked?' 취소':''}`} aria-pressed={liked} disabled={busy} onClick={()=>onToggle(design.id)}><Heart size={20} strokeWidth={1.7} fill={liked?'currentColor':'none'} aria-hidden="true" /></button>
      </div>
      <p className="site-template-category mt-1">{design.kind==='standard'?'기본 디자인':design.categoryLabel} · {design.service==='basic'?'베이직':design.service==='dining'?'다이닝':'디스플레이'}</p>
      <p className="site-template-description mt-2 line-clamp-2 whitespace-pre-line">{design.description}</p>
      <div className="site-template-actions">
        <Link href={design.previewHref} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline site-button-rounded"><ZoomIn size={16} aria-hidden="true" />미리보기</Link>
        <Link href={design.detailHref} className="site-template-detail-link">상세보기<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </div>
  </article>;
}
