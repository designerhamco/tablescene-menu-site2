"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, Palette } from "lucide-react";
import { getTemplatePreviewOptionGroups } from "@/lib/template-preview-options";
import type { DefaultDesignOptionKey, DefaultDesignOptions } from "@/lib/default-design-options";
import type { PreviewDesign, PreviewDesignDefaults } from "@/lib/menu-preview-design";
import PreviewDesignOptions from "./PreviewDesignOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import styles from "./MenuPreviewOptionsPanel.module.css";

export default function MenuPreviewOptionsPanel({ open, onToggle, tab, onTabChange, groups, values, onFeatureChange, pending, templateKey, defaults, design, onDesignChange, album, alignmentDisabled = false, extraFeatures }: {
  open: boolean;
  onToggle: () => void;
  tab: string;
  onTabChange: (tab: string) => void;
  groups: ReturnType<typeof getTemplatePreviewOptionGroups>;
  values: DefaultDesignOptions;
  onFeatureChange: (key: DefaultDesignOptionKey, enabled: boolean) => void;
  pending: boolean;
  templateKey: string;
  defaults?: PreviewDesignDefaults;
  design: PreviewDesign;
  onDesignChange: (value: PreviewDesign) => void;
  album: boolean;
  alignmentDisabled?: boolean;
  extraFeatures?: ReactNode;
}) {
  const toggle = useRef<HTMLButtonElement>(null);
  const choices = groups.flatMap(group => group.choices);
  const count = choices.filter(([key]) => values[key]).length;
  return <aside className={styles.panel} aria-label="보기 옵션" data-preview-options-panel data-options-open={open ? "true" : "false"}
    onKeyDown={event => {
      if (event.key === "Escape" && open && !event.defaultPrevented && !(event.target as Element).closest("[data-preview-color-picker]")) {
        event.preventDefault(); onToggle(); toggle.current?.focus();
      }
    }}>
    <button ref={toggle} type="button" className={styles.toggle} title={open ? "보기 옵션 닫기" : "보기 옵션 열기"} aria-label={open ? "보기 옵션 닫기" : "보기 옵션 열기"} aria-expanded={open} aria-controls="preview-display-options" data-preview-options-toggle onClick={onToggle}>
      <Palette className={styles.palette} size={22} aria-hidden="true" /><span className={styles.label}>보기 옵션</span><span className={styles.count}>{tab === "features" ? `${count}/${choices.length} 선택` : "디자인 미리보기"}</span><ChevronLeft className={styles.chevron} size={16} aria-hidden="true" />
    </button>
    <div id="preview-display-options" className={styles.body} hidden={!open}>
      <p className={styles.experienceNote} data-preview-experience-note>
        보기·디자인 옵션을 바꿔 템플릿을 체험해 보세요.<br />변경 내용은 미리보기에만 적용되며 저장되지 않습니다.
      </p>
      <Tabs purpose="section" value={tab} onValueChange={onTabChange}>
        <TabsList size="sm" distribution="equal" aria-label="미리보기 옵션 종류" className="w-full">
          <TabsTrigger value="features" id="preview-features-tab" aria-controls="preview-features-panel">기능 옵션</TabsTrigger>
          <TabsTrigger value="design" id="preview-design-tab" aria-controls="preview-design-panel">디자인 옵션</TabsTrigger>
        </TabsList>
        <TabsContent value="features" id="preview-features-panel" aria-labelledby="preview-features-tab" data-preview-display-options>
        <div className={styles.groups}>{groups.map(group => <fieldset key={group.label} className={styles.group}>
          <legend>{group.label}</legend><div className={styles.choices}>{group.choices.map(([key, label]) => <label key={key} className={styles.choice}>
            <input type="checkbox" aria-label={`${label} 보기`} checked={values[key]} disabled={pending || ((key === "featuredPreview" || key === "coverImagesPreview") && !values.coverPreview)} onChange={event => onFeatureChange(key, event.target.checked)} />{label}
          </label>)}</div>
        </fieldset>)}</div>
        {extraFeatures ? <div className={styles.extraFeatures}>{extraFeatures}</div> : null}
        </TabsContent>
        <TabsContent value="design" id="preview-design-panel" aria-labelledby="preview-design-tab">
        {open && defaults ? <PreviewDesignOptions templateKey={templateKey} defaults={defaults} value={design} album={album} dining={templateKey.startsWith("dining_")} disabled={pending} alignmentDisabled={alignmentDisabled} onChange={onDesignChange} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  </aside>;
}
