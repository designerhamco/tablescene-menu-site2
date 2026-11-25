"use client";
import { MENU_DECORATION_LINES, MENU_DECORATION_NAMES, MENU_DECORATION_STYLES, MENU_DECORATION_WIDTHS, supportsMenuDecorationLine, type MenuDecorationLine, type MenuLineDecoration } from "@/lib/menu-decorations";
import type { PreviewDesign, PreviewDesignDefaults } from "@/lib/menu-preview-design";
import type { PreviewRenderedDesign } from "@/lib/menu-preview-rendered-design";
import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import InfoTooltip from "@/components/ui/InfoTooltip";
import PreviewColorPicker from "./PreviewColorPicker";
import styles from "./PreviewDesignOptions.module.css";
import optionStyles from "./MenuPreviewOptionsPanel.module.css";

export default function PreviewDecorationOptions({ value, defaults, renderedDesign, album, device, disabled, savedFallback, onChange }: {
  value: PreviewDesign; defaults: PreviewDesignDefaults; renderedDesign?: PreviewRenderedDesign;
  album: boolean; device?: MenuPreviewDevice; disabled: boolean; savedFallback: boolean;
  onChange: (value: PreviewDesign) => void;
}) {
  const current = value.decorations ?? { ...defaults.decorations, ...(value.hidePatternBands ? { patternBands: false } : {}) };
  const update = (key: MenuDecorationLine, patch: Partial<MenuLineDecoration>) => {
    onChange({ ...value, decorations: { ...current, [key]: { ...current[key], ...patch } } });
  };
  const visible = (key: MenuDecorationLine) => current[key]?.visible ?? defaults.decorationVisibilityDefaults?.[key] ?? false;
  const lines = MENU_DECORATION_LINES.filter(key => supportsMenuDecorationLine(key, album));
  const editable = lines.filter(key => visible(key) && supportsMenuDecorationLine(key, album, device));
  const patternVisible = current.patternBands ?? defaults.decorationVisibilityDefaults?.patternBands ?? false;
  const colorDefault = (key: MenuDecorationLine) => {
    if (key === "priceLeader" && renderedDesign?.decorationStrokes?.priceLeader?.defaultColor) return renderedDesign.decorationStrokes.priceLeader.defaultColor;
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
    <fieldset data-preview-decoration-choices>
      <legend className={styles.legend}>장식 선택</legend>
      <div className={optionStyles.choices}>
        <div className={optionStyles.choice} data-preview-pattern-bands>
          <label className={optionStyles.choice}><input type="checkbox" aria-label="상·하단 패턴 띠 표시" checked={patternVisible}
            disabled={disabled || !defaults.patternBandsSupported || (!defaults.patternBandsAssetAvailable && !patternVisible)}
            onChange={event => onChange({ ...value, hidePatternBands: undefined, decorations: { ...current, patternBands: event.target.checked } })} />상·하단 패턴 띠</label>
          <InfoTooltip layer="preview" label="패턴 띠 적용 범위">{!defaults.patternBandsSupported ? "기본 좌상단 디자인은 패턴 띠를 지원하지 않습니다." : "패턴 이미지와 띠 두께는 메뉴판 관리의 디자인 설정에서 바꿀 수 있어요. 패턴 이미지를 등록한 뒤 표시할 수 있습니다."}</InfoTooltip>
        </div>
        {lines.map(key => <div key={key} className={optionStyles.choice}>
          <label className={optionStyles.choice}><input type="checkbox" aria-label={`${MENU_DECORATION_NAMES[key]} 표시`} checked={visible(key)} disabled={disabled || !supportsMenuDecorationLine(key, album, device)} onChange={event => update(key, { visible: event.target.checked })} />{MENU_DECORATION_NAMES[key]}</label>
          {tips[key] ? <InfoTooltip layer="preview" label={`${MENU_DECORATION_NAMES[key]} 적용 범위`}>{tips[key]}</InfoTooltip> : null}
        </div>)}
      </div>
    </fieldset>
    <div className="site-stack-block site-content-divider" data-preview-decoration-design>
    {editable.length ? editable.map(key => {
      const line = current[key] ?? {}, label = MENU_DECORATION_NAMES[key];
      const stroke = renderedDesign?.decorationStrokes?.[key];
      const width = line.width ?? stroke?.width ?? 1;
      const style = line.style ?? stroke?.style ?? (key === "priceLeader" ? "dotted" : "solid");
      return <fieldset key={key} disabled={disabled} data-preview-decoration={key}>
        <legend className={styles.legend}>{label}</legend>
        <div className={styles.colorGrid}>
          <label className={styles.option}>두께<select aria-label={`${label} 두께`} className={styles.select} disabled={!renderedDesign} value={width} onChange={event => update(key, { width: Number(event.target.value) as MenuLineDecoration["width"] })}>
            {!MENU_DECORATION_WIDTHS.some(option => option === width) && <option value={width} disabled>{width}px</option>}{MENU_DECORATION_WIDTHS.map(width => <option key={width} value={width}>{width}px</option>)}
          </select></label>
          <label className={styles.option}>선 스타일<select aria-label={`${label} 스타일`} className={styles.select} disabled={!renderedDesign} value={style} onChange={event => update(key, { style: event.target.value as MenuLineDecoration["style"] })}>
            {MENU_DECORATION_STYLES.map(style => <option key={style} value={style}>{{ solid: "실선", dashed: "파선", dotted: "점선" }[style]}</option>)}
          </select></label>
          <PreviewColorPicker label="선 색상" accessibleLabel={`${label} 색상`} value={line.color} defaultColor={colorDefault(key)} onChange={color => update(key, { color })} disabled={disabled} loading={!renderedDesign} resetTarget="기본 연결색" />
        </div>
      </fieldset>;
    }) : <p className="type-caption site-copy-muted">선 장식을 선택하면 디자인 설정이 표시됩니다.</p>}
    </div>
  </div>;
}
