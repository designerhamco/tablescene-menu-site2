"use client";
import { useActionState } from "react";
import type { MenuOrderSettings } from "@/lib/menu-order-settings";
import { updateOrderSettings, type OrderSettingsState } from "./actions";
export default function OrderSettingsForm({
  menuId,
  settings,
  courses,
  runtime,
}: {
  menuId: string;
  settings: MenuOrderSettings;
  runtime: {calls:boolean;orders:boolean};
  courses: { id: string; name: string; course_price: number | null }[];
}) {
  const [state, action, pending] = useActionState(updateOrderSettings, {
    status: "idle",
    message: "",
  } as OrderSettingsState);
  return (
    <form action={action} className="mt-10 max-w-2xl">
      <input type="hidden" name="menuId" value={menuId} />
      <p className="site-notice mb-4" role="status">
        {runtime.calls ? "직원 호출이 연결되어 있습니다. 테이블별 QR로 접속한 손님이 사용할 수 있습니다." : "호출 항목과 사용 여부를 미리 저장할 수 있습니다. 실제 호출은 운영 연결 후 테이블별 QR에서 사용할 수 있습니다."}
        {runtime.orders ? " 후불 주문이 연결되어 있습니다." : " 후불 주문 설정은 저장되며, 실제 주문은 운영 연결 후 사용할 수 있습니다."}
      </p>
      {[
        [
          "orderEnabled",
          "후불 주문 사용",
          "상품 담기·장바구니·후불 주문을 사용합니다.",
        ],
        ["callEnabled", "직원 호출 사용", "테이블에서 직원을 호출합니다."],
        [
          "mobilePrepayVisible",
          "모바일 선결제 버튼 표시",
          "고객용 QR 화면에 선결제를 준비 중으로 표시합니다. 아직 결제할 수 없습니다.",
        ],
      ].map(([key, label, description]) => (
        <label
          key={key}
          className="flex items-start gap-4 border-b border-zinc-200 py-6"
        >
          <input
            className="mt-1 h-5 w-5 accent-black"
            type="checkbox"
            name={key}
            defaultChecked={Boolean(settings[key as keyof MenuOrderSettings])}
          />
          <span>
            <span className="block font-semibold">{label}</span>
            <span className="mt-2 block text-sm leading-relaxed text-zinc-500">
              {description}
            </span>
          </span>
        </label>
      ))}
      {courses.length ? (
        <fieldset className="border-b border-zinc-200 py-6">
          <legend className="type-label">코스 전체 주문</legend>
          <p className="mt-2 text-sm text-zinc-500">
            체크한 코스를 하나의 상품으로 담습니다. 코스 구성 요리는 별도
            상품으로 주문하지 않습니다.
          </p>
          {courses.map((course) => (
            <label key={course.id} className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                name="orderableCourseId"
                value={course.id}
                defaultChecked={settings.orderableCourseIds.includes(course.id)}
              />
              {course.name} · {course.course_price?.toLocaleString("ko-KR")}원
            </label>
          ))}
        </fieldset>
      ) : null}
      <p className="mt-6 text-sm leading-relaxed text-zinc-500">
        매장 PC·태블릿은 후불 주문만 제공합니다. 실제 접수는 운영 연결이 완료된
        테스트 매장부터 사용할 수 있습니다.
      </p>
      <button
        className="site-button site-button-rounded site-button-primary mt-8"
        disabled={pending}
      >
        {pending ? "저장 중…" : "설정 저장"}
      </button>
      {state.message ? (
        <p role="status" className="mt-4 text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
