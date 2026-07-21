"use client";

import type { MenuWidgetType } from "@/lib/menu-widgets";

const TYPE_OPTIONS: Array<{
  value: MenuWidgetType;
  label: string;
  description: string;
}> = [
  { value: "image", label: "이미지", description: "이미지만 크게 보여줍니다." },
  { value: "text", label: "텍스트", description: "공지나 안내 문구를 보여줍니다." },
  { value: "image_text", label: "이미지 + 텍스트", description: "이미지와 설명을 함께 보여줍니다." },
];

type MenuWidgetTypePickerProps = {
  value: MenuWidgetType;
  onChange: (value: MenuWidgetType) => void;
  disabled?: boolean;
};

export default function MenuWidgetTypePicker({ value, onChange, disabled = false }: MenuWidgetTypePickerProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="위젯 유형">
      {TYPE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`rounded-lg border px-3 py-3 text-left transition ${
              selected
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            } disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400`}
          >
            <span className="block text-sm font-black">{option.label}</span>
            <span className={`mt-1 block break-keep text-[11px] font-bold leading-relaxed ${selected ? "text-zinc-200" : "text-zinc-400"}`}>
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
