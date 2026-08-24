import type { Metadata } from "next";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "커스텀 | ArtiMenu",
  description: "주문 제작형 메뉴판과 브랜드 맞춤형 메뉴 경험을 제공하는 아티메뉴 프리미엄 서비스입니다.",
};

export default function CustomPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-[#f7f4ef] text-zinc-950">
        <section className="border-b border-[#ddd4c5] px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <span className="inline-flex rounded-full border border-[#A88745]/35 bg-[#2F2418] px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#F4E7C5]">
              PREMIUM CUSTOM
            </span>
            <h1 className="mt-8 text-5xl font-black tracking-tight text-zinc-950 md:text-7xl">
              커스텀
            </h1>
            <p className="mt-6 max-w-2xl break-keep text-lg font-semibold leading-relaxed text-zinc-700 md:text-xl">
              주문 제작형 메뉴판과 브랜드 맞춤형 메뉴 경험을 제공하는 프리미엄 서비스입니다.
            </p>
            <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
              상세 페이지 준비 중입니다. 곧 자세한 내용을 안내드릴 예정입니다.
            </p>
            <div className="mt-10">
              <a
                href="mailto:admin@dndcommerce.co.kr"
                className="inline-flex rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800"
              >
                문의하기
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-[#7A5A28]">01</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">브랜드 맞춤 구성</h2>
              <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
                매장의 톤, 메뉴 구조, 운영 방식에 맞춰 메뉴 경험의 형태를 함께 설계합니다.
              </p>
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-[#7A5A28]">02</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">주문 제작 화면</h2>
              <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
                정형 템플릿으로 담기 어려운 브랜드 전용 레이아웃과 인터랙션을 준비합니다.
              </p>
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.18em] text-[#7A5A28]">03</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">문의 기반 진행</h2>
              <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
                구체적인 범위와 제작 일정은 상담을 통해 차분하게 안내드릴 예정입니다.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
