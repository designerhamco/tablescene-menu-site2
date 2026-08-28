import React from 'react';

import { type FAQCategory } from '@/app/components/common/FAQ';
import {
  DisplayHero,
  DisplayLinkSection,
  DisplayPurposeSection,
  DisplaySetupSection,
  ExistingScreenSection,
  LiveUpdateSection,
  ReadabilitySection,
  ScreenFitSection,
} from '@/app/components/display/DisplayProductStory';
import TemplateShowcase from '@/app/components/home/TemplateShowcase';
import ServicePricingSection from '@/app/components/pricing/ServicePricingSection';

export const displayFaqData: FAQCategory[] = [
  {
    category: '디스플레이 이용',
    items: [
      {
        question: '아티메뉴 다이닝과 디스플레이는 무엇이 다른가요?',
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
            매장마다 TV 크기, 모니터 해상도, 화면 비율, 브라우저 확대 상태가 다를 수 있습니다. 아티메뉴 디스플레이는 화면 크기와 메뉴 개수에 맞춰 가능한 한 보기 좋은 비율로 정리되고, 가독성을 유지하는 선에서 큰 화면에 맞게 조정됩니다.
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

const DisplayServicePage = () => {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <DisplayHero />

      <div className="relative -mt-10 overflow-hidden rounded-t-[2rem] bg-zinc-950 md:-mt-16 md:rounded-t-[3rem]">
        <TemplateShowcase service="display" presentation="marquee" />
        <DisplayPurposeSection />
        <ExistingScreenSection />
        <ReadabilitySection />
        <ScreenFitSection />
        <LiveUpdateSection />
        <DisplayLinkSection />
      </div>

      <div className="relative -mt-10 overflow-hidden rounded-t-[2rem] bg-white md:-mt-16 md:rounded-t-[3rem]">
        <DisplaySetupSection />
        <ServicePricingSection service="display" />
      </div>
    </div>
  );
};

export default DisplayServicePage;
