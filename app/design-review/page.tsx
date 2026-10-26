import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_DESIGN_REVIEWS, MENU_LAYOUTS, getDefaultDesignReviewUrl } from "@/lib/menu-design-policy";

export const metadata: Metadata = { title: "기본 디자인 검토 | ArtiMenu", robots: { index: false, follow: false } };

export default function DesignReviewPage() {
  return <main className="mx-auto max-w-5xl px-6 py-24">
    <p className="text-copy text-zinc-500">기본 디자인 · 유형별 미리보기</p>
    <h1 className="type-page-title mt-3">매장에 맞게 채워가는 기본 디자인</h1>
    <p className="mt-5 max-w-2xl leading-relaxed text-zinc-600">흰 배경과 검정 글자를 바탕으로 대표영역, 메뉴 이미지와 가격 옵션을 확인해보세요. 목록형과 앨범형을 비교할 수 있으며 호출과 주문은 미리보기에서만 작동합니다.</p>
    <div className="mt-14 divide-y divide-zinc-200 border-y border-zinc-200">
      {DEFAULT_DESIGN_REVIEWS.map(design => <section key={design.id} className="flex flex-wrap items-center justify-between gap-6 py-10">
        <div><h2 className="type-content-title">{design.label}</h2><p className="mt-2 text-zinc-500">{MENU_LAYOUTS[design.layout].label}</p></div>
        <Link href={getDefaultDesignReviewUrl(design)} className="site-button site-button-outline">미리보기</Link>
      </section>)}
    </div>
    <p className="mt-7 text-copy leading-relaxed text-zinc-500">PC·태블릿·모바일을 전환하며 확인할 수 있습니다. 이미지 영역에는 교체 가능한 예시 이미지를 넣었습니다.</p>
  </main>;
}
