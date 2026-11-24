"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowUpRight } from "@/app/components/ui/site-arrow";
import { X } from "@/app/components/ui/site-icon";
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
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [device, setDevice] = useState<(typeof devices)[number]["key"]>("tablet");
  const workspaceId = useId();
  const previewUrl = `/mypage/menus/${menuId}/preview?${new URLSearchParams({ view: "actual", embedded: "1", device, designRevision: revision })}`;

  useEffect(() => {
    if (saved) dialogRef.current?.close();
  }, [saved, revision]);

  return (
    <section className="site-stack-group">
      <ContentPanel surface="muted" data-basic-design-launch>
        <div className="site-stack-copy" data-basic-design-launch-actions>
          {saved && <p className="type-body-sm" role="status">디자인 저장 완료</p>}
          <button type="button" className="site-button site-button-outline" aria-haspopup="dialog" aria-controls={workspaceId} onClick={() => {
            dialogRef.current?.showModal();
            setOpen(true);
          }}>
            디자인 설정 <ArrowUpRight aria-hidden />
          </button>
        </div>
      </ContentPanel>
      <dialog ref={dialogRef} id={workspaceId} className="site-dialog site-basic-design-dialog" aria-labelledby={`${workspaceId}-title`} onClose={() => setOpen(false)}>
        <div className="site-management-scope site-stack-block">
          <div className="site-content-heading-row" data-layout="toolbar">
            <h3 id={`${workspaceId}-title`} className="type-content-title">디자인 설정</h3>
            <button type="button" className="site-button site-button-ghost site-button-icon" aria-label="디자인 설정 닫기" onClick={() => dialogRef.current?.close()}><X aria-hidden /></button>
          </div>
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
            <div className="site-stack-copy site-basic-design-controls">{children}</div>
            {open && canPreview && (
              <div className="site-stack-copy">
                <div className="site-basic-design-preview" data-device={device}>
                  <iframe title={`${devices.find(({ key }) => key === device)?.label} 메뉴판 미리보기`} src={previewUrl} />
                </div>
                <p className="type-caption site-copy-muted">저장한 디자인이 미리보기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </section>
  );
}
