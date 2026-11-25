"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";

export const MenuEditorDirtyContext = createContext(false);
export const MenuEditorWorkspaceActionsContext = createContext<ReactNode>(null);

/** Keep the original buttons inside their form, including native validation and Server Actions. */
export default function MenuEditorActionBar({ children, pending: externalPending = false, dirty: externalDirty, formId, onCancel }: {
  children: ReactNode;
  pending?: boolean;
  dirty?: boolean;
  formId?: string;
  onCancel?: () => void;
}) {
  const workspaceDirty = useContext(MenuEditorDirtyContext);
  const workspaceActions = useContext(MenuEditorWorkspaceActionsContext);
  const ref = useRef<HTMLDivElement>(null);
  const { pending: formPending } = useFormStatus();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [edited, setEdited] = useState(false);
  const [hasError, setHasError] = useState(false);
  const pending = externalPending || formPending;

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const workspace = bar.closest<HTMLElement>("[data-basic-item-editor], .site-editor-workspace");
    const measure = () => {
      const height = `${bar.getBoundingClientRect().height}px`;
      workspace?.style.setProperty("--menu-editor-action-bar-height", height);
      document.documentElement.style.setProperty("--menu-editor-action-bar-height", height);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(bar);
    measure();
    const form = formId ? document.getElementById(formId) : bar.closest("form");
    const scope = bar.closest("[data-basic-editor-management]") ?? bar.closest("[data-basic-item-form]") ?? form ?? bar.parentElement;
    if (!scope) return;
    let frame = 0;
    const signature = () => form instanceof HTMLFormElement ? JSON.stringify(Array.from(new FormData(form).entries()).filter(([key]) => !key.startsWith("$ACTION_")).map(([key, value]) => [key, typeof value === "string" ? value : value.name])) : "";
    let baseline = signature();
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setEdited(scope.getAttribute("data-editor-dirty") === "true" || signature() !== baseline);
        setHasError(Boolean(bar.querySelector('.site-editor-save-feedback:not([hidden])')));
      });
    };
    const reset = () => { baseline = signature(); refresh(); };
    const observer = new MutationObserver(refresh);
    observer.observe(scope, { subtree: true, childList: true, attributes: true, attributeFilter: ["value", "checked", "hidden", "data-editor-dirty", "disabled"] });
    scope.addEventListener("input", refresh);
    scope.addEventListener("change", refresh);
    scope.addEventListener("reset", reset);
    window.addEventListener("tablescene:editor-saved", reset);
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      workspace?.style.removeProperty("--menu-editor-action-bar-height");
      document.documentElement.style.removeProperty("--menu-editor-action-bar-height");
      scope.removeEventListener("input", refresh);
      scope.removeEventListener("change", refresh);
      scope.removeEventListener("reset", reset);
      window.removeEventListener("tablescene:editor-saved", reset);
    };
  }, [formId]);

  const dirty = Boolean(workspaceDirty || externalDirty || edited);
  const state = pending ? "pending" : hasError ? "error" : dirty ? "dirty" : "saved";
  function cancelChanges() {
    if (pending || !dirty) return;
    setCancelOpen(false);
    if (onCancel) onCancel();
    else {
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      url.searchParams.delete("error");
      url.searchParams.delete("designDraft");
      url.searchParams.delete("designReset");
      window.location.assign(url.toString());
    }
  }

  return <div ref={ref} className="site-editor-action-bar" data-state={state} aria-label="편집 작업">
    <div className="site-container">
      <div className="site-editor-action-bar-inner">
        <div className="site-editor-action-bar-leading">
          <p className="site-editor-save-status type-body-sm" role="status" aria-live="polite">
            <span aria-hidden="true" />
            {pending ? "저장 중…" : hasError ? "입력값과 저장 결과를 확인해 주세요" : dirty ? "저장하지 않은 변경사항" : "모든 변경사항이 저장됨"}
          </p>
          {workspaceActions && <fieldset className="site-action-row" disabled={pending} aria-label="메뉴판 구성 공통 작업">{workspaceActions}</fieldset>}
        </div>
        <div className="site-editor-action-bar-controls">
          {children}
          {dirty && <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild><button type="button" className="site-button site-button-outline" data-editor-cancel disabled={!dirty || pending}>미저장 수정 취소</button></DialogTrigger>
            <DialogContent className="site-management-scope">
              <div className="site-stack-group">
                <div className="site-stack-title">
                  <DialogTitle>미저장 수정을 취소할까요?</DialogTitle>
                  <DialogDescription>현재 탭에서 저장하지 않은 수정만 버리고 마지막 저장 상태로 돌아갑니다. 템플릿 샘플로 바꾸는 작업과는 별개입니다.</DialogDescription>
                </div>
                <div className="site-action-row" data-distribution="end">
                  <DialogClose asChild><button type="button" className="site-button site-button-outline">계속 편집</button></DialogClose>
                  <button type="button" className="site-button site-button-primary" disabled={pending} onClick={cancelChanges}>미저장 수정 취소</button>
                </div>
              </div>
            </DialogContent>
          </Dialog>}
        </div>
      </div>
    </div>
  </div>;
}
