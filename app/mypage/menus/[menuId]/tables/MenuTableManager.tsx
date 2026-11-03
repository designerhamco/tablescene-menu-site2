"use client";

import { useActionState } from "react";

import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { ArchivedMenuTableListItem, MenuTableListItem } from "@/lib/menu-table-management";
import { LoadingState } from "@/app/components/ui/loading-state";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { formatKoreanDateTime } from "@/lib/korean-date-time";

import { initialMenuTableActionState, type MenuTableActionState } from "./action-state";
import { createMenuTableAction, mutateMenuTableAction } from "./actions";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import { LayoutGrid } from "lucide-react";

function ActionNotice({ state }: { state: MenuTableActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <ContentPanel as="div" surface="notice" density="compact" role="status"><p className="type-body-sm">{state.message}</p></ContentPanel>
  );
}

export default function MenuTableManager({
  menuSiteId,
  tables,
  archivedTables = [],
}: {
  menuSiteId: string;
  tables: Pick<MenuTableListItem, "id" | "label" | "status">[];
  archivedTables?: ArchivedMenuTableListItem[];
}) {
  const [createState, createAction, createPending] = useActionState(createMenuTableAction, initialMenuTableActionState);
  const [mutationState, mutationAction, mutationPending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);

  return (
    <div className="site-stack-group">
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

      <ContentPanel>
        <div className="site-stack-title">
          <div className="site-stack-copy"><p className="type-caption site-copy-subtle">테이블 설정</p><h2 className="type-subsection-title">새 테이블 추가</h2></div>
        <p className="type-body-sm site-copy-muted">
          테이블을 추가하고 사용 상태를 관리합니다. 테이블 이름을 바꿔도 QR은 유지됩니다. 주문과 호출은 각 관리 메뉴에서 별도로 켜고 끌 수 있습니다.
        </p>
        </div>
        <form action={createAction} aria-busy={createPending} className="site-form-row">
          <input type="hidden" name="menuSiteId" value={menuSiteId} />
          <label className="site-field-stack type-label">
            테이블 이름
            <input
              name="label"
              required
              maxLength={80}
              placeholder="예: 1번 테이블"
              className="site-field w-full"
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
        {createPending ? <LoadingState inline label="테이블을 만들고 있습니다. 잠시만 기다려 주세요." /> : null}
      </ContentPanel>

      <section className="site-stack-block">
        <div className="site-stack-title">
          <h2 className="type-subsection-title">운영 테이블</h2>
          <p className="type-body-sm site-copy-muted">
            사용 중·비활성 테이블 {tables.length.toLocaleString("ko-KR")}개
          </p>
        </div>

        {tables.length === 0 ? (
          <EmptyState headingLevel={3} icon={<LayoutGrid />} title="아직 등록된 테이블이 없습니다." description="테이블을 추가하면 이곳에서 관리할 수 있습니다." />
        ) : tables.map((table) => (
          <ContentPanel as="article" key={table.id}>
            <div className="site-content-heading-row">
              <div>
                <h3 className="type-content-title break-words">{table.label}</h3>
              </div>
              <Badge>
                {table.status === "active" ? "사용 중" : "비활성"}
              </Badge>
            </div>

            <form action={mutationAction} className="site-form-row site-content-divider">
              <input type="hidden" name="menuSiteId" value={menuSiteId} />
              <input type="hidden" name="tableId" value={table.id} />
              <label className="site-field-stack type-label">
                이름
                <input name="label" required maxLength={80} defaultValue={table.label} className="site-field w-full" />
              </label>
              <label className="site-field-stack type-label" data-field-width="short">
                상태
                <select name="status" defaultValue={table.status} className="site-field w-full">
                  <option value="active">사용 중</option>
                  <option value="disabled">비활성</option>
                </select>
              </label>
              <button name="intent" value="update" disabled={mutationPending} className="site-button site-button-outline">
                저장
              </button>
            </form>

            <div className="site-stack-copy">
            <div className="site-action-row">
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
            <p className="type-body-sm site-copy-muted">테이블에 비치한 손님용 태블릿에서만 공용 단말로 연결해 주세요. 연결하면 이 브라우저의 관리자 계정이 로그아웃되고 손님용 주문 화면으로 이동합니다.</p>
            </div>
          </ContentPanel>
        ))}
      </section>
      <section className="site-stack-block" aria-label="보관된 테이블">
        <div className="site-stack-title">
          <h2 className="type-subsection-title">보관된 테이블 · {archivedTables.length.toLocaleString("ko-KR")}개</h2>
          <p className="type-body-sm text-zinc-500">보관된 테이블은 주문과 호출에 사용할 수 없습니다. 복원하면 비활성 상태로 운영 목록에 돌아오며, 사용 중으로 바꾼 뒤 다시 사용할 수 있습니다.</p>
        </div>
        {archivedTables.length === 0 ? <p className="type-body-sm text-zinc-500">보관된 테이블이 없습니다.</p> : archivedTables.map(table => (
          <ContentPanel as="article" key={table.id}>
            <div className="site-content-heading-row">
              <div className="site-stack-copy min-w-0">
                <h3 className="type-content-title break-words">{table.label}</h3>
                <p className="type-caption site-copy-subtle">보관일 {formatKoreanDateTime(table.archivedAt)}</p>
              </div>
              <Badge>보관됨</Badge>
            </div>
            <form action={mutationAction} className="site-form-row" aria-busy={mutationPending}>
              <input type="hidden" name="menuSiteId" value={menuSiteId} />
              <input type="hidden" name="tableId" value={table.id} />
              <label className="type-label site-field-stack">
                복원할 테이블 이름
                <input name="label" required maxLength={80} defaultValue={table.label} className="site-field w-full" />
              </label>
              <button name="intent" value="restore" disabled={mutationPending} className="site-button site-button-outline">테이블 복원</button>
            </form>
          </ContentPanel>
        ))}
      </section>
    </div>
  );
}
