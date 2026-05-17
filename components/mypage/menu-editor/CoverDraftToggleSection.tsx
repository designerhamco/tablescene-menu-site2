"use client";

import { useEffect, useState, type ReactNode } from "react";

import SwitchField from "@/components/mypage/menu-editor/SwitchField";

type CoverDraftToggleSectionProps = {
  name: string;
  label: string;
  defaultChecked: boolean;
  inactiveMessage: string;
  children: ReactNode;
};

export default function CoverDraftToggleSection({
  name,
  label,
  defaultChecked,
  inactiveMessage,
  children,
}: CoverDraftToggleSectionProps) {
  const [enabled, setEnabled] = useState(defaultChecked);
  const [resetVersion, setResetVersion] = useState(0);
  const hasDraftToggleChange = enabled !== defaultChecked;

  useEffect(() => {
    function handleCoverDraftReset(event: Event) {
      const detail = (event as CustomEvent<{ menuCoverEnabled?: boolean }>).detail;
      if (typeof detail?.menuCoverEnabled !== "boolean") return;

      setEnabled(detail.menuCoverEnabled);
      setResetVersion((version) => version + 1);
    }

    window.addEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
    return () => window.removeEventListener("tablescene:cover-draft-reset", handleCoverDraftReset);
  }, []);

  return (
    <>
      <div className="md:col-span-2">
        <SwitchField
          key={resetVersion}
          name={name}
          label={label}
          defaultChecked={enabled}
          onText="사용 중"
          offText="사용 안 함"
          onCheckedChange={setEnabled}
        />
        {hasDraftToggleChange && (
          <p className="mt-3 break-keep rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-relaxed text-amber-700">
            저장을 눌러야 미리보기와 공개 메뉴판에 반영됩니다.
          </p>
        )}
      </div>

      {!enabled && (
        <p className="md:col-span-2 break-keep rounded-lg border border-dashed border-zinc-200 bg-white p-5 text-sm font-bold leading-relaxed text-zinc-500">
          {inactiveMessage}
        </p>
      )}

      {enabled ? children : null}
    </>
  );
}
