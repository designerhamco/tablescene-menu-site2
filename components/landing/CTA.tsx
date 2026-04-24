import { Icon } from "./Icon";

export function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden bg-zinc-50 py-20 text-zinc-900 md:py-24">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <h2 className="mb-8 text-3xl font-bold leading-[1.1] tracking-tight text-zinc-900 md:text-5xl">
          모든 디바이스를 하나로 잇는,<br />
          <span className="font-bold text-zinc-900">완벽한 웹 올인원</span> 솔루션.
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
          웨이팅, 주문, 결제부터 포인트 적립까지. 따로 관리하던 모든 서비스를<br className="hidden md:block" />
          단 하나의 웹 화면으로 통합하여, 별도의 기기 없이 운영 효율을 극대화하세요.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
          <a
            href="mailto:admin@dndcommerce.co.kr?subject=테이블씬 도입 문의"
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-black px-10 py-4 text-base font-bold uppercase tracking-widest text-white shadow-lg shadow-zinc-200 transition-colors hover:bg-zinc-800 md:w-auto md:text-lg"
          >
            지금 도입하기
            <Icon name="arrowRight" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="mailto:admin@dndcommerce.co.kr"
            className="flex w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-10 py-4 text-base font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:w-auto md:text-lg"
          >
            도입 상담 문의
          </a>
        </div>
      </div>
    </section>
  );
}
