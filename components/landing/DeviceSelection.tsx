import Image from "next/image";

import { Icon } from "./Icon";

const heroDevices = [
  {
    title: "Tablet Stand",
    eyebrow: "Smart Order",
    desc: "카운터와 테이블, 어디든 자유롭게",
    icon: "tablet",
    image: "https://images.unsplash.com/photo-1489925461942-d8f490a04588?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=720",
  },
  {
    title: "Wall Kiosk",
    eyebrow: "Kiosk Mode",
    desc: "벽면 공간을 활용한 효율적인 주문",
    icon: "monitor",
    image: "https://images.unsplash.com/photo-1692503466587-1a8d2a42a053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=720",
  },
  {
    title: "Mobile QR",
    eyebrow: "Self Service",
    desc: "고객의 스마트폰으로 즉시 주문",
    icon: "smartphone",
    image: "https://images.unsplash.com/photo-1761515397001-c8e82879c4c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=720",
    badge: "QR 이미지 무료 제공",
  },
] as const;

const smallDevices = [
  ["QR\n스탠드", "https://images.unsplash.com/photo-1707126186331-2d70ab33d3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=160"],
  ["태블릿\n기기 대여", "https://images.unsplash.com/photo-1638273266965-843b01e02a5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=160"],
  ["태블릿\n거치 악세서리", "https://images.unsplash.com/photo-1610664840481-10b7b43c9283?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=160"],
] as const;

export function DeviceSelection() {
  return (
    <section id="devices" className="relative bg-zinc-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-5xl">
            설치 없는 웹 기반 서비스,<br className="hidden md:block" />
            모든 기기가 매장의 얼굴이 됩니다
          </h2>
          <p className="break-keep text-lg leading-relaxed text-zinc-500">
            반응형 웹 기술로 PC, 태블릿, 모바일 어디서든 완벽하게 호환됩니다.<br className="hidden md:block" />
            복잡한 설치 없이, 매장 분위기에 어울리는 디바이스만 준비하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {heroDevices.map((device) => (
            <div
              key={device.title}
              className="group relative aspect-[16/10] cursor-pointer overflow-hidden rounded-[2rem] bg-zinc-900"
            >
              <Image
                src={device.image}
                alt={device.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover opacity-80 transition-all duration-700 group-hover:scale-105 group-hover:opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
              <div className="absolute inset-x-8 top-8">
                <div className="mb-2 flex items-center justify-between">
                  <Icon name={device.icon} className="h-6 w-6 text-white/80" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white md:text-3xl">{device.title}</h3>
                <p className="text-sm font-medium text-white/70 md:text-base">{device.desc}</p>
              </div>
              {"badge" in device && device.badge && (
                <div className="absolute bottom-8 left-8 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black shadow-lg md:px-4 md:py-2 md:text-sm">
                  {device.badge}
                </div>
              )}
            </div>
          ))}

          <div className="grid aspect-[16/10] grid-cols-2 gap-4 md:gap-6">
            {smallDevices.map(([title, image]) => (
              <div
                key={title}
                className="group flex cursor-pointer flex-col justify-between rounded-[1.5rem] border border-zinc-100 bg-white p-4 transition-all hover:shadow-lg md:p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="whitespace-pre-line text-sm font-bold leading-tight text-zinc-900 md:text-base">{title}</span>
                  <Icon name="chevronRight" className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-black md:h-5 md:w-5" />
                </div>
                <div className="flex flex-1 items-center justify-center py-2">
                  <Image
                    src={image}
                    width={200}
                    height={200}
                    className="h-full w-full rounded-lg object-contain"
                    alt={title.replace("\n", " ")}
                  />
                </div>
              </div>
            ))}
            <a
              href="#devices"
              className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-zinc-100 bg-zinc-50 p-4 transition-all hover:bg-black hover:text-white md:gap-3 md:p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-400 group-hover:text-black md:h-12 md:w-12">
                <Icon name="arrowRight" className="h-5 w-5 md:h-6 md:w-6" />
              </span>
              <span className="text-sm font-bold text-zinc-900 group-hover:text-white md:text-base">관련제품 더보기</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
