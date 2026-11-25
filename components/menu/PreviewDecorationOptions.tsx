"use client";
import { MENU_DECORATION_LINES, MENU_DECORATION_NAMES, MENU_DECORATION_STYLES, MENU_DECORATION_WIDTHS, supportsMenuDecorationLine, type MenuDecorationLine, type MenuLineDecoration } from "@/lib/menu-decorations";
import type { PreviewDesign, PreviewDesignDefaults } from "@/lib/menu-preview-design";
import type { PreviewRenderedDesign } from "@/lib/menu-preview-rendered-design";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import InfoTooltip from "@/components/ui/InfoTooltip";
import PreviewColorPicker from "./PreviewColorPicker";
import styles from "./PreviewDesignOptions.module.css";

export default function PreviewDecorationOptions({ value, defaults, renderedDesign, album, device, disabled, savedFallback, onChange }: {
  value: PreviewDesign; defaults: PreviewDesignDefaults; renderedDesign?: PreviewRenderedDesign;
  album: boolean; device?: MenuPreviewDevice; disabled: boolean; savedFallback: boolean;
  onChange: (value: PreviewDesign) => void;
}) {
  const current = value.decorations ?? { ...defaults.decorations, ...(value.hidePatternBands ? { patternBands: false } : {}) };
  const update = (key: MenuDecorationLine, patch: Partial<MenuLineDecoration>) => {
    onChange({ ...value, decorations: { ...current, [key]: { ...current[key], ...patch } } });
  };
  const colorDefault = (key: MenuDecorationLine) => {
    const group = key === "itemDivider" || key === "priceLeader" ? "supporting" : "category";
    return value.textColors?.[group] ?? defaults.textColors[group] ?? renderedDesign?.nativeTextColors[group] ?? defaults.textColorDefaults[group];
  };
  const tips: Partial<Record<MenuDecorationLine, string>> = {
    columnDivider: "리스트형 PC·태블릿에서 실제로 이웃한 메뉴 열이 두 개 이상일 때 표시됩니다. 대표 영역과 메뉴 영역 사이에는 표시하지 않습니다.",
    categoryDivider: "같은 열 안에서 연속된 카테고리 사이에 표시됩니다. 위젯이나 새 열의 시작에는 표시하지 않습니다.",
    itemDivider: "같은 카테고리·같은 열의 메뉴 아이템 사이에만 표시됩니다.",
    priceLeader: "메뉴명과 가격이 나란히 배치된 리스트형에 표시됩니다.",
  };
  return <div className={styles.panel} data-preview-decoration-options>
    <div className={styles.intro}><button type="button" className="site-button site-button-outline site-button-compact" disabled={disabled || (savedFallback ? value.decorations === undefined : !Object.keys(current).length)} onClick={() => onChange({ ...value, hidePatternBands: undefined, decorations: savedFallback ? undefined : {} })}>{savedFallback ? "장식 편집 되돌리기" : "장식 초기화"}</button></div>
    <fieldset data-preview-pattern-bands disabled={disabled || !defaults.patternBandsSupported}>
      <legend className={styles.legend}>상·하단 패턴 띠<InfoTooltip layer="preview" label="패턴 띠 적용 범위">{!defaults.patternBandsSupported ? "온유와 기본 좌상단 디자인은 패턴 띠를 지원하지 않습니다." : "패턴 이미지와 띠 두께는 메뉴판 관리의 디자인 설정에서 바꿀 수 있어요. 패턴 이미지를 등록한 뒤 표시할 수 있습니다."}</InfoTooltip></legend>
      <label className={styles.option}>표시<select aria-label="상·하단 패턴 띠 표시" className={styles.select} value={current.patternBands === undefined ? "template" : current.patternBands ? "on" : "off"} onChange={event => onChange({ ...value, hidePatternBands: undefined, decorations: { ...current, patternBands: event.target.value === "template" ? undefined : event.target.value === "on" } })}>
        <option value="template">템플릿 기본</option><option value="on" disabled={!defaults.patternBandsAssetAvailable}>사용</option><option value="off">사용 안 함</option>
      </select></label>
    </fieldset>
    {MENU_DECORATION_LINES.filter(key => supportsMenuDecorationLine(key, album)).map(key => {
      const line = current[key] ?? {}, label = MENU_DECORATION_NAMES[key];
      const unavailable = !supportsMenuDecorationLine(key, album, device);
      return <fieldset key={key} disabled={disabled || unavailable} data-preview-decoration={key}>
        <legend className={styles.legend}>{label}{tips[key] ? <InfoTooltip layer="preview" label={`${label} 적용 범위`}>{tips[key]}</InfoTooltip> : null}</legend>
        <div className={styles.backgrounds}>
          <label className={styles.option}>표시<select aria-label={`${label} 표시`} className={styles.select} value={line.visible === undefined ? "template" : line.visible ? "on" : "off"} onChange={event => update(key, { visible: event.target.value === "template" ? undefined : event.target.value === "on" })}>
            <option value="template">템플릿 기본</option><option value="on">사용</option><option value="off">사용 안 함</option>
          </select></label>
          <label className={styles.option}>두께<select aria-label={`${label} 두께`} className={styles.select} value={line.width ?? "template"} onChange={event => update(key, { width: event.target.value === "template" ? undefined : Number(event.target.value) as MenuLineDecoration["width"] })}>
            <option value="template">템플릿 기본</option>{MENU_DECORATION_WIDTHS.map(width => <option key={width} value={width}>{width}px</option>)}
          </select></label>
          <label className={styles.option}>선 스타일<select aria-label={`${label} 스타일`} className={styles.select} value={line.style ?? "template"} onChange={event => update(key, { style: event.target.value === "template" ? undefined : event.target.value as MenuLineDecoration["style"] })}>
            <option value="template">템플릿 기본</option>{MENU_DECORATION_STYLES.map(style => <option key={style} value={style}>{{ solid: "실선", dashed: "파선", dotted: "점선" }[style]}</option>)}
          </select></label>
          <label className={styles.option}>색상<select aria-label={`${label} 색상 방식`} className={styles.select} value={line.color ? "custom" : "default"} onChange={event => update(key, { color: event.target.value === "custom" ? colorDefault(key) : undefined })}>
            <option value="default">기본색 유지</option><option value="custom">직접 지정</option>
          </select></label>
          {line.color ? <PreviewColorPicker label="선 색상" accessibleLabel={`${label} 색상`} value={line.color} defaultColor={colorDefault(key)} onChange={color => update(key, { color })} disabled={disabled || unavailable} resetTarget="기본 연결색" /> : null}
        </div>
      </fieldset>;
    })}
  </div>;
}
