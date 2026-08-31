"use client";

import { useState } from "react";

import { normalizeAubeTableCoverBackgroundOpacity } from "@/lib/aube-table";

type CoverBackgroundOpacityFieldProps = {
  defaultValue: number | undefined;
};

export default function CoverBackgroundOpacityField({ defaultValue }: CoverBackgroundOpacityFieldProps) {
  const [value, setValue] = useState(() => normalizeAubeTableCoverBackgroundOpacity(defaultValue));

  return (
    <div className="mt-2">
      <div className="flex items-center gap-4">
        <input
          type="range"
          name="multi_page_cover_background_opacity"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(event) => setValue(normalizeAubeTableCoverBackgroundOpacity(event.target.value))}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-zinc-900"
          aria-label="커버 배경색 불투명도"
        />
        <output className="w-14 shrink-0 text-right text-sm font-bold tabular-nums text-zinc-700">
          {value}%
        </output>
      </div>
      <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
        이미지 위에 배경색이 겹쳐지는 정도입니다. 0%는 이미지만, 100%는 배경색만 표시합니다.
      </p>
    </div>
  );
}
