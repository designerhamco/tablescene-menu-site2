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
          "후불 주문 사용",
          "공개된 판매 가능 상품을 담고 후불로 주문합니다. 품절·숨김 상품은 제외되며 코스는 전체 단위로 주문합니다.",
        ],
        [
          "mobilePrepayVisible",
          "모바일 선결제 버튼 표시",
          "고객용 QR 화면에 선결제를 준비 중으로 표시합니다. 아직 결제할 수 없습니다.",
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
      {section === "orders" ? <p className="mt-6 text-copy leading-relaxed text-zinc-500">
        매장 PC·태블릿은 후불 주문만 제공합니다. 실제 접수는 운영 연결이 완료된
        테스트 매장부터 사용할 수 있습니다.
      </p> : null}
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
