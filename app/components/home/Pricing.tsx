import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, Lock } from 'lucide-react';

const PLANS = [
  {
    id: 'pro-v1',
    name: '올인원 통합 관리',
    tagline: 'PRO 1.0',
    keywords: ['주문/결제', '직원 호출', '효율적 운영'],
    narrative: '주문부터 결제, 직원 호출까지 매장 운영에 필요한 핵심 기능을 하나로 담았습니다. 효율적인 매장 관리를 시작하세요.',
    link: '/services/pro-v1',
    // Busy Kitchen (Original Pro Image)
    poster: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    highlight: false,
    disabled: false
  },
  {
    id: 'dining',
    name: '프리미엄 커스텀',
    tagline: 'DINING',
    keywords: ['파인다이닝', 'QR 웰컴 카드', '프리미엄 커스텀'],
    narrative: '웹 메뉴판과 완벽한 조화를 이루는 프리미엄 QR 웰컴 카드를 제작해 드립니다. 매장의 품격을 높이는 차별화된 경험을 제공하세요.',
    link: '/services/signature',
    // Bar / Fine Dining (Original Dining Image)
    poster: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    highlight: false,
    disabled: false
  },
  {
    id: 'pro-ai',
    name: 'AI 자동화 솔루션',
    tagline: 'PRO AI',
    keywords: ['매출 분석', '마케팅 자동화', '운영 최적화'],
    narrative: 'AI가 매출 데이터를 분석하여 마케팅 전략을 제안하고 실행합니다. 매장 운영의 새로운 패러다임을 경험해보세요.',
    link: '#',
    // AI / Tech feel
    poster: 'https://images.unsplash.com/photo-1588560107833-167198a53677?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    highlight: true,
    disabled: true
  }
];

const PricingCard = ({ plan, index }: { plan: typeof PLANS[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`group relative bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-sm transition-all duration-500 flex flex-col md:flex-row md:h-[460px] ${
        plan.disabled ? '' : 'hover:shadow-xl cursor-pointer'
      }`}
    >
      {/* Disabled Overlay - Covers ENTIRE card */}
      {plan.disabled && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900/40 backdrop-blur-[1px] cursor-not-allowed">
             <span className="text-xl md:text-2xl font-black tracking-widest text-white drop-shadow-lg">COMING SOON</span>
             <span className="text-sm text-zinc-200 font-medium mt-1 drop-shadow-md">서비스 준비중입니다</span>
        </div>
      )}

      {/* Full Card Link Overlay for Active Plans */}
      {!plan.disabled && (
        <Link 
          to={plan.link} 
          className="absolute inset-0 z-10"
          aria-label={`${plan.name} 자세히 보기`}
        />
      )}

      {/* Left: Content */}
      <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col items-start justify-center relative z-20 pointer-events-none md:pointer-events-auto ${plan.disabled ? 'opacity-40 grayscale' : ''}`}>
        <span className="text-zinc-500 text-sm font-bold tracking-widest uppercase mb-3 block">
          {plan.name}
        </span>
        
        <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-6 tracking-tight flex items-center gap-3">
          {plan.tagline}
        </h3>
        
        {/* Keywords Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {plan.keywords.map((keyword, idx) => (
            <span 
              key={idx}
              className="bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-md text-xs font-bold tracking-tight"
            >
              {keyword}
            </span>
          ))}
        </div>
        
        <p className="text-zinc-500 text-lg leading-relaxed word-keep-all break-keep md:line-clamp-3">
          {plan.narrative}
        </p>
      </div>

      {/* Right: Media (Cinematic Motion Image) */}
      <div className={`w-full md:w-1/2 h-48 md:h-auto relative overflow-hidden bg-zinc-900 ${plan.disabled ? 'grayscale opacity-40' : ''}`}>
        
        {/* Animated Background Image (Ken Burns Effect) */}
        <motion.div 
            className="absolute inset-0 w-full h-full"
            animate={plan.disabled ? {} : { 
                scale: [1, 1.1],
                filter: ["brightness(0.7)", "brightness(0.8)"]
            }}
            transition={{ 
                duration: 10, 
                repeat: Infinity, 
                repeatType: "reverse", 
                ease: "linear" 
            }}
        >
          <img 
              src={plan.poster}
              alt={plan.tagline}
              className={`w-full h-full object-cover ${plan.disabled ? 'grayscale brightness-50' : ''}`}
          />
        </motion.div>
        
        {/* Overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10 pointer-events-none" />
        
        {/* Floating Action Button */}
        {!plan.disabled && (
          <div 
            className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-20 w-12 h-12 md:w-16 md:h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-900 shadow-lg group-hover:bg-black group-hover:text-white transition-all duration-300 group-hover:scale-110"
          >
            <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:-rotate-45 transition-transform duration-300" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Pricing = () => {
  return (
    <section className="py-24 bg-zinc-50 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900 tracking-tight leading-tight">
            매장의 운영 방식에 최적화된<br className="hidden md:block" /> 맞춤형 솔루션을 제안합니다
          </h2>
          <p className="text-lg text-zinc-500 leading-relaxed font-medium">
            규모도, 운영 방식도 다른 우리 매장.<br className="md:hidden" /> 가장 필요한 기능만 담은 합리적인 플랜으로 시작해보세요.
          </p>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-6 px-6 md:grid md:grid-cols-1 md:gap-8 md:mx-auto md:p-0 md:overflow-visible scrollbar-hide">
          {PLANS.map((plan, index) => (
            <div key={plan.id} className="min-w-[85vw] snap-center md:min-w-0 md:w-full">
              <PricingCard plan={plan} index={index} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Pricing;