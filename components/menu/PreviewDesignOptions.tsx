"use client";

import { ALBUM_IMAGE_RATIOS, CHIP_SHAPES, CHIP_SHAPE_LABELS, IMAGE_RADIUS_KEYS, IMAGE_RADIUS_LABELS } from "@/lib/menu-appearance";
import { KOREAN_FONT_OPTIONS, getAvailableEnglishFontsForTemplate, getEnglishFontOption, getKoreanFontOption } from "@/lib/font-options";
import { PREVIEW_FONT_GROUPS, type PreviewDesign, type PreviewDesignDefaults, type PreviewFontChoice } from "@/lib/menu-preview-design";
import { REPRESENTATIVE_ALIGNMENTS } from "@/lib/menu-design-surfaces";
import ImageRadiusSelect from "./ImageRadiusSelect";
import PreviewColorPicker from "./PreviewColorPicker";
import styles from "./PreviewDesignOptions.module.css";

export default function PreviewDesignOptions({ value, defaults, templateKey, album, dining, disabled, onChange }: {
  value: PreviewDesign;
  defaults: PreviewDesignDefaults;
  templateKey: string;
  album: boolean;
  dining: boolean;
  disabled: boolean;
  onChange: (value: PreviewDesign) => void;
}) {
  const set = (patch: Partial<PreviewDesign>) => onChange({ ...value, ...patch });
  const font = (group: typeof PREVIEW_FONT_GROUPS[number], patch: PreviewFontChoice) => set({ fonts: { ...value.fonts, [group]: { ...value.fonts?.[group], ...patch } } });
  const radiusKeys = IMAGE_RADIUS_KEYS.filter(key => !dining || key !== "cover");
  return <div className={styles.panel} data-preview-design-options>
    <div className={styles.intro}><p>미리보기에서만 적용됩니다.</p><button type="button" onClick={() => onChange({})} disabled={disabled || !Object.keys(value).length} className={styles.reset}>디자인 초기화</button></div>
    <fieldset><legend className={styles.legend}>배경색</legend><div className={styles.backgrounds} data-preview-backgrounds>
      <PreviewColorPicker label={dining ? "본문 페이지 배경색" : "페이지 배경색"} value={value.pageBackground} defaultColor={defaults.colors.page} onChange={pageBackground => set({ pageBackground })} disabled={disabled} />
      {dining ? <>
        <PreviewColorPicker label="커버 배경색" value={value.coverBackground} defaultColor={defaults.colors.cover} onChange={coverBackground => set({ coverBackground })} disabled={disabled} />
        {templateKey.endsWith("_b") ? <PreviewColorPicker label="좌측 메뉴열 배경색" value={value.sidebarBackground} defaultColor={defaults.colors.sidebar} onChange={sidebarBackground => set({ sidebarBackground })} disabled={disabled} /> : null}
        <PreviewColorPicker label="커버 소개 글자색" value={value.coverDescriptionColor} defaultColor={defaults.colors.coverDescription} onChange={coverDescriptionColor => set({ coverDescriptionColor })} disabled={disabled} />
      </> : <PreviewColorPicker label="보조 배경색" value={value.auxiliaryBackground} defaultColor={defaults.colors.auxiliary} onChange={auxiliaryBackground => set({ auxiliaryBackground })} disabled={disabled} />}
    </div></fieldset>
    <div className={styles.fontGroups} data-preview-font-groups>{PREVIEW_FONT_GROUPS.map(group => {
      const choice = value.fonts?.[group] ?? {}, label = { brand: "가게명", category: "카테고리명", other: "나머지 문구" }[group];
      return <fieldset key={group} className={styles.fontGroup}><legend>{label}</legend>
        <PreviewColorPicker label="글자색" accessibleLabel={`${label} 글자색`} value={choice.color} defaultColor={defaults.fonts[group].color} onChange={color => font(group, { color })} disabled={disabled} />
        <div className={styles.fonts}>
          <label className={styles.option}>한글 서체<select aria-label={`${label} 한글 서체`} value={choice.ko ?? ""} onChange={event => font(group, { ko: event.target.value as PreviewFontChoice["ko"] || undefined })} disabled={disabled} className={styles.select}>
            <option value="">기본값 · {getKoreanFontOption(defaults.fonts[group].ko)?.label}</option>{KOREAN_FONT_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select></label>
          <label className={styles.option}>영문 서체<select aria-label={`${label} 영문 서체`} value={choice.en ?? ""} onChange={event => font(group, { en: event.target.value as PreviewFontChoice["en"] || undefined })} disabled={disabled} className={styles.select}>
            <option value="">기본값 · {getEnglishFontOption(defaults.fonts[group].en)?.label}</option>{getAvailableEnglishFontsForTemplate(templateKey).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select></label>
        </div>
      </fieldset>;
    })}</div>
    <p className={styles.hint}>가게 설명과 안내사항은 한글·영문 모두 설정한 한글 서체를 따릅니다. 가격 옵션명은 카테고리명의 색상과 서체를 따릅니다.</p>
    {album ? <fieldset className={styles.albumRatio}><legend className={styles.legend}>앨범형 상품 이미지</legend><label className={styles.option}>상품 이미지 비율<select aria-label="앨범형 상품 이미지 비율" value={value.albumImageRatio ?? defaults.appearance.albumImageRatio} onChange={event => set({ albumImageRatio: event.target.value as PreviewDesign["albumImageRatio"] })} disabled={disabled} className={styles.select}>{ALBUM_IMAGE_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}</select></label></fieldset> : null}
    <fieldset><legend className={styles.legend}>이미지 라운드</legend><div className={styles.radiusGrid} data-preview-image-radii>{radiusKeys.map(key => {
      const label = IMAGE_RADIUS_LABELS[key];
      return <label key={key} className={styles.option}>{label}<ImageRadiusSelect label={label} radius={value.imageRadii?.[key]} disabled={disabled} className={styles.select}
        onChange={radius => set({ imageRadii: { ...value.imageRadii, [key]: radius } })} /></label>;
    })}</div></fieldset>
    <div className={styles.extras}>
      {!dining ? <label className={styles.option}>대표영역 내용 정렬<select aria-label="대표영역 내용 정렬" value={value.representativeAlignment ?? "template"} disabled={disabled} className={styles.select} onChange={event => set({ representativeAlignment: event.target.value === "template" ? undefined : event.target.value as PreviewDesign["representativeAlignment"] })}><option value="template">템플릿 기본값</option>{REPRESENTATIVE_ALIGNMENTS.map(align => <option key={align} value={align}>{{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[align]}</option>)}</select></label> : null}

      <label className={styles.option}>텍스트칩 모양<select aria-label="텍스트칩 모양" value={value.chipShape ?? "template"} onChange={event => set({ chipShape: event.target.value as PreviewDesign["chipShape"] })} disabled={disabled} className={styles.select}>{CHIP_SHAPES.map(shape => <option key={shape} value={shape}>{CHIP_SHAPE_LABELS[shape]}</option>)}</select></label>
    </div>
  </div>;
}
