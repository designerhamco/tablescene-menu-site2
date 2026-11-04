import { NavigationTabs } from "@/app/components/ui/navigation-tabs";

export default function OperationFeatureNavigation({ menuId, feature, settings = false, historyAvailable, canConfigure, canManageDevices = false, panel = "settings", callItemsAvailable = canConfigure || historyAvailable }: {
  menuId: string;
  feature: "orders" | "calls";
  settings?: boolean;
  historyAvailable: boolean;
  canConfigure: boolean;
  canManageDevices?: boolean;
  panel?: "settings" | "items" | "devices" | "payments";
  callItemsAvailable?: boolean;
}) {
  const label = feature === "orders" ? "주문" : "호출";
  const path = `/mypage/menus/${menuId}/${feature}`;
  return <NavigationTabs label={`${label}관리 화면`} purpose="page" items={[
    { label: `${label} 내역`, href: path, active: !settings, disabledReason: historyAvailable ? undefined : "운영 연결이 완료되면 이용할 수 있습니다.", disabledLabel: "연결 전" },
    { label: `${label} 설정`, href: `${path}/settings`, active: settings && panel === "settings", disabledReason: canConfigure || canManageDevices || historyAvailable ? undefined : "관리 또는 알림 설정 권한이 필요합니다." },
    ...(feature === "orders" ? [{ label: "기기별 설정", href: `${path}/settings?tab=devices`, active: settings && panel === "devices", disabledReason: canConfigure || canManageDevices ? undefined : "테이블·기기 관리 권한이 필요합니다." }] : []),
    ...(feature === "orders" ? [{ label: "결제 단말기 연결", href: `${path}/settings?tab=payments`, active: settings && panel === "payments", disabledReason: canConfigure ? undefined : "결제 연결 준비 정보는 사장님만 관리할 수 있습니다." }] : []),
    ...(feature === "calls" ? [{ label: "호출 항목 설정", href: `${path}/settings?tab=items`, active: settings && panel === "items", disabledReason: callItemsAvailable ? undefined : "호출 항목 관리 권한이 필요합니다." }] : []),
  ]} />;
}
