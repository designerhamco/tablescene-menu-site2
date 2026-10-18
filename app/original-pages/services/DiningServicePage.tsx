import Link from "next/link";
export default function DiningServicePage() {
  return (
    <div
      data-service-page="dining"
      className="bg-white pb-24 pt-36"
    >
      <div className="site-container">
        <p className="site-eyebrow">스페셜 다이닝 플랜</p>
        <h1 className="type-page-title mt-5">
          메뉴를 넘어
          <br />
          매장의 이야기를 담는 다이닝
        </h1>
        <p className="site-body mt-6 max-w-2xl text-zinc-500">
          사진과 코스, 상세 설명을 여러 페이지로 구성하세요. 매장 분위기를 담은
          디자인에 테이블 주문과 직원 호출을 더할 수 있습니다.
        </p>
        <Link
          className="site-button site-button-primary mt-8"
          href="/apply?plan=dining"
        >
          다이닝 디자인 템플릿 보기
        </Link>
        <div className="mt-16 overflow-hidden rounded-[var(--ui-radius-hero)] bg-zinc-100">
          <img
            src="/menu-templates/dining_aube_table_a/aube-table-cover.png"
            alt="다이닝 메뉴판 디자인"
            className="max-h-[660px] w-full object-cover"
          />
        </div>
        <div className="grid gap-12 py-16 md:grid-cols-3">
          {[
            [
              "사진과 코스",
              "커버부터 메뉴 페이지까지 매장의 흐름에 맞춰 구성합니다.",
            ],
            [
              "테이블 주문과 호출",
              "옵션·수량을 선택해 담고 후불로 주문하는 흐름을 준비하고 있습니다.",
            ],
            [
              "모든 기기에서",
              "매장 태블릿과 고객 휴대폰에 맞는 화면으로 보여줍니다.",
            ],
          ].map(([title, body]) => (
            <section key={title}>
              <h2 className="type-subsection-title">{title}</h2>
              <p className="site-body mt-4 text-zinc-500">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
