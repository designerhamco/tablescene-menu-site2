import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';

const painPoints = [
  {
    id: 'price',
    title: '디지털 메뉴판을 직접 만들고',
    description: '메뉴 하나 바꾸려고 레이아웃부터 다시 만지면\n운영보다 제작에 시간이 더 들어요.',
  },
  {
    id: 'design',
    title: '디자인까지 매번 고민하고',
    description: '가격표를 보기 좋게 맞추려다 보면\n폰트, 간격, 이미지 정리까지 신경 쓰게 돼요.',
  },
  {
    id: 'new-menu',
    title: '작은 수정도 다시 부탁하고',
    description: '디자이너에게 요청하거나 편집 파일을 열어\n수정본을 다시 만드는 과정이 반복돼요.',
  },
  {
    id: 'brand',
    title: '수정본을 다시 확인하고',
    description: '저장하고 공유하고 화면에 다시 띄우는 과정이\n메뉴가 자주 바뀔수록 번거로워져요.',
  },
];

function getVisibleCount(progress: number) {
  if (progress < 0.06) return 0;
  if (progress < 0.16) return 1;
  if (progress < 0.26) return 2;
  if (progress < 0.36) return 3;
  return 4;
}

const ServiceOverview = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setVisibleCount((current) => {
      const next = getVisibleCount(latest);
      return current === next ? current : next;
    });
  });

  return (
    <section ref={sectionRef} className="relative flex min-h-screen items-center overflow-hidden bg-zinc-950 py-16 text-white md:py-20">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1920&auto=format&fit=crop')",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-zinc-950/72" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <h2 className="break-keep text-3xl font-bold tracking-tight text-white md:text-5xl">
            디지털 메뉴판,<br className="hidden md:block" />
            아직도 직접 만들고 있나요?
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {painPoints.map((item, index) => {
            const isVisible = index < visibleCount;

            return (
              <motion.div
                key={item.id}
                initial={false}
                animate={{
                  opacity: isVisible ? 1 : 0,
                  y: isVisible ? 0 : 36,
                  scale: isVisible ? 1 : 0.98,
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative flex min-h-[190px] flex-col items-center justify-center rounded-[1.35rem] bg-white p-5 text-center before:absolute before:-bottom-2 before:left-1/2 before:h-4 before:w-4 before:-translate-x-1/2 before:rotate-45 before:bg-white md:min-h-[230px] md:p-7"
              >
                <h3 className="mb-3 break-keep text-base font-bold tracking-tight text-zinc-950 md:mb-4 md:text-2xl">
                  {item.title}
                </h3>
                <p className="break-keep whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-500 md:text-base">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceOverview;
