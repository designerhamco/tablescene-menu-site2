"use client";
import { useActionState, useState } from "react";
import type { MenuOrderSettings, MenuOrderSettingsSection } from "@/lib/menu-order-settings";
import { updateOrderSettings, type OrderSettingsState } from "./actions";
export default function OrderSettingsForm({
  menuId,
  settings,
  runtime,
  section,
  activeTablesReady,
}: {
  menuId: string;
  settings: MenuOrderSettings;
  section: MenuOrderSettingsSection;
  activeTablesReady: boolean | null;
  runtime: {calls:boolean;orders:boolean};
}) {
  const featureKey = section === "orders" ? "orderEnabled" : "callEnabled";
  const [featureEnabled, setFeatureEnabled] = useState(settings[featureKey]);
  const [customerCheckout,setCustomerCheckout]=useState(settings.customerCheckout ?? (settings.mobilePrepayVisible ? "both" : "postpay"));
  const [state, action, pending] = useActionState(updateOrderSettings, {
    status: "idle",
    message: "",
  } as OrderSettingsState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="menuId" value={menuId} />
      <input type="hidden" name="section" value={section} />
      <h3 className="type-content-title">{section === "orders" ? "주문 사용 설정" : "호출 사용 설정"}</h3>
      <p className="site-notice mb-4" role="status">
        {section === "calls"
          ? runtime.calls ? "직원 호출이 연결되어 있습니다. 테이블별 QR로 접속한 손님이 사용할 수 있습니다." : "호출 항목은 미리 준비할 수 있습니다. 사용 ON은 활성 테이블이 있을 때 설정하며 실제 호출은 운영 연결 후 사용할 수 있습니다."
          : runtime.orders ? "후불 주문이 연결되어 있습니다." : "주문은 메뉴판에 공개된 상품과 가격을 사용합니다. 사용 ON은 활성 테이블이 있을 때 설정하며 실제 주문은 운영 연결 후 사용할 수 있습니다."}
      </p>
      {!activeTablesReady ? <p id="table-setup-required" className="type-body-sm text-zinc-600">
        {activeTablesReady === null ? "테이블 상태를 확인한 뒤 기능을 켤 수 있습니다." : "활성 테이블을 준비한 뒤 기능을 켤 수 있습니다."} 이미 켜진 기능을 OFF로 바꾸는 것은 가능합니다.
      </p> : null}
      {(section === "calls" ? [
        ["callEnabled", "직원 호출 사용", "테이블에서 직원을 호출합니다."],
      ] : [
        [
          "orderEnabled",
          "주문 기능 사용",
          "공개된 판매 가능 상품을 담고 후불로 주문합니다. 품절·숨김 상품은 제외되며 코스는 전체 단위로 주문합니다.",
        ],
      ]).map(([key, label, description]) => (
        <label
          key={key}
          className="flex items-start gap-4 border-b border-zinc-200 py-6"
        >
          <input
            className="mt-1 h-5 w-5 accent-black"
            type="checkbox"
            name={key}
            {...(key === featureKey ? {
              checked: featureEnabled,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFeatureEnabled(event.target.checked),
              disabled: !activeTablesReady && !featureEnabled,
              "aria-describedby": !activeTablesReady ? "table-setup-required" : undefined,
            } : { defaultChecked: Boolean(settings[key as keyof MenuOrderSettings]) })}
          />
          <span>
            <span className="block font-semibold">{label}</span>
            <span className="mt-2 block text-copy leading-relaxed text-zinc-500">
              {description}
            </span>
          </span>
        </label>
      ))}
      {section === "orders" ? <>
        <fieldset className="space-y-4 py-4">
          <legend className="type-content-title">고객 개인 기기</legend>
          <p className="type-body-sm text-zinc-500">고객용 테이블 링크로 접속한 기기에 적용됩니다. 화면 크기와 회전에 따라 결제 방식이 바뀌지 않습니다.</p>
          <label className="block space-y-2"><span className="type-body-sm">결제 방식</span>
            <select className="site-field w-full" name="customerCheckout" value={customerCheckout} onChange={event=>setCustomerCheckout(event.target.value as typeof customerCheckout)}>
              <option value="off">고객 개인 기기 주문 OFF</option>
              <option value="postpay">후결제만</option><option value="prepay">선결제만 · 준비 중</option><option value="both">선결제 / 후결제</option>
            </select>
          </label>
          {customerCheckout==="prepay" ? <p className="site-notice" role="status">실제 선결제는 아직 준비 중입니다. 선결제만 선택하면 개인 기기의 실제 주문을 받을 수 없습니다. 공용 단말 설정은 별도로 적용됩니다.</p> : null}
          <label className="block space-y-2"><span className="type-body-sm">휴대폰 번호 입력</span>
            <select className="site-field w-full" name="customerPhone" defaultValue={settings.customerPhone ?? "required"}>
              <option value="required">필수 입력</option><option value="optional">선택 입력</option><option value="hidden">입력란 숨김</option>
            </select>
          </label>
          <p className="type-body-sm text-zinc-500">개인 기기에서만 주문마다 입력란을 표시합니다. 이전 번호를 자동 입력하며 다른 번호로 바꿀 수 있습니다.</p>
          <p className="type-body-sm text-zinc-500">주문 권한 1시간 · 만료 5분 전 연장 안내 · 완전 만료 후 QR 재스캔 · 같은 브라우저의 내역 확인 24시간</p>
        </fieldset>
        <fieldset className="space-y-4 border-t border-zinc-200 py-4">
          <legend className="type-content-title">매장 공용 단말</legend>
          <label className="flex items-start gap-3"><input className="mt-1 h-5 w-5 accent-black" type="checkbox" name="terminalOrderEnabled" defaultChecked={settings.terminalOrderEnabled!==false}/><span>공용 단말 후결제 사용</span></label>
          <p className="type-body-sm text-zinc-500">전화번호를 받지 않습니다. 테이블 관리에서 이 브라우저를 공용 단말로 연결할 수 있습니다.</p>
          <p className="type-body-sm text-zinc-500">장바구니가 있는 상태로 10분간 조작하지 않으면 미주문 상품만 비웁니다. 1분 전에 안내하며 이미 접수된 주문은 유지합니다.</p>
        </fieldset>
        <section className="space-y-3 rounded-xl bg-zinc-100 p-5" aria-label="알림톡 설정 준비">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="type-content-title">조리 완료 알림톡</h3><span className="type-body-sm text-zinc-500">연동 준비 중</span></div>
          <p className="type-body-sm text-zinc-600">개인 기기로 주문할 때 입력한 번호로 조리 완료를 안내할 예정입니다. 현재는 카카오 연결 및 실제 발송을 제공하지 않습니다.</p>
          <label className="flex gap-3 text-zinc-500"><input type="checkbox" disabled/>알림톡 사용 · 준비 중</label>
          <div className="rounded-xl bg-white p-4"><p className="type-body-sm font-medium">메시지 미리보기</p><p className="mt-2 type-body-sm">주문하신 메뉴가 준비되었습니다. 픽업대에서 받아 주세요.</p></div>
        </section>
      </> : null}
      <button
        className="site-button site-button-primary mt-8"
        disabled={pending}
      >
        {pending ? "저장 중…" : section === "orders" ? "주문 설정 저장" : "호출 설정 저장"}
      </button>
      {state.message ? (
        <p role="status" className="mt-4 text-copy">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
