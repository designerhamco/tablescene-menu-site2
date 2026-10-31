"use client";

import { ALBUM_IMAGE_RATIOS, unifiedAppearanceRadius, withUnifiedAppearanceRadius } from "@/lib/menu-appearance";
import { KOREAN_FONT_OPTIONS, getAvailableEnglishFontsForTemplate, getEnglishFontOption, getKoreanFontOption } from "@/lib/font-options";
import { type PreviewDesign, type PreviewDesignDefaults, type PreviewFontChoice } from "@/lib/menu-preview-design";
import { resolvePreviewChipColors, type PreviewChipColors } from "@/lib/menu-preview-chip-colors";
import { REPRESENTATIVE_ALIGNMENTS } from "@/lib/menu-design-surfaces";
import { MENU_TEXT_COLOR_GROUPS, MENU_TEXT_COLOR_LABELS, type MenuTextColorGroup } from "@/lib/menu-text-colors";
import ImageRadiusSelect from "./ImageRadiusSelect";
import PreviewColorPicker from "./PreviewColorPicker";
import styles from "./PreviewDesignOptions.module.css";

export default function PreviewDesignOptions({ value, defaults, templateKey, album, dining, disabled, alignmentDisabled = false, onChange }: {
  value: PreviewDesign;
  defaults: PreviewDesignDefaults;
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
    textColors: { ...value.textColors,
      ...(value.textColorGroupsVersion !== 2 && value.textColors?.supporting && !value.textColors?.information ? { information: value.textColors.supporting } : {}),
      [group]: color },
  });
  const colorDefault = (group: MenuTextColorGroup) => (group === "information" && value.textColorGroupsVersion !== 2 ? value.textColors?.supporting : undefined) ?? defaults.textColors[group]
    ?? value.fonts?.[group === "brand" || group === "category" ? group : "other"]?.color
    ?? (dining && group === "representative" ? value.coverDescriptionColor ?? defaults.colors.coverDescription : defaults.textColorDefaults[group]);
  const appearance = { ...defaults.appearance, imageRadii: { ...defaults.appearance.imageRadii, ...value.imageRadii }, chipShape: value.chipShape ?? defaults.appearance.chipShape };
  const radius = unifiedAppearanceRadius(appearance, !dining);
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
      <label className={styles.option}>한글 서체<select aria-label="공통 한글 서체" value={value.fontFamily?.ko ?? ""} disabled={disabled} className={styles.select} onChange={event => set({fontFamily:{...value.fontFamily,ko:event.target.value as PreviewFontChoice["ko"] || undefined}})}>
        <option value="">기본값 · {getKoreanFontOption(defaults.fontFamily.ko)?.label}</option>{KOREAN_FONT_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
      <label className={styles.option}>영문 서체<select aria-label="공통 영문 서체" value={value.fontFamily?.en ?? ""} disabled={disabled} className={styles.select} onChange={event => set({fontFamily:{...value.fontFamily,en:event.target.value as PreviewFontChoice["en"] || undefined}})}>
        <option value="">기본값 · {getEnglishFontOption(defaults.fontFamily.en)?.label}</option>{getAvailableEnglishFontsForTemplate(templateKey).map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select></label>
    </div></fieldset>
    <fieldset><legend className={styles.legend}>글자색</legend><div className={styles.colorGrid} data-preview-font-groups>{MENU_TEXT_COLOR_GROUPS.map(group => {
      const label = MENU_TEXT_COLOR_LABELS[group];
      return <PreviewColorPicker key={group} label={label} accessibleLabel={`${label} 글자색`} value={value.textColors?.[group]} defaultColor={colorDefault(group)} onChange={color => textColor(group, color)} disabled={disabled} />;
    })}</div></fieldset>
    {album ? <fieldset className={styles.albumRatio}><legend className={styles.legend}>앨범형 상품 이미지</legend><label className={styles.option}>상품 이미지 비율<select aria-label="앨범형 상품 이미지 비율" value={value.albumImageRatio ?? defaults.appearance.albumImageRatio} onChange={event => set({ albumImageRatio: event.target.value as PreviewDesign["albumImageRatio"] })} disabled={disabled} className={styles.select}>{ALBUM_IMAGE_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}</select></label></fieldset> : null}
    {!dining ? <fieldset data-preview-chip-colors><legend className={styles.legend}>텍스트칩 색상</legend>
      <div className={styles.chipColors}>
        <fieldset><legend>일반 텍스트칩</legend><div className={styles.colorGrid}>
          <PreviewColorPicker label="배경색" accessibleLabel="일반 텍스트칩 배경색" value={value.chipColors?.generalBackground} defaultColor={defaults.chipColors.generalBackground} onChange={color => setChipColor("generalBackground", color)} disabled={disabled}/>
          <PreviewColorPicker label="글자색" accessibleLabel="일반 텍스트칩 글자색" value={value.chipColors?.generalText} defaultColor={chipColors.generalText ?? defaults.chipColors.generalText} onChange={color => setChipColor("generalText", color)} disabled={disabled}/>
        </div></fieldset>
        <fieldset><legend>기간할인 텍스트칩</legend><div className={styles.colorGrid}>
          <PreviewColorPicker label="배경색" accessibleLabel="기간할인 텍스트칩 배경색" value={value.chipColors?.saleBackground} defaultColor={defaults.chipColors.saleBackground} onChange={color => setChipColor("saleBackground", color)} disabled={disabled}/>
          <PreviewColorPicker label="글자색" accessibleLabel="기간할인 텍스트칩 글자색" value={value.chipColors?.saleText} defaultColor={chipColors.saleText ?? defaults.chipColors.saleText} onChange={color => setChipColor("saleText", color)} disabled={disabled}/>
        </div><p className={styles.hint}>배경색은 할인 안내와 남은 시간 문구에도 함께 적용됩니다.</p></fieldset>
      </div>
    </fieldset> : null}
    {!dining ? <fieldset data-preview-representative-alignment><legend className={styles.legend}>가게명·가게 설명 정렬</legend>
      <label className={styles.option}><select aria-label="가게명·가게 설명 정렬" value={alignmentDisabled ? "template" : value.representativeAlignment ?? "template"} disabled={disabled || alignmentDisabled} className={styles.select} onChange={event => set({ representativeAlignment: event.target.value === "template" ? undefined : event.target.value as PreviewDesign["representativeAlignment"] })}><option value="template">템플릿 기본값</option>{REPRESENTATIVE_ALIGNMENTS.map(align => <option key={align} value={align}>{{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[align]}</option>)}</select></label>
      {alignmentDisabled ? <p className={styles.hint}>상단행 고정형은 가게명 중앙·가게 설명 왼쪽 정렬을 유지합니다.</p> : null}
    </fieldset> : null}
    <fieldset data-preview-image-radii><legend className={styles.legend}>이미지·텍스트칩 라운드</legend>
      <label className={styles.option}><span>광고·{!dining ? "대표·" : ""}위젯·상품 이미지·텍스트칩</span><ImageRadiusSelect label="이미지·텍스트칩" radius={radius.radius} mixed={radius.mixed} disabled={disabled} className={styles.select}
        onChange={next => {
          const unified = withUnifiedAppearanceRadius(appearance, next, !dining);
          set({ imageRadii: next === undefined ? undefined : unified.imageRadii, chipShape: next === undefined ? undefined : unified.chipShape });
        }}/></label>
    </fieldset>
  </div>;
}
