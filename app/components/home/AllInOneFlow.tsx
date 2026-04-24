import React from 'react';
import { motion } from 'motion/react';
import { Users, CreditCard, ChefHat, MessageCircle, Bell, Gift, Tablet, Monitor, Smartphone, Plus, ArrowRight } from 'lucide-react';

const AllInOneFlow = () => {
  const cards = [
    {
      id: 1,
      icon: <Users className="w-6 h-6" />,
      title: "스마트 웨이팅",
      desc: "대기 등록부터 입장 안내,\n미리 주문하는 선주문 기능",
      badge: "PRO AI"
    },
    {
      id: 2,
      icon: <Tablet className="w-6 h-6" />,
      title: "주문 & 결제",
      desc: "웹 메뉴판 결제 (PG 연동),\n웹 POS 실시간 연동"
    },
    {
      id: 3,
      icon: <Bell className="w-6 h-6" />,
      title: "스마트 직원 호출",
      desc: "진동벨 없이 웹에서 즉시 호출,\n요청 항목 자유로운 커스텀"
    },
    {
      id: 4,
      icon: <MessageCircle className="w-6 h-6" />,
      title: "CRM & 멤버십",
      desc: "결제 시 자동 포인트 적립,\n주문 시 현금처럼 사용"
    }
  ];

  return (
    <section className="py-24 bg-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6 leading-tight">
              복잡한 매장 운영,<br/>
              테이블씬 하나로 연결됩니다
            </h2>
            <p className="text-lg md:text-xl text-zinc-500 font-medium">
              따로 놀던 기기들과 데이터를 하나의 흐름으로 완성하세요.<br className="hidden md:block"/>
              웨이팅부터 고객 관리까지, 모든 기능이 완벽하게 연동됩니다.
            </p>
          </motion.div>
        </div>

        {/* Diagram Container */}
        <div className="relative max-w-6xl mx-auto">
          
          {/* Top Row: Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-4 md:p-8 shadow-lg border border-zinc-100 hover:shadow-xl transition-shadow relative group text-center flex flex-col items-center h-full z-10"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-zinc-900 mb-2 md:mb-3 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2">
                  {card.title}
                  {/* @ts-ignore */}
                  {card.badge && (
                    <span className="bg-[#F8E731] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none border border-black/5 align-middle">
                      {/* @ts-ignore */}
                      {card.badge}
                    </span>
                  )}
                </h3>
                <p className="text-sm md:text-base text-zinc-500 leading-relaxed whitespace-pre-line">
                  {card.desc.split('(NEW)').map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="bg-[#F8E731] text-black text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse ml-1 align-middle inline-block">
                          NEW
                        </span>
                      )}
                    </span>
                  ))}
                </p>
                
                {/* Connection Point (Bottom) - Visible on Large Screens */}
                <div className="hidden lg:block absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 rounded-full translate-y-1/2 border-4 border-white z-20" />
              </motion.div>
            ))}
          </div>

          {/* SVG Connection Area (Dedicated Space) */}
          <div className="relative h-24 md:h-32 w-full -my-1">
             <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              
              {/* Desktop Paths (4 columns) - Visible on Large Screens */}
              <g className="hidden lg:block">
                {[
                  "M 12.5 0 C 12.5 50, 50 50, 50 100",
                  "M 37.5 0 C 37.5 50, 50 50, 50 100",
                  "M 62.5 0 C 62.5 50, 50 50, 50 100",
                  "M 87.5 0 C 87.5 50, 50 50, 50 100"
                ].map((d, i) => (
                  <g key={i}>
                    {/* Background Path */}
                    <path 
                      d={d} 
                      fill="none" 
                      stroke="#E4E4E7" 
                      strokeWidth="1" 
                      vectorEffect="non-scaling-stroke" 
                    />
                  </g>
                ))}
              </g>

              {/* Mobile/Tablet Paths (2 columns) - Visible on Small/Medium Screens */}
              <g className="lg:hidden">
                {[
                  "M 25 0 C 25 50, 50 50, 50 100",
                  "M 75 0 C 75 50, 50 50, 50 100"
                ].map((d, i) => (
                  <g key={i}>
                    <path 
                      d={d} 
                      fill="none" 
                      stroke="#E4E4E7" 
                      strokeWidth="1" 
                      vectorEffect="non-scaling-stroke" 
                    />
                  </g>
                ))}
              </g>
            </svg>
          </div>

          {/* Bottom Hub Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative z-10 pt-4"
          >
            {/* Center Connection Point (Desktop) */}
            <div className="hidden lg:block absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 rounded-full -translate-y-1/2 border-4 border-white z-20" />

            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
              
              {/* Box 1: TableScene PRO (Dark) */}
              <div className="relative group w-full lg:w-auto">
                 {/* Glow Effect */}
                 <div className="absolute inset-0 bg-zinc-900 blur-[40px] opacity-10 rounded-full" />
                 
                 <div className="relative bg-zinc-900 text-white px-10 py-6 lg:py-8 rounded-[2rem] shadow-2xl flex flex-col items-center md:items-start text-center md:text-left border border-zinc-700/50 min-w-[280px]">
                   <div className="text-zinc-400 text-xs font-bold tracking-wider uppercase mb-2">테이블씬 웹메뉴판</div>
                   <div className="text-xl lg:text-2xl font-bold tracking-tight mb-4">PRO 1.0</div>
                   <div className="flex items-center gap-4 text-zinc-400 justify-center w-full md:w-auto">
                      <Monitor className="w-5 h-5" />
                      <Tablet className="w-5 h-5" />
                      <Smartphone className="w-5 h-5" />
                   </div>
                 </div>
              </div>

              {/* Plus Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-white shadow-lg border border-zinc-100 flex items-center justify-center text-zinc-400">
                  <Plus className="w-6 h-6" />
                </div>
              </div>

              {/* Box 2: AI Service (White) */}
              <div className="relative w-full lg:w-auto opacity-80 cursor-not-allowed">
                 <div className="bg-white text-zinc-900 px-10 py-6 lg:py-8 rounded-[2rem] shadow-xl border border-zinc-200 flex flex-col items-center md:items-start text-center md:text-left min-w-[280px] h-full justify-between">
                   <div className="text-zinc-400 text-xs font-bold tracking-wider uppercase mb-2">AI Service</div>
                   <div className="text-xl lg:text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
                     AI 마케팅 자동화
                     <span className="bg-[#F8E731] text-black text-[10px] lg:text-xs font-bold px-2 py-0.5 rounded-full leading-none border border-black/5 shadow-sm">PRO AI</span>
                   </div>
                   <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 mt-auto">
                      COMING SOON
                   </div>
                 </div>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default AllInOneFlow;