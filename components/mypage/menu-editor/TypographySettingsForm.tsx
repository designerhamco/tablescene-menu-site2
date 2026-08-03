"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import ScriptAwareText from "@/components/menu-templates/shared/ScriptAwareText";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import {
  ENGLISH_FONT_CATEGORY_OPTIONS,
  KOREAN_FONT_CATEGORY_OPTIONS,
  KOREAN_FONT_OPTIONS,
  getAvailableEnglishFontsForTemplate,
  getEnglishFontOption,
  getFontLoadAssets,
  getKoreanFontOption,
  getSafeEnglishFontValueForTemplate,
  type EnglishFontOption,
  type EnglishFontValue,
  type FontCategoryKey,
  type FontOption,
  type KoreanFontOption,
  type KoreanFontValue,
} from "@/lib/font-options";
import {
  TYPOGRAPHY_ROLE_KEYS,
  createDefaultTypographyRoleSettings,
  getFontSizeScaleOptionsForTemplate,
  getTypographyCssVariables,
  getTypographyRoleFontLoadAssets,
  isDisplayTypographyTemplate,
  normalizeFontSizeScaleKeyForTemplate,
  type FontSizeScaleKey,
  type TypographyRoleKey,
  type TypographyRoleSettings,
} from "@/lib/template-typography-presets";
import type { TemplateType } from "@/lib/template-types";

type TypographySettingsFormProps = {
  formId: string;
  initialFont: KoreanFontOption;
  initialEnglishFont: EnglishFontOption;
  defaultFont: KoreanFontOption;
  defaultEnglishFont: EnglishFontOption;
  hasCustomKoreanFont: boolean;
  hasCustomEnglishFont: boolean;
  initialFontSizeScale: FontSizeScaleKey;
  initialRoleSettings: TypographyRoleSettings;
  templateType: TemplateType;
  templateKey?: string | null;
};

type MixedSelectValue = "__mixed__";
type GroupSelectValue<Value extends string> = Value | MixedSelectValue;

const MIXED_SELECT_VALUE: MixedSelectValue = "__mixed__";
const CAFE_A_SCRIPT_FONT_VAR_FALLBACKS = {
  brand: {
    ko: "var(--menu-role-brand-font-ko, var(--menu-font-ko))",
    en: "var(--menu-role-brand-font-en, var(--menu-font-en))",
    family: "var(--menu-role-brand-font-family, inherit)",
  },
  category: {
    ko: "var(--menu-role-category-font-ko, var(--menu-font-ko))",
    en: "var(--menu-role-category-font-en, var(--menu-font-en))",
    family: "var(--menu-role-category-font-family, inherit)",
  },
  itemName: {
    ko: "var(--menu-role-item-name-font-ko, var(--menu-font-ko))",
    en: "var(--menu-role-item-name-font-en, var(--menu-font-en))",
    family: "var(--menu-role-item-name-font-family, inherit)",
  },
  supporting: {
    ko: "var(--menu-role-supporting-font-ko, var(--menu-font-ko))",
    en: "var(--menu-role-supporting-font-en, var(--menu-font-en))",
    family: "var(--menu-role-supporting-font-family, inherit)",
  },
  price: {
    ko: "var(--menu-role-price-font-ko, var(--menu-font-ko))",
    en: "var(--menu-role-price-font-en, var(--menu-font-en))",
    family: "var(--menu-role-price-font-family, inherit)",
  },
} as const;

type CafeAScriptFontRole = keyof typeof CAFE_A_SCRIPT_FONT_VAR_FALLBACKS;

function getCafeAMiniPreviewScriptStyle(role: CafeAScriptFontRole, extraStyle: CSSProperties = {}): CSSProperties {
  const fonts = CAFE_A_SCRIPT_FONT_VAR_FALLBACKS[role];

  return {
    "--cafe-a-script-ko-font": fonts.ko,
    "--cafe-a-script-en-font": fonts.en,
    fontFamily: fonts.family,
    ...extraStyle,
  } as CSSProperties;
}

type TypographyControlGroup = {
  key: "storeName" | "categoryName" | "otherText";
  label: string;
  description: string;
  roles: readonly TypographyRoleKey[];
  allowColor: boolean;
};

const TYPOGRAPHY_CONTROL_GROUPS = [
  {
    key: "storeName",
    label: "가게명 글자",
    description: "로고 이미지가 없을 때 표시되는 가게명 텍스트에만 적용됩니다.",
    roles: ["brand"],
    allowColor: true,
  },
  {
    key: "categoryName",
    label: "카테고리명 글자",
    description: "메뉴 그룹과 카테고리 제목에만 적용됩니다.",
    roles: ["category"],
    allowColor: true,
  },
  {
    key: "otherText",
    label: "나머지 글자",
    description: "브랜드 설명, 메뉴명, 설명, 가격, 특가 문구, 위젯, 푸터에는 폰트만 적용됩니다.",
    roles: ["itemName", "supporting", "price"],
    allowColor: false,
  },
] as const satisfies readonly TypographyControlGroup[];

type FontDropdownProps<Value extends string> = {
  label: string;
  description: string;
  name: string;
  options: readonly FontOption<Value>[];
  categoryOptions: readonly { key: FontCategoryKey; label: string }[];
  value: Value | "";
  defaultOption: FontOption<Value>;
  formId: string;
  onChange: (value: Value | "") => void;
};

function FontPicker<Value extends string>({
  label,
  description,
  name,
  options,
  categoryOptions,
  value,
  defaultOption,
  formId,
  onChange,
}: FontDropdownProps<Value>) {
  const [selectedCategory, setSelectedCategory] = useState<FontCategoryKey | "all">("all");
  const labelId = useId();
  const selectedOption = value ? options.find((option) => option.value === value) ?? defaultOption : defaultOption;
  const filteredOptions = useMemo(
    () => selectedCategory === "all" ? options : options.filter((option) => option.category === selectedCategory),
    [options, selectedCategory],
  );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-labelledby={labelId}>
      <input form={formId} type="hidden" name={name} value={value} />
      <div className="flex flex-col gap-3">
        <div>
          <h4 id={labelId} className="text-sm font-black text-zinc-950">{label}</h4>
          <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">{description}</p>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            현재 선택: <span className="text-zinc-700">{value ? selectedOption.label : `템플릿 기본값 (${defaultOption.label})`}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label={`${label} 카테고리 필터`}>
          {[{ key: "all" as const, label: "전체" }, ...categoryOptions].map((category) => {
            const selected = selectedCategory === category.key;

            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400 hover:bg-white hover:text-zinc-950"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50 p-2">
          <button
            type="button"
            onClick={() => onChange("")}
            className={`mb-2 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition ${
              value === "" ? "bg-zinc-950 text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <span>템플릿 기본값 ({defaultOption.label})</span>
            {value === "" ? <span className="text-[10px] font-black opacity-70">SELECTED</span> : null}
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredOptions.map((option) => {
              const selected = value === option.value;

              return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`flex min-w-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                  selected ? "bg-zinc-950 text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected ? <span className="shrink-0 text-[10px] font-black opacity-70">SELECTED</span> : null}
              </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function getGroupSettingValue<Key extends keyof TypographyRoleSettings[TypographyRoleKey]>(
  settings: TypographyRoleSettings,
  roles: readonly TypographyRoleKey[],
  key: Key,
): GroupSelectValue<NonNullable<TypographyRoleSettings[TypographyRoleKey][Key]> | ""> {
  const values = roles.map((role) => {
    const value = settings[role][key];
    return value == null ? "" : value;
  });
  const [firstValue] = values;
  return values.every((value) => value === firstValue) ? firstValue : MIXED_SELECT_VALUE;
}

function getRoleSettingInputValue(value: string | null) {
  return value ?? "";
}

function normalizeDraftColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : null;
}

export default function TypographySettingsForm({
  formId,
  initialFont,
  initialEnglishFont,
  defaultFont,
  defaultEnglishFont,
  hasCustomKoreanFont,
  hasCustomEnglishFont,
  initialFontSizeScale,
  initialRoleSettings,
  templateType,
  templateKey,
}: TypographySettingsFormProps) {
  const isDisplayTypography = isDisplayTypographyTemplate(templateKey);
  const showRoleTypographyControl = templateKey === "cafe_design_a" || templateKey === "cafe_mocha_forest_a" || templateKey === "cafe_sunday_line_a";
  const isSundayLineTemplate = templateKey === "cafe_sunday_line_a";
  const cafeAMiniPreviewBrandText = isSundayLineTemplate ? "선데이 로스터스 SUNDAY 2026" : "오브 커피 AUBE 2026";
  const cafeAMiniPreviewDescriptionText = isSundayLineTemplate
    ? "좋은 원두와 Simple 디저트를 준비하는 로스터리입니다."
    : "신선한 원두와 Organic 재료를 사용하는 카페입니다.";
  const showFontSizeControl = getTemplateCapabilities(templateKey).typographyFontSizeControl === "simple";
  const fontSizeScaleOptions = getFontSizeScaleOptionsForTemplate(templateKey);
  const initialDisplaySafeFontSizeScale = normalizeFontSizeScaleKeyForTemplate(initialFontSizeScale, templateKey);
  const englishFontOptions = useMemo(() => getAvailableEnglishFontsForTemplate(templateKey), [templateKey]);
  const safeDefaultEnglishFont = useMemo(
    () => getEnglishFontOption(getSafeEnglishFontValueForTemplate(templateKey, defaultEnglishFont.value)) ?? defaultEnglishFont,
    [defaultEnglishFont, templateKey],
  );
  const [selectedFontValue, setSelectedFontValue] = useState<KoreanFontValue | "">(hasCustomKoreanFont ? initialFont.value : "");
  const [selectedEnglishFontValue, setSelectedEnglishFontValue] = useState<EnglishFontValue | "">(
    hasCustomEnglishFont ? getSafeEnglishFontValueForTemplate(templateKey, initialEnglishFont.value) : "",
  );
  const [selectedFontSizeScale, setSelectedFontSizeScale] = useState<FontSizeScaleKey>(initialDisplaySafeFontSizeScale);
  const [selectedRoleSettings, setSelectedRoleSettings] = useState<TypographyRoleSettings>(initialRoleSettings);
  const safeSelectedEnglishFontValue = selectedEnglishFontValue
    ? getSafeEnglishFontValueForTemplate(templateKey, selectedEnglishFontValue)
    : "";
  const previewKoreanFont = useMemo(() => getKoreanFontOption(selectedFontValue) ?? defaultFont, [defaultFont, selectedFontValue]);
  const previewEnglishFont = useMemo(
    () => getEnglishFontOption(safeSelectedEnglishFontValue) ?? safeDefaultEnglishFont,
    [safeDefaultEnglishFont, safeSelectedEnglishFontValue],
  );
  const previewTypographySettings = useMemo(
    () => ({
      korean_font_key: previewKoreanFont.value,
      english_font_key: previewEnglishFont.value,
      font_size_scale_key: selectedFontSizeScale,
      typography_roles: selectedRoleSettings,
    }),
    [previewEnglishFont.value, previewKoreanFont.value, selectedFontSizeScale, selectedRoleSettings],
  );
  const previewTypographyStyle = useMemo(() => getTypographyCssVariables(previewTypographySettings, templateKey), [previewTypographySettings, templateKey]);
  const editorFontAssets = useMemo(
    () => [getFontLoadAssets(previewKoreanFont), getFontLoadAssets(previewEnglishFont), ...getTypographyRoleFontLoadAssets(selectedRoleSettings)],
    [previewEnglishFont, previewKoreanFont, selectedRoleSettings],
  );
  const isPriceList = templateType === "price_list";
  function updateControlGroupSetting(roles: readonly TypographyRoleKey[], key: "font_ko_key" | "font_en_key" | "color", value: string) {
    if (value === MIXED_SELECT_VALUE) return;
    setSelectedRoleSettings((current) => ({
      ...current,
      ...roles.reduce((nextRoles, role) => {
        nextRoles[role] = {
          ...current[role],
          [key]: key === "color" ? normalizeDraftColor(value) : (value ? value : null),
        };
        return nextRoles;
      }, {} as Partial<TypographyRoleSettings>),
    }));
  }

  return (
    <div className="mt-5 space-y-5">
      <KoreanFontAssets assets={editorFontAssets} />
      <div className="space-y-5">
        {showRoleTypographyControl ? (
          <>
            <input form={formId} type="hidden" name="korean_font_key" value={selectedFontValue} />
            <input form={formId} type="hidden" name="english_font_key" value={safeSelectedEnglishFontValue} />
            <input form={formId} type="hidden" name="font_size_scale_key" value={selectedFontSizeScale} />
            <section className="rounded-lg border border-zinc-200 bg-white p-4">
              {TYPOGRAPHY_ROLE_KEYS.map((role) => {
                const setting = selectedRoleSettings[role];
                const roleColor = role === "brand" || role === "category" ? setting.color : null;

                return (
                  <div key={`typography-role-hidden-${role}`} hidden>
                    <input form={formId} type="hidden" name={`typography_role_${role}_font_ko_key`} value={getRoleSettingInputValue(setting.font_ko_key)} />
                    <input form={formId} type="hidden" name={`typography_role_${role}_font_en_key`} value={getRoleSettingInputValue(setting.font_en_key)} />
                    <input form={formId} type="hidden" name={`typography_role_${role}_color`} value={getRoleSettingInputValue(roleColor)} />
                  </div>
                );
              })}
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h4 className="text-sm font-black text-zinc-950">글자 설정</h4>
                  <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                    가게명과 카테고리명은 폰트와 색상을, 나머지 글자는 폰트만 조정합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRoleSettings(createDefaultTypographyRoleSettings())}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-zinc-400 hover:bg-white hover:text-zinc-950"
                >
                  글자 설정 초기화
                </button>
              </div>
              <div className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
                {TYPOGRAPHY_CONTROL_GROUPS.map((group) => {
                  const koreanFontValue = getGroupSettingValue(selectedRoleSettings, group.roles, "font_ko_key");
                  const englishFontValue = getGroupSettingValue(selectedRoleSettings, group.roles, "font_en_key");
                  const colorValue = group.allowColor ? getGroupSettingValue(selectedRoleSettings, group.roles, "color") : "";
                  const hasMixedValue = koreanFontValue === MIXED_SELECT_VALUE || englishFontValue === MIXED_SELECT_VALUE || colorValue === MIXED_SELECT_VALUE;
                  const selectedColor = typeof colorValue === "string" && colorValue !== MIXED_SELECT_VALUE && colorValue ? colorValue : "#191C1B";

                  return (
                    <div
                      key={group.key}
                      className={`grid gap-3 px-3 py-3 ${
                        group.allowColor
                          ? "lg:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1.05fr)_minmax(10rem,1.05fr)_minmax(8rem,0.8fr)]"
                          : "lg:grid-cols-[minmax(8rem,1fr)_minmax(10rem,1.05fr)_minmax(10rem,1.05fr)]"
                      } lg:items-center`}
                    >
                      <div>
                        <p className="break-keep text-sm font-black text-zinc-800">{group.label}</p>
                        <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">{group.description}</p>
                        {hasMixedValue ? (
                          <p className="mt-1 break-keep text-[11px] font-bold leading-relaxed text-zinc-400">저장된 개별 설정이 있어 변경한 항목만 함께 맞춰집니다.</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-black text-zinc-400" htmlFor={`typography-group-${group.key}-font-ko`}>한글 폰트</label>
                        <select
                          id={`typography-group-${group.key}-font-ko`}
                          value={koreanFontValue}
                          onChange={(event) => updateControlGroupSetting(group.roles, "font_ko_key", event.target.value)}
                          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none transition focus:border-zinc-950"
                        >
                          {koreanFontValue === MIXED_SELECT_VALUE ? <option value={MIXED_SELECT_VALUE}>기존 개별 설정 유지</option> : null}
                          <option value="">템플릿 기본값 ({defaultFont.label})</option>
                          {KOREAN_FONT_OPTIONS.map((option) => (
                            <option key={`ko-${group.key}-${option.value}`} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-black text-zinc-400" htmlFor={`typography-group-${group.key}-font-en`}>영문/숫자 폰트</label>
                        <select
                          id={`typography-group-${group.key}-font-en`}
                          value={englishFontValue}
                          onChange={(event) => updateControlGroupSetting(group.roles, "font_en_key", event.target.value)}
                          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none transition focus:border-zinc-950"
                        >
                          {englishFontValue === MIXED_SELECT_VALUE ? <option value={MIXED_SELECT_VALUE}>기존 개별 설정 유지</option> : null}
                          <option value="">템플릿 기본값 ({safeDefaultEnglishFont.label})</option>
                          {englishFontOptions.map((option) => (
                            <option key={`en-${group.key}-${option.value}`} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      {group.allowColor ? (
                        <div>
                          <label className="mb-1 block text-[11px] font-black text-zinc-400" htmlFor={`typography-group-${group.key}-color`}>색상</label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`typography-group-${group.key}-color`}
                              type="color"
                              value={selectedColor}
                              onChange={(event) => updateControlGroupSetting(group.roles, "color", event.target.value)}
                              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-zinc-200 bg-white p-1"
                            />
                            <button
                              type="button"
                              onClick={() => updateControlGroupSetting(group.roles, "color", "")}
                              className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs font-black text-zinc-500 transition hover:border-zinc-400 hover:bg-white hover:text-zinc-950"
                            >
                              기본 색상
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <FontPicker
                label="한글 폰트"
                description="카테고리명과 한글 메뉴명에 우선 적용됩니다."
                name="korean_font_key"
                options={KOREAN_FONT_OPTIONS}
                categoryOptions={KOREAN_FONT_CATEGORY_OPTIONS}
                value={selectedFontValue}
                defaultOption={defaultFont}
                formId={formId}
                onChange={setSelectedFontValue}
              />
              <FontPicker
                label="영문 / 숫자 폰트"
                description="영문 보조명, 가격, HOT/ICE, 텍스트칩에 적용됩니다."
                name="english_font_key"
                options={englishFontOptions}
                categoryOptions={ENGLISH_FONT_CATEGORY_OPTIONS}
                value={safeSelectedEnglishFontValue}
                defaultOption={safeDefaultEnglishFont}
                formId={formId}
                onChange={setSelectedEnglishFontValue}
              />
            </div>
            <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
              고객에게는 폰트 이름만 표시됩니다. 웹폰트 주소와 CSS font-family 값은 코드에서 관리합니다.
            </p>

            <div>
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">글자 크기</p>
                  <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                    {showFontSizeControl
                      ? "메뉴판에 표시되는 메뉴명, 설명, 가격의 전체 크기를 조정합니다."
                      : "이 템플릿은 화면 크기와 메뉴 수에 맞춰 글자 크기와 간격이 자동으로 조정됩니다."}
                  </p>
                  {showFontSizeControl ? (
                    <>
                      <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                        {isDisplayTypography
                          ? "디스플레이 화면에서는 선택한 크기에 맞춰 글자와 간격이 자동으로 조정됩니다."
                          : "기본 크기는 대부분의 매장에 적합합니다. 글자를 크게 하면 멀리서 보기 좋지만 한 화면에 보이는 메뉴 수는 줄어들 수 있습니다."}
                      </p>
                      <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                        화면 크기와 메뉴 수에 따라 글자 크기는 자동으로 보정됩니다.
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
              {showFontSizeControl ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="글자 크기">
                  {fontSizeScaleOptions.map((option) => (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition xl:flex-col xl:items-start xl:justify-center ${
                        selectedFontSizeScale === option.key
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <input
                        form={formId}
                        type="radio"
                        name="font_size_scale_key"
                        value={option.key}
                        checked={selectedFontSizeScale === option.key}
                        onChange={() => setSelectedFontSizeScale(option.key)}
                        className="sr-only"
                      />
                      <span className="break-keep text-sm font-black leading-tight">{option.label}</span>
                      <span className={`menu-font-en text-xs font-bold ${selectedFontSizeScale === option.key ? "text-white/70" : "text-zinc-400"}`}>
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <input form={formId} type="hidden" name="font_size_scale_key" value="m" />
              )}
            </div>
          </>
        )}

        <section
          className="menu-typography cafe-a-typography rounded-lg border border-zinc-200 bg-white p-5 text-zinc-950"
          style={{
            ...previewTypographyStyle,
            fontFamily: "var(--menu-font-ko)",
          } as CSSProperties}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h4 className="text-sm font-black text-zinc-950">미니 프리뷰</h4>
              <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                저장 전 선택값이 이 작은 메뉴보드 조각에만 즉시 반영됩니다.
              </p>
            </div>
            <p className="menu-font-en text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
              Font Preview
            </p>
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-[#DDE8E7] bg-[#F8FEFD] p-4 shadow-sm">
            <div>
              <p
                className="break-keep text-3xl font-black uppercase leading-none"
                style={getCafeAMiniPreviewScriptStyle("brand", {
                  color: "var(--menu-role-brand-color, #191c1b)",
                })}
              >
                <ScriptAwareText text={cafeAMiniPreviewBrandText} />
              </p>
              <p
                className="mt-2 break-keep text-xs font-semibold leading-relaxed text-[#66726f]"
                style={getCafeAMiniPreviewScriptStyle("supporting")}
              >
                <ScriptAwareText text={cafeAMiniPreviewDescriptionText} />
              </p>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] items-end gap-3">
              <h5
                className="break-keep font-black uppercase leading-tight"
                style={getCafeAMiniPreviewScriptStyle("category", {
                  color: "var(--menu-role-category-color, #191c1b)",
                })}
              >
                <ScriptAwareText text={isPriceList ? "시그니처 SIGNATURE CARE" : "시그니처 SIGNATURE COFFEE"} />
              </h5>
              {["HOT", "ICE"].map((label) => (
                <span
                  key={label}
                  className="text-center text-[11px] font-black uppercase text-[#17211F]"
                  style={getCafeAMiniPreviewScriptStyle("price")}
                >
                  <ScriptAwareText text={label} />
                </span>
              ))}
            </div>
            <div className="mt-2 border-b border-[#9AA29F]" />
            <div className="mt-3 space-y-3">
              {[
                { name: isPriceList ? "프리미엄 Care" : "제주 말차 Latte", en: isPriceList ? "PREMIUM CARE" : "JEJU MATCHA LATTE", desc: "제주 말차와 부드러운 Cream", hot: "-", ice: "6.5", badge: "SIGNATURE" },
                { name: isPriceList ? "밸런스 관리" : "바닐라 라떼 VANILLA LATTE", en: isPriceList ? "BALANCE CARE" : "VANILLA LATTE", desc: "부드러운 우유와 은은한 Vanilla", hot: "6.0", ice: "6.5", badge: "BEST" },
              ].map((item) => (
                <div key={item.en} className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p
                        className="break-keep font-black leading-tight text-[#17211F]"
                        style={getCafeAMiniPreviewScriptStyle("itemName")}
                      >
                        <ScriptAwareText text={item.name} />
                      </p>
                      <p
                        className="min-w-0 break-words font-bold uppercase leading-tight text-[#5F6F6B]"
                        style={getCafeAMiniPreviewScriptStyle("supporting")}
                      >
                        <ScriptAwareText text={item.en} />
                      </p>
                    </div>
                    <p
                      className="mt-1 break-keep text-xs font-normal leading-snug text-[#3F4945]"
                      style={getCafeAMiniPreviewScriptStyle("supporting")}
                    >
                      <ScriptAwareText text={item.desc} />
                    </p>
                  </div>
                  <span
                    className="text-center font-black leading-none text-[#17211F]"
                    style={getCafeAMiniPreviewScriptStyle("price")}
                  >
                    <ScriptAwareText text={item.hot} />
                  </span>
                  <span
                    className="text-center font-black leading-none text-[#17211F]"
                    style={getCafeAMiniPreviewScriptStyle("price")}
                  >
                    <ScriptAwareText text={item.ice} />
                  </span>
                  <span
                    className="rounded-[3px] bg-[#191C1B] px-1.5 py-0.5 text-[10px] font-black uppercase text-white"
                    style={getCafeAMiniPreviewScriptStyle("supporting")}
                  >
                    <ScriptAwareText text={item.badge} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
