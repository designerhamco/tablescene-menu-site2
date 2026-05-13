import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';

const painPoints = [
  {
    id: 'price',
    title: '가격이 자꾸 바뀌어서',
    description: '메뉴판을 또 새로 뽑아야 해요.\n작은 수정인데도 시간과 비용이 계속 들어요.',
  },
  {
    id: 'design',
    title: '조금만 고치고 싶은데',
    description: '디자이너에게 매번 말하기가 부담돼요.\n원하는 타이밍에 바로 바꾸기가 어려워요.',
  },
  {
    id: 'new-menu',
    title: '신메뉴가 생길 때마다',
    description: '빈자리가 없어서 종이를 덧대게 돼요.\n계절 메뉴가 많아질수록 정리가 힘들어요.',
  },
  {
    id: 'brand',
    title: '임시로 만든 메뉴판이',
    description: '매장 분위기랑 안 맞아서 아쉬워요.\n브랜드 느낌을 제대로 보여주고 싶어요.',
  },
];

function getVisibleCount(progress: number) {
  if (progress < 0.18) return 0;
  if (progress < 0.36) return 1;
  if (progress < 0.54) return 2;
  if (progress < 0.72) return 3;
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
            메뉴판 하나 바꾸는 일,<br className="hidden md:block" />
            생각보다 번거롭지 않나요?
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
