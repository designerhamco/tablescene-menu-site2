import { flowCards } from "./data";
import { Icon } from "./Icon";

export function AllInOneFlow() {
  return (
    <section id="allinone" className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <h2 className="mb-6 text-4xl font-bold leading-tight text-zinc-900 md:text-5xl">
            복잡한 매장 운영,<br />
            메뉴링크 하나로 연결됩니다
          </h2>
          <p className="text-lg font-medium text-zinc-500 md:text-xl">
            따로 놀던 기기들과 데이터를 하나의 흐름으로 완성하세요.<br className="hidden md:block" />
            웨이팅부터 고객 관리까지, 모든 기능이 완벽하게 연동됩니다.
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
            {flowCards.map((card) => (
              <div
                key={card.title}
                className="group relative z-10 flex h-full flex-col items-center rounded-2xl border border-zinc-100 bg-white p-4 text-center shadow-lg transition-shadow hover:shadow-xl md:p-8"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-900 transition-transform duration-300 group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                  <Icon name={card.icon} className="h-6 w-6" />
                </div>
                <h3 className="mb-2 flex flex-col items-center justify-center gap-1 text-lg font-bold text-zinc-900 md:mb-3 md:flex-row md:gap-2 md:text-2xl">
                  {card.title}
                  {"badge" in card && card.badge && (
                    <span className="rounded-full border border-black/5 bg-[#F8E731] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
                      {card.badge}
                    </span>
                  )}
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-500 md:text-base">{card.desc}</p>
                <div className="absolute bottom-0 left-1/2 z-20 hidden h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-4 border-white bg-zinc-900 lg:block" />
              </div>
            ))}
          </div>

          <div className="relative -my-1 h-24 w-full md:h-32">
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <g className="hidden lg:block">
                {["M 12.5 0 C 12.5 50, 50 50, 50 100", "M 37.5 0 C 37.5 50, 50 50, 50 100", "M 62.5 0 C 62.5 50, 50 50, 50 100", "M 87.5 0 C 87.5 50, 50 50, 50 100"].map((d) => (
                  <path key={d} d={d} fill="none" stroke="#E4E4E7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
              <g className="lg:hidden">
                {["M 25 0 C 25 50, 50 50, 50 100", "M 75 0 C 75 50, 50 50, 50 100"].map((d) => (
                  <path key={d} d={d} fill="none" stroke="#E4E4E7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}
              </g>
            </svg>
          </div>

          <div className="relative z-10 pt-4">
            <div className="absolute left-1/2 top-4 z-20 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-zinc-900 lg:block" />
            <div className="flex flex-col items-center justify-center gap-4 lg:flex-row lg:gap-8">
              <div className="relative w-full lg:w-auto">
                <div className="absolute inset-0 rounded-full bg-zinc-900 opacity-10 blur-[40px]" />
                <div className="relative flex min-w-[280px] flex-col items-center rounded-[2rem] border border-zinc-700/50 bg-zinc-900 px-10 py-6 text-center text-white shadow-2xl md:items-start md:text-left lg:py-8">
                  <div className="mb-2 text-xs font-bold text-zinc-400">메뉴링크 웹메뉴판</div>
                  <div className="mb-4 text-xl font-bold tracking-tight lg:text-2xl">PRO 1.0</div>
                  <div className="flex w-full items-center justify-center gap-4 text-zinc-400 md:w-auto">
                    <Icon name="monitor" className="h-5 w-5" />
                    <Icon name="tablet" className="h-5 w-5" />
                    <Icon name="smartphone" className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-100 bg-white text-zinc-400 shadow-lg">
                <Icon name="plus" className="h-6 w-6" />
              </div>
              <div className="w-full cursor-not-allowed opacity-80 lg:w-auto">
                <div className="flex min-w-[280px] flex-col items-center rounded-[2rem] border border-zinc-200 bg-white px-10 py-6 text-center text-zinc-900 shadow-xl md:items-start md:text-left lg:py-8">
                  <div className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight lg:text-2xl">
                    AI 마케팅 자동화
                    <span className="rounded-full border border-black/5 bg-[#F8E731] px-2 py-0.5 text-[10px] font-bold leading-none text-black shadow-sm lg:text-xs">PRO AI</span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-sm font-bold text-zinc-400">COMING SOON</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
