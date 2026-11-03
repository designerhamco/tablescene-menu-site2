"use client";

import { useActionState } from "react";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import { mutateMenuTableAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import { LoadingState } from "@/app/components/ui/loading-state";
import { ContentPanel } from "@/app/components/ui/content-panel";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";

export default function OperationTerminalPanel({ menuSiteId }: { menuSiteId: string }) {
  const [state, action, pending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
  return (
    <ContentPanel aria-label="손님용 공용 단말 안내">
      <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />
      <div className="site-stack-title">
        <h2 className="type-content-title">매장 태블릿을 손님용으로 사용하나요?</h2>
        <p className="type-body-sm text-zinc-600">공용 단말은 테이블에 비치해 손님이 직접 후불 주문하는 태블릿입니다. 손님 개인 휴대폰으로 QR을 스캔하는 경우에는 연결할 필요가 없습니다.</p>
      </div>
      <ul className="type-body-sm site-stack-copy site-copy-list list-disc site-copy-muted">
        <li>손님용 태블릿에서 테이블 관리의 ‘이 기기를 공용 단말로 연결’을 누르세요. 그 브라우저만 관리자 로그아웃되고 손님용 주문 화면으로 이동합니다.</li>
        <li>사용 중에는 연결이 자동으로 갱신됩니다. 오래 사용하지 않아 연결이 만료되면 같은 태블릿에서 관리자 로그인 후 다시 연결해 주세요.</li>
        <li>연결 해제는 이 브라우저의 손님용 연결만 종료합니다. 다른 기기의 연결이나 이미 접수된 주문은 유지되며, 손님 교체와 계산 완료는 별도로 처리해야 합니다.</li>
      </ul>
      <form action={action} className="site-stack-copy" aria-busy={pending}>
        <input type="hidden" name="menuSiteId" value={menuSiteId} />
        <p className="type-body-sm text-zinc-500">이 브라우저를 손님용으로 사용하다가 관리용으로 되돌릴 때 연결을 해제해 주세요.</p>
        <div><button name="intent" value="unregister-terminal" disabled={pending} className="site-button site-button-outline">이 브라우저의 단말 연결 해제</button></div>
        {pending ? <LoadingState inline label="단말 연결을 해제하고 있습니다." /> : null}
        {state.status !== "idle" ? <ContentPanel as="div" surface="notice" density="compact" role="status"><p className="type-body-sm">{state.message}</p></ContentPanel> : null}
      </form>
    </ContentPanel>
  );
}
