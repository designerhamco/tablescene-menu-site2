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
  getFontSizeMultiplier,
  getFontSizeScaleOptionsForTemplate,
  isDisplayTypographyTemplate,
  normalizeFontSizeScaleKeyForTemplate,
  type FontSizeScaleKey,
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
  templateType: TemplateType;
  templateKey?: string | null;
};

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
  templateType,
  templateKey,
}: TypographySettingsFormProps) {
  const isDisplayTypography = isDisplayTypographyTemplate(templateKey);
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
  const safeSelectedEnglishFontValue = selectedEnglishFontValue
    ? getSafeEnglishFontValueForTemplate(templateKey, selectedEnglishFontValue)
    : "";
  const previewKoreanFont = useMemo(() => getKoreanFontOption(selectedFontValue) ?? defaultFont, [defaultFont, selectedFontValue]);
  const previewEnglishFont = useMemo(
    () => getEnglishFontOption(safeSelectedEnglishFontValue) ?? safeDefaultEnglishFont,
    [safeDefaultEnglishFont, safeSelectedEnglishFontValue],
  );
  const previewFontSizeScale = getFontSizeMultiplier(selectedFontSizeScale, templateKey);
  const editorFontAssets = useMemo(
    () => [getFontLoadAssets(previewKoreanFont), getFontLoadAssets(previewEnglishFont)],
    [previewEnglishFont, previewKoreanFont],
  );
  const isPriceList = templateType === "price_list";

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
            "--menu-font-ko": previewKoreanFont.fontFamily,
            "--menu-font-en": previewEnglishFont.fontFamily,
            "--menu-font-size-scale": String(previewFontSizeScale),
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
              <h5 className="break-keep text-base font-black uppercase leading-tight text-[#007C89]">
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
                      <p className="break-keep text-sm font-black leading-tight text-[#17211F]">{item.ko}</p>
                      <p className="menu-font-en min-w-0 break-words text-[11px] font-bold uppercase leading-tight text-[#5F6F6B]">{item.en}</p>
                    </div>
                  </div>
                  <span className="menu-font-en text-center text-sm font-black leading-none text-[#17211F]">{item.hot}</span>
                  <span className="menu-font-en text-center text-sm font-black leading-none text-[#17211F]">{item.ice}</span>
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
