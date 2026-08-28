"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createCustomStaffCallItemKey,
  MAX_STAFF_CALL_ITEMS,
  MAX_STAFF_CALL_ITEM_LABEL_LENGTH,
  type StaffCallItem,
} from "@/lib/call-items";

import { initialCallItemActionState, saveCallItemsAction } from "./actions";

export default function CallItemManager({
  menuSiteId,
  items,
}: {
  menuSiteId: string;
  items: StaffCallItem[];
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
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-2xl font-black tracking-tight">호출 항목 설정</h2>
          <p className="mt-2 max-w-2xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            손님에게 보여줄 요청 항목을 최대 {MAX_STAFF_CALL_ITEMS}개까지 정합니다. 사용 중지를 해도 이전 호출 이력의 항목명은 그대로 보존됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={draft.length >= MAX_STAFF_CALL_ITEMS}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-xs font-black text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          항목 추가
        </button>
      </div>

      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="menuSiteId" value={menuSiteId} />
        <input type="hidden" name="itemsJson" value={serializedItems} />
        {draft.map((item, index) => (
          <div key={item.key} className="grid gap-3 rounded-2xl border border-zinc-200 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-black text-zinc-600">{index + 1}</span>
            <label className="text-xs font-black text-zinc-600">
              항목 이름
              <input
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
                required
                maxLength={MAX_STAFF_CALL_ITEM_LABEL_LENGTH}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-bold text-zinc-950 outline-none focus:border-zinc-500"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-black text-zinc-700">
              <input
                type="checkbox"
                checked={item.active}
                onChange={(event) => updateItem(index, { active: event.target.checked })}
                className="h-4 w-4 accent-zinc-950"
              />
              사용
            </label>
            <div className="flex items-center justify-end gap-1">
              <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label={`${item.label} 위로 이동`}>
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => moveItem(index, 1)} disabled={index === draft.length - 1} className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label={`${item.label} 아래로 이동`}>
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => removeItem(index)} disabled={draft.length <= 1} className="rounded-full p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30" aria-label={`${item.label} 제거`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        {state.status !== "idle" && state.message ? (
          <p className={`rounded-2xl border px-4 py-3 text-sm font-bold ${state.status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`} role="status">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={pending} className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60">
            {pending ? "저장 중" : "호출 항목 저장"}
          </button>
        </div>
      </form>
    </section>
  );
}
