'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ImageCarousel } from '@/app/components/ui/image-carousel';
import { Check } from '@/app/components/ui/site-icon';
import HelpTooltip from '@/components/ui/HelpTooltip';
import { SitePagination } from '@/app/components/ui/site-pagination';
import { catalogDesigns, getCatalogDesign, getSelectableCatalogDesign } from '@/lib/catalog-designs';
import type { MenuDesignAccess, MenuTemplateService } from '@/lib/menu-design-policy';
import { ContentPanel } from '@/app/components/ui/content-panel';
export default function MenuDesignSwitcher({ menuId, current, service, basic = false, industryLabel, disabled = false }: {
  menuId: string;
  current: string;
  service: MenuTemplateService;
  access: MenuDesignAccess;
  basic?: boolean;
  industryCategory?: string | null;
  industryLabel?: string;
  disabled?: boolean;
}) {
  const [selection,setSelection]=useState(current),[pending,setPending]=useState(false),[errorMessage,setErrorMessage]=useState('');
  const [page, setPage] = useState(1);
  const router=useRouter(),design=getCatalogDesign(selection);
  const currentDesign = getCatalogDesign(current);
  const showCurrentDesign = currentDesign && !getSelectableCatalogDesign(current);
  const choices = catalogDesigns.filter((candidate) => candidate.service === service);
  const help = "같은 서비스의 모든 지원 템플릿으로 추가 요금 없이 교체할 수 있습니다. 메뉴·사진·공개 주소는 유지됩니다.";

  async function applyDesign() {
    if (pending || disabled || selection === current || !choices.some((choice) => choice.id === selection)) return;
    setPending(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/menu-design", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, designId: selection }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success("디자인이 변경되었습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "변경에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (basic) {
    const cards = currentDesign ? [currentDesign, ...choices.filter((choice) => choice.id !== current)] : choices;
    const pageCount = Math.ceil(cards.length / 4);
    const visibleCards = cards.slice((page - 1) * 4, page * 4);
    return (
      <section className="site-stack-copy">
        <div className="site-action-row">
          <h3 className="type-subsection-title">템플릿 교체</h3>
          <HelpTooltip label="템플릿 교체 도움말">{help}</HelpTooltip>
        </div>
        <div className="site-stack-block site-content-divider site-editor-section-rule" data-density="compact">
          {industryLabel && <p className="type-body-sm">현재 업종 · {industryLabel}</p>}
          {disabled && <p className="type-caption site-copy-muted">이 메뉴판에서 템플릿을 교체할 수 없습니다.</p>}
          <div className="site-basic-editor-template-cards">
            {visibleCards.map((candidate) => (
              <article key={candidate.id} className="site-editor-template-card" data-selected={selection === candidate.id}>
                <button type="button" className="site-button site-button-outline site-button-icon" data-icon-size="compact"
                  aria-label={`${candidate.name} 선택${candidate.id === current ? " · 현재 템플릿" : ""}`}
                  aria-pressed={selection === candidate.id} disabled={pending || disabled} onClick={() => setSelection(candidate.id)}>
                  <Check className="site-editor-choice-mark" aria-hidden />
                </button>
                <ImageCarousel images={candidate.images} name={candidate.name} sizes="(max-width: 767px) 45vw, 25vw" />
                <div className="site-stack-detail">
                  <span className="type-caption site-copy-muted">{candidate.categoryLabel}</span>
                  <span className="type-item-title">{candidate.name}</span>
                </div>
              </article>
            ))}
          </div>
          <SitePagination currentPage={page} totalPages={pageCount} onSelect={setPage} showSingle label="교체할 템플릿 목록 페이지" />
          <div className="site-action-row" data-distribution="center">
            {design && <Link href={design.previewHref} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">선택한 템플릿 미리보기</Link>}
            <button type="button" className="site-button site-button-primary" disabled={pending || disabled || selection === current || !choices.some((choice) => choice.id === selection)} onClick={() => void applyDesign()}>
              {pending ? "교체 중…" : "선택한 템플릿으로 교체"}
            </button>
          </div>
          {errorMessage && <p role="alert" className="type-body-sm text-destructive">{errorMessage}</p>}
        </div>
      </section>
    );
  }

  return <ContentPanel><div className="site-stack-copy"><div className="site-action-row"><h3 className="type-content-title">디자인 교체</h3><HelpTooltip label="디자인 교체 도움말">{help}</HelpTooltip></div>
    <form className="site-form-row" onSubmit={(event) => { event.preventDefault(); void applyDesign(); }}>
      <label className="site-field-stack type-label">디자인<select className="site-field site-input" value={selection} onChange={e=>setSelection(e.target.value)} disabled={pending || disabled}>{showCurrentDesign ? <option value={current}>{currentDesign.name} (현재 디자인)</option> : null}{choices.map(d=><option key={d.id} value={d.id}>{d.kind==='standard'?'기본 · ':''}{d.name}</option>)}</select></label>
      {design?<Link href={design.previewHref} target="_blank" className="site-button site-button-outline">미리보기</Link>:null}
      <button type="submit" className="site-button site-button-primary" disabled={pending||disabled||selection===current||!choices.some(choice=>choice.id===selection)}>{pending?'변경 중…':'선택한 디자인 적용'}</button>
    </form>{errorMessage && <p role="alert" className="type-body-sm text-destructive">{errorMessage}</p>}
  </div></ContentPanel>;
}
