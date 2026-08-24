import Link from "next/link";
import { BellRing, CheckCircle2, CreditCard, QrCode, ShoppingCart } from "lucide-react";

const verifiedFeatures = [
  {
    icon: QrCode,
    title: "테이블 QR 방문",
    description: "테이블별 QR로 메뉴판을 열고 유효한 방문 세션을 확인하는 흐름을 준비했습니다.",
  },
  {
    icon: ShoppingCart,
    title: "장바구니·후불 주문",
    description: "상품 옵션, 수량 변경, 삭제와 카운터 후불 주문 접수 화면을 확인할 수 있습니다.",
  },
  {
    icon: BellRing,
    title: "직원 호출",
    description: "기본 호출 항목 1건의 접수와 매장 대시보드 확인 흐름을 준비했습니다.",
  },
  {
    icon: CreditCard,
    title: "주문 운영 화면",
    description: "주문 상태 처리, 수동 카드·현금 결제 기록과 매출 요약 화면을 준비했습니다.",
  },
] as const;

export default function OrderServiceReviewContent() {
  return (
    <div className="bg-zinc-50 text-zinc-950">
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-600 shadow-sm">
            출시 준비 중 · 실제 주문/결제 미제공
          </span>
          <h1 className="mt-7 max-w-4xl break-keep text-5xl font-black tracking-tight md:text-7xl">
            아티메뉴 오더
          </h1>
          <p className="mt-6 max-w-3xl break-keep text-lg font-semibold leading-relaxed text-zinc-600 md:text-xl">
            QR 메뉴판에서 상품을 담고 매장에 주문하는 흐름을 준비하고 있습니다. 현재는 기능과 화면을 검증하는 단계이며,
            고객의 실제 선결제와 음식점 정산은 제공하지 않습니다.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/templates/cafe_design_a/preview?orderCallQa=active"
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-4 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              주문·호출 화면 미리보기
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-6 py-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-100"
            >
              현재 판매 상품 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-zinc-500">준비된 범위</p>
            <h2 className="mt-2 break-keep text-3xl font-black tracking-tight md:text-4xl">검증 중인 주문 운영 기능</h2>
            <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              아래 항목은 개발·QA 중인 기능입니다. 매장별 설정, 실제 계정 권한과 운영 데이터에 대한 최종 검증이 끝난 뒤 정식 제공 범위를 확정합니다.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {verifiedFeatures.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-7">
                <Icon className="h-6 w-6" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] bg-zinc-950 p-8 text-white md:grid-cols-[1fr_1.2fr] md:p-12">
          <div>
            <p className="text-sm font-black text-zinc-400">정식 제공 전 필수 단계</p>
            <h2 className="mt-3 break-keep text-3xl font-black tracking-tight">결제·정산은 계약 후 별도 출시합니다</h2>
          </div>
          <ul className="space-y-4 text-sm font-semibold leading-relaxed text-zinc-300">
            {[
              "PG사 전자결제 계약과 중개 플랫폼 심사",
              "KG이니시스 신버전 AML 지급대행 특약 및 음식점 온보딩 기준 확정",
              "실결제·취소·환불·지급·대사 테스트",
              "음식점별 주문 운영과 직원 권한 Production E2E",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
