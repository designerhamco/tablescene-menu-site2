import Image from "next/image";

import { plans } from "./data";
import { Icon } from "./Icon";

export function Pricing() {
  return (
    <section id="pricing" className="relative bg-zinc-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-5xl">
            매장의 운영 방식에 최적화된<br className="hidden md:block" /> 맞춤형 솔루션을 제안합니다
          </h2>
          <p className="text-lg font-medium leading-relaxed text-zinc-500">
            규모도, 운영 방식도 다른 우리 매장.<br className="md:hidden" /> 가장 필요한 기능만 담은 합리적인 플랜으로 시작해보세요.
          </p>
        </div>

        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:mx-auto md:grid md:grid-cols-1 md:gap-8 md:overflow-visible md:p-0">
          {plans.map((plan) => (
            <div key={plan.id} className="min-w-[85vw] snap-center md:min-w-0 md:w-full">
              <article
                className={`group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white shadow-sm transition-all duration-500 md:h-[460px] md:flex-row ${
                  plan.disabled ? "" : "cursor-pointer hover:shadow-xl"
                }`}
              >
                {plan.disabled && (
                  <div className="absolute inset-0 z-30 flex cursor-not-allowed flex-col items-center justify-center bg-zinc-900/40 backdrop-blur-[1px]">
                    <span className="text-xl font-black tracking-widest text-white drop-shadow-lg md:text-2xl">COMING SOON</span>
                    <span className="mt-1 text-sm font-medium text-zinc-200 drop-shadow-md">서비스 준비중입니다</span>
                  </div>
                )}
                {!plan.disabled && <a href={plan.link} className="absolute inset-0 z-10" aria-label={`${plan.name} 자세히 보기`} />}

                <div className={`relative z-20 flex w-full flex-col items-start justify-center p-8 md:w-1/2 md:p-12 ${plan.disabled ? "opacity-40 grayscale" : ""}`}>
                  <span className="mb-3 block text-sm font-bold text-zinc-500">{plan.name}</span>
                  <h3 className="mb-6 flex items-center gap-3 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">{plan.tagline}</h3>
                  <div className="mb-8 flex flex-wrap gap-2">
                    {plan.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-bold tracking-tight text-zinc-900">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <p className="break-keep text-lg leading-relaxed text-zinc-500">{plan.narrative}</p>
                </div>

                <div className={`relative h-48 w-full overflow-hidden bg-zinc-900 md:h-auto md:w-1/2 ${plan.disabled ? "opacity-40 grayscale" : ""}`}>
                  <Image
                    src={plan.poster}
                    alt={plan.tagline}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className={`object-cover transition-transform duration-[8000ms] group-hover:scale-110 ${plan.disabled ? "brightness-50 grayscale" : "brightness-75"}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {!plan.disabled && (
                    <span className="absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-black group-hover:text-white md:bottom-8 md:right-8 md:h-16 md:w-16">
                      <Icon name="arrowRight" className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45 md:h-6 md:w-6" />
                    </span>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
