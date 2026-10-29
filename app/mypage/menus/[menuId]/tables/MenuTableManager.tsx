"use client";

import { useActionState } from "react";

import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { MenuTableListItem } from "@/lib/menu-table-management";

import { initialMenuTableActionState, type MenuTableActionState } from "./action-state";
import { createMenuTableAction, mutateMenuTableAction } from "./actions";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { LayoutGrid } from "lucide-react";

function ActionNotice({ state }: { state: MenuTableActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p className={`site-notice   px-4 py-3 text-copy font-medium ${
      state.status === "success"
        ? "site-notice-success"
        : "site-notice-error"
    }`}>
      {state.message}
    </p>
  );
}

export default function MenuTableManager({
  menuSiteId,
  tables,
}: {
  menuSiteId: string;
  tables: Pick<MenuTableListItem, "id" | "label" | "status">[];
}) {
  const [createState, createAction, createPending] = useActionState(createMenuTableAction, initialMenuTableActionState);
  const [mutationState, mutationAction, mutationPending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);

  return (
    <div className="space-y-6">
      <ActionFeedbackToast
        message={createState.message}
        tone={createState.status === "success" ? "success" : "error"}
        eventKey={createState}
      />
      <ActionFeedbackToast
        message={mutationState.message}
        tone={mutationState.status === "success" ? "success" : "error"}
        eventKey={mutationState}
      />
      <ActionNotice state={createState} />
      <ActionNotice state={mutationState} />

      <section className="site-section p-6">
        <p className="text-support font-medium uppercase tracking-[0.16em] text-emerald-700">테이블 설정</p>
        <h2 className="type-subsection-title mt-2">새 테이블 추가</h2>
        <p className="mt-2 max-w-3xl break-keep text-copy font-medium leading-relaxed text-zinc-500">
          테이블을 추가하고 사용 상태를 관리합니다. 테이블 이름을 바꿔도 QR은 유지됩니다. 주문과 호출은 각 관리 메뉴에서 별도로 켜고 끌 수 있습니다.
        </p>
        <form action={createAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <label className="flex-1 text-copy font-medium text-zinc-800">
            테이블 이름
            <input
              name="label"
              required
              maxLength={80}
              placeholder="예: 1번 테이블"
              className="site-field mt-2 w-full border-zinc-200 px-4 py-3 transition"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="site-button site-button-primary"
          >
            {createPending ? "생성 중" : "테이블 만들기"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="type-subsection-title">운영 테이블</h2>
          <p className="mt-2 text-copy font-medium text-zinc-500">
            사용 중·비활성 테이블 {tables.length.toLocaleString("ko-KR")}개
          </p>
        </div>

        {tables.length === 0 ? (
          <EmptyState headingLevel={3} icon={<LayoutGrid />} title="아직 등록된 테이블이 없습니다." description="테이블을 추가하면 이곳에서 관리할 수 있습니다." />
        ) : tables.map((table) => (
          <article key={table.id} className="site-section p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="type-content-title">{table.label}</h3>
              </div>
              <Badge>
                {table.status === "active" ? "사용 중" : "비활성"}
              </Badge>
            </div>

            <form action={mutationAction} className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
              <input type="hidden" name="menuSiteId" value={menuSiteId} />
              <input type="hidden" name="tableId" value={table.id} />
              <label className="text-copy font-medium text-zinc-800">
                이름
                <input name="label" required maxLength={80} defaultValue={table.label} className="site-field mt-2 w-full border-zinc-200 px-4 py-3" />
              </label>
              <label className="text-copy font-medium text-zinc-800">
                상태
                <select name="status" defaultValue={table.status} className="site-field mt-2 w-full border-zinc-200 px-4 py-3">
                  <option value="active">사용 중</option>
                  <option value="disabled">비활성</option>
                </select>
              </label>
              <button name="intent" value="update" disabled={mutationPending} className="site-button site-button-outline">
                저장
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <form action={mutationAction} onSubmit={event => {if (!window.confirm(`${table.label}의 공용 단말로 이 브라우저를 연결하시겠습니까? 공용 단말에서는 후불 주문만 제공하고 전화번호를 받지 않습니다. 연결 후 이 브라우저의 관리자 계정은 로그아웃됩니다.`)) event.preventDefault();}}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="register-terminal" disabled={mutationPending || table.status !== "active"} className="site-button site-button-outline">이 기기를 공용 단말로 연결</button>
              </form>
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="archive" disabled={mutationPending} className="site-button site-button-outline">
                  테이블 보관
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
      <form action={mutationAction} className="space-y-3">
        <input type="hidden" name="menuSiteId" value={menuSiteId} />
        <p className="type-body-sm text-zinc-500">연결 후 이 브라우저의 관리자 계정은 로그아웃됩니다. 공용 단말은 사용 중 연결이 자동으로 갱신됩니다. 장기간 사용하지 않아 연결이 만료되면 다시 연결해 주세요. 손님 교체나 계산 완료는 별도로 처리하며, 연결을 해제해도 이미 접수된 주문은 삭제되지 않습니다.</p>
        <button name="intent" value="unregister-terminal" disabled={mutationPending} className="site-button site-button-outline">이 브라우저의 단말 연결 해제</button>
      </form>
    </div>
  );
}
