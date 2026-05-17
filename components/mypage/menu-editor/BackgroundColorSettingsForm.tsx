"use client";

import { useState } from "react";

type BackgroundColorSettingsFormProps = {
  formId: string;
  initialColor: string;
  defaultColor: string;
  hasCustomBackgroundColor: boolean;
};

export default function BackgroundColorSettingsForm({
  formId,
  initialColor,
  defaultColor,
  hasCustomBackgroundColor,
}: BackgroundColorSettingsFormProps) {
  const [backgroundColor, setBackgroundColor] = useState(initialColor);
  const colorPickerValue = /^#[0-9A-Fa-f]{6}$/.test(backgroundColor) ? backgroundColor : defaultColor;

  return (
    <div className="mt-5 space-y-4">
      <div className="space-y-4">
        <input form={formId} type="hidden" name="background_color" value={backgroundColor} />
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">배경색</label>
          <div className="mt-2 flex min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-950">
            <input
              type="color"
              value={colorPickerValue}
              onChange={(event) => setBackgroundColor(event.target.value.toUpperCase())}
              className="h-12 w-14 shrink-0 cursor-pointer border-0 bg-transparent p-1.5"
              aria-label="메뉴판 배경색 선택"
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value.toUpperCase())}
              pattern="#[0-9A-Fa-f]{6}"
              className="min-w-0 flex-1 px-3 text-sm font-bold uppercase text-zinc-900 outline-none"
              aria-label="현재 선택된 배경색"
            />
          </div>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            현재 선택된 색상 값입니다. 너무 어둡거나 너무 밝은 색을 선택하면 글자가 잘 보이지 않을 수 있습니다.
          </p>
        </div>
      </div>

      {!hasCustomBackgroundColor && (
        <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
          현재 템플릿 기본 배경색을 사용 중입니다.
        </p>
      )}
    </div>
  );
}
