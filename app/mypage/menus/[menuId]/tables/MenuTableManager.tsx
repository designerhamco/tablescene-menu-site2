"use client";

import { useActionState } from "react";

import QrAddressActions from "@/components/mypage/QrAddressActions";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
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
  menuSlug,
  publicBaseUrl,
  tables,
}: {
  menuSiteId: string;
  menuSlug: string;
  publicBaseUrl: string | null;
  tables: MenuTableListItem[];
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
        <p className="text-support font-medium uppercase tracking-[0.16em] text-emerald-700">테이블별 QR</p>
        <h2 className="type-subsection-title mt-2">새 테이블 추가</h2>
        <p className="mt-2 max-w-3xl break-keep text-copy font-medium leading-relaxed text-zinc-500">
          각 좌석에는 서로 다른 QR이 필요합니다. 테이블 이름을 바꿔도 QR은 유지되며, QR 교체를 선택한 경우에만 기존 인쇄물이 무효화됩니다.
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
            사용 중·비활성 테이블 {tables.length.toLocaleString("ko-KR")}개 · 각 QR은 언제든 다시 다운로드할 수 있습니다.
          </p>
        </div>

        {tables.length === 0 ? (
          <EmptyState headingLevel={3} icon={<LayoutGrid />} title="아직 등록된 테이블이 없습니다." description="테이블을 추가하면 이곳에서 관리할 수 있습니다." />
        ) : tables.map((table) => (
          <article key={table.id} className="site-section p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="type-content-title">{table.label}</h3>
                <p className="mt-1 text-support font-medium text-zinc-400">
                  마지막 QR 교체 {formatKoreanDateTime(table.tokenRotatedAt)}
                </p>
              </div>
              <Badge>
                {table.status === "active" ? "사용 중" : "비활성"}
              </Badge>
            </div>

            <QrAddressActions
              copyKey={table.id}
              feedbackLabel={table.label}
              fileName={`arti-menu-${menuSlug}-${table.label.replace(/[^0-9A-Za-z가-힣_-]+/g, "-")}-qr.png`}
              path={table.qrPath}
              publicBaseUrl={publicBaseUrl}
            />

            <a className="site-button site-button-secondary mt-4" href={table.qrPath+"?mode=terminal"} target="_blank" rel="noopener noreferrer">매장 PC·태블릿에서 열기</a>
            <p className="mt-2 text-copy text-zinc-500">손님용 QR은 모바일 화면으로 열리고, 이 주소는 기기 크기에 맞춰 후불 주문만 사용합니다.</p>
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
              <form action={mutationAction}>
                <input type="hidden" name="menuSiteId" value={menuSiteId} />
                <input type="hidden" name="tableId" value={table.id} />
                <button name="intent" value="rotate-token" disabled={mutationPending} title="기존에 인쇄한 QR과 방문 세션이 즉시 무효화됩니다." className="site-button site-button-outline">
                  QR 교체
                </button>
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
    </div>
  );
}
