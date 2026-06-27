"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Clock, ScreenShare, MessageCircle } from 'lucide-react';

export type FAQCategory = {
  category: string;
  items: {
    question: string;
    answer: React.ReactNode;
  }[];
};

const MAIN_FAQ_DATA: FAQCategory[] = [
  {
    category: "서비스 이용",
    items: [
      {
        question: "제가 가진 기기에서도 메뉴판을 볼 수 있나요?",
        answer: (
          <>
            네. 메뉴링크 베이직 메뉴판은 웹 링크로 열리는 방식이라, 인터넷 브라우저를 사용할 수 있는 대부분의 기기에서 확인할 수 있습니다. 모바일, 태블릿, 노트북, PC는 물론이고, 브라우저를 지원하는 스마트 TV나 매장용 디스플레이에서도 사용할 수 있습니다.
          </>
        )
      },
      {
        question: "매장 TV나 큰 화면에는 어떻게 띄우나요?",
        answer: (
          <>
            가장 쉬운 방법은 매장 TV나 모니터에서 메뉴판 링크를 직접 여는 것입니다. 스마트 TV라면 TV 브라우저에서 메뉴판 주소를 열 수 있고, 일반 TV나 모니터라면 노트북, 미니 PC, TV 스틱, 크롬캐스트 같은 기기를 연결해 화면에 띄울 수 있습니다.
          </>
        )
      },
      {
        question: "메뉴판을 만들려면 프로그램을 설치해야 하나요?",
        answer: (
          <>
            아니요. 별도 프로그램 설치 없이 웹에서 사용할 수 있습니다. 메뉴판은 링크로 열리고, 수정은 마이페이지에서 진행합니다. 고객이 보는 화면도 브라우저에서 바로 열 수 있습니다.
          </>
        )
      },
      {
        question: "결제 후 바로 사용할 수 있나요?",
        answer: (
          <>
            결제가 완료되면 메뉴판이 자동 생성되고 마이페이지에서 확인할 수 있습니다. 생성된 메뉴판은 내용을 수정한 뒤 공개 상태로 전환해 사용할 수 있습니다.
          </>
        )
      }
    ]
  }
];

export const DETAILED_FAQ_DATA: FAQCategory[] = [
  {
    category: "이용 환경",
    items: [
      {
        question: "제가 가진 기기에서도 메뉴판을 볼 수 있나요?",
        answer: (
          <>
            메뉴링크 베이직 메뉴판은 웹 링크로 열리는 방식이라 인터넷 브라우저를 사용할 수 있는 대부분의 기기에서 확인할 수 있습니다.
          </>
        )
      },
      {
        question: "매장 TV나 큰 화면에는 어떻게 띄우나요?",
        answer: (
          <>
            스마트 TV는 브라우저에서 메뉴판 링크를 열 수 있고, 일반 TV나 모니터는 노트북, 미니 PC, TV 스틱, 크롬캐스트 같은 기기를 연결해 사용할 수 있습니다.
          </>
        )
      },
      {
        question: "프로그램을 설치해야 하나요?",
        answer: (
          <>
            별도 프로그램 설치 없이 웹에서 사용할 수 있습니다. 메뉴판 수정은 마이페이지에서 진행하고, 공개 메뉴판은 링크로 열립니다.
          </>
        )
      }
    ]
  },
  {
    category: "메뉴판 생성 / 관리",
    items: [
      {
        question: "결제 후 바로 사용할 수 있나요?",
        answer: (
          <>
            결제가 완료되면 메뉴판이 자동 생성되고 마이페이지에서 확인할 수 있습니다. 내용을 수정한 뒤 공개 상태로 전환해 사용할 수 있습니다.
          </>
        )
      },
      {
        question: "메뉴판 주소는 나중에 바꿀 수 있나요?",
        answer: (
          <>
            공개 전에는 수정할 수 있지만, 공개 후에는 QR 코드와 공유 링크 유지를 위해 주소 변경이 제한될 수 있습니다.
          </>
        )
      },
      {
        question: "QR 이미지는 받을 수 있나요?",
        answer: (
          <>
            메뉴판이 생성되면 공개 주소에 연결된 QR 이미지를 다운로드할 수 있습니다. 테이블 안내물, 카운터 POP, 포스터 등에 활용할 수 있습니다.
          </>
        )
      }
    ]
  },
  {
    category: "디자인 / 템플릿",
    items: [
      {
        question: "디자인도 직접 바꿀 수 있나요?",
        answer: (
          <>
            템플릿을 기반으로 글자 크기, 글씨체, 배경색 등 일부 디자인 옵션을 조정할 수 있도록 준비하고 있습니다.
          </>
        )
      },
      {
        question: "템플릿은 나중에 변경할 수 있나요?",
        answer: (
          <>
            현재는 결제 시 선택한 템플릿을 기준으로 메뉴판이 생성됩니다. 템플릿 변경 기능은 추후 정책에 따라 제공될 수 있습니다.
          </>
        )
      }
    ]
  },
  {
    category: "AI 작성 도우미",
    items: [
      {
        question: "AI 작성 도우미는 어떤 기능인가요?",
        answer: (
          <>
            메뉴가 많거나 설명 작성이 막막할 때, 메뉴 설명 작성, 메뉴 자동 정리, 자동 번역을 도와주는 기능입니다.
          </>
        )
      },
      {
        question: "AI 작성 도우미는 어떻게 제공되나요?",
        answer: (
          <>
            메뉴링크 베이직 메뉴판 생성 시 기본 AI 크레딧 18개, 메뉴링크 디스플레이 메뉴판 생성 시 기본 AI 크레딧 26개가 계정에 지급됩니다.
            보유 AI 크레딧은 계정의 모든 메뉴판에서 함께 사용할 수 있고, 부족하면 AI 크레딧을 추가 충전할 수 있습니다.
            AI 설명 작성과 부분 자동 번역은 1 크레딧, AI 메뉴 정리는 3 크레딧, 전체 자동 번역은 5 크레딧을 사용합니다.
          </>
        )
      },
      {
        question: "자동 번역은 어떻게 차감되나요?",
        answer: (
          <>
            전체 자동 번역은 실행 시 5 AI 크레딧을 사용합니다. 항목별 부분 자동 번역은 1 AI 크레딧을 사용합니다.
            데이터 양이 많으면 처리 시간이 길어질 수 있습니다.
          </>
        )
      },
      {
        question: "AI가 작성한 문구를 꼭 그대로 써야 하나요?",
        answer: (
          <>
            아니요. 제안된 문구를 참고해 직접 수정할 수 있습니다.
          </>
        )
      }
    ]
  },
  {
    category: "요금 / 결제",
    items: [
      {
        question: "월 결제와 연 결제는 어떻게 다른가요?",
        answer: (
          <>
            월 결제는 매월 자동 갱신되며 부담 없이 시작할 수 있습니다. 연 결제는 1년 단위 이용 기간으로, 월 결제보다 더 저렴하게 이용할 수 있습니다.
          </>
        )
      },
      {
        question: "월 결제를 해지하면 바로 사용할 수 없나요?",
        answer: (
          <>
            아니요. 해지 신청 후에도 이미 결제된 이용 기간 종료일까지 서비스를 사용할 수 있습니다. 다음 결제일부터 자동 결제가 중단됩니다.
          </>
        )
      },
      {
        question: "월 결제 중 연 결제로 변경할 수 있나요?",
        answer: (
          <>
            초기 오픈 단계에서는 고객지원 문의를 통해 변경을 도와드립니다. 현재 이용 기간 종료 후 연 결제로 변경하는 방식으로 안내됩니다.
          </>
        )
      },
      {
        question: "이용을 종료하면 메뉴판 데이터는 어떻게 되나요?",
        answer: (
          <>
            이용 기간이 종료되면 메뉴판은 비공개 처리되며, 유료 구독 종료 후에는 90일간 복구 가능 상태로 보관됩니다. 무료체험 종료 또는 결제 실패·미납으로 제한된 경우에는 30일간 복구 가능 상태로 보관될 수 있습니다.
            보관 기간이 종료되면 메뉴판 데이터와 업로드 이미지는 정책에 따라 삭제될 수 있으며, 이후 복구가 어려울 수 있습니다.
            결제 내역, 주문번호, 결제 금액, 결제 상태, 환불 여부, 이용 기간, 약관 동의 기록은 운영, 정산, 법적 대응을 위해 보관될 수 있습니다.
          </>
        )
      }
    ]
  },
  {
    category: "준비 중 기능",
    items: [
      {
        question: "테이블 오더 기능도 사용할 수 있나요?",
        answer: (
          <>
            테이블 오더 기능은 준비 중입니다. 현재는 메뉴링크 디지털 메뉴판 제작과 관리 기능을 먼저 제공합니다.
          </>
        )
      },
      {
        question: "메뉴링크 디스플레이는 무엇인가요?",
        answer: (
          <>
            매장 TV나 모니터에 메뉴판을 띄워 사용하는 디스플레이 메뉴보드 서비스입니다. 메뉴링크 베이직과 함께 확장해 사용할 수 있도록 준비 중입니다.
          </>
        )
      }
    ]
  }
];

const FAQItem = ({ item, isOpen, onToggle, index }: { item: FAQCategory["items"][number], isOpen: boolean, onToggle: () => void, index: number }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-zinc-200 last:border-none"
    >
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-start md:items-center justify-between gap-6 text-left group hover:bg-zinc-50/50 transition-colors px-4 rounded-lg"
      >
        <span className={`text-lg md:text-xl font-bold transition-colors ${isOpen ? 'text-primary' : 'text-zinc-900 group-hover:text-black'}`}>
          <span className="text-primary mr-2">Q.</span>{item.question}
        </span>
        <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 mt-1 md:mt-0 ${isOpen ? 'border-primary bg-primary text-white rotate-180' : 'border-zinc-300 text-zinc-400 group-hover:border-zinc-900 group-hover:text-zinc-900'}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-8 pt-2 pl-4 md:pl-8 pr-4 md:pr-12 text-zinc-600 leading-relaxed font-medium text-base">
              <div className="flex gap-3">
                 <span className="font-bold text-zinc-900 shrink-0">A.</span>
                 <div>{item.answer}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface FAQProps {
  className?: string;
  showSupport?: boolean;
  data?: FAQCategory[];
  description?: string;
}

const FAQ = ({
  className = "",
  showSupport = true,
  data = MAIN_FAQ_DATA,
  description,
}: FAQProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // When tab changes, reset open index
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    setOpenIndex(0); // Open first item by default when switching tabs
  };

  return (
    <section className={`py-24 bg-white relative ${className}`}>
      {/* Container width adjusted to match Footer (max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900 tracking-tight leading-tight">
            자주 묻는 질문
          </h2>
          {description ? (
            <p className="text-lg text-zinc-500 font-medium">
              {description}
            </p>
          ) : null}
        </div>

        {/* Category Tabs */}
        {data.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {data.map((category, idx) => (
              <button
                key={idx}
                onClick={() => handleTabChange(idx)}
                className={`px-5 py-2.5 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${
                  activeTab === idx 
                    ? 'bg-zinc-900 text-white shadow-lg scale-105' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                {category.category}
              </button>
            ))}
          </div>
        )}

        {/* FAQ List */}
        <div className="w-full md:max-w-6xl mx-auto bg-white rounded-2xl border border-zinc-200 p-4 md:p-8 shadow-sm min-h-[400px] mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {data[activeTab].items.map((faq, index) => (
                <FAQItem
                  key={`${activeTab}-${index}`}
                  index={index}
                  item={faq}
                  isOpen={openIndex === index}
                  onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Support Center (Responsive Layout) - Conditionally Rendered */}
        {showSupport && (
          <div className="mt-20 border-t border-zinc-100 pt-12 w-full md:max-w-6xl mx-auto">
             <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
                
                {/* Left: Title - Centered on mobile */}
                <div className="text-center md:text-left">
                   <h3 className="text-2xl md:text-3xl font-bold text-zinc-900">사장님의 든든한 운영 파트너</h3>
                   <p className="text-zinc-400 text-base md:text-lg mt-2 font-medium">체계적인 기술 지원으로 안정적인 매장 운영을 약속합니다.</p>
                </div>

                {/* Right: Info Grid - Centered & Single Line per item on mobile */}
                <div className="w-full md:w-auto flex flex-col md:flex-row gap-4 md:gap-8 items-center">
                   
                   {/* Item 1: Time */}
                   <div className="flex items-center gap-3 md:gap-4 md:items-start">
                      <Clock className="w-6 h-6 text-zinc-300 md:mt-0.5 shrink-0" strokeWidth={2} />
                      <div className="flex flex-col items-start gap-1 md:block text-left">
                         <strong className="block text-base md:text-lg font-bold text-zinc-900 md:mb-1">운영 시간</strong>
                         <div className="flex flex-col text-sm md:text-base gap-0.5">
                            <span className="text-zinc-500">평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00 제외)</span>
                            <span className="text-zinc-400 font-medium">긴급(주말) 10:00 ~ 22:00</span>
                         </div>
                      </div>
                   </div>

                   {/* Item 2: Kakao */}
                   <div className="flex items-center gap-3 md:gap-4 md:items-start">
                      <MessageCircle className="w-6 h-6 text-[#FAE100] md:mt-0.5 shrink-0 fill-current" strokeWidth={0} />
                      <div className="flex items-center gap-2 md:block text-left">
                         <strong className="block text-base md:text-lg font-bold text-zinc-900 md:mb-1">카카오톡 상담</strong>
                         <span className="text-base text-zinc-500">@디앤디커머스</span>
                      </div>
                   </div>

                   {/* Item 3: Remote */}
                   <div className="flex items-center gap-3 md:gap-4 md:items-start">
                      <ScreenShare className="w-6 h-6 text-primary md:mt-0.5 shrink-0" strokeWidth={2} />
                      <div className="flex items-center gap-2 md:block text-left">
                         <strong className="block text-base md:text-lg font-bold text-zinc-900 md:mb-1">원격 점검 지원</strong>
                         <span className="text-base text-zinc-500">화면 공유로 해결</span>
                      </div>
                   </div>

                </div>
             </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FAQ;
