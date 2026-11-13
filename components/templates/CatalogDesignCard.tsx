"use client";
import { ImageCarousel } from "@/app/components/ui/image-carousel";
import Link from "next/link";
import { Heart } from "@/app/components/ui/site-icon";
import { CATALOG_MOODS } from "@/lib/catalog-facets";
import type { CatalogDesign } from "@/lib/catalog-designs";

export default function CatalogDesignCard({design,liked,busy,onToggle}:{design:CatalogDesign;liked:boolean;busy:boolean;onToggle:(id:string)=>void}) {
  const designer = design.kind === "designer";
  const moods = designer ? CATALOG_MOODS.filter(mood => mood.key !== "all" && design.moods.includes(mood.key)) : [];
  return <article className="site-template-card site-template-selection-card" data-catalog-design={design.id}>
    <div className="site-catalog-media-wrap">
      <div className="site-template-media"><ImageCarousel images={design.images} name={design.name} href={design.detailHref} /></div>
    </div>
    <div className="site-template-details site-stack-copy">
      {designer ? <p className="site-template-category" data-catalog-category>{design.categoryLabel}</p> : null}
      <div className="site-template-title-row">
        <h2 className="type-card-title site-template-title"><Link href={design.detailHref}>{design.name}</Link></h2>
        <button type="button" className="site-icon-control site-button site-button-ghost site-button-icon site-catalog-heart" aria-label={`${design.name} 좋아요${liked?' 취소':''}`} aria-pressed={liked} disabled={busy} onClick={()=>onToggle(design.id)}><Heart size={20} strokeWidth={1.7} fill={liked?'currentColor':'none'} aria-hidden="true" /></button>
      </div>
      {designer ? <>
        <p className="site-template-category" data-catalog-structure>{design.structureLabel} · {design.itemLayout === "album" ? "앨범형" : "리스트형"}</p>
        {moods.length ? <ul className="site-template-category site-template-moods" aria-label="분위기" data-catalog-moods>{moods.map(mood => <li key={mood.key}>#{mood.label}</li>)}</ul> : null}
      </> : <p className="site-template-description line-clamp-2 whitespace-pre-line">{design.description}</p>}
    </div>
  </article>;
}
