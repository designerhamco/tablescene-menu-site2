"use client";

import { useId, useState, type ReactNode } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import DirtySubmitButton from "./DirtySubmitButton";

const devices = [
  { key: "pc", label: "PC" },
  { key: "tablet", label: "태블릿" },
  { key: "mobile", label: "모바일" },
] as const;

export default function BasicDesignWorkspace({ menuId, formId, revision, saved, disabled, canPreview, children }: {
  menuId: string;
  formId: string;
  revision: string;
  saved: boolean;
  disabled: boolean;
  canPreview: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(saved);
  const [device, setDevice] = useState<(typeof devices)[number]["key"]>("tablet");
  const workspaceId = useId();
  const previewUrl = `/mypage/menus/${menuId}/preview?${new URLSearchParams({ view: "actual", embedded: "1", device, designRevision: revision })}`;

  return (
    <section className="site-stack-group">
      <ContentPanel surface="muted" density="compact">
        <div className="site-content-heading-row">
          <div className="site-stack-copy">
            <h3 className="type-content-title">디자인 설정</h3>
            {saved && <p className="type-body-sm" role="status">디자인 저장 완료</p>}
          </div>
          <button type="button" className="site-button site-button-outline" aria-expanded={open} aria-controls={workspaceId} onClick={() => setOpen((value) => !value)}>
            {open ? "디자인 설정 닫기" : "디자인 설정 열기"}
          </button>
        </div>
      </ContentPanel>
      <div id={workspaceId} hidden={!open}>
        <ContentPanel>
          <div className="site-content-heading-row">
            {canPreview && (
              <Tabs purpose="state" value={device} onValueChange={(next) => {
                const match = devices.find(({ key }) => key === next);
                if (match) setDevice(match.key);
              }}>
                <TabsList aria-label="미리보기 기기">
                  {devices.map(({ key, label }) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}
                </TabsList>
              </Tabs>
            )}
            <DirtySubmitButton formId={formId} form={formId} className="site-button site-button-primary" disabled={disabled}>
              디자인 저장
            </DirtySubmitButton>
          </div>
          <div className="site-basic-design-workspace" data-preview={canPreview}>
            <div className="site-stack-block">{children}</div>
            {open && canPreview && (
              <div className="site-stack-copy">
                <div className="site-basic-design-preview" data-device={device}>
                  <iframe title={`${devices.find(({ key }) => key === device)?.label} 메뉴판 미리보기`} src={previewUrl} />
                </div>
                <p className="type-caption site-copy-muted">저장한 디자인이 미리보기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </ContentPanel>
      </div>
    </section>
  );
}
