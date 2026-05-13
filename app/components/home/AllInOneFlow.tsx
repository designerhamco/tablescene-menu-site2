import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { StoreFitVisual } from './StoreFitSection';

type Feature = {
  id: string;
  title: string;
  description: string;
  image: string;
};

const features: Feature[] = [
  {
    id: 'edit',
    title: '어떤 기기에서든 관리자 페이지로 빠르게 수정',
    description:
      '휴대폰, 태블릿, 노트북처럼 웹사이트에 접속할 수 있는 기기라면 관리자 페이지에서 메뉴명, 가격, 설명을 바로 수정할 수 있습니다. 저장한 내용은 공개 메뉴판에 반영됩니다.',
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
    title: '메뉴판 하나로 여러 기기에서 바로 확인',
    description:
      '한 번 만든 메뉴판은 TV, 태블릿, 노트북, 모바일에서 같은 링크로 열어볼 수 있습니다. 별도 파일을 다시 옮기지 않아도 가지고 있는 기기에서 자연스럽게 확인할 수 있어요.',
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
          >
            <StoreFitVisual className="mt-14" showNeeds={false} />
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
