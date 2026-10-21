'use client';
import { ChevronDown, Check } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { CATALOG_INDUSTRIES, filterCatalogDesigns, getCatalogPricing, type CatalogKind, type CatalogService } from '@/lib/catalog-designs';
import type { TemplateCatalogItem } from '@/lib/templates';
import CatalogDesignCard from '@/components/templates/CatalogDesignCard';
import useTemplateFavorites from '@/components/templates/useTemplateFavorites';
import TemplatePagination from './TemplatePagination';
const INDUSTRY_GROUPS=CATALOG_INDUSTRIES;
const TEMPLATES_PER_PAGE = 6;
const PRODUCT_TABS=[{key:'basic',label:'베이직'},{key:'dining',label:'다이닝'},{key:'display',label:'디스플레이'}] as const;
export default function TemplateGallery({initialProduct='dining_single',initialKind='standard',initialFilter='all'}:{diningTemplates:readonly TemplateCatalogItem[];displayTemplates:readonly TemplateCatalogItem[];displayCheckoutEnabled?:boolean;initialProduct?:'dining_single'|'dining_multi'|'display';initialKind?:CatalogKind;initialFilter?:string}) {
  const [product,setProduct]=useState<CatalogService>(initialProduct==='dining_multi'?'dining':initialProduct==='display'?'display':'basic');
  const [kind,setKind]=useState<CatalogKind>(initialKind);
  const [filter,setFilter]=useState(initialKind==='standard'?(['all','list','album'].includes(initialFilter)?initialFilter:'all'):(CATALOG_INDUSTRIES.some(i=>i.key===initialFilter)?initialFilter:'all'));
  const [open,setOpen]=useState<CatalogKind|null>(initialKind);
  const [page,setPage]=useState(1);
  const galleryStartRef=useRef<HTMLDivElement>(null),tabsId=useId();
  const {favorites,toggle,busy,message}=useTemplateFavorites();
  const visibleTemplates=useMemo(()=>filterCatalogDesigns(product,kind,filter),[product,kind,filter]);
  const totalPages=Math.ceil(visibleTemplates.length/TEMPLATES_PER_PAGE),currentPage=Math.min(page,Math.max(totalPages,1));
  const paginatedTemplates=visibleTemplates.slice((currentPage-1)*TEMPLATES_PER_PAGE,currentPage*TEMPLATES_PER_PAGE);
  const kindLabel=kind==='standard'?'기본 디자인':'디자인 템플릿';
  const pricing=product==='display'?null:getCatalogPricing(product,kind);
  const money=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
  const productTitle=product==='display'?'아티메뉴 디스플레이':`${product==='basic'?'베이직':'다이닝'} ${kindLabel}`;
  function keepUrl(service:CatalogService,nextKind:CatalogKind,nextFilter:string){const url=new URL(location.href);url.searchParams.set('plan',service);url.searchParams.set('category',nextKind);url.searchParams.set('filter',nextFilter);history.replaceState(null,'',url);}
  function selectProduct(service:CatalogService){setProduct(service);setFilter('all');setPage(1);keepUrl(service,kind,'all');}
  function selectKind(next:CatalogKind){setKind(next);setFilter('all');setOpen(open===next?null:next);setPage(1);keepUrl(product,next,'all');}
  function selectFilter(next:string){setFilter(next);setPage(1);keepUrl(product,kind,next);}
  const filterLabel=filter==='all'?'전체':kind==='standard'?(filter==='album'?'앨범형':'리스트형'):INDUSTRY_GROUPS.find(i=>i.key===filter)?.label??'전체';
  return <>
    <div className="site-catalog-services"><div className="site-tabs" role="tablist" aria-label="서비스 및 페이지 유형 선택" onKeyDown={event=>{
      const current=PRODUCT_TABS.findIndex(t=>t.key===product),next=event.key==='ArrowRight'?(current+1)%3:event.key==='ArrowLeft'?(current+2)%3:event.key==='Home'?0:event.key==='End'?2:-1;
      if(next<0)return;event.preventDefault();selectProduct(PRODUCT_TABS[next].key);event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{PRODUCT_TABS.map(({key,label})=><button key={key} role="tab" type="button" className="site-tab" id={`${tabsId}-${key}`} aria-controls={`${tabsId}-panel`} aria-selected={product === key} tabIndex={product===key?0:-1} onClick={()=>selectProduct(key)}>{label}</button>)}</div></div>
    <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${product}`}>
      <section className="site-catalog-plan" aria-label="템플릿 이용 안내"><div><p className="site-body-title">{productTitle}</p><p className="site-body-support mt-1 text-zinc-600">{product==='display'?'현재 준비 중입니다.':kind==='standard'?'기본 레이아웃을 선택하고 색상과 글꼴을 매장에 맞게 직접 꾸며보세요.':'완성된 디자인으로 시작하고 같은 서비스의 기본 디자인과 디자인 템플릿을 자유롭게 바꿔보세요.'}</p></div><div><p className="text-lg font-bold">{pricing?`얼리버드 월 ${money(pricing.earlyBirdMonthly)} · 정상가 ${money(pricing.regularMonthly)}`:'준비 중'}</p>{pricing?<p className="site-brand-note mt-2 inline-flex items-center gap-1.5 text-xs font-medium"><Check className="h-4 w-4" aria-hidden="true" />메뉴판 1개당 월 구독 · {kind==='standard'?'기본 디자인끼리 교체 가능':'기본·디자인 템플릿 교체 가능'}</p>:null}</div></section>
      <div ref={galleryStartRef} className="site-catalog-layout scroll-mt-24">
        <aside className="site-catalog-filters" aria-label="템플릿 카테고리"><h2 className="type-item-title mb-4">카테고리</h2>
          {product==='display'?<p className="type-body-sm text-zinc-600">디스플레이 · 준비 중</p>:<div className="site-catalog-accordion">{(['standard','designer'] as const).map(group=><div key={group} className="site-catalog-category-group"><button type="button" className="site-catalog-category-heading" aria-expanded={open===group} aria-controls={`${tabsId}-${group}-categories`} aria-current={kind===group?'true':undefined} onClick={()=>selectKind(group)}><span>{group==='standard'?'기본 디자인':'디자인 템플릿'}</span><ChevronDown size={16} aria-hidden="true" /></button><div id={`${tabsId}-${group}-categories`} hidden={open!==group} className="site-category-list" role="group" aria-label={group==='standard'?'기본 디자인 유형 선택':'디자인 템플릿 업종 선택'}>
            {(group==='standard'?[{key:'all',label:'전체'},{key:'list',label:'리스트형'},{key:'album',label:'앨범형'}]:INDUSTRY_GROUPS).map(item=><button key={item.key} type="button" aria-pressed={kind===group&&filter===item.key} onClick={()=>selectFilter(item.key)}>{item.label}</button>)}
          </div></div>)}</div>}
        </aside>
        <div className="site-catalog-results"><p className="site-catalog-count">{product==='display'?'디스플레이':`${kindLabel} · ${filterLabel}`} <span>{visibleTemplates.length}</span></p><p role="status" className="type-body-sm mb-3 text-red-700">{message}</p>
          {paginatedTemplates.length?<div className="site-template-grid">{paginatedTemplates.map(design=><CatalogDesignCard key={design.id} design={design} liked={favorites.includes(design.id)} busy={busy} onToggle={toggle} />)}</div>:<section className="site-card site-card-empty flex min-h-72 flex-col items-center justify-center px-6 text-center"><h2 className="type-content-title">{filterLabel} 템플릿 준비 중</h2><p className="mt-3 break-keep text-sm text-zinc-600">매장에 잘 어울리는 새 디자인을 순차적으로 추가하고 있습니다.</p></section>}
          <TemplatePagination currentPage={currentPage} totalPages={totalPages} onSelect={next=>{setPage(next);requestAnimationFrame(()=>galleryStartRef.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));}} />
        </div>
      </div>
    </div>
  </>;
}
