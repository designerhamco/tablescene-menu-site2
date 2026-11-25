"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useCafeAStarterResetCoordinator } from "@/components/mypage/menu-editor/CafeAStarterResetCoordinator";
import { ContentPanel } from "@/app/components/ui/content-panel";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";

type CoverDraftToggleSectionProps = {
  name: string;
  label: string;
  defaultChecked: boolean;
  inactiveMessage: string;
  children: ReactNode;
  basic?: boolean;
  devices?: ReactNode;
};

export default function CoverDraftToggleSection({
  name,
  label,
  defaultChecked,
  inactiveMessage,
  children,
  basic = false,
  devices,
}: CoverDraftToggleSectionProps) {
  const coordinator = useCafeAStarterResetCoordinator();
  const [enabled, setEnabled] = useState(defaultChecked);
  const [resetVersion, setResetVersion] = useState(0);
  const hasDraftToggleChange = enabled !== defaultChecked;

  useEffect(() => {
    if (!coordinator?.snapshot) return;
    const frameId = window.requestAnimationFrame(() => {
      setEnabled(true);
      setResetVersion((version) => version + 1);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [coordinator?.resetKey, coordinator?.snapshot]);

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

  const toggle = (
    <SwitchField
          key={resetVersion}
          compact={basic}
          name={name}
          label={basic ? "사용 여부" : label}
          defaultChecked={enabled}
          onText="사용 중"
          offText="사용 안 함"
          onCheckedChange={setEnabled}
        />
  );

  if (basic) {
    return (
      <div className="site-stack-group md:col-span-2">
        <div className="site-basic-editor-cover-grid">
          <section className="site-stack-copy">
            <h3 className="type-label">대표 영역 사용 여부</h3>
            <ContentPanel surface="muted" density="compact">
              <div className="site-cover-master-panel">
                {toggle}
                <div className="site-cover-device-sketch" data-device="pc" data-visible={enabled} aria-hidden="true"><i /></div>
              </div>
            </ContentPanel>
          </section>
          {enabled && devices}
        </div>
        {hasDraftToggleChange && <p className="type-body-sm">최종 저장을 눌러야 미리보기와 공개 메뉴판에 반영됩니다.</p>}
        {enabled ? children : <p className="type-body-sm site-copy-muted">{inactiveMessage}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="md:col-span-2">
        {toggle}
        {hasDraftToggleChange && (
          <p className="site-notice site-notice-warning mt-3 break-keep p-3 text-support font-medium leading-relaxed">
            저장을 눌러야 미리보기와 공개 메뉴판에 반영됩니다.
          </p>
        )}
      </div>

      {!enabled && (
        <p className="site-editor-subpanel md:col-span-2 break-keep p-5 text-copy leading-relaxed text-zinc-600">
          {inactiveMessage}
        </p>
      )}

      {enabled ? children : null}
    </>
  );
}
