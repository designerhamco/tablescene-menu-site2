"use client";

import { FontSelect } from "@/app/components/ui/font-select";
import { KOREAN_FONT_OPTIONS, getAvailableEnglishFontsForTemplate, getEnglishFontOption, getKoreanFontOption } from "@/lib/font-options";
import { DISPLAY_FONT_SIZE_SCALE_OPTIONS } from "@/lib/template-typography-presets";
import type { PreviewDesign, PreviewDesignDefaults } from "@/lib/menu-preview-design";
import styles from "./PreviewDesignOptions.module.css";

export default function DisplayPreviewOptions({ value, defaults, scale, pending, onChange, onScaleChange, onReset }: {
  value: PreviewDesign;
  defaults: PreviewDesignDefaults;
  scale: string;
  pending: boolean;
  onChange: (value: PreviewDesign) => void;
  onScaleChange: (scale?: string) => void;
  onReset: () => void;
}) {
  return <div className={styles.panel} data-preview-design-options data-display-design-options="">
    <div className={styles.intro}><button type="button" className="site-button site-button-outline site-button-compact" disabled={pending || (!value.fontFamily && scale === "m")} onClick={onReset}>디자인 초기화</button></div>
    <fieldset><legend className={styles.legend}>공통 서체</legend><div className={styles.backgrounds}>
      <div className={styles.option}><span>한글 서체</span><FontSelect label="공통 한글 서체" script="ko" options={KOREAN_FONT_OPTIONS} defaultOption={getKoreanFontOption(defaults.fontFamily.ko)!} value={value.fontFamily?.ko ?? ""} disabled={pending} className={styles.select} size="sm" defaultLabel="기본값" onChange={ko => onChange({ fontFamily: { ...value.fontFamily, ko: ko || undefined } })} /></div>
      <div className={styles.option}><span>영문 서체</span><FontSelect label="공통 영문 서체" script="en" options={getAvailableEnglishFontsForTemplate("display_menu_a")} defaultOption={getEnglishFontOption(defaults.fontFamily.en)!} value={value.fontFamily?.en ?? ""} disabled={pending} className={styles.select} size="sm" defaultLabel="기본값" onChange={en => onChange({ fontFamily: { ...value.fontFamily, en: en || undefined } })} /></div>
    </div></fieldset>
    <label className={styles.option}><span>글자 크기</span><select aria-label="디스플레이 글자 크기" className={styles.select} value={scale} disabled={pending} onChange={event => onScaleChange(event.target.value)}>
      {DISPLAY_FONT_SIZE_SCALE_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label} · {option.description}</option>)}
    </select></label>
  </div>;
}
