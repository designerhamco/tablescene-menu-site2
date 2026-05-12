"use client";

import { useMemo, useState } from "react";

import {
  ENGLISH_FONT_OPTIONS,
  FONT_SIZE_SCALE_OPTIONS,
  KOREAN_FONT_OPTIONS,
  getEnglishFontFamily,
  getFontSizeMultiplier,
  getKoreanFontFamily,
  type EnglishFontKey,
  type FontSizeScaleKey,
  type KoreanFontKey,
  type TypographySettings,
} from "@/lib/template-typography-presets";

type TypographySettingsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  formId: string;
  menuId: string;
  initialSettings: TypographySettings;
  defaultSettings: TypographySettings;
  hasCustomTypography: boolean;
};

export default function TypographySettingsForm({
  action,
  formId,
  menuId,
  initialSettings,
  defaultSettings,
  hasCustomTypography,
}: TypographySettingsFormProps) {
  const [settings, setSettings] = useState<TypographySettings>(initialSettings);
  const sizeMultiplier = useMemo(() => getFontSizeMultiplier(settings.font_size_scale_key), [settings.font_size_scale_key]);

  return (
    <form id={formId} action={action} className="mt-5 space-y-5">
      <input type="hidden" name="menuId" value={menuId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">한글 폰트</label>
          <select
            name="korean_font_key"
            value={settings.korean_font_key}
            onChange={(event) => setSettings((current) => ({ ...current, korean_font_key: event.target.value as KoreanFontKey }))}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
          >
            {KOREAN_FONT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <p
            className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700"
            style={{
              fontFamily: getKoreanFontFamily(settings.korean_font_key),
              fontSize: `${0.875 * sizeMultiplier}rem`,
            }}
          >
            아메리카노 4,500
          </p>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">영문 폰트</label>
          <select
            name="english_font_key"
            value={settings.english_font_key}
            onChange={(event) => setSettings((current) => ({ ...current, english_font_key: event.target.value as EnglishFontKey }))}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
          >
            {ENGLISH_FONT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <p
            className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700"
            style={{
              fontFamily: getEnglishFontFamily(settings.english_font_key),
              fontSize: `${0.875 * sizeMultiplier}rem`,
            }}
          >
            Signature Coffee
          </p>
        </div>
      </div>
      <div>
        <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">글자 크기</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {FONT_SIZE_SCALE_OPTIONS.map((option) => (
            <label
              key={option.key}
              className={`cursor-pointer rounded-lg border bg-white p-4 transition ${
                settings.font_size_scale_key === option.key ? "border-zinc-950 ring-2 ring-zinc-950/10" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <input
                type="radio"
                name="font_size_scale_key"
                value={option.key}
                checked={settings.font_size_scale_key === option.key}
                onChange={() => setSettings((current) => ({ ...current, font_size_scale_key: option.key as FontSizeScaleKey }))}
                className="sr-only"
              />
              <span className="block text-lg font-black text-zinc-950" style={{ fontSize: `${1.125 * option.scale}rem` }}>
                {option.label}
              </span>
              <span className="mt-1 block break-keep text-xs font-bold leading-relaxed text-zinc-400">{option.description}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
          메뉴 수가 적어 화면이 허전해 보이면 L을 선택해 더 크게 보여줄 수 있습니다.
        </p>
      </div>
      {!hasCustomTypography && (
        <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
          현재 템플릿 기본값: {defaultSettings.korean_font_key} / {defaultSettings.english_font_key} / {defaultSettings.font_size_scale_key.toUpperCase()}
        </p>
      )}
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        글꼴 설정 저장
      </button>
    </form>
  );
}
