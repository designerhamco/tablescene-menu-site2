import Link from "next/link";

export default function OperationTableSetupNotice({ menuId, tableSetupAvailable, activeTablesReady, canManageTables }: {
  menuId: string;
  tableSetupAvailable: boolean;
  activeTablesReady: boolean | null;
  canManageTables: boolean;
}) {
  if (activeTablesReady) return null;
  return (
    <aside className="site-section mb-6 p-5 sm:p-6" aria-label="테이블 설정 안내">
      <h2 className="type-content-title">{activeTablesReady === null ? "테이블 상태를 확인해 주세요" : "먼저 테이블을 준비해 주세요"}</h2>
      <p className="type-body-sm mt-3 max-w-3xl break-keep text-zinc-600">
        {!tableSetupAvailable
          ? "테이블 기능 연결 후 테이블을 등록·활성화하면 주문과 호출을 각각 켤 수 있습니다. 대표 QR은 지금도 메뉴판 공유에 사용할 수 있습니다."
          : activeTablesReady === null
            ? "테이블 상태를 불러오지 못했습니다. 관리 화면에서 다시 확인해 주세요. 기존 주문·호출 내역은 계속 확인할 수 있습니다."
            : "활성 테이블이 있어야 주문과 호출을 켤 수 있습니다. 기존 내역은 계속 확인할 수 있으며 두 기능은 각각 켜고 끌 수 있습니다."}
        {!canManageTables ? " 테이블 설정은 사장님 또는 테이블 관리 권한이 있는 직원에게 요청해 주세요." : ""}
      </p>
      {canManageTables ? <Link href={`/mypage/menus/${menuId}/tables`} className="site-button site-button-primary mt-4">테이블 관리로 이동</Link> : null}
    </aside>
  );
}
