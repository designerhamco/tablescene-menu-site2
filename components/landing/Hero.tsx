"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const thumbnails = [
  ["https://images.unsplash.com/photo-1745549670488-6852ef218009?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=320", "Dining Detail", "left-[5%] top-[9%] w-[22vw] md:w-[12vw]"],
  ["https://images.unsplash.com/photo-1759171993888-8fa717efd14c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=320", "Abstract Food", "right-[5%] top-[9%] w-[24vw] md:w-[13vw]"],
  ["https://images.unsplash.com/photo-1680946496238-5272d3c407fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=320", "Interior", "left-[3%] top-[35%] w-[18vw] md:w-[10vw]"],
  ["https://images.unsplash.com/photo-1559339352-11d035aa65de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=320", "Chef", "right-[3%] top-[35%] w-[19vw] md:w-[11vw]"],
  ["https://images.unsplash.com/photo-1592656431823-6dd2a427a30b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=320", "Plating", "bottom-[10%] left-[8%] w-[24vw] md:w-[13vw]"],
  ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=70&w=320", "Food Top View", "bottom-[10%] right-[8%] w-[22vw] md:w-[12vw]"],
] as const;

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      if (!sectionRef.current) {
        return;
      }

      const rect = sectionRef.current.getBoundingClientRect();
      const scrollable = Math.max(rect.height - window.innerHeight, 1);
      const nextProgress = Math.min(Math.max(-rect.top / scrollable, 0), 1);
      setProgress(nextProgress);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const heroWidth = 100 - progress * 14;
  const heroHeight = 100 - progress * 28;
  const heroRadius = progress * 32;
  const heroMaxWidth = 1600 - progress * 620;
  const ambientOpacity = Math.min(progress * 1.4, 0.9);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[180vh] bg-[#fcfcfc]">
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: ambientOpacity }}>
          <div className="relative mx-auto h-full max-w-[1600px]">
            {thumbnails.map(([src, alt, position], index) => (
              <div
                key={src}
                className={`absolute aspect-square overflow-hidden rounded-[24px] border border-zinc-100 bg-white shadow-xl opacity-80 ${position}`}
                style={{
                  transform: `translateY(${(index % 2 === 0 ? 18 : -8) + progress * (index % 2 === 0 ? -22 : 18)}px)`,
                }}
              >
                <Image src={src} alt={alt} fill sizes="(min-width: 768px) 13vw, 24vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative z-10 overflow-hidden bg-black shadow-2xl will-change-[width,height,border-radius]"
          style={{
            width: `${heroWidth}vw`,
            height: `${heroHeight}vh`,
            maxWidth: `${heroMaxWidth}px`,
            borderRadius: `${heroRadius}px`,
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=75&w=1280&auto=format&fit=crop"
            alt="Dining Background"
            fill
            priority
            sizes="(min-width: 1024px) 980px, 86vw"
            className="object-cover opacity-80"
          />
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
            poster="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=75&w=1280&auto=format&fit=crop"
            muted
            loop
            playsInline
            autoPlay
          />
          <div className="absolute inset-0 bg-black/45" style={{ opacity: 0.25 + progress * 0.35 }} />
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ transform: `translateY(${-progress * 18}px)` }}
          >
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-white drop-shadow-lg md:text-7xl">
              매장의 모든 순간을<br />하나로 연결하다
            </h1>
            <p className="max-w-xl text-xl font-medium text-white/90 drop-shadow-md">
              웨이팅부터 주문, 결제, 고객 관리까지.<br />
              복잡한 매장 운영, 아티메뉴 하나로 완벽해집니다.
            </p>
          </div>
        </div>

        <div className="absolute bottom-12 z-20 px-6 text-center" style={{ opacity: Math.min(progress * 1.5, 1) }}>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            따로 쓰던 기능을 웹 하나로,<br />내 기기에서 바로
          </h2>
        </div>
      </div>
    </section>
  );
}
