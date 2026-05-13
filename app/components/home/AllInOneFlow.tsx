import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';

type Feature = {
  id: string;
  title: string;
  description: string;
  image: string;
};

const introImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1800&auto=format&fit=crop';

const features: Feature[] = [
  {
    id: 'edit',
    title: '가격이 바뀌어도 메뉴판을 다시 만들 필요 없어요',
    description:
      '메뉴명, 가격, 설명을 직접 수정하고 저장하면 바로 반영됩니다. 가격이 바뀌거나 신메뉴가 추가되어도 메뉴판을 다시 만들 필요가 없습니다.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1400&auto=format&fit=crop',
  },
  {
    id: 'design',
    title: '매장 분위기에 맞게 글자와 색을 다듬으세요',
    description:
      '글자 크기, 글씨체, 배경색을 매장 분위기에 맞게 조정할 수 있습니다. 정해진 디자인을 그대로 쓰는 것이 아니라, 우리 매장에 맞게 다듬어갈 수 있어요.',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1400&auto=format&fit=crop',
  },
  {
    id: 'screen',
    title: '가지고 있는 화면을 디지털 메뉴보드처럼',
    description:
      'TV, 태블릿, 노트북, 모바일에서 메뉴판 링크를 바로 열어볼 수 있습니다. 가지고 있는 디바이스를 활용해 매장용 디지털 메뉴판처럼 사용할 수 있어요.',
    image: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?q=80&w=1400&auto=format&fit=crop',
  },
  {
    id: 'assistant',
    title: 'AI 작성 도우미로 메뉴 입력과 번역까지 더 쉽게',
    description:
      '메뉴가 많거나 설명이 막막할 때 AI 작성 도우미가 메뉴 정리와 문구 작성을 도와줍니다. 영어, 중국어, 일본어 번역도 GPT 기반으로 더 자연스러운 말투에 가깝게 다듬어 보여줄 수 있어요.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1400&auto=format&fit=crop',
  },
  {
    id: 'structure',
    title: '메뉴가 많아도 페이지와 카테고리로 깔끔하게',
    description:
      '메뉴가 많아도 페이지와 카테고리로 나누어 깔끔하게 정리할 수 있습니다. 커피, 디저트, 세트 메뉴처럼 매장 구성에 맞게 메뉴판 구조를 만들 수 있어요.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1400&auto=format&fit=crop',
  },
  {
    id: 'qr',
    title: '공개 주소와 연결된 QR 이미지까지 바로 준비',
    description:
      '메뉴판이 생성되면 공개 주소에 연결된 QR 이미지를 다운로드할 수 있습니다. 출력물, 테이블 안내, 카운터 POP 등에 붙여 손님에게 쉽게 공유하세요.',
    image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=1400&auto=format&fit=crop',
  },
];

function clampFeatureIndex(progress: number) {
  return Math.min(features.length - 1, Math.max(0, Math.floor(progress * features.length)));
}

const AllInOneFlow = () => {
  const featureSectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = features[activeIndex];
  const { scrollYProgress } = useScroll({
    target: featureSectionRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setActiveIndex((current) => {
      const next = clampFeatureIndex(latest);
      return current === next ? current : next;
    });
  });

  return (
    <>
      <section className="relative overflow-hidden bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-5xl">
              사장님이 직접 바꾸고,<br />
              링크 하나로 매장 화면에 바로 띄우는 메뉴판
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-14 aspect-[16/9] w-full overflow-hidden rounded-[2rem] border border-zinc-100 bg-zinc-100"
          >
            <img src={introImage} alt="" className="h-full w-full object-cover" />
          </motion.div>
        </div>
      </section>

      <section ref={featureSectionRef} className="relative h-[620vh] bg-white">
        <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-24 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-16 lg:gap-24">
            <div className="order-2 md:order-1">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="mb-5 break-keep text-2xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">
                  {activeFeature.title}
                </h3>
                <p className="break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
                  {activeFeature.description}
                </p>
              </motion.div>

              <div className="mt-12 grid grid-cols-6 gap-2 text-center text-sm font-bold md:max-w-md md:text-base">
                {features.map((feature, index) => (
                  <span
                    key={feature.id}
                    className={`rounded-full border px-2 py-2 transition-colors duration-300 ${
                      index === activeIndex
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : 'border-zinc-200 text-zinc-300'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              key={activeFeature.image}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.38 }}
              className="order-1 aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-zinc-100 bg-zinc-100 md:order-2"
            >
              <img src={activeFeature.image} alt="" className="h-full w-full object-cover" />
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AllInOneFlow;
