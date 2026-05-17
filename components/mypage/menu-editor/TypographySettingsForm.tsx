"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";

import KoreanFontAssets from "@/components/menu-templates/shared/KoreanFontAssets";
import {
  ENGLISH_FONT_OPTIONS,
  KOREAN_FONT_OPTIONS,
  getEnglishFontOption,
  getFontLoadAssets,
  getKoreanFontOption,
  type EnglishFontOption,
  type EnglishFontValue,
  type FontOption,
  type KoreanFontOption,
  type KoreanFontValue,
} from "@/lib/font-options";
import type { TemplateType } from "@/lib/template-types";

type TypographySettingsFormProps = {
  formId: string;
  initialFont: KoreanFontOption;
  initialEnglishFont: EnglishFontOption;
  defaultFont: KoreanFontOption;
  defaultEnglishFont: EnglishFontOption;
  hasCustomKoreanFont: boolean;
  hasCustomEnglishFont: boolean;
  templateType: TemplateType;
};

type FontDropdownProps<Value extends string> = {
  label: string;
  name: string;
  options: readonly FontOption<Value>[];
  value: Value | "";
  defaultOption: FontOption<Value>;
  formId: string;
  onChange: (value: Value | "") => void;
};

function FontDropdown<Value extends string>({
  label,
  name,
  options,
  value,
  defaultOption,
  formId,
  onChange,
}: FontDropdownProps<Value>) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const listId = useId();
  const selectedOption = value ? options.find((option) => option.value === value) ?? defaultOption : defaultOption;

  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400" id={`${buttonId}-label`}>
        {label}
      </label>
      <input form={formId} type="hidden" name={name} value={value} />
      <div className="relative mt-2 min-w-0">
          <button
            type="button"
            id={buttonId}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-labelledby={`${buttonId}-label ${buttonId}`}
            aria-controls={listId}
            onClick={() => setOpen((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-900 outline-none transition focus:border-zinc-950"
          >
            <span style={{ fontFamily: selectedOption.fontFamily }}>
              {value ? selectedOption.label : `템플릿 기본값 (${defaultOption.label})`}
            </span>
            <span className="text-xs text-zinc-400" aria-hidden>
              ▾
            </span>
          </button>
          {open && (
            <div
              id={listId}
              role="listbox"
              aria-labelledby={`${buttonId}-label`}
              tabIndex={-1}
              className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-xl"
            >
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                  value === "" ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                style={{ fontFamily: defaultOption.fontFamily }}
              >
                템플릿 기본값 ({defaultOption.label})
              </button>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                    value === option.value ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                  style={{ fontFamily: option.fontFamily }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
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
  templateType,
}: TypographySettingsFormProps) {
  const [selectedFontValue, setSelectedFontValue] = useState<KoreanFontValue | "">(hasCustomKoreanFont ? initialFont.value : "");
  const [selectedEnglishFontValue, setSelectedEnglishFontValue] = useState<EnglishFontValue | "">(
    hasCustomEnglishFont ? initialEnglishFont.value : "",
  );
  const previewKoreanFont = useMemo(() => getKoreanFontOption(selectedFontValue) ?? defaultFont, [defaultFont, selectedFontValue]);
  const previewEnglishFont = useMemo(
    () => getEnglishFontOption(selectedEnglishFontValue) ?? defaultEnglishFont,
    [defaultEnglishFont, selectedEnglishFontValue],
  );
  const editorFontAssets = useMemo(
    () => [...KOREAN_FONT_OPTIONS, ...ENGLISH_FONT_OPTIONS].map((option) => getFontLoadAssets(option)),
    [],
  );
  const isPriceList = templateType === "price_list";

  return (
    <div className="mt-5 space-y-5">
      <KoreanFontAssets assets={editorFontAssets} />
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FontDropdown
            label="한글 폰트"
            name="korean_font_key"
            options={KOREAN_FONT_OPTIONS}
            value={selectedFontValue}
            defaultOption={defaultFont}
            formId={formId}
            onChange={setSelectedFontValue}
          />
          <FontDropdown
            label="영문 / 숫자 폰트"
            name="english_font_key"
            options={ENGLISH_FONT_OPTIONS}
            value={selectedEnglishFontValue}
            defaultOption={defaultEnglishFont}
            formId={formId}
            onChange={setSelectedEnglishFontValue}
          />
        </div>
        <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
          고객에게는 폰트 이름만 표시됩니다. 웹폰트 주소와 CSS font-family 값은 코드에서 관리합니다.
        </p>
        <div
          className="rounded-lg border border-zinc-200 bg-white p-5 text-zinc-950"
          style={{
            "--menu-font-ko": previewKoreanFont.fontFamily,
            "--menu-font-en": previewEnglishFont.fontFamily,
            fontFamily: "var(--menu-font-ko)",
          } as CSSProperties}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <span
              className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white"
              style={{ fontFamily: "var(--menu-font-en)" }}
            >
              {isPriceList ? "REPRESENTATIVE" : "BEST"}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400" style={{ fontFamily: "var(--menu-font-en)" }}>
              Font Preview
            </span>
          </div>
          <p className="text-sm font-black text-zinc-500">{isPriceList ? "기본 관리" : "시그니처"}</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-xl font-black tracking-tight text-zinc-950">
                {isPriceList ? "프리미엄 케어" : "바닐라 크림 라떼"}
              </h4>
              <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                {isPriceList
                  ? "기본 상담과 집중 관리가 포함된 프로그램입니다."
                  : "부드러운 우유와 은은한 바닐라 향을 더한 라떼입니다."}
              </p>
            </div>
            <p className="shrink-0 text-lg font-black text-zinc-950" style={{ fontFamily: "var(--menu-font-en)" }}>
              {isPriceList ? "85,000원" : "5,500원"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
