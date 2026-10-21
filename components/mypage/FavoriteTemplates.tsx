'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { getCatalogDesign } from '@/lib/catalog-designs';
import CatalogDesignCard from '@/components/templates/CatalogDesignCard';
import useTemplateFavorites from '@/components/templates/useTemplateFavorites';
export default function FavoriteTemplates({initialFavorites}:{initialFavorites:readonly string[]}) {
  const {favorites,toggle,busy,message}=useTemplateFavorites(initialFavorites);
  const designs=favorites.map(getCatalogDesign).filter(d=>d!==null);
  return <section className="site-catalog-results" aria-labelledby="favorite-designs-title">
    <h2 id="favorite-designs-title" className="type-subsection-title">좋아요한 템플릿</h2>
    <p className="site-body-support mt-3 mb-6 text-zinc-600">마음에 드는 디자인을 모아 비교해 보세요. 하트를 다시 누르면 목록에서 삭제됩니다.</p>
    <p role="status" className="type-body-sm text-red-700">{message}</p>
    {designs.length?<div className="site-template-grid">{designs.map(design=><CatalogDesignCard key={design.id} design={design} liked busy={busy} onToggle={toggle} />)}</div>:
      <div className="site-card site-card-empty flex min-h-72 flex-col items-center justify-center gap-4 px-6 text-center"><Heart size={28} className="text-zinc-400" aria-hidden="true" /><p className="type-content-title">좋아요한 디자인이 아직 없어요</p><Link href="/apply" className="site-button site-button-primary">디자인 둘러보기</Link></div>}
  </section>;
}
