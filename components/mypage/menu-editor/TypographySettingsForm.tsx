"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
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
  TYPOGRAPHY_ROLE_SIZE_OPTIONS,
  TYPOGRAPHY_ROLE_WEIGHT_OPTIONS,
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

type RoleFontSelectValue = "" | KoreanFontValue | EnglishFontValue;

const TYPOGRAPHY_ROLE_LABELS = {
  brand: "매장명·브랜드명",
  category: "카테고리명",
  itemName: "메뉴명",
  supporting: "보조 문구",
  price: "가격",
} as const satisfies Record<TypographyRoleKey, string>;

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
  const showRoleTypographyControl = templateKey === "cafe_design_a";
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
  const roleFontOptions = useMemo(() => {
    const options: { label: string; value: RoleFontSelectValue; group: "korean" | "english" }[] = [];
    KOREAN_FONT_OPTIONS.forEach((option) => options.push({ label: option.label, value: option.value, group: "korean" }));
    englishFontOptions.forEach((option) => options.push({ label: option.label, value: option.value, group: "english" }));
    return options;
  }, [englishFontOptions]);

  function updateRoleSetting(role: TypographyRoleKey, key: "font_key" | "size" | "weight", value: string) {
    setSelectedRoleSettings((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [key]: key === "font_key" ? (value ? value : null) : value,
      },
    }) as TypographyRoleSettings);
  }

  return (
    <div className="mt-5 space-y-5">
      <KoreanFontAssets assets={editorFontAssets} />
      <div className="space-y-5">
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

        {showRoleTypographyControl ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h4 className="text-sm font-black text-zinc-950">역할별 글자 설정</h4>
              <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                필요한 역할만 전체 폰트 설정과 다르게 조정합니다. 비워두면 템플릿과 전체 설정을 그대로 따릅니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRoleSettings(createDefaultTypographyRoleSettings())}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-zinc-400 hover:bg-white hover:text-zinc-950"
            >
              역할별 설정 초기화
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[720px] divide-y divide-zinc-100 rounded-lg border border-zinc-100">
              {TYPOGRAPHY_ROLE_KEYS.map((role) => {
                const setting = selectedRoleSettings[role];
                const fontValue = setting.font_key ?? "";

                return (
                  <div key={role} className="grid grid-cols-[1.25fr_1.5fr_0.82fr_0.9fr] items-center gap-3 px-3 py-3">
                    <p className="break-keep text-sm font-black text-zinc-800">{TYPOGRAPHY_ROLE_LABELS[role]}</p>
                    <label className="sr-only" htmlFor={`typography-role-${role}-font`}>{TYPOGRAPHY_ROLE_LABELS[role]} 폰트</label>
                    <select
                      id={`typography-role-${role}-font`}
                      form={formId}
                      name={`typography_role_${role}_font_key`}
                      value={fontValue}
                      onChange={(event) => updateRoleSetting(role, "font_key", event.target.value)}
                      className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none transition focus:border-zinc-950"
                    >
                      <option value="">전체 설정 따름</option>
                      <optgroup label="한글 폰트">
                        {roleFontOptions.filter((option) => option.group === "korean").map((option) => (
                          <option key={`ko-${role}-${option.value}`} value={option.value}>{option.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="영문/숫자 폰트">
                        {roleFontOptions.filter((option) => option.group === "english").map((option) => (
                          <option key={`en-${role}-${option.value}`} value={option.value}>{option.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    <label className="sr-only" htmlFor={`typography-role-${role}-size`}>{TYPOGRAPHY_ROLE_LABELS[role]} 크기</label>
                    <select
                      id={`typography-role-${role}-size`}
                      form={formId}
                      name={`typography_role_${role}_size`}
                      value={setting.size}
                      onChange={(event) => updateRoleSetting(role, "size", event.target.value)}
                      className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none transition focus:border-zinc-950"
                    >
                      {TYPOGRAPHY_ROLE_SIZE_OPTIONS.map((option) => (
                        <option key={`${role}-size-${option.key}`} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`typography-role-${role}-weight`}>{TYPOGRAPHY_ROLE_LABELS[role]} 굵기</label>
                    <select
                      id={`typography-role-${role}-weight`}
                      form={formId}
                      name={`typography_role_${role}_weight`}
                      value={setting.weight}
                      onChange={(event) => updateRoleSetting(role, "weight", event.target.value)}
                      className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none transition focus:border-zinc-950"
                    >
                      {TYPOGRAPHY_ROLE_WEIGHT_OPTIONS.map((option) => (
                        <option key={`${role}-weight-${option.key}`} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        ) : null}

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

        <section
          className="menu-typography rounded-lg border border-zinc-200 bg-white p-5 text-zinc-950"
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
            <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] items-end gap-3">
              <h5
                className="break-keep font-black uppercase leading-tight text-[#007C89]"
                style={{
                  fontFamily: "var(--menu-role-category-font-family, inherit)",
                  fontSize: "calc(1rem * var(--menu-font-size-scale, 1) * var(--menu-role-category-size-scale, 1))",
                  fontWeight: "var(--menu-role-category-font-weight, 900)",
                }}
              >
                {isPriceList ? "SIGNATURE CARE" : "SIGNATURE COFFEE"}
              </h5>
              {["HOT", "ICE"].map((label) => (
                <span key={label} className="menu-font-en text-center text-[11px] font-black uppercase text-[#007C89]">
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-2 border-b border-[#88DAD7]" />
            <div className="mt-3 space-y-3">
              {[
                { ko: isPriceList ? "프리미엄 케어" : "바질 크림 라떼", en: isPriceList ? "PREMIUM CARE" : "BASIL CREAM LATTE", hot: "-", ice: "6.5", badge: "SIGNATURE" },
                { ko: isPriceList ? "밸런스 관리" : "오트 너티 라떼", en: isPriceList ? "BALANCE CARE" : "OAT NUTTY LATTE", hot: "6.5", ice: "6.5", badge: "BEST" },
                { ko: isPriceList ? "시즌 케어" : "딸기 라떼", en: isPriceList ? "SEASON CARE" : "STRAWBERRY LATTE", hot: "-", ice: "6.5", badge: "NEW" },
              ].map((item) => (
                <div key={item.en} className="grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_auto] items-baseline gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p
                        className="break-keep font-black leading-tight text-[#17211F]"
                        style={{
                          fontFamily: "var(--menu-role-item-name-font-family, inherit)",
                          fontSize: "calc(0.875rem * var(--menu-font-size-scale, 1) * var(--menu-role-item-name-size-scale, 1))",
                          fontWeight: "var(--menu-role-item-name-font-weight, 700)",
                        }}
                      >
                        {item.ko}
                      </p>
                      <p
                        className="menu-font-en min-w-0 break-words font-bold uppercase leading-tight text-[#5F6F6B]"
                        style={{
                          fontFamily: "var(--menu-role-supporting-font-family, inherit)",
                          fontSize: "calc(0.6875rem * var(--menu-font-size-scale, 1) * var(--menu-role-supporting-size-scale, 1))",
                          fontWeight: "var(--menu-role-supporting-font-weight, 700)",
                        }}
                      >
                        {item.en}
                      </p>
                    </div>
                  </div>
                  <span
                    className="menu-font-en text-center font-black leading-none text-[#17211F]"
                    style={{
                      fontFamily: "var(--menu-role-price-font-family, inherit)",
                      fontSize: "calc(0.875rem * var(--menu-font-size-scale, 1) * var(--menu-role-price-size-scale, 1))",
                      fontWeight: "var(--menu-role-price-font-weight, 900)",
                    }}
                  >
                    {item.hot}
                  </span>
                  <span
                    className="menu-font-en text-center font-black leading-none text-[#17211F]"
                    style={{
                      fontFamily: "var(--menu-role-price-font-family, inherit)",
                      fontSize: "calc(0.875rem * var(--menu-font-size-scale, 1) * var(--menu-role-price-size-scale, 1))",
                      fontWeight: "var(--menu-role-price-font-weight, 900)",
                    }}
                  >
                    {item.ice}
                  </span>
                  <span className="menu-font-en rounded-[3px] bg-[#D7F4F3] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#007C89]">
                    {item.badge}
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
