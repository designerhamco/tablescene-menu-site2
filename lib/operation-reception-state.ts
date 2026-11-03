export function getOperationReceptionState({ feature, published, enabled, settingsKnown, runtimeEnabled, activeTablesReady, registeredTables, canRead }: {
  feature: "orders" | "calls";
  published: boolean;
  enabled: boolean;
  settingsKnown: boolean;
  runtimeEnabled: boolean;
  activeTablesReady: boolean | null;
  registeredTables: number | null;
  canRead: boolean;
}) {
  const label = feature === "orders" ? "주문" : "호출";
  const idle = `${label} 미사용`;
  const unavailable = `${label} 사용 불가`;
  if (!canRead) return { value: "확인 불가", reason: "권한 없음", detail: `${label} 현황을 확인할 권한이 없습니다.`, next: "none" as const, accepting: false };
  if (!published) return { value: unavailable, reason: "메뉴판 비공개", detail: `메뉴판을 공개한 뒤 ${label} 기능을 켤 수 있습니다.`, next: "publish" as const, accepting: false };
  if (!settingsKnown || activeTablesReady === null) return { value: "상태 확인 불가", reason: "조회 실패", detail: "설정을 불러오지 못했습니다. 새로고침해 주세요.", next: "none" as const, accepting: false };
  if (!runtimeEnabled) return { value: unavailable, reason: "사용 제한", detail: "현재 기능 연결과 이용권을 확인해 주세요.", next: "settings" as const, accepting: false };
  if (!activeTablesReady) return { value: unavailable, reason: registeredTables === 0 ? "테이블·키오스크 미등록" : "사용 중인 테이블·키오스크 없음", detail: registeredTables === 0 ? "테이블 또는 키오스크를 등록한 뒤 기능을 켤 수 있습니다." : "테이블 또는 키오스크를 사용 중으로 바꾼 뒤 기능을 켤 수 있습니다.", next: "tables" as const, accepting: false };
  return { value: enabled ? `${label} 접수 중` : idle, reason: null, detail: enabled ? `손님의 ${label}을 받고 있습니다.` : `전체 스위치를 켜면 ${label} 접수를 시작합니다.`, next: "manage" as const, accepting: enabled };
}
