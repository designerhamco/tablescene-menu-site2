'use client';
import Link from 'next/link';
import { EmptyState } from '@/app/components/ui/empty-state';
import { Heart } from 'lucide-react';
import { getCatalogDesign } from '@/lib/catalog-designs';
import CatalogDesignCard from '@/components/templates/CatalogDesignCard';
import useTemplateFavorites from '@/components/templates/useTemplateFavorites';
export default function FavoriteTemplates({initialFavorites}:{initialFavorites:readonly string[]}) {
  const {favorites,toggle,busy,message}=useTemplateFavorites(initialFavorites);
  const designs=favorites.map(getCatalogDesign).filter(d=>d!==null);
  return <section className="site-catalog-results" aria-labelledby="favorite-designs-title">
    <h2 id="favorite-designs-title" className="type-section-title">좋아요한 템플릿</h2>
    <p className="site-body-support mt-3 mb-6 text-zinc-600">마음에 드는 디자인을 모아 비교해 보세요. 하트를 다시 누르면 목록에서 삭제됩니다.</p>
    <p role="status" className="type-body-sm text-red-700">{message}</p>
    {designs.length?<div className="site-template-grid">{designs.map(design=><CatalogDesignCard key={design.id} design={design} liked busy={busy} onToggle={toggle} />)}</div>:
      <EmptyState headingLevel={3} icon={<Heart />} title="좋아요한 디자인이 아직 없어요" description="마음에 드는 디자인의 하트를 누르면 이곳에서 모아볼 수 있습니다." action={<Link href="/templates" className="site-button site-button-primary site-button-lg site-button-rounded">디자인 둘러보기</Link>} />}
  </section>;
}
