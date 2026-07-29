"use client";

import { useState } from "react";

import {
  DEFAULT_ONE_PAGE_LAYOUT_SHELL,
  ONE_PAGE_LAYOUT_SHELL_DESCRIPTIONS,
  ONE_PAGE_LAYOUT_SHELL_KEYS,
  ONE_PAGE_LAYOUT_SHELL_LABELS,
  type OnePageLayoutShell,
} from "@/lib/one-page-layout-shells";

type OnePageLayoutShellSettingsFormProps = {
  formId: string;
  initialShell: OnePageLayoutShell;
};

function ShellDiagram({ shell }: { shell: OnePageLayoutShell }) {
  if (shell === "brand_top_band") {
    return (
      <div className="grid h-14 grid-rows-[18px_1fr] gap-1" aria-hidden="true">
        <div className="rounded-sm bg-zinc-950" />
        <div className="grid grid-cols-[1fr_36px] gap-1">
          <div className="rounded-sm bg-zinc-300" />
          <div className="rounded-sm border border-zinc-300 bg-white" />
        </div>
      </div>
    );
  }

  if (shell === "brand_center_rail") {
    return (
      <div className="grid h-14 grid-cols-[1fr_28px_1fr] gap-1" aria-hidden="true">
        <div className="rounded-sm bg-zinc-300" />
        <div className="rounded-sm bg-zinc-950" />
        <div className="rounded-sm bg-zinc-300" />
      </div>
    );
  }

  return (
    <div className="grid h-14 grid-cols-[34px_1fr] gap-1" aria-hidden="true">
      <div className="rounded-sm bg-zinc-950" />
      <div className="rounded-sm bg-zinc-300" />
    </div>
  );
}

export default function OnePageLayoutShellSettingsForm({ formId, initialShell }: OnePageLayoutShellSettingsFormProps) {
  const [selectedShell, setSelectedShell] = useState<OnePageLayoutShell>(initialShell || DEFAULT_ONE_PAGE_LAYOUT_SHELL);

  return (
    <div className="mt-5">
      <input form={formId} type="hidden" name="one_page_layout_shell" value={selectedShell} />
      <div className="grid gap-3 md:grid-cols-3">
        {ONE_PAGE_LAYOUT_SHELL_KEYS.map((shell) => {
          const selected = selectedShell === shell;

          return (
            <button
              key={shell}
              type="button"
              onClick={() => setSelectedShell(shell)}
              className={`rounded-lg border p-3 text-left transition ${
                selected
                  ? "border-zinc-950 bg-white shadow-sm"
                  : "border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-white"
              }`}
            >
              <ShellDiagram shell={shell} />
              <div className="mt-3">
                <p className="text-sm font-black text-zinc-950">{ONE_PAGE_LAYOUT_SHELL_LABELS[shell]}</p>
                <p className="mt-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                  {ONE_PAGE_LAYOUT_SHELL_DESCRIPTIONS[shell]}
                </p>
              </div>
              {selected ? <p className="mt-2 text-[10px] font-black uppercase text-zinc-950">Selected</p> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
        모바일에서는 모든 구성이 동일한 세로 흐름으로 표시됩니다.
      </p>
    </div>
  );
}
