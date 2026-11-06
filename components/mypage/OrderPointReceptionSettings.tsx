import Link from "next/link";
import type { OrderPointDeviceSettings } from "@/lib/terminal-device-info";
import OrderPointDeviceConnection from "./OrderPointDeviceConnection";
import { ContentPanel } from "@/app/components/ui/content-panel";
import type { MenuTableListItem } from "@/lib/menu-table-validation";
import type { MenuOrderSettings } from "@/lib/menu-order-settings";
import { DEFAULT_ORDER_POINT_POLICY, type OrderPointChannel, type OrderPointFeature } from "@/lib/order-point-policy";
import OrderPointFeatureToggle from "./OrderPointFeatureToggle";

type ReceptionPoint = Pick<MenuTableListItem, "id" | "label" | "status" | "kind" | "policy" | "policyAvailable">;

/** Both settings pages use the same registered points and channel policies. */
export default function OrderPointReceptionSettings({ menuSiteId, feature, points, settings, runtime, published, deviceSetup = null, canManageQr = false, readOnly = false }: {
  menuSiteId: string;
  feature: OrderPointFeature;
  points: ReceptionPoint[] | null;
  settings: Omit<MenuOrderSettings, "orderEnabled" | "callEnabled"> & { orderEnabled: boolean | null; callEnabled: boolean | null };
  runtime: boolean;
  published: boolean;
  deviceSetup?: OrderPointDeviceSettings | null;
  canManageQr?: boolean;
  readOnly?: boolean;
}) {
  const label = feature === "orders" ? "주문" : "호출";
  const globalEnabled = feature === "orders" ? settings.orderEnabled : settings.callEnabled;
  const manageLink = <><Link href={`/mypage/menus/${menuSiteId}/tables`} className="site-button site-button-outline">테이블·키오스크 관리</Link></>;

  function channelControl(point: ReceptionPoint, channel: OrderPointChannel) {
    const reason = !point.policyAvailable ? "방식별 설정을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요."
      : !published ? "메뉴판을 공개하면 사용할 수 있습니다."
          : !runtime ? `${label} 기능을 현재 사용할 수 없습니다.`
            : globalEnabled == null ? `전체 ${label} 설정을 확인할 수 없습니다.`
            : !globalEnabled ? `${label} 설정${feature === "orders" ? " 탭" : ""}에서 전체 ${label}을 켜고 저장해 주세요.`
              : feature === "orders" && channel === "terminal" && settings.terminalOrderEnabled === false ? "전체 주문 설정에서 매장 공용 단말 후결제를 허용하고 저장해 주세요."
                : feature === "orders" && channel === "customer" && ["off", "prepay"].includes(settings.customerCheckout ?? "postpay") ? "전체 주문 설정에서 손님 휴대폰의 후결제를 허용하고 저장해 주세요." : null;
    return <ContentPanel surface="muted">
      <h6 className="type-item-title">{channel === "customer" ? "손님 휴대폰·QR" : point.kind === "kiosk" ? "키오스크 기기" : "매장 태블릿"}</h6>
      <OrderPointFeatureToggle menuSiteId={menuSiteId} tableId={point.id} label={point.label} channel={channel}
        feature={feature} pointStatus={point.status} policy={point.policy ?? DEFAULT_ORDER_POINT_POLICY} disabledReason={reason} readOnly={readOnly} />
      {channel === "terminal" && deviceSetup ? <OrderPointDeviceConnection menuSiteId={menuSiteId} point={point} published={published} setup={deviceSetup} /> : null}
    </ContentPanel>;
  }

  return <section className="site-stack-group" aria-label={`테이블·키오스크별 ${label} 허용`}>
    <div className="site-stack-title">
      <h3 className="type-subsection-title">테이블·키오스크별 {label} 허용</h3>
      <p className="type-body-sm site-copy-muted">전체 {label}이 켜져 있을 때, 아래에서 받을 곳과 사용 방식을 정할 수 있습니다. 개별 스위치는 변경 즉시 저장됩니다.</p>
      <p className="type-body-sm site-copy-muted">태블릿과 손님 휴대폰·QR은 같은 테이블 번호를 사용하며, {label} 허용은 각각 설정할 수 있습니다. 기존 {label} 내역은 유지됩니다.</p>
    </div>
    {points === null ? <ContentPanel surface="notice" density="compact">
      <p className="type-body-sm">테이블·키오스크 설정을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요. 기존 허용 설정은 유지됩니다.</p>
    </ContentPanel> : !points.length ? <ContentPanel>
      <div className="site-stack-title"><h4 className="type-content-title">등록된 테이블·키오스크가 없습니다</h4><p className="type-body-sm site-copy-muted">테이블·키오스크 관리에서 먼저 등록해 주세요. 등록한 항목이 이곳에도 함께 표시됩니다.</p></div>
      <div className="site-action-row">{manageLink}</div>
    </ContentPanel> : <>
      {(["table", "kiosk"] as const).map(kind => {
        const group = points.filter(point => (point.kind ?? "table") === kind);
        if (!group.length) return null;
        return <div key={kind} className="site-stack-block">
          <h4 className="type-content-title">{kind === "table" ? "테이블" : "키오스크"} · {group.length.toLocaleString("ko-KR")}개</h4>
          {group.map(point => <ContentPanel as="article" id={`point-${point.id}`} key={point.id} aria-label={`${point.label} ${label} 설정`}>
            <div className="site-content-heading-row"><h5 className="type-content-title break-words">{point.label}</h5></div>
            <div className={kind === "table" ? "site-card-grid xl:grid-cols-2" : "site-stack-block"}>
              {channelControl(point, "terminal")}
              {kind === "table" ? channelControl(point, "customer") : null}
            </div>
          </ContentPanel>)}
        </div>;
      })}
      <div className="site-action-row">{manageLink}{canManageQr ? <Link href={`/mypage/menus/${menuSiteId}/qr`} className="site-button site-button-outline">QR 관리</Link> : null}</div>
    </>}
  </section>;
}
