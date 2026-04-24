"use client";

import Image from "next/image";
import { services } from "./data";
import { Icon } from "./Icon";

export function Services() {
  return (
    <section id="services" className="relative overflow-hidden bg-[#fcfcfc] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative mb-16 text-center">
          <span className="mb-4 block text-xs font-bold uppercase tracking-widest text-primary">Our Solutions</span>
          <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-zinc-900 md:text-6xl">우리의 서비스</h2>
          <p className="text-lg font-medium text-zinc-500 md:text-xl">
            완벽하게 연결된 올인원 시스템으로 완성된<br className="hidden md:block" />
            테이블씬의 혁신적인 서비스를 만나보세요.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {services.map((service) => {
            const disabled = "disabled" in service && service.disabled;
            const isAi = "isAi" in service && service.isAi;
            const video = "video" in service ? service.video : undefined;

            return (
              <a
                key={service.id}
                href={service.link}
                onClick={(event) => disabled && event.preventDefault()}
                className={`group relative block aspect-[4/5] h-full w-full overflow-hidden rounded-3xl bg-zinc-100 transition-all duration-500 md:aspect-[3/4] ${
                  disabled ? "cursor-not-allowed opacity-90" : "hover:shadow-2xl"
                }`}
              >
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className={`object-cover transition-transform duration-700 ease-out ${
                    disabled ? "grayscale" : "group-hover:scale-105"
                  }`}
                />
                {video && !disabled && (
                  <video
                    src={video}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
                {disabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                    <span className="text-3xl font-black uppercase tracking-widest text-white/60 drop-shadow-lg">Coming Soon</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <h3 className="mb-3 flex items-center gap-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
                    {service.title}
                    {isAi && (
                      <span className="rounded-full border border-white/20 bg-gradient-to-r from-blue-500 to-violet-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-lg md:text-xs">
                        AI
                      </span>
                    )}
                    {!disabled && (
                      <span className="ml-auto rounded-full bg-white/10 p-2 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Icon name="arrowUpRight" className="h-5 w-5" />
                      </span>
                    )}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-zinc-300 opacity-90 transition-transform duration-300 group-hover:translate-y-0 md:text-base">
                    {service.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
