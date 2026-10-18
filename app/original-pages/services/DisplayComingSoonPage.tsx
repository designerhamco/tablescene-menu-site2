import Link from "next/link";
export default function DisplayComingSoonPage() {
  return (
    <section
      data-service-page="display"
      className="flex min-h-[75vh] flex-col justify-center bg-white pb-24 pt-36"
    >
      <div className="site-container w-full">
        <p className="site-eyebrow">디스플레이 플랜 · 준비 중</p>
        <h1 className="type-page-title mt-5">
          매장의 큰 화면을 위한
          <br />
          아티메뉴 디스플레이
        </h1>
        <p className="site-body mt-6 max-w-xl text-zinc-500">
          더 안정적인 화면 구성과 운영을 위해 준비하고 있습니다. 현재 신규
          신청은 받지 않으며, 오픈 일정은 추후 안내하겠습니다.
        </p>
        <Link href="/apply" className="site-button site-button-primary mt-8">
          베이직·다이닝 디자인 보기
        </Link>
      </div>
    </section>
  );
}
