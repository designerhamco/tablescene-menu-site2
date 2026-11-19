"use client";

import { useRef, type ReactNode } from "react";
import { Palette } from "@/app/components/ui/site-icon";
import { ChevronLeft } from "@/app/components/ui/site-arrow";
import { getTemplatePreviewOptionGroups } from "@/lib/template-preview-options";
import type { DefaultDesignOptionKey, DefaultDesignOptions } from "@/lib/default-design-options";
import type { PreviewDesign, PreviewDesignDefaults } from "@/lib/menu-preview-design";
import type { PreviewRenderedDesign } from "@/lib/menu-preview-rendered-design";
import InfoTooltip from "@/components/ui/InfoTooltip";
import PreviewDesignOptions from "./PreviewDesignOptions";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import styles from "./MenuPreviewOptionsPanel.module.css";

export default function MenuPreviewOptionsPanel({ open, onToggle, tab, onTabChange, groups, values, onFeatureChange, onFeatureReset, canResetFeatures, pending, templateKey, defaults, renderedDesign, design, onDesignChange, album, patternBandsAvailable, alignmentDisabled = false, featureContent, designContent }: {
  open: boolean;
  onToggle: () => void;
  tab: string;
  onTabChange: (tab: string) => void;
  groups: ReturnType<typeof getTemplatePreviewOptionGroups>;
  values: DefaultDesignOptions;
  onFeatureChange: (key: DefaultDesignOptionKey, enabled: boolean) => void;
  onFeatureReset: () => void;
  canResetFeatures: boolean;
  pending: boolean;
  templateKey: string;
  defaults?: PreviewDesignDefaults;
  renderedDesign?: PreviewRenderedDesign;
  design: PreviewDesign;
  onDesignChange: (value: PreviewDesign) => void;
  album: boolean;
  patternBandsAvailable?: boolean;
  alignmentDisabled?: boolean;
  featureContent?: ReactNode;
  designContent?: ReactNode;
}) {
  const toggle = useRef<HTMLButtonElement>(null);
  const choices = groups.flatMap(group => group.choices);
  const count = choices.filter(([key]) => values[key]).length;
  const patternOption = patternBandsAvailable ? <div className="site-action-row" data-preview-pattern-bands>
    <label className={styles.choice}>
      <input type="checkbox" checked={!design.hidePatternBands} disabled={pending} onChange={event => onDesignChange({ ...design, hidePatternBands: event.target.checked ? undefined : true })} />패턴 띠 표시
    </label>
    <InfoTooltip layer="preview" label="패턴 띠 도움말">패턴 이미지와 띠 두께는 메뉴판 관리의 디자인 설정에서 바꿀 수 있어요.</InfoTooltip>
  </div> : null;
  return <aside className={styles.panel} aria-label="보기 옵션" data-preview-options-panel data-options-open={open ? "true" : "false"}
    onKeyDown={event => {
      if (event.key === "Escape" && open && !event.defaultPrevented && !(event.target as Element).closest("[data-preview-color-picker], [data-preview-color-reset]")) {
        event.preventDefault(); onToggle(); toggle.current?.focus();
      }
    }}>
    <button ref={toggle} type="button" className={styles.toggle} title={open ? "보기 옵션 닫기" : "보기 옵션 열기"} aria-label={open ? "보기 옵션 닫기" : "보기 옵션 열기"} aria-expanded={open} aria-controls="preview-display-options" data-preview-options-toggle onClick={onToggle}>
      <Palette className={styles.palette} size={22} aria-hidden="true" /><span className={styles.label}>보기 옵션</span><span className={styles.count}>{groups.length && tab === "features" ? `${count}/${choices.length} 선택` : "디자인 미리보기"}</span><ChevronLeft className={styles.chevron} size={16} aria-hidden="true" />
    </button>
    <div id="preview-display-options" className={styles.body} hidden={!open}>
      {!groups.length ? patternOption : <Tabs purpose="section" value={tab} onValueChange={onTabChange}>
        <TabsList size="sm" distribution="equal" aria-label="미리보기 옵션 종류" className="w-full">
          <TabsTrigger value="features" id="preview-features-tab" aria-controls="preview-features-panel">기능 옵션</TabsTrigger>
          <TabsTrigger value="design" id="preview-design-tab" aria-controls="preview-design-panel">디자인 옵션</TabsTrigger>
        </TabsList>
        <TabsContent value="features" id="preview-features-panel" aria-labelledby="preview-features-tab" data-preview-display-options>
        <div className="site-stack-block">
          <div className="site-action-row" data-distribution="end"><Button type="button" variant="outline" size="compact" onClick={onFeatureReset} disabled={pending || !canResetFeatures} data-preview-feature-reset>기능 초기화</Button></div>
        <div className={styles.groups}>{groups.map(group => <fieldset key={group.label} className={styles.group}>
          <legend>{group.label}</legend><div className={styles.choices}>{group.choices.map(([key, label]) => <label key={key} className={styles.choice}>
            <input type="checkbox" aria-label={`${label} 보기`} checked={values[key]} disabled={pending || ((key === "featuredPreview" || key === "coverImagesPreview") && !values.coverPreview)} onChange={event => onFeatureChange(key, event.target.checked)} />{label}
          </label>)}</div>
        </fieldset>)}</div>
        {featureContent}
        </div>
        </TabsContent>
        <TabsContent value="design" id="preview-design-panel" aria-labelledby="preview-design-tab">
        {open && defaults ? designContent ?? <PreviewDesignOptions templateKey={templateKey} defaults={defaults} renderedDesign={renderedDesign} value={design} album={album} dining={templateKey.startsWith("dining_")} disabled={pending} alignmentDisabled={alignmentDisabled} onChange={onDesignChange} /> : null}
          {patternOption}
        </TabsContent>
      </Tabs>}
    </div>
  </aside>;
}
