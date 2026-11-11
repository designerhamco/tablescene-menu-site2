"use client";

import { ALBUM_IMAGE_RATIOS, withUnifiedAppearanceRadius } from "@/lib/menu-appearance";
import type { PreviewRenderedDesign } from "@/lib/menu-preview-rendered-design";
import { KOREAN_FONT_OPTIONS, getAvailableEnglishFontsForTemplate, getEnglishFontOption, getKoreanFontOption } from "@/lib/font-options";
import { type PreviewDesign, type PreviewDesignDefaults } from "@/lib/menu-preview-design";
import { resolvePreviewChipColors, type PreviewChipColors } from "@/lib/menu-preview-chip-colors";
import { REPRESENTATIVE_ALIGNMENTS } from "@/lib/menu-design-surfaces";
import { getMenuTextColorGroups, getMenuTextColorLabel, resolvedMenuTextColors, type MenuTextColorGroup } from "@/lib/menu-text-colors";
import { FontSelect } from "@/app/components/ui/font-select";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ImageRadiusSelect from "./ImageRadiusSelect";
import PreviewColorPicker from "./PreviewColorPicker";
import styles from "./PreviewDesignOptions.module.css";

export default function PreviewDesignOptions({ value, defaults, renderedDesign, templateKey, album, dining, disabled, alignmentDisabled = false, onChange }: {
  value: PreviewDesign;
  defaults: PreviewDesignDefaults;
  renderedDesign?: PreviewRenderedDesign;
  templateKey: string;
  album: boolean;
  dining: boolean;
  disabled: boolean;
  alignmentDisabled?: boolean;
  onChange: (value: PreviewDesign) => void;
}) {
  const set = (patch: Partial<PreviewDesign>) => onChange({ ...value, ...patch });
  const textColor = (group: MenuTextColorGroup, color?: string) => set({
    textColorGroupsVersion: 2,
    ...(dining ? { diningTextColorGroupsVersion: 3 as const } : {}),
    textColors: { ...(dining ? resolvedMenuTextColors({design:{...value,textColors:{...defaults.textColors,...value.textColors}}},true) : {}), ...value.textColors,
      ...(value.textColorGroupsVersion !== 2 && value.textColors?.supporting && !value.textColors?.information ? { information: value.textColors.supporting } : {}),
      [group]: color },
  });
  const colorDefault = (group: MenuTextColorGroup) => (group === "information" && value.textColorGroupsVersion !== 2 ? value.textColors?.supporting : undefined) ?? defaults.textColors[group]
    ?? renderedDesign?.nativeTextColors[group]
    ?? (group === "pageTitle" || group === "sectionDescription" || group === "price" ? undefined : value.fonts?.[group === "brand" || group === "category" ? group : "other"]?.color)
    ?? (dining && group === "representative" ? value.coverDescriptionColor ?? defaults.colors.coverDescription : defaults.textColorDefaults[group]);
  const appearance = { ...defaults.appearance, imageRadii: { ...defaults.appearance.imageRadii, ...value.imageRadii }, chipShape: value.chipShape ?? defaults.appearance.chipShape };
  const chipColors = resolvePreviewChipColors(value.chipColors ?? {});
  const setChipColor = (key: keyof PreviewChipColors, color?: string) => {
    const next = { ...value.chipColors, [key]: color };
    set({ chipColors: Object.values(next).some(Boolean) ? next : undefined });
  };
  return <div className={styles.panel} data-preview-design-options>
    <div className={styles.intro}><button type="button" onClick={() => onChange({})} disabled={disabled || !Object.keys(value).length} className="site-button site-button-outline site-button-compact">디자인 초기화</button></div>
    <fieldset><legend className={styles.legend}>배경색</legend><div className={styles.colorGrid} data-preview-backgrounds>
      <PreviewColorPicker label={dining ? "본문 페이지 배경색" : "페이지 배경색"} value={value.pageBackground} defaultColor={defaults.colors.page} onChange={pageBackground => set({ pageBackground })} disabled={disabled} />
      {dining ? <>
        <PreviewColorPicker label="커버 배경색" value={value.coverBackground} defaultColor={defaults.colors.cover} onChange={coverBackground => set({ coverBackground })} disabled={disabled} />
        {templateKey.endsWith("_b") ? <PreviewColorPicker label="좌측 메뉴열 배경색" value={value.sidebarBackground} defaultColor={defaults.colors.sidebar} onChange={sidebarBackground => set({ sidebarBackground })} disabled={disabled} /> : null}
      </> : <PreviewColorPicker label="보조 배경색" value={value.auxiliaryBackground} defaultColor={defaults.colors.auxiliary} onChange={auxiliaryBackground => set({ auxiliaryBackground })} disabled={disabled} />}
    </div></fieldset>
    <fieldset data-preview-common-fonts><legend className={styles.legend}>공통 서체</legend><div className={styles.backgrounds}>
      <div className={styles.option}><span>한글 서체</span><FontSelect label="공통 한글 서체" script="ko" options={KOREAN_FONT_OPTIONS} defaultOption={getKoreanFontOption(defaults.fontFamily.ko)!} value={value.fontFamily?.ko ?? ""} disabled={disabled} className={styles.select} size="sm" defaultLabel="기본값" onChange={ko => set({fontFamily:{...value.fontFamily,ko:ko || undefined}})} /></div>
      <div className={styles.option}><span>영문 서체</span><FontSelect label="공통 영문 서체" script="en" options={getAvailableEnglishFontsForTemplate(templateKey)} defaultOption={getEnglishFontOption(defaults.fontFamily.en)!} value={value.fontFamily?.en ?? ""} disabled={disabled} className={styles.select} size="sm" defaultLabel="기본값" onChange={en => set({fontFamily:{...value.fontFamily,en:en || undefined}})} /></div>
    </div></fieldset>
    <fieldset><legend className={styles.legend}>글자색</legend><div className={styles.colorGrid} data-preview-font-groups>{getMenuTextColorGroups(dining).map(group => {
      const label = getMenuTextColorLabel(group, dining);
      return <PreviewColorPicker key={group} label={label} accessibleLabel={`${label} 글자색`} value={value.textColors?.[group]} defaultColor={colorDefault(group)} onChange={color => textColor(group, color)} disabled={disabled} loading={!renderedDesign} />;
    })}</div></fieldset>
    {album ? <fieldset className={styles.albumRatio}><legend className={styles.legend}>앨범형 상품 이미지</legend><label className={styles.option}>상품 이미지 비율<select aria-label="앨범형 상품 이미지 비율" value={value.albumImageRatio ?? defaults.appearance.albumImageRatio} onChange={event => set({ albumImageRatio: event.target.value as PreviewDesign["albumImageRatio"] })} disabled={disabled} className={styles.select}>{ALBUM_IMAGE_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}</select></label></fieldset> : null}
    {!dining ? <fieldset data-preview-chip-colors><legend className={styles.legend}>텍스트칩 색상</legend>
      <div className={styles.chipColors}>
        <fieldset><legend>일반 텍스트칩</legend><div className={styles.colorGrid}>
          <PreviewColorPicker label="배경색" accessibleLabel="일반 텍스트칩 배경색" value={value.chipColors?.generalBackground} defaultColor={defaults.chipColors.generalBackground} onChange={color => setChipColor("generalBackground", color)} disabled={disabled}/>
          <PreviewColorPicker label="글자색" accessibleLabel="일반 텍스트칩 글자색" value={value.chipColors?.generalText} defaultColor={chipColors.generalText ?? defaults.chipColors.generalText} onChange={color => setChipColor("generalText", color)} disabled={disabled}/>
        </div></fieldset>
        <fieldset><legend>기간할인 텍스트칩<InfoTooltip layer="preview" label="기간할인 색상 적용 범위">배경색은 할인 안내와 남은 시간 문구에도 함께 적용됩니다.</InfoTooltip></legend><div className={styles.colorGrid}>
          <PreviewColorPicker label="배경색" accessibleLabel="기간할인 텍스트칩 배경색" value={value.chipColors?.saleBackground} defaultColor={defaults.chipColors.saleBackground} onChange={color => setChipColor("saleBackground", color)} disabled={disabled}/>
          <PreviewColorPicker label="글자색" accessibleLabel="기간할인 텍스트칩 글자색" value={value.chipColors?.saleText} defaultColor={chipColors.saleText ?? defaults.chipColors.saleText} onChange={color => setChipColor("saleText", color)} disabled={disabled}/>
        </div></fieldset>
      </div>
    </fieldset> : null}
    {!dining ? <fieldset data-preview-representative-alignment><legend className={styles.legend}>가게명·가게 설명 정렬{alignmentDisabled ? <InfoTooltip layer="preview" label="정렬 변경 제한">상단행 고정형의 PC·태블릿에서는 템플릿에 정해진 정렬을 유지합니다.</InfoTooltip> : null}</legend>
      <label className={styles.option}><select aria-label="가게명·가게 설명 정렬" value={renderedDesign?.alignment.value ?? "current"} disabled={disabled || alignmentDisabled || !renderedDesign} className={styles.select} onChange={event => { if (REPRESENTATIVE_ALIGNMENTS.includes(event.target.value as PreviewDesign["representativeAlignment"] & string)) set({ representativeAlignment: event.target.value as PreviewDesign["representativeAlignment"] }); }}>
        {REPRESENTATIVE_ALIGNMENTS.map(align => <option key={align} value={align}>{{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[align]}</option>)}
        {(!renderedDesign || renderedDesign.alignment.value === "current") ? <option value="current">{renderedDesign?.alignment.label ?? "설정 확인 중"}</option> : null}
      </select></label>
    </fieldset> : null}
    <fieldset data-preview-image-radii><legend className={styles.legend}>이미지·텍스트칩 라운드</legend>
      <label className={styles.option}><span>광고·{!dining ? "대표·" : ""}위젯·상품 이미지·텍스트칩</span><ImageRadiusSelect label="이미지·텍스트칩" selection={renderedDesign?.radius ?? {value:"current",label:"설정 확인 중"}} showTemplateOption={false} disabled={disabled || !renderedDesign} className={styles.select}
        onChange={next => {
          const unified = withUnifiedAppearanceRadius(appearance, next, !dining);
          set({ imageRadii: next === undefined ? undefined : unified.imageRadii, chipShape: next === undefined ? undefined : unified.chipShape });
        }}/></label>
    </fieldset>
  </div>;
}
