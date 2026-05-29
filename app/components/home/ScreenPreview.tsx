import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// import { SmartWaitingUI } from './preview-ui/SmartWaitingUI'; // Not used for now

interface TabItem {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  component?: React.ReactNode;
}

const TABS: TabItem[] = [
  {
    id: 'waiting',
    label: '스마트 웨이팅',
    title: '매장 도착 전,\n미리 줄서기.',
    description: '고객의 소중한 시간을 아껴주세요.\n실시간 대기 현황 확인부터 입장 알림까지 자동으로 처리됩니다.',
    image: 'https://images.unsplash.com/photo-1761515397001-c8e82879c4c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    // component: <SmartWaitingUI /> // Reverted to image
  },
  {
    id: 'intro',
    label: '인트로(프로모션)',
    title: '우리 매장의 첫인상,\n강렬하게.',
    description: '브랜드 스토리와 진행 중인 이벤트를 가장 먼저 보여주세요.\n고객의 시선을 사로잡는 몰입감 있는 인트로를 제공합니다.',
    image: 'https://images.unsplash.com/photo-1561284081-ebf6c977bbde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 'menu',
    label: '메뉴',
    title: '주문을 부르는\n생생한 메뉴판.',
    description: '고해상도 음식 사진과 상세한 설명으로 주문율을 높이세요.\n품절 관리와 메뉴 수정도 관리자 페이지에서 즉시 반영됩니다.',
    image: 'https://images.unsplash.com/photo-1609951734391-b79a50460c6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 'cart',
    label: '장바구니(주문/결제)',
    title: '앉은 자리에서\n주문부터 결제까지.',
    description: '직원을 기다릴 필요 없이 원하는 메뉴를 담고 결제하세요.\n더치페이, 메뉴별 결제 등 다양한 결제 방식을 지원합니다.',
    image: 'https://images.unsplash.com/photo-1757301714935-c8127a21abc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 'points',
    label: '포인트 적립',
    title: '결제와 동시에\n자동 적립.',
    description: '번호 입력 없이, 결제만 하면 포인트가 쌓입니다.\n재방문을 유도하는 강력한 멤버십 시스템을 경험하세요.',
    image: 'https://images.unsplash.com/photo-1702097034591-198838488ba7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 'call',
    label: '직원호출',
    title: '필요한 것만\n콕 집어 요청.',
    description: '"물 주세요", "앞치마 주세요" 목청 높여 부르지 마세요.\n원하는 요청사항을 선택하면 직원에게 즉시 전달됩니다.',
    image: 'https://images.unsplash.com/photo-1599950753725-ea5d8aba0d29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 'about',
    label: '소개페이지',
    title: '매장의 철학을\n전달하는 공간.',
    description: '영업 시간, 위치 정보는 기본.\n우리 매장만의 특별한 이야기로 고객과 소통하세요.',
    image: 'https://images.unsplash.com/photo-1679232329247-56ba5563b86a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  }
];

const ScreenPreview = () => {
  const [activeTab, setActiveTab] = useState<TabItem>(TABS[0]);

  return (
    <section className="py-24 bg-white overflow-hidden relative">
      <div className="w-full px-6">
        
        {/* Title */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6 tracking-tight">
            매장 운영의 진실,<br className="md:hidden" /> 눈으로 직접 확인하세요
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl">
            메뉴링크이 제공하는 직관적인 인터페이스를 미리 만나보세요.
          </p>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto flex justify-start md:justify-center overflow-x-auto pb-4 md:pb-0 mb-12 gap-8 md:gap-12 px-4 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-sm md:text-base font-bold tracking-wide uppercase transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab.id === tab.id ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {tab.label}
              {activeTab.id === tab.id && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content Area - Centered Tablet Layout */}
        <div className="relative w-full max-w-[1400px] mx-auto mt-10 lg:mt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              {/* Tablet Device Mockup */}
              <div className="relative w-full rounded-3xl bg-zinc-900 p-2 shadow-2xl ring-1 ring-zinc-900/50">
                {/* Power Button */}
                <div className="absolute top-12 -right-[2px] w-[2px] h-8 bg-zinc-800 rounded-r-md z-10" />
                {/* Volume Buttons */}
                <div className="absolute top-24 -right-[2px] w-[2px] h-12 bg-zinc-800 rounded-r-md z-10" />
                
                {/* Aspect Ratio Container (16:9) */}
                <div className="relative w-full pb-[56.25%]">
                  {/* Screen Content */}
                  <div className="absolute inset-0 bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-white/10">
                      {activeTab.component ? (
                        activeTab.component
                      ) : (
                        <img 
                          src={activeTab.image} 
                          alt={activeTab.label}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Glass Reflection */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30 pointer-events-none rounded-2xl" />
                  </div>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};

export default ScreenPreview;
