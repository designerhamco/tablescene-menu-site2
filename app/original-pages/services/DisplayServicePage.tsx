import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import FAQ, { type FAQCategory } from '@/app/components/common/FAQ';
import DeviceSelection from '@/app/components/home/DeviceSelection';
import TemplateShowcase from '@/app/components/home/TemplateShowcase';
import ServicePricingSection from '@/app/components/pricing/ServicePricingSection';

const flowSteps = [
  {
    eyebrow: '첫번째',
    title: '화면 용도 선택',
    description: '카운터 메뉴보드, 가격표, 대기 안내처럼 매장에서 보여줄 화면의 목적을 정합니다.',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '두번째',
    title: '템플릿 선택',
    description: '카페, 베이커리, 시술 가격표, 안내 화면에 어울리는 큰 화면용 디자인에서 시작합니다.',
    image: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '세번째',
    title: '디스플레이 링크 생성',
    description: '결제 후 TV, 모니터, PC, 태블릿 브라우저에서 열 수 있는 화면 링크가 준비됩니다.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '네번째',
    title: '메뉴와 가격 입력',
    description: '메뉴명, 가격, 대표 메뉴, 품절 상태, 이벤트 문구와 안내 문구를 마이페이지에서 채웁니다.',
    image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '다섯번째',
    title: '큰 화면에 맞게 조정',
    description: '화면 크기와 메뉴 개수에 맞춰 글자 크기, 여백, 열 구성을 가능한 한 읽기 좋게 정리합니다.',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1600&auto=format&fit=crop',
  },
  {
    eyebrow: '여섯번째',
    title: '매장 화면에 띄우기',
    description: '스마트 TV 브라우저나 연결된 노트북, 미니 PC, TV 스틱에서 링크를 열고 전체화면으로 사용합니다.',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1600&auto=format&fit=crop',
  },
];

const displayFaqData: FAQCategory[] = [
  {
    category: '디스플레이 이용',
    items: [
      {
        question: '메뉴링크 베이직과 디스플레이는 무엇이 다른가요?',
        answer: (
          <>
            베이직은 손님이 QR이나 링크로 직접 열어보는 모바일 중심 메뉴판에 가깝습니다. 디스플레이는 카운터 뒤 TV, 매장 모니터, 대기 공간 화면에 계속 띄워두는 큰 화면용 메뉴보드입니다.
          </>
        ),
      },
      {
        question: '새 TV나 전용 기기를 꼭 사야 하나요?',
        answer: (
          <>
            꼭 새 기기를 구매해야 하는 방식은 아닙니다. 스마트 TV가 있다면 TV 브라우저에서 링크를 열 수 있고, 일반 TV나 모니터는 노트북, 미니 PC, TV 스틱, 크롬캐스트 같은 장치를 연결해 사용할 수 있습니다.
          </>
        ),
      },
      {
        question: '설치가 복잡한가요?',
        answer: (
          <>
            별도 앱 설치 방식이 아니라 브라우저에서 디스플레이용 링크를 여는 방식입니다. 매장 환경에 따라 세팅 방식은 달라질 수 있지만, 기본적으로 링크를 열고 전체화면으로 띄워두면 메뉴보드처럼 사용할 수 있습니다.
          </>
        ),
      },
    ],
  },
  {
    category: '화면 구성',
    items: [
      {
        question: '큰 화면에서는 무엇이 다르게 보이나요?',
        answer: (
          <>
            손님이 몇 걸음 떨어진 곳에서도 읽을 수 있도록 메뉴명, 가격, 카테고리, 대표 메뉴가 또렷하게 보이는 구성을 우선합니다. 큰 글씨, 넓은 간격, 한눈에 읽히는 열 구성, 이벤트나 안내 문구 노출에 맞춘 메뉴보드입니다.
          </>
        ),
      },
      {
        question: '화면 크기가 달라도 잘 맞나요?',
        answer: (
          <>
            매장마다 TV 크기, 모니터 해상도, 화면 비율, 브라우저 확대 상태가 다를 수 있습니다. 메뉴링크 디스플레이는 화면 크기와 메뉴 개수에 맞춰 가능한 한 보기 좋은 비율로 정리되고, 가독성을 유지하는 선에서 큰 화면에 맞게 조정됩니다.
          </>
        ),
      },
      {
        question: '메뉴가 많은 매장도 사용할 수 있나요?',
        answer: (
          <>
            사용할 수 있습니다. 모든 메뉴를 무조건 한 화면에 넣기보다 메뉴 수와 화면 크기에 따라 여백, 글자 크기, 열 구성, 카테고리 구성이 조정됩니다. 메뉴가 적으면 화면이 허전하지 않게, 메뉴가 많으면 가능한 한 읽기 좋게 정리하는 방향입니다.
          </>
        ),
      },
    ],
  },
  {
    category: '관리 / 기능',
    items: [
      {
        question: '가격이나 품절 메뉴가 바뀌면 어떻게 수정하나요?',
        answer: (
          <>
            마이페이지에서 메뉴 데이터, 가격, 품절 상태, 시즌 메뉴, 이벤트 문구를 직접 수정할 수 있습니다. 종이 출력물이나 새 이미지 파일을 다시 만들지 않아도 저장한 내용이 디스플레이 화면에 반영되는 구조입니다.
          </>
        ),
      },
      {
        question: 'AI 작성 도우미도 사용할 수 있나요?',
        answer: (
          <>
            네. 메뉴 설명, 이벤트 문구, 안내 문구 작성이 막막할 때 보조 기능으로 사용할 수 있습니다. 메뉴 목록을 정리하거나 문구를 제안받은 뒤 사장님이 직접 수정해 사용할 수 있습니다.
          </>
        ),
      },
      {
        question: '자동 번역은 어떻게 제공되나요?',
        answer: (
          <>
            한국어로 입력한 내용을 영어, 중국어, 일본어로 번역할 수 있습니다. 전체 자동 번역은 3크레딧, 항목별 부분 자동 번역은 1크레딧을 사용합니다. 보유 AI 크레딧은 계정의 모든 메뉴판에서 함께 사용할 수 있습니다.
          </>
        ),
      },
    ],
  },
  {
    category: '요금 / 종료',
    items: [
      {
        question: '디스플레이 요금은 어떻게 되나요?',
        answer: (
          <>
            정가는 월 39,600원, 연 475,200원입니다. 오픈 할인 기준으로 월결제는 월 19,800원, 연결제는 연 190,000원이며 연결제는 오픈 월결제 12개월 대비 약 20% 할인됩니다.
          </>
        ),
      },
      {
        question: 'AI 작성 도우미 제공량은 어떻게 되나요?',
        answer: (
          <>
            신규 Display 구독 1건당 Display 메뉴판 1개와 기본 AI 크레딧 26개가 제공됩니다. 정기 결제 갱신 시에는 기존 메뉴판의 이용기간만 연장되며 새 메뉴판이나 기본 AI 제공량이 추가되지 않습니다. AI 설명 작성과 부분 자동 번역은 1크레딧, AI 메뉴 정리는 3크레딧, 전체 자동 번역은 3크레딧이 차감됩니다.
          </>
        ),
      },
      {
        question: '해지하면 디스플레이 화면과 데이터는 어떻게 되나요?',
        answer: (
          <>
            월결제는 해지 신청 후에도 이미 결제된 이용 기간 종료일까지 사용할 수 있고, 다음 결제일부터 자동 결제가 중단됩니다. 이용 기간이 끝나면 디스플레이 메뉴보드는 비공개 처리되며 유료 구독 종료 후 90일간 복구 가능 상태로 보관됩니다. 90일 이후에는 메뉴보드 데이터와 업로드 이미지가 삭제되고 복구할 수 없습니다. 결제 내역과 약관 동의 기록 등 운영, 정산, 법적 대응에 필요한 기록은 보관될 수 있습니다.
          </>
        ),
      },
    ],
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

const DisplayServicePage = () => {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <section
        className="relative flex min-h-screen items-center overflow-hidden bg-zinc-950 px-6 py-32 text-white md:px-[max(3rem,calc((100vw-80rem)/2+1.5rem))] md:py-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(0,0,0,0.94), rgba(0,0,0,0.84), rgba(0,0,0,0.68)), url(https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1800&auto=format&fit=crop)',
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
            매장 TV를<br />
            디지털 메뉴보드로 바꾸세요
          </h1>
          <p className="mt-6 max-w-2xl break-keep text-base font-medium leading-relaxed text-white/80 md:text-lg">
            메뉴링크 디스플레이는 모바일 메뉴판을 크게 띄우는 서비스가 아니라, 매장 TV와 모니터에서 메뉴명과 가격을 멀리서도 읽기 좋게 보여주는 대형 화면용 디지털 메뉴보드입니다.
          </p>
        </motion.div>
      </section>

      <SimpleVisualSection
        title={<>손님이 여는 메뉴판이 아니라<br />매장이 보여주는 화면입니다</>}
        description="메뉴링크 베이직이 손님이 QR이나 링크로 직접 열어보는 메뉴판이라면, 디스플레이는 카운터 뒤 TV나 매장 모니터에 계속 띄워두는 메뉴보드입니다. 카페 메뉴, 베이커리 오늘의 메뉴, 시술 가격표, 클리닉 대기 안내처럼 매장 안에서 보여주는 화면에 집중합니다."
        image="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        reverse
        title={<>가지고 있는 화면을<br />메뉴보드로 활용하세요</>}
        description="새 기기를 반드시 구매해야 하는 서비스가 아닙니다. 스마트 TV는 브라우저에서 디스플레이 링크를 열 수 있고, 일반 TV나 모니터는 노트북, 미니 PC, TV 스틱, 크롬캐스트 같은 장치를 연결해 사용할 수 있습니다."
        image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        title={<>멀리서도 메뉴명과 가격이<br />먼저 읽히게 구성합니다</>}
        description="모바일 메뉴판은 손님이 가까이에서 보지만, 매장 디스플레이는 몇 걸음 떨어진 거리에서 보게 됩니다. 큰 글씨, 넓은 간격, 한눈에 읽히는 카테고리, 대표 메뉴 강조, 이벤트 문구 노출처럼 큰 화면에서 필요한 가독성을 우선합니다."
        image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        reverse
        title={<>메뉴가 많아도,<br />화면에 맞는 비율을 찾습니다</>}
        description="모든 메뉴를 무조건 한 화면에 넣는 방식이 아니라, 화면 크기와 메뉴 개수에 맞춰 가능한 한 읽기 좋은 비율로 정리합니다. 메뉴가 적을 때는 화면이 허전하지 않게, 메뉴가 많을 때는 여백과 열 구성, 글자 크기를 조정해 가독성을 유지합니다."
        image="https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1400&auto=format&fit=crop"
      />

      <SimpleVisualSection
        title={<>메뉴가 바뀌어도<br />다시 만들 필요가 없습니다</>}
        description="가격 변경, 품절 메뉴, 시즌 메뉴, 이벤트 안내가 생기면 마이페이지에서 직접 수정할 수 있습니다. 종이 출력물이나 이미지 파일을 새로 만들지 않아도, 저장한 내용이 매장 화면의 메뉴보드에 반영됩니다."
        image="https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=1400&auto=format&fit=crop"
      />

      <TemplateShowcase service="display" />

      <FlowSection />
      <DeviceSelection
        muted
        includeLargeScreen
        title={<>링크 하나면,<br className="hidden md:block" />매장 화면에 바로 띄울 수 있어요</>}
      />
      <ServicePricingSection service="display" />
      <FAQ data={displayFaqData} />
    </div>
  );
};

export default DisplayServicePage;
