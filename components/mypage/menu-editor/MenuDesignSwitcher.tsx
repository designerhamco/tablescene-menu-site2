'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { SitePagination } from '@/app/components/ui/site-pagination';
import { catalogDesigns, getCatalogDesign, getSelectableCatalogDesign } from '@/lib/catalog-designs';
import type { MenuDesignAccess, MenuService } from '@/lib/menu-design-policy';
export default function MenuDesignSwitcher({menuId,current,service,access,basic=false,industryLabel,disabled=false}:{menuId:string;current:string;service:MenuService;access:MenuDesignAccess;basic?:boolean;industryLabel?:string;disabled?:boolean}) {
  const [selection,setSelection]=useState(current),[pending,setPending]=useState(false),[message,setMessage]=useState('');
  const [page, setPage] = useState(1);
  const router=useRouter(),design=getCatalogDesign(selection);
  const currentDesign = getCatalogDesign(current);
  const showCurrentDesign = currentDesign && !getSelectableCatalogDesign(current);
  const choices = catalogDesigns.filter((candidate) => candidate.service === service && (access === "all" || candidate.kind === "standard"));
  const help = access === "all"
    ? "같은 서비스의 기본 디자인과 디자인 템플릿으로 교체할 수 있습니다."
    : "같은 서비스의 기본 디자인끼리 교체할 수 있습니다.";

  async function applyDesign() {
    if (pending || disabled || selection === current || !choices.some((choice) => choice.id === selection)) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/menu-design", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, designId: selection }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage("디자인이 변경되었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "변경에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (basic) {
    const cards = currentDesign ? [currentDesign, ...choices.filter((choice) => choice.id !== current)] : choices;
    const pageCount = Math.ceil(cards.length / 4);
    const visibleCards = cards.slice((page - 1) * 4, page * 4);
    return (
      <section className="site-stack-group site-content-divider">
        <div className="site-stack-copy">
          <div className="site-action-row">
            <h3 className="type-content-title">템플릿 교체</h3>
            <HelpTooltip label="템플릿 교체 도움말">{help} 메뉴·사진·공개 주소는 유지됩니다.</HelpTooltip>
          </div>
          {industryLabel && <p className="type-body-sm site-copy-muted">현재 업종 · {industryLabel}</p>}
        </div>
        <div className="site-basic-editor-template-cards">
          {visibleCards.map((candidate) => (
            <button key={candidate.id} type="button" className="site-choice site-choice-control site-editor-template-choice"
              aria-pressed={selection === candidate.id} disabled={pending || disabled} onClick={() => setSelection(candidate.id)}>
              <Image src={candidate.image} width={384} height={240} sizes="(max-width: 767px) 45vw, 25vw" alt="" />
              <span className="type-caption site-copy-muted">{candidate.categoryLabel}</span>
              <span className="type-item-title">{candidate.name}</span>
              {candidate.id === current && <span className="type-caption">현재 템플릿</span>}
            </button>
          ))}
        </div>
        <SitePagination currentPage={page} totalPages={pageCount} onSelect={setPage} label="교체할 템플릿 목록 페이지" />
        <div className="site-action-row" data-distribution="center">
          {design && <Link href={design.previewHref} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">선택한 템플릿 미리보기</Link>}
          <button type="button" className="site-button site-button-primary" disabled={pending || disabled || selection === current || !choices.some((choice) => choice.id === selection)} onClick={() => void applyDesign()}>
            {pending ? "교체 중…" : "선택한 템플릿으로 교체"}
          </button>
        </div>
        {message && <p role="status" className="type-body-sm">{message}</p>}
      </section>
    );
  }

  return <section className="site-section site-editor-subpanel mb-5 p-5"><h3 className="type-content-title">디자인 교체</h3><p className="site-body-support mt-2 mb-4 text-zinc-600">{access==='all'?'같은 서비스의 기본 디자인과 디자인 템플릿을 교체할 수 있습니다.':'같은 서비스의 기본 디자인끼리 교체할 수 있습니다.'} 메뉴·사진·공개 주소는 유지됩니다.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void applyDesign(); }}>
      <label className="type-label grid min-w-0 gap-2">디자인<select className="site-field site-input" value={selection} onChange={e=>setSelection(e.target.value)} disabled={pending}>{showCurrentDesign ? <option value={current}>{currentDesign.name} (현재 디자인)</option> : null}{choices.map(d=><option key={d.id} value={d.id}>{d.kind==='standard'?'기본 · ':''}{d.name}</option>)}</select></label>
      {design?<Link href={design.previewHref} target="_blank" className="site-button site-button-outline">미리보기</Link>:null}
      <button type="submit" className="site-button site-button-primary" disabled={pending||selection===current}>{pending?'변경 중…':'선택한 디자인 적용'}</button>
    </form><p role="status" className="type-body-sm mt-3">{message}</p>
  </section>;
}
