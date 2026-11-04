import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { ContentPanel } from "@/app/components/ui/content-panel";

export default function OperationTableSetupNotice({ menuId, tableSetupAvailable, activeTablesReady, canManageTables }: {
  menuId: string;
  tableSetupAvailable: boolean;
  activeTablesReady: boolean | null;
  canManageTables: boolean;
}) {
  if (activeTablesReady) return null;
  return (
    <ContentPanel as="aside" surface="notice" density="compact" aria-label="테이블 설정 안내" role="note">
      <div className="site-notice-layout">
      <span className="site-indicator-icon" data-icon-surface="colored"><TriangleAlert className="h-5 w-5" aria-hidden="true" /></span>
      <div className="site-stack-title">
        <h2 className="type-content-title">{activeTablesReady === null ? "테이블 상태를 확인해 주세요" : "먼저 테이블 또는 키오스크를 준비해 주세요"}</h2>
        <p className="type-body-sm site-copy-muted">
          {!tableSetupAvailable
            ? "테이블 기능 연결 후 테이블을 등록·활성화하면 주문과 호출을 각각 켤 수 있습니다. 대표 QR은 지금도 메뉴판 공유에 사용할 수 있습니다."
            : activeTablesReady === null
              ? "테이블 상태를 불러오지 못했습니다. 관리 화면에서 다시 확인해 주세요. 기존 주문·호출 내역은 계속 확인할 수 있습니다."
              : "사용 중인 테이블·키오스크가 없어 주문과 호출을 켤 수 없습니다. 테이블·키오스크 관리에서 등록하거나 비활성 상태를 사용 중으로 바꿔 주세요. 기존 주문·호출 내역은 계속 확인할 수 있습니다."}
          {!canManageTables ? " 테이블 설정은 사장님 또는 테이블 관리 권한이 있는 직원에게 요청해 주세요." : ""}
        </p>
        {canManageTables ? <div className="site-action-row"><Link href={`/mypage/menus/${menuId}/tables`} className="site-button site-button-primary">테이블·키오스크 관리로 이동</Link></div> : null}
      </div>
      </div>
    </ContentPanel>
  );
}
