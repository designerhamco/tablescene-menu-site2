import React from 'react';
import { motion } from 'motion/react';
import { Users, CreditCard, ChefHat, MessageCircle, Bell, Gift, Tablet, Monitor, Smartphone, Plus, ArrowRight } from 'lucide-react';

const AllInOneFlow = () => {
  const cards = [
    {
      id: 1,
      icon: <Smartphone className="w-6 h-6" />,
      title: "모바일 메뉴판",
      desc: "QR과 링크로 공유하고\n가격표까지 바로 수정"
    },
    {
      id: 2,
      icon: <Monitor className="w-6 h-6" />,
      title: "스크린 메뉴보드",
      desc: "TV와 모니터에 맞춘\n대형 화면 안내"
    },
    {
      id: 3,
      icon: <MessageCircle className="w-6 h-6" />,
      title: "맞춤형 제작",
      desc: "브랜딩과 인터랙션을 담은\n프리미엄 웹 메뉴 경험"
    },
    {
      id: 4,
      icon: <Bell className="w-6 h-6" />,
      title: "오더 1.0",
      desc: "QR 주문과 주방 연동은\n현재 준비 중입니다",
      badge: "준비 중"
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
              메뉴와 가격표를<br/>
              필요한 화면으로 연결합니다
            </h2>
            <p className="text-lg md:text-xl text-zinc-500 font-medium">
              모바일 QR, PC 링크, 매장 스크린까지 하나의 흐름으로 관리하세요.<br className="hidden md:block"/>
              오더 기능은 정식 출시 전까지 준비 중으로 안내합니다.
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
              
              {/* Box 1: TableScene Menu (Dark) */}
              <div className="relative group w-full lg:w-auto">
                 {/* Glow Effect */}
                 <div className="absolute inset-0 bg-zinc-900 blur-[40px] opacity-10 rounded-full" />
                 
                 <div className="relative bg-zinc-900 text-white px-10 py-6 lg:py-8 rounded-[2rem] shadow-2xl flex flex-col items-center md:items-start text-center md:text-left border border-zinc-700/50 min-w-[280px]">
                   <div className="text-zinc-400 text-xs font-bold tracking-wider uppercase mb-2">TableScene Menu</div>
                   <div className="text-xl lg:text-2xl font-bold tracking-tight mb-4">메뉴/가격표 링크</div>
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

              {/* Box 2: Screen & Custom */}
              <div className="relative w-full lg:w-auto">
                 <div className="bg-white text-zinc-900 px-10 py-6 lg:py-8 rounded-[2rem] shadow-xl border border-zinc-200 flex flex-col items-center md:items-start text-center md:text-left min-w-[280px] h-full justify-between">
                   <div className="text-zinc-400 text-xs font-bold tracking-wider uppercase mb-2">Screen & Custom</div>
                   <div className="text-xl lg:text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
                     스크린과 맞춤 제작
                   </div>
                   <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 mt-auto">
                      매장 화면과 브랜드 경험까지 확장
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
