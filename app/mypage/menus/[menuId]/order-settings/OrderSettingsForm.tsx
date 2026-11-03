"use client";
import { useActionState, useState } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Switch } from "@/app/components/ui/switch";
import type { MenuOrderSettings, MenuOrderSettingsSection } from "@/lib/menu-order-settings";
import { updateOrderSettings, type OrderSettingsState } from "./actions";
export default function OrderSettingsForm({
  menuId,
  settings,
  runtime,
  section,
  activeTablesReady,
  published,
}: {
  menuId: string;
  settings: MenuOrderSettings;
  section: MenuOrderSettingsSection;
  activeTablesReady: boolean | null;
  published: boolean;
  runtime: {calls:boolean;orders:boolean};
}) {
  const featureKey = section === "orders" ? "orderEnabled" : "callEnabled";
  const [featureEnabled, setFeatureEnabled] = useState(published && settings[featureKey]);
  const [customerCheckout,setCustomerCheckout]=useState(settings.customerCheckout ?? (settings.mobilePrepayVisible ? "both" : "postpay"));
  const [state, action, pending] = useActionState(updateOrderSettings, {
    status: "idle",
    message: "",
  } as OrderSettingsState);
  return (
    <form action={action} className="site-stack-group">
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="section" value={section} />
      <h3 className="type-content-title">{section === "orders" ? "전체 주문 설정" : "전체 호출 설정"}</h3>
      <ContentPanel as="aside" surface="notice" density="compact">
      <p id={!published ? "publication-required" : undefined} className="type-body-sm" role="status">
        {!published ? "현재 메뉴판이 비공개이므로 주문·호출은 OFF입니다. 옵션과 호출 항목은 미리 준비할 수 있으며, 메뉴판을 공개한 뒤 기능을 켜 주세요."
          : section === "calls"
            ? runtime.calls ? "사용 중인 테이블·키오스크에서 직원 호출을 받을 수 있습니다. 아래에서 사용 여부를 설정해 주세요." : "호출 항목은 미리 준비할 수 있습니다. 기능 연결 상태와 사용 중인 테이블·키오스크를 확인한 뒤 켜 주세요."
            : runtime.orders ? "사용 중인 테이블·키오스크에서 후불 주문을 받을 수 있습니다. 아래에서 사용 여부를 설정해 주세요." : "주문 옵션은 미리 준비할 수 있습니다. 기능 연결 상태와 사용 중인 테이블·키오스크를 확인한 뒤 켜 주세요."}
      </p>
      </ContentPanel>
      {!activeTablesReady ? <p id="table-setup-required" className="type-body-sm site-copy-muted">
        {activeTablesReady === null ? "테이블·키오스크 상태를 확인한 뒤 기능을 켤 수 있습니다." : "사용 중인 테이블·키오스크를 준비한 뒤 기능을 켤 수 있습니다."} 이미 켜진 기능을 OFF로 바꾸는 것은 가능합니다.
      </p> : null}
      {(section === "calls" ? [
        ["callEnabled", "전체 호출 사용", "모든 테이블·키오스크의 호출을 함께 켜거나 끕니다. 개별 허용은 아래에서 설정할 수 있습니다."],
      ] : [
        [
          "orderEnabled",
          "전체 주문 사용",
          "모든 테이블·키오스크의 주문을 함께 켜거나 끕니다. 개별 허용은 ‘기기별 설정’ 탭에서 설정할 수 있습니다.",
        ],
      ]).map(([key, label, description]) => (
        <label
          key={key}
          className="site-action-row site-content-divider" data-distribution="between"
        >
          <span className="site-stack-copy min-w-0 flex-1">
            <span className="type-label">{label}</span>
            <span className="type-body-sm site-copy-muted">
              {description}
            </span>
          </span>
          <Switch
            name={key}
            {...(key === featureKey ? {
              checked: published && activeTablesReady === true && featureEnabled,
              onCheckedChange: setFeatureEnabled,
              disabled: pending || !published || activeTablesReady !== true || (!runtime[section] && !featureEnabled),
              "aria-describedby": !published ? "publication-required" : !activeTablesReady ? "table-setup-required" : undefined,
            } : { defaultChecked: Boolean(settings[key as keyof MenuOrderSettings]) })}
          />
        </label>
      ))}
      {section === "orders" ? <>
        <section className="site-stack-block" aria-label="손님 휴대폰·QR 주문 옵션">
          <div className="site-stack-title"><h4 className="type-content-title">손님 휴대폰·QR</h4>
          <p className="type-body-sm site-copy-muted">모든 테이블의 손님 휴대폰·QR 주문에 적용됩니다. 화면 크기와 회전에 따라 결제 방식이 바뀌지 않습니다.</p></div>
          <label className="site-field-stack"><span className="type-label">결제 방식</span>
            <select className="site-field w-full" name="customerCheckout" value={customerCheckout} onChange={event=>setCustomerCheckout(event.target.value as typeof customerCheckout)}>
              <option value="off">고객 개인 기기 주문 OFF</option>
              <option value="postpay">후결제만</option><option value="prepay">선결제만 · 준비 중</option><option value="both">선결제 / 후결제</option>
            </select>
          </label>
          {customerCheckout==="prepay" ? <ContentPanel as="aside" surface="notice" density="compact"><p className="type-body-sm" role="status">실제 선결제는 아직 준비 중입니다. 선결제만 선택하면 개인 기기의 실제 주문을 받을 수 없습니다. 공용 단말 설정은 별도로 적용됩니다.</p></ContentPanel> : null}
          <label className="site-field-stack"><span className="type-label">휴대폰 번호 입력</span>
            <select className="site-field w-full" name="customerPhone" defaultValue={settings.customerPhone ?? "required"}>
              <option value="required">필수 입력</option><option value="optional">선택 입력</option><option value="hidden">입력란 숨김</option>
            </select>
          </label>
          <p className="type-body-sm site-copy-muted">손님 휴대폰에서 주문마다 입력란을 표시합니다. 이전 번호를 자동 입력하며 다른 번호로 바꿀 수 있습니다.</p>
          <p className="type-body-sm site-copy-muted">주문 권한 1시간 · 만료 5분 전 연장 안내 · 완전 만료 후 QR 재스캔 · 같은 브라우저의 내역 확인 24시간</p>
        </section>
        <section className="site-stack-block site-content-divider" aria-label="매장 공용 단말 주문 옵션">
          <h4 className="type-content-title">매장 공용 단말</h4>
          <label className="site-action-row" data-distribution="between"><span className="type-label">모든 매장 기기 후결제 허용</span><Switch name="terminalOrderEnabled" defaultChecked={settings.terminalOrderEnabled!==false} disabled={pending} /></label>
          <p className="type-body-sm site-copy-muted">전화번호를 받지 않습니다. ‘기기별 설정’ 탭에서 사용할 기기를 연결할 수 있습니다.</p>
          <p className="type-body-sm site-copy-muted">장바구니가 있는 상태로 마지막 조작 후 2분간 사용하지 않으면 미주문 상품만 비웁니다. 30초 전에 안내하며 ‘계속 이용하기’를 누르면 다시 2분 동안 이용할 수 있습니다. 이미 접수된 주문은 유지합니다.</p>
        </section>
        <ContentPanel surface="muted" aria-label="알림톡 설정 준비">
          <div className="site-content-heading-row"><h3 className="type-content-title">조리 완료 알림톡</h3><span className="type-body-sm site-copy-muted">연동 준비 중</span></div>
          <p className="type-body-sm site-copy-muted">개인 기기로 주문할 때 입력한 번호로 조리 완료를 안내할 예정입니다. 현재는 카카오 연결 및 실제 발송을 제공하지 않습니다.</p>
          <label className="site-action-row type-label site-copy-muted"><Switch disabled />알림톡 사용 · 준비 중</label>
          <div className="site-stack-copy"><p className="type-label">메시지 미리보기</p><p className="type-body-sm">주문하신 메뉴가 준비되었습니다. 픽업대에서 받아 주세요.</p></div>
        </ContentPanel>
      </> : null}
      <div className="site-action-row">
      <button
        className="site-button site-button-primary"
        disabled={pending}
      >
        {pending ? "저장 중…" : section === "orders" ? "주문 설정 저장" : "호출 설정 저장"}
      </button>
      </div>
      {state.message ? (
        <p role="status" className="type-body-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
