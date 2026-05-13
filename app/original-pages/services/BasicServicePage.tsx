import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import FAQ from '@/app/components/common/FAQ';
import DeviceSelection from '@/app/components/home/DeviceSelection';
import TemplateShowcase from '@/app/components/home/TemplateShowcase';
import ServicePricingSection from '@/app/components/pricing/ServicePricingSection';

const flowSteps = [
  {
    eyebrow: '첫번째',
    title: '템플릿 선택',
    description: '매장 분위기에 맞는 디자인에서 시작합니다.',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '두번째',
    title: '주소 입력',
    description: '손님에게 공유할 메뉴판 링크를 정합니다.',
    image: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '세번째',
    title: '결제 후 생성',
    description: '관리 가능한 메뉴판이 마이페이지에 만들어집니다.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '네번째',
    title: '메뉴 입력',
    description: '메뉴명, 가격, 설명, 이미지를 채워 넣습니다.',
    image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '다섯번째',
    title: '디자인 조정',
    description: '폰트, 배경색, 텍스트 칩을 매장에 맞게 다듬습니다.',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '여섯번째',
    title: '공개하기',
    description: '공개 링크와 QR로 메뉴판을 바로 활용합니다.',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1600&auto=format&fit=crop',
  },
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

function FlowSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          title="몇 분 만에 만들 수 있어요"
        />
        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-x-5 md:gap-y-12 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {flowSteps.map((step, index) => (
            <article key={step.eyebrow} className="relative min-w-[78vw] snap-center md:min-w-0">
              <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-zinc-100 md:rounded-[1.75rem]">
                <img src={step.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="pt-5 md:pt-6">
                <p className="text-xs font-bold text-zinc-300 md:text-sm">{step.eyebrow}</p>
                <h3 className="mt-3 break-keep text-2xl font-bold leading-tight tracking-tight text-zinc-950 md:text-[1.65rem]">
                  {step.title}
                </h3>
                <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500 md:text-[15px]">
                  {step.description}
                </p>
              </div>
              {index % 3 !== 2 && index !== flowSteps.length - 1 ? (
                <div className="pointer-events-none absolute right-[-1.55rem] top-[32%] z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 md:flex">
                  <ArrowRight className="h-4 w-4" />
                </div>
              ) : null}
            </article>
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
            메뉴와 가격표를<br />
            직접 바꾸고 바로 보여주세요
          </h1>
          <p className="mt-6 max-w-2xl break-keep text-base font-medium leading-relaxed text-white/80 md:text-lg">
            테이블씬 베이직은 앱 설치 없이 브라우저 링크로 열리는 디지털 메뉴판입니다. 모바일, 태블릿, 노트북, PC처럼 브라우저를 사용할 수 있는 기기라면 링크 하나로 메뉴와 가격표를 바로 보여줄 수 있습니다.
          </p>
        </motion.div>
      </section>

      <SimpleVisualSection
        title={<>관리자 페이지에서<br />언제든 메뉴를 수정하세요</>}
        description="PC 앞에 앉아 있지 않아도 됩니다. 모바일 웹으로 관리자 페이지에 접속할 수 있다면 매장 안팎 어디서든 메뉴명, 가격, 설명, 이미지, 노출 상태를 수정할 수 있고, 저장한 내용은 공개 메뉴판에 반영됩니다."
        image="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        reverse
        title={<>페이지와 카테고리를<br />운영 방식대로 구성하세요</>}
        description="메뉴 페이지를 여러 개 추가하고, 메뉴 아이템과 카테고리도 자유롭게 늘려갈 수 있습니다. 커피, 디저트, 세트, 시술, 이벤트 메뉴처럼 매장에 맞게 구조를 바꾸고, 한국어·영어·중국어·일본어 메뉴 표시도 함께 준비할 수 있습니다."
        image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        title={<>가격과 옵션도<br />메뉴에 맞게 자세히 보여주세요</>}
        description="HOT / ICE 가격을 따로 설정하거나, 메뉴별 옵션을 더 자세히 안내할 수 있습니다. 맵기, 짜기, 쓴맛처럼 5칸 단계로 보여주는 세부 표시도 활용해 손님이 메뉴의 특징을 더 쉽게 이해하도록 도울 수 있습니다."
        image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        reverse
        title={<>메뉴가 많아도,<br />보기 좋은 비율을 찾습니다</>}
        description="모든 메뉴를 무조건 한 화면에 넣는 방식이 아니라, 화면 크기와 메뉴 개수에 맞춰 가능한 한 읽기 좋은 비율로 정리합니다. 모바일에서는 세로형으로, 넓은 화면에서는 여백과 열 구성을 활용해 가독성을 유지합니다."
        image="https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        title={<>매장 분위기에 맞게<br />디자인을 다듬을 수 있습니다</>}
        description="템플릿을 그대로 쓰는 것에서 끝나지 않습니다. 폰트 스타일과 배경색을 조정하고, BEST나 Signature 같은 텍스트 칩을 만들어 색상까지 바꿀 수 있어 우리 매장 메뉴판처럼 자연스럽게 다듬어갈 수 있습니다."
        image="https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1400&auto=format&fit=crop"
      />

      <TemplateShowcase service="basic" />

      <FlowSection />
      <DeviceSelection
        muted
        includeLargeScreen={false}
        title={<>링크 하나면,<br className="hidden md:block" />어떤 기기에서도 열어볼 수 있어요</>}
      />
      <ServicePricingSection service="basic" />
      <FAQ />
    </div>
  );
};

export default BasicServicePage;
