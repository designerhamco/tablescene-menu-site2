import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, CheckCircle2, TrendingDown, Clock, ScreenShare, MessageCircle } from 'lucide-react';

const FAQ_DATA = [
  {
    category: "도입 및 기기",
    items: [
      {
        question: "서비스 도입 시 별도의 기기를 구매해야 하나요?",
        answer: (
          <>
            아니요. 사장님이 이미 사용 중인 태블릿, PC, 스마트폰만 있다면 어디서든 바로 사용 가능합니다. 손님들은 개인 휴대폰으로 메뉴를 보기 때문에 비싼 하드웨어 추가 비용이 들지 않아 경제적입니다. (단, 웹 기반 서비스로 일반 포스(POS) 기기 내 설치는 불가합니다.)
          </>
        )
      },
      {
        question: "현재 사용 중인 포스(POS)기와 연동되나요?",
        answer: (
          <>
            본 서비스는 포스사와 연동하는 방식이 아닌, <strong className="font-bold text-zinc-900">독자적인 '테이블씬 대시보드(웹 POS)'</strong>를 사용합니다.
            <br /><br />
            <span className="font-bold text-primary">[Point]</span> 무거운 포스기에 얽매일 필요 없습니다! 주방, 카운터, 혹은 사장님 주머니 속 스마트폰까지, 장소에 구애받지 않고 어디서든 자유롭게 주문을 확인하고 관리할 수 있는 것이 저희 서비스만의 최대 장점입니다.
          </>
        )
      },
      {
        question: "테이블별로 QR 코드를 다르게 만들어야 하나요?",
        answer: (
          <>
            네, 각 테이블 고유의 QR 코드를 생성해 드립니다. 특히 구역별 커스터마이징이 매우 자유롭습니다. 창가석(W01), 야외테라스(O01), 단체석(G01) 등 매장 구조에 맞춰 사장님이 원하는 대로 이름을 붙여 관리할 수 있습니다.
          </>
        )
      }
    ]
  },
  {
    category: "메뉴 및 운영",
    items: [
      {
        question: "메뉴 수정은 실시간으로 가능한가요?",
        answer: (
          <>
            네, 관리자 페이지에서 메뉴 품절 처리, 가격 변경, 사진 수정을 하는 즉시 손님 화면에 반영됩니다. 종이 메뉴판처럼 다시 인쇄할 필요가 없어 비용이 절감되며, 재료 소진 등 매장 상황에 즉각적으로 대응할 수 있습니다.
          </>
        )
      },
      {
        question: "사용 중 오류가 발생하거나 궁금한 점이 있으면 어떡하나요?",
        answer: (
          <>
            <span className="font-bold text-zinc-900">[고객센터 평일 09:00 ~ 17:00 / 긴급상담 주말 10:00 ~ 22:00]</span><br/>
            서비스 이용 중 문의 사항은 카카오톡 상담을 통해 남겨주세요. 특히 해결이 어려운 문제는 저희 지원팀이 원격 제어로 사장님의 화면을 실시간으로 보면서 신속하게 해결해 드립니다. 늦은 시간이나 공휴일에도 안심하고 운영하세요!
          </>
        )
      },
      {
        question: "웹 방식이면 인터넷이 끊기거나 불안정하지 않을까요?",
        answer: (
          <>
            본 서비스는 안정적인 클라우드 서버를 기반으로 작동하므로, 매장의 인터넷(Wi-Fi 또는 LTE/5G) 환경만 원활하다면 끊김 없이 사용 가능합니다.
            <br /><br />
            <span className="font-bold text-primary">[Tip]</span> 만약 매장 인터넷이 일시적으로 불안정할 경우, 사장님 스마트폰의 테더링(핫스팟)을 연결해서 즉시 임시 대처가 가능하다는 점도 웹 방식만의 장점입니다.
          </>
        )
      }
    ]
  },
  {
    category: "결제 및 정산 (PRO 전용)",
    items: [
      {
        question: "결제 방식은 어떻게 구성되어 있나요?",
        answer: (
          <>
            기본적으로 웹 메뉴판을 통한 온라인 선결제를 지원합니다. 만약 손님이 현장에서 카드 리더기나 현금으로 결제하길 원하신다면(후불제), 별도의 단말기로 결제하신 뒤 대시보드에서 해당 주문의 결제 상태를 '수동'으로 변경하여 매출을 관리하실 수 있습니다.
          </>
        )
      },
      {
        question: "PG 결제 가맹 계약은 사장님이 직접 해야 하나요?",
        answer: (
          <>
            네, 결제 대금이 사장님 계좌로 안전하게 정산되어야 하므로 PG 가맹 계약은 필수입니다. 가입이 생소하실 사장님들을 위해 <strong className="font-bold text-zinc-900">상세한 가입 가이드(안내서)</strong>를 제공해 드립니다. 가이드에 따라 가입을 완료하신 후, 발급된 가맹점 ID 값만 저희 시스템에 등록해 주시면 바로 결제 기능이 활성화됩니다.
          </>
        )
      },
      {
        question: "결제 수수료는 어떻게 되나요? (우대 수수료 혜택 안내)",
        answer: (
          <div className="space-y-6">
            <p>
              포트원을 이용해도 정부에서 지원하는 <strong className="text-zinc-900">영세/중소 가맹점 우대 수수료 혜택</strong>을 동일하게 적용받으실 수 있습니다.
            </p>

            <div className="bg-zinc-50 rounded-xl overflow-hidden border border-zinc-200 text-sm">
               <div className="p-3 bg-zinc-900 text-white text-center font-bold">
                  영세/중소 가맹점 우대 수수료 예시
               </div>
               <div className="divide-y divide-zinc-200">
                 <div className="grid grid-cols-3 p-3 bg-zinc-100 font-bold text-zinc-600 text-xs md:text-sm">
                    <div>가맹점 구분</div>
                    <div>연 매출</div>
                    <div>수수료율</div>
                 </div>
                 <div className="grid grid-cols-3 p-3 items-center">
                    <div className="font-bold">영세</div>
                    <div className="text-zinc-500">3억 이하</div>
                    <div className="font-bold text-blue-600">0.5%~</div>
                 </div>
                 <div className="grid grid-cols-3 p-3 items-center">
                    <div className="font-bold">중소 1</div>
                    <div className="text-zinc-500">3~5억</div>
                    <div className="font-bold text-blue-600">약 2.1%</div>
                 </div>
                 <div className="grid grid-cols-3 p-3 items-center">
                    <div className="font-bold">중소 2</div>
                    <div className="text-zinc-500">5~10억</div>
                    <div className="font-bold text-zinc-700">약 2.4%</div>
                 </div>
                 <div className="grid grid-cols-3 p-3 items-center">
                    <div className="font-bold">일반</div>
                    <div className="text-zinc-500">30억~</div>
                    <div className="font-bold text-zinc-500">약 3.0%~</div>
                 </div>
               </div>
            </div>
            <p className="text-xs text-zinc-400">
               * PG사 및 결제 수단에 따라 상이할 수 있으나 우대 정책은 동일하게 반영됩니다.
            </p>

            <div className="grid gap-4 md:grid-cols-2 pt-2">
               <div>
                  <div className="flex items-center gap-2 mb-1 text-zinc-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                    <span>혜택은 그대로</span>
                  </div>
                  <p className="text-sm text-zinc-500 pl-6">오프라인 단말기와 동일한 우대 수수료 적용</p>
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1 text-zinc-900 font-bold">
                    <TrendingDown className="w-4 h-4 text-zinc-400" />
                    <span>비용은 절감</span>
                  </div>
                  <p className="text-sm text-zinc-500 pl-6">Starter 요금제 월 0원 + 인건비 절감 효과</p>
               </div>
            </div>
          </div>
        )
      }
    ]
  }
];

const FAQItem = ({ item, isOpen, onToggle, index }: { item: any, isOpen: boolean, onToggle: () => void, index: number }) => {
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
}

const FAQ = ({ className = "", showSupport = true }: FAQProps) => {
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
          <p className="text-lg text-zinc-500 font-medium">
            서비스 이용과 관련하여 가장 많이 궁금해하시는 내용입니다.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FAQ_DATA.map((category, idx) => (
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
              {FAQ_DATA[activeTab].items.map((faq, index) => (
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
                   <span className="text-sm font-bold text-primary tracking-widest uppercase mb-2 block">Support</span>
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