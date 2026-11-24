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
      canEnable={runtimeEnabled} activeTablesReady={activeTablesReady} action={<span className="type-label">주문 시작</span>} />;
  }
  return <label className="site-action-row type-label" data-wrap="nowrap">
    주문 시작
    <Switch checked={orderEnabled === true && runtimeEnabled && activeTablesReady === true && published} disabled
      title={orderEnabled === null ? "주문 시작 상태 확인 불가" : undefined} />
  </label>;
}
