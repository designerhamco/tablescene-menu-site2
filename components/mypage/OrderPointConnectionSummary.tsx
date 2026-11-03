import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { formatTerminalDevice, type TerminalDeviceInfo } from "@/lib/terminal-device-info";

export type OrderPointConnectionState = { available: boolean; connections: { tableId: string; device: TerminalDeviceInfo | null }[] };
export default function OrderPointConnectionSummary({ menuSiteId, point, state }: {
  menuSiteId: string; point: { id: string; kind?: "table" | "kiosk" }; state?: OrderPointConnectionState;
}) {
  const kiosk = point.kind === "kiosk", devices = state?.connections.filter(item => item.tableId === point.id) ?? [];
  return <div className="site-stack-block site-content-divider">
    <div className="site-content-heading-row"><h4 className="type-item-title">{kiosk ? "연결된 키오스크 기기" : "연결된 태블릿"}</h4><Badge tone={state?.available && devices.length ? "active" : "neutral"}>{!state?.available ? "연결 확인 불가" : devices.length ? `기기 연결됨 · ${devices.length}대` : "미연결"}</Badge></div>
    {!state?.available ? <p className="type-body-sm site-copy-muted">연결 정보를 불러오지 못했습니다. 기기별 설정에서 다시 확인해 주세요.</p>
      : devices.length ? <ul className="site-stack-copy">{devices.map((connection, index) => <li key={index} className="type-body-sm break-words">{connection.device ? formatTerminalDevice(connection.device) : "기기 정보가 없는 이전 연결입니다."}</li>)}</ul>
        : <p className="type-body-sm site-copy-muted">이 {kiosk ? "키오스크" : "테이블"}에 연결된 매장 기기가 없습니다.</p>}
    <div className="site-action-row"><Link className="site-button site-button-outline" href={`/mypage/menus/${menuSiteId}/orders/settings?tab=devices#point-${point.id}`}>{devices.length ? "기기 연결 관리" : kiosk ? "키오스크 기기 연결" : "태블릿 연결"}</Link></div>
    <p className="type-footnote site-copy-muted">{kiosk ? "키오스크는 이 번호에 사용할 기기를 연결해야 합니다. 손님마다 다시 연결할 필요는 없습니다." : "손님 휴대폰·QR만 사용한다면 태블릿을 연결하지 않아도 됩니다. 키오스크는 별도 키오스크 번호에 기기를 연결해 사용합니다."}</p>
  </div>;
}
