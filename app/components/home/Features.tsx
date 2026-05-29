import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, ArrowRight } from 'lucide-react';

const features = [
  {
    id: 0,
    title: "데이터 기반의 통합 매장 관리",
    description: "매출 데이터 분석부터 재고 관리, 인기 메뉴 파악까지. 직관적인 대시보드로 매장의 흐름을 한눈에 확인하고 효율적으로 관리하세요.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["매출 분석", "통합 대시보드"]
  },
  {
    id: 1,
    title: "웨이팅부터 결제까지 올인원",
    description: "입장 대기부터 테이블 주문, 그리고 결제까지 하나의 시스템으로 연결됩니다. 여러 기기를 쓸 필요 없이 메뉴링크 하나면 충분합니다.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["웨이팅 통합", "테이블 오더"]
  },
  {
    id: 2,
    title: "실시간 주방 & 홀 연동",
    description: "주문 즉시 주방 대시보드로 내역이 전송되고, 조리가 완료되면 고객에게 알림톡이 자동 발송되어 서빙 효율을 극대화합니다.",
    image: "https://images.unsplash.com/photo-1709396759771-07c3644794c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["주방 대시보드", "알림톡 발송"]
  },
  {
    id: 3,
    title: "단골을 만드는 포인트 적립",
    description: "휴대폰 번호 입력만으로 간편하게 포인트를 적립하고 사용할 수 있습니다. 복잡한 가입 절차 없이 재방문율을 높이는 비결입니다.",
    image: "https://images.unsplash.com/photo-1667725335393-3f5d14d45e6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["포인트 적립", "고객 관리"]
  },
  {
    id: 4,
    title: "소음 없는 스마트 직원 호출",
    description: "'물 주세요', '앞치마 주세요' 등 필요한 요청을 메뉴판에서 터치 한 번으로. '딩동' 소리 없는 쾌적한 매장 환경을 제공합니다.",
    image: "https://images.unsplash.com/photo-1676324558731-019dfc39b394?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tags: ["직원 호출", "환경 개선"]
  }
];

const Features = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-24 bg-[#111111] text-white relative overflow-hidden min-h-screen flex items-center">
      {/* Background Lighting */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#111111] to-transparent pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column: Content & Accordion */}
          <div className="flex flex-col justify-center h-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight text-white">단순한 디지털 메뉴 그 이상</h2>
              <p className="text-lg text-zinc-400 leading-relaxed font-medium">
                단순히 보여주는 메뉴판이 아닙니다.<br className="hidden md:block"/>
                브랜딩부터 운영 효율까지, 당신의 매장을 완벽하게 지원합니다.
              </p>
            </motion.div>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <div 
                  key={feature.id}
                  className={`border-b border-white/10 last:border-0 ${activeIndex === index ? 'pb-6' : 'pb-4'}`}
                >
                  <button
                    onClick={() => setActiveIndex(index)}
                    className="w-full flex items-center justify-between py-4 group text-left transition-colors"
                  >
                    <h3 className={`text-xl md:text-2xl font-bold transition-colors duration-300 ${activeIndex === index ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                      {feature.title}
                    </h3>
                    <div className={`p-2 rounded-full transition-colors duration-300 ${activeIndex === index ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 group-hover:bg-zinc-800'}`}>
                      {activeIndex === index ? <Minus size={16} /> : <Plus size={16} />}
                    </div>
                  </button>
                  
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: activeIndex === index ? 'auto' : 0,
                      opacity: activeIndex === index ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {/* Mobile Only Image */}
                    <div className="lg:hidden mb-6 rounded-xl overflow-hidden aspect-video relative shadow-lg">
                      <img 
                        src={feature.image} 
                        alt={feature.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                    </div>

                    <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-6 font-medium">
                      {feature.description}
                    </p>
                    <div className="flex gap-2">
                       {feature.tags.map(tag => (
                         <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 text-white/70 border border-white/10">
                           {tag}
                         </span>
                       ))}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Sticky Image Area */}
          <div className="hidden lg:block h-[800px] sticky top-24">
             <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl border border-white/5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={features[activeIndex].image} 
                      alt={features[activeIndex].title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </motion.div>
                </AnimatePresence>
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;
