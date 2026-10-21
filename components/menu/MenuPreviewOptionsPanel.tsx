"use client";

import { useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { getTemplatePreviewOptionGroups } from "@/lib/template-preview-options";
import type { DefaultDesignOptionKey, DefaultDesignOptions } from "@/lib/default-design-options";
import type { PreviewDesign, PreviewDesignDefaults } from "@/lib/menu-preview-design";
import PreviewDesignOptions from "./PreviewDesignOptions";
import styles from "./MenuPreviewOptionsPanel.module.css";

export default function MenuPreviewOptionsPanel({ open, onToggle, tab, onTabChange, groups, values, onFeatureChange, pending, templateKey, defaults, design, onDesignChange, album }: {
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
    <button ref={toggle} type="button" className={styles.toggle} aria-label={open ? "보기 옵션 닫기" : "보기 옵션 열기"} aria-expanded={open} aria-controls="preview-display-options" data-preview-options-toggle onClick={onToggle}>
      <span className={styles.label}>보기 옵션</span><span className={styles.count}>{tab === "features" ? `${count}/${choices.length} 선택` : "디자인 미리보기"}</span><ChevronLeft className={styles.chevron} size={16} aria-hidden="true" />
    </button>
    <div id="preview-display-options" className={styles.body} hidden={!open}>
      <div role="tablist" aria-label="미리보기 옵션 종류" className={styles.tabs}>
        {([["features", "기능 옵션"], ["design", "디자인 옵션"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" id={`preview-${value}-tab`} aria-controls={`preview-${value}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} className={styles.tab}
          onClick={() => onTabChange(value)} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "features" : event.key === "End" ? "design" : value === "features" ? "design" : "features";
            onTabChange(next); document.getElementById(`preview-${next}-tab`)?.focus();
          }}>{label}</button>)}
      </div>
      <div id="preview-features-panel" role="tabpanel" aria-labelledby="preview-features-tab" data-preview-display-options hidden={tab !== "features"}>
        <div className={styles.groups}>{groups.map(group => <fieldset key={group.label} className={styles.group}>
          <legend>{group.label}</legend><div className={styles.choices}>{group.choices.map(([key, label]) => <label key={key} className={styles.choice}>
            <input type="checkbox" aria-label={`${label} 보기`} checked={values[key]} disabled={pending || ((key === "featuredPreview" || key === "coverImagesPreview") && !values.coverPreview)} onChange={event => onFeatureChange(key, event.target.checked)} />{label}
          </label>)}</div>
        </fieldset>)}</div>
      </div>
      <div id="preview-design-panel" role="tabpanel" aria-labelledby="preview-design-tab" hidden={tab !== "design"}>
        {open && defaults ? <PreviewDesignOptions templateKey={templateKey} defaults={defaults} value={design} album={album} dining={templateKey.startsWith("dining_")} disabled={pending} onChange={onDesignChange} /> : null}
      </div>
    </div>
  </aside>;
}
