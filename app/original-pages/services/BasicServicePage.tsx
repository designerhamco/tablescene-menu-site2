import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';

import FAQ from '@/app/components/common/FAQ';
import DeviceSelection from '@/app/components/home/DeviceSelection';
import TemplateShowcase from '@/app/components/home/TemplateShowcase';
import ServicePricingSection from '@/app/components/pricing/ServicePricingSection';

const storeTypes = [
  {
    label: '카페',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '식당',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '디저트샵',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '미용실',
    image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '네일샵',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '피부관리샵',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '공방',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '클래스',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: 'PT / 피트니스',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1400&auto=format&fit=crop',
  },
  {
    label: '팝업스토어',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1400&auto=format&fit=crop',
  },
];

const storeNeeds = [
  '가격 변동이 잦은 매장',
  '시즌 메뉴를 자주 추가하는 매장',
  '종이 메뉴판 제작이 번거로운 매장',
  '모바일과 매장 화면을 함께 쓰고 싶은 매장',
];

const featureGroups = [
  {
    title: '메뉴판 관리',
    description: '메뉴명, 가격, 설명, 이미지, 추천 메뉴와 숨김 상태까지 직접 관리합니다.',
    items: ['메뉴/가격/설명 관리', '페이지/카테고리 관리', '이미지 등록', '추천 메뉴 표시', '숨김 처리'],
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1400&auto=format&fit=crop',
  },
  {
    title: '디자인 / 표시',
    description: '디자이너 템플릿으로 시작하고, 매장 분위기에 맞는 표시 옵션을 준비합니다.',
    items: ['디자인 템플릿', '모바일/태블릿/PC/매장 화면 대응', '글자 크기/글씨체/배경색 설정 준비'],
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop',
  },
  {
    title: '공유 / 편의 기능',
    description: '공개 링크와 QR 이미지, 작성 도우미로 메뉴판 운영을 더 가볍게 만듭니다.',
    items: ['공개 메뉴판 링크', 'QR 이미지 다운로드', 'AI 작성 도우미', '다국어 표시 지원'],
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1400&auto=format&fit=crop',
  },
];

const flowSteps = [
  ['템플릿 선택', '매장 분위기에 맞는 디자인을 고릅니다.'],
  ['주소 입력과 생성', '공개 주소를 정하고 결제 후 메뉴판을 생성합니다.'],
  ['직접 수정', '메뉴, 가격, 설명과 디자인을 바로 다듬습니다.'],
  ['공개 활용', '링크와 QR 이미지로 매장에서 사용합니다.'],
];

function SectionTitle({
  title,
  description,
  inverted = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mx-auto mb-10 max-w-3xl text-center"
    >
      <h2 className={`break-keep text-3xl font-bold leading-tight tracking-tight md:text-5xl ${inverted ? 'text-white' : 'text-zinc-950'}`}>{title}</h2>
      {description ? <p className={`mt-5 break-keep text-base font-medium leading-relaxed md:text-lg ${inverted ? 'text-zinc-400' : 'text-zinc-500'}`}>{description}</p> : null}
    </motion.div>
  );
}

function ImageBlock({ image, dark = false }: { image: string; dark?: boolean }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-zinc-200 md:aspect-[16/10]">
      <img src={image} alt="" className="h-full w-full object-cover" />
      <div className={`absolute inset-0 ${dark ? 'bg-black/55' : 'bg-black/10'}`} />
    </div>
  );
}

function PrimaryLink({ to, children, variant = 'dark' }: { to: string; children: React.ReactNode; variant?: 'dark' | 'light' | 'outline' }) {
  const className =
    variant === 'dark'
      ? 'bg-zinc-950 text-white hover:bg-zinc-800'
      : variant === 'light'
        ? 'border border-white bg-white text-zinc-950 hover:bg-zinc-100'
        : 'border border-white/35 bg-white/10 text-white hover:bg-white/15';

  const content = (
    <>
      {children}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  const linkClassName = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors ${className}`;

  if (to.startsWith('http')) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={linkClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={linkClassName}>
      {content}
    </Link>
  );
}

function StoreFitSection() {
  const [activeStore, setActiveStore] = useState(storeTypes[0]);

  return (
    <section className="bg-zinc-50 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="메뉴판을 자주 바꾸는 매장이라면"
          description="메뉴와 가격표를 쉽게 만들고, 사장님이 직접 관리하고 싶은 매장에 잘 맞습니다."
        />

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:justify-center md:overflow-visible">
          {storeTypes.map((store) => {
            const isActive = activeStore.label === store.label;
            return (
              <button
                key={store.label}
                type="button"
                onClick={() => setActiveStore(store)}
                onMouseEnter={() => setActiveStore(store)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  isActive ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {store.label}
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeStore.label}
              src={activeStore.image}
              alt=""
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35 }}
              className="h-[420px] w-full object-cover opacity-75 md:h-[600px]"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-black/75" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <div className="grid gap-3 md:grid-cols-4">
              {storeNeeds.map((need) => (
                <div key={need} className="flex items-start gap-2 text-sm font-bold leading-relaxed text-white md:text-base">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F8E731]" />
                  {need}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SimpleVisualSection({
  title,
  description,
  image,
  reverse = false,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  image: string;
  reverse?: boolean;
}) {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className={`mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div>
          <h2 className="break-keep text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">{title}</h2>
          <p className="mt-5 break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">{description}</p>
        </div>
        <ImageBlock image={image} />
      </div>
    </section>
  );
}

function FeatureAccordion() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = featureGroups[activeIndex];

  return (
    <section className="relative overflow-hidden bg-[#111111] px-6 py-20 text-white md:py-28">
      <div className="absolute left-0 top-0 h-[360px] w-full bg-gradient-to-b from-zinc-800/30 to-transparent opacity-70" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <SectionTitle title="테이블씬 베이직에서 제공하는 기능" inverted />
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <ImageBlock image={activeFeature.image} dark />
          <div className="border-y border-white/10">
            {featureGroups.map((group, index) => {
              const isOpen = activeIndex === index;
              return (
                <div key={group.title} className="border-b border-white/10 last:border-0">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left"
                  >
                    <span className={`text-xl font-bold transition-colors ${isOpen ? 'text-white' : 'text-zinc-500'}`}>{group.title}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180 text-white' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6">
                          <p className="break-keep text-sm font-medium leading-relaxed text-zinc-400">{group.description}</p>
                          <div className="mt-5 grid gap-3">
                            {group.items.map((item) => (
                              <div key={item} className="flex items-center gap-3 text-sm font-bold text-zinc-200">
                                <Check className="h-4 w-4 shrink-0 text-[#F8E731]" />
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionTitle title="복잡한 과정 없이 시작하세요" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {flowSteps.map(([title, desc], index) => (
            <div key={title} className="rounded-[1.4rem] border border-zinc-200 bg-white p-5 md:p-6">
              <span className="mb-8 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold text-white">{index + 1}</span>
              <h3 className="break-keep text-lg font-bold text-zinc-950">{title}</h3>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const BasicServicePage = () => {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <section
        className="relative flex min-h-screen items-center overflow-hidden bg-zinc-950 px-6 py-32 text-white md:px-[max(3rem,calc((100vw-80rem)/2+1.5rem))] md:py-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(0,0,0,0.94), rgba(0,0,0,0.84), rgba(0,0,0,0.68)), url(https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1800&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl text-left"
        >
          <h1 className="break-keep text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            링크 하나로 열리는<br />
            우리 매장 디지털 메뉴판
          </h1>
          <p className="mt-6 max-w-2xl break-keep text-base font-medium leading-relaxed text-white/80 md:text-lg">
            메뉴와 가격표를 웹 링크로 만들고, 모바일부터 매장 화면까지 보기 좋게 보여주세요. 수정은 마이페이지에서 직접 할 수 있습니다.
          </p>
        </motion.div>
      </section>

      <StoreFitSection />
      <DeviceSelection muted={false} />

      <SimpleVisualSection
        title={<>메뉴가 많아도,<br />화면에 맞춰 정리됩니다</>}
        description="화면 크기와 메뉴 개수에 맞춰 여백과 열 구성이 자연스럽게 조정됩니다. 모바일에서는 읽기 쉽게, 넓은 화면에서는 넓게 활용합니다."
        image="https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        reverse
        title={<>메뉴판 수정,<br />이제 다시 맡기지 마세요</>}
        description="메뉴명, 가격, 설명, 카테고리를 직접 수정하고 바로 반영하세요. 가격이 바뀌거나 신메뉴가 추가되어도 메뉴판을 다시 만들 필요가 없습니다."
        image="https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        title={<>AI 작성 도우미로<br />메뉴 입력을 더 쉽게</>}
        description="메뉴가 많거나 설명 작성이 막막할 때, 메뉴 정리와 문구 작성을 가볍게 도와줍니다. 제안된 문구는 그대로 쓰거나 직접 다듬을 수 있습니다."
        image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1400&auto=format&fit=crop"
      />

      <TemplateShowcase service="basic" />

      <FlowSection />
      <FeatureAccordion />
      <ServicePricingSection service="basic" />
      <FAQ />
    </div>
  );
};

export default BasicServicePage;
