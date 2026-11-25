import HelpTooltip from "@/components/ui/HelpTooltip";
import { Switch } from "@/app/components/ui/switch";
import { loadOperationReceptionSummary } from "@/lib/server/menu-order-settings-service";
import OperationFeatureToggle from "./OperationFeatureToggle";

export default async function OrderReceptionControl({ menuId, canConfigure, published, activeTablesReady }: {
  menuId: string;
  canConfigure: boolean;
  published: boolean;
  activeTablesReady: boolean | null;
}) {
  const summary = await loadOperationReceptionSummary(menuId).catch(() => null);
  const orderEnabled = summary?.orderEnabled ?? null;
  const runtimeEnabled = summary?.runtime.orders ?? false;
  if (canConfigure && orderEnabled !== null) {
    return <OperationFeatureToggle menuId={menuId} feature="orders" enabled={orderEnabled} published={published}
      canEnable={runtimeEnabled} activeTablesReady={activeTablesReady} toolbarLabel="주문 시작" />;
  }
  const reason = orderEnabled === null ? "주문 시작 상태를 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요." : "주문 설정을 변경할 권한이 필요합니다.";
  const reasonId = `order-reception-${menuId}-reason`;
  return <div className="site-action-row" data-wrap="nowrap">
    <label className="site-action-row type-label whitespace-nowrap" data-wrap="nowrap">
      주문 시작
      <Switch size="sm" checked={orderEnabled === true && runtimeEnabled && activeTablesReady === true && published}
        disabled aria-describedby={reasonId} />
    </label>
    <span id={reasonId} className="sr-only">{reason}</span>
    <HelpTooltip label="주문 시작 도움말" side="bottom" align="end" hover><p>{reason}</p></HelpTooltip>
  </div>;
}
