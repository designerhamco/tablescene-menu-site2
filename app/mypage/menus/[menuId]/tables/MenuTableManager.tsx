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
import TableMenuAddressActions from "@/components/mypage/TableMenuAddressActions";

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
  connectedTableId = null,
  connectionStatusAvailable = true,
  publicBaseUrl = null,
  menuPublished = true,
}: {
  menuSiteId: string;
  tables: (Pick<MenuTableListItem, "id" | "label" | "status"> & { qrPath?: string })[];
  archivedTables?: ArchivedMenuTableListItem[];
  connectedTableId?: string | null;
  connectionStatusAvailable?: boolean;
  publicBaseUrl?: string | null;
  menuPublished?: boolean;
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

        <ContentPanel as="aside" surface="notice" density="compact" aria-label="매장 태블릿 연결 안내">
          <div className="site-stack-title">
            <h3 className="type-content-title">테이블에 놓을 매장 태블릿에서 설정해 주세요</h3>
            <p className="type-body-sm">1번 테이블의 연결 버튼을 누르면 현재 태블릿의 주문이 1번 테이블 주문으로 접수됩니다. 손님이 자기 휴대폰으로 QR을 찍는 매장은 이 설정이 필요 없습니다.</p>
          </div>
          <p className="type-body-sm">연결 버튼을 누르면 관리자 계정이 로그아웃되고 손님용 메뉴판이 자동으로 열립니다. 연결된 메뉴판은 ‘메뉴판 열기’ 버튼으로 다시 열 수도 있습니다.</p>
          <p className="type-body-sm">연결 해제는 현재 기기에만 적용됩니다. 손님용 화면을 사용하다 연결을 해제하려면 같은 태블릿에서 관리자 로그인 후 이 페이지로 돌아오세요.</p>
          {!connectionStatusAvailable ? <p className="type-body-sm" role="alert">현재 태블릿의 연결 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.</p> : null}
          {!menuPublished ? <p className="type-body-sm">메뉴판을 공개한 뒤 태블릿을 연결할 수 있습니다.</p> : null}
        </ContentPanel>

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
              <form action={mutationAction} onSubmit={event => {if (!window.confirm(`현재 태블릿을 ${table.label} 주문용으로 연결할까요? 관리자 계정이 로그아웃되고 손님용 메뉴판이 자동으로 열립니다.`)) event.preventDefault();}}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="register-terminal" disabled={mutationPending || table.status !== "active" || !menuPublished || !connectionStatusAvailable || connectedTableId === table.id} className="site-button site-button-outline">현재 태블릿을 테이블에 연결</button>
              </form>
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="unregister-terminal" disabled={mutationPending || !connectionStatusAvailable || connectedTableId !== table.id} className="site-button site-button-outline">테이블 연결 해제</button>
              </form>
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="open-terminal-menu" disabled={mutationPending || !menuPublished || table.status !== "active" || !connectionStatusAvailable || connectedTableId !== table.id} className="site-button site-button-primary">메뉴판 열기</button>
              </form>
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="archive" disabled={mutationPending} className="site-button site-button-outline">
                  테이블 보관
                </button>
              </form>
            </div>
            <p className="type-body-sm site-copy-muted">{!connectionStatusAvailable ? "현재 태블릿의 연결 상태를 확인하지 못했습니다." : connectedTableId === table.id ? "현재 태블릿이 이 테이블에 연결되어 있습니다. ‘메뉴판 열기’로 손님용 화면을 다시 열 수 있습니다." : "현재 태블릿은 이 테이블에 연결되어 있지 않습니다. 연결하면 손님용 메뉴판이 자동으로 열립니다."}</p>
            <p className="type-footnote site-copy-muted">연결을 해제해도 기존 주문은 남습니다. 테이블 보관은 운영 목록에서 빼두는 기능이며 예전 주문 기록은 유지됩니다.</p>
            </div>
            {table.qrPath ? <TableMenuAddressActions path={table.qrPath} tableId={table.id} publicBaseUrl={publicBaseUrl}
              disabledReason={table.status !== "active" ? "테이블을 사용 중으로 바꾸면 이 주소를 사용할 수 있습니다." : !menuPublished ? "메뉴판을 공개하면 이 주소를 사용할 수 있습니다." : undefined} /> : null}
          </ContentPanel>
        ))}
      </section>
      <section className="site-stack-block" aria-label="보관된 테이블">
        <div className="site-stack-title">
          <h2 className="type-subsection-title">보관된 테이블 · {archivedTables.length.toLocaleString("ko-KR")}개</h2>
          <p className="type-body-sm site-copy-muted">예를 들어 매장에서 3번 테이블을 치웠다면, 예전 주문 기록은 남기고 이곳에 보관할 수 있습니다. 잠깐 사용을 쉬는 테이블은 비활성으로 두세요. 다시 필요하면 복원한 뒤 사용 중으로 바꾸면 됩니다.</p>
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
