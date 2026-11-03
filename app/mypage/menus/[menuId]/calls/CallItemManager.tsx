"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import {
  createCustomStaffCallItemKey,
  getServiceStaffCallItems,
  type StaffCallService,
  MAX_STAFF_CALL_ITEMS,
  MAX_STAFF_CALL_ITEM_LABEL_LENGTH,
  type StaffCallItem,
} from "@/lib/call-items";

import { initialCallItemActionState } from "./action-state";
import { saveCallItemsAction } from "./actions";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";

export default function CallItemManager({
  menuSiteId,
  items,
  service = "basic",
}: {
  menuSiteId: string;
  items: StaffCallItem[];
  service?: StaffCallService;
}) {
  const [draft, setDraft] = useState<StaffCallItem[]>(items);
  const [state, action, pending] = useActionState(saveCallItemsAction, initialCallItemActionState);

  function updateItem(index: number, update: Partial<StaffCallItem>) {
    setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= draft.length) return;
    setDraft((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  }

  function removeItem(index: number) {
    if (draft.length <= 1) return;
    setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, sortOrder) => ({ ...item, sortOrder })));
  }

  function addItem() {
    if (draft.length >= MAX_STAFF_CALL_ITEMS) return;
    setDraft((current) => [...current, {
      key: createCustomStaffCallItemKey(),
      label: "새 호출 항목",
      sortOrder: current.length,
      active: true,
    }]);
  }

  const serializedItems = JSON.stringify(draft.map((item, sortOrder) => ({ ...item, sortOrder })));

  return (
    <ContentPanel>
      <ActionFeedbackToast
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
        eventKey={state}
      />
      <div className="site-content-heading-row">
        <div className="site-stack-title">
          <h3 className="type-subsection-title">호출 항목 설정</h3>
          <p className="type-body-sm site-copy-muted">
            손님이 한 번에 선택할 요청 항목을 최대 {MAX_STAFF_CALL_ITEMS}개까지 정합니다. 기본 항목을 불러와도 저장하기 전에는 반영되지 않습니다. 이전 호출 이력의 항목명은 그대로 보존됩니다.
          </p>
          {draft.length > MAX_STAFF_CALL_ITEMS ? (
            <p className="type-body-sm site-copy-muted">기존 항목을 {MAX_STAFF_CALL_ITEMS}개 이하로 줄인 뒤 저장해 주세요.</p>
          ) : null}
        </div>
        <div className="site-action-row">
        <button type="button" disabled={pending} onClick={() => setDraft(getServiceStaffCallItems(service))} className="site-button site-button-secondary">
          기본 항목 불러오기
        </button>
        <button
          type="button"
          onClick={addItem}
          disabled={pending || draft.length >= MAX_STAFF_CALL_ITEMS}
          className="site-button site-button-outline"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          항목 추가
        </button>
        </div>
      </div>

      <form action={action} className="site-stack-block">
        <fieldset disabled={pending} className="site-stack-block">
        <input type="hidden" name="menuSiteId" value={menuSiteId} />
        <input type="hidden" name="itemsJson" value={serializedItems} />
        {draft.map((item, index) => (
          <ContentPanel key={item.key} surface="muted"><div className="site-form-row">
            <Badge>{index + 1}</Badge>
            <label className="site-field-stack type-label">
              항목 이름
              <input
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                required
                maxLength={MAX_STAFF_CALL_ITEM_LABEL_LENGTH}
                className="site-field w-full"
              />
            </label>
            <label className="site-action-row type-label">
              <Switch
                checked={item.active}
                onCheckedChange={active => updateItem(index, { active })}
              />
              사용
            </label>
            <div className="site-action-row">
              <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="site-button site-button-ghost site-button-icon" aria-label={`${item.label} 위로 이동`}>
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => moveItem(index, 1)} disabled={index === draft.length - 1} className="site-button site-button-ghost site-button-icon" aria-label={`${item.label} 아래로 이동`}>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => removeItem(index)} disabled={draft.length <= 1} className="site-button site-button-danger-ghost site-button-icon" aria-label={`${item.label} 제거`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div></ContentPanel>
        ))}

        {state.status !== "idle" && state.message ? <ContentPanel as="aside" surface="notice" density="compact"><p className="type-body-sm" role="status">{state.message}</p></ContentPanel> : null}

        <div className="site-action-row">
          <button type="submit" disabled={pending} className="site-button site-button-primary">
            {pending ? "저장 중" : "호출 항목 저장"}
          </button>
        </div>
        </fieldset>
      </form>
    </ContentPanel>
  );
}
