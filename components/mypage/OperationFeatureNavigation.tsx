import { NavigationTabs } from "@/app/components/ui/navigation-tabs";

export default function OperationFeatureNavigation({ menuId, feature, settings = false, historyAvailable, canConfigure }: {
  menuId: string;
  feature: "orders" | "calls";
  settings?: boolean;
  historyAvailable: boolean;
  canConfigure: boolean;
}) {
  const label = feature === "orders" ? "주문" : "호출";
  const path = `/mypage/menus/${menuId}/${feature}`;
  return <NavigationTabs label={`${label}관리 화면`} purpose="page" items={[
    { label: `${label} 내역`, href: path, active: !settings, disabledReason: historyAvailable ? undefined : "운영 연결이 완료되면 이용할 수 있습니다.", disabledLabel: "연결 전" },
    { label: `${label} 설정`, href: `${path}/settings`, active: settings, disabledReason: canConfigure ? undefined : "사장 계정만 설정을 변경할 수 있습니다." },
  ]} />;
}
