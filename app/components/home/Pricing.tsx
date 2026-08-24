import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, Lock } from 'lucide-react';

const PLANS = [
  {
    id: 'menu',
    name: '디지털 메뉴판/가격표',
    tagline: '아티메뉴 베이직',
    keywords: ['모바일/QR', '가격표', '바로 수정'],
    narrative: '카페/베이커리, 음식점/다이닝, 뷰티/웰니스, 클래스/공방, 병원/클리닉까지 메뉴와 가격표를 하나의 링크로 관리합니다.',
    link: '/services/basic',
    poster: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    highlight: false,
    disabled: false
  },
  {
    id: 'screen',
    name: '대형 화면 메뉴보드',
    tagline: '아티메뉴 디스플레이',
    keywords: ['TV/모니터', '메뉴보드', '안내 화면'],
    narrative: '매장 TV와 모니터에 띄우는 디지털 메뉴보드로 메뉴, 가격표, 이벤트 화면을 보여주세요.',
    link: '/services/display',
    poster: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    highlight: false,
    disabled: false
  },
  {
    id: 'custom',
    name: '맞춤형 웹 메뉴 경험',
    tagline: '아티메뉴 커스텀',
    keywords: ['브랜딩', '인터랙션', '프로젝트 제작'],
    narrative: '템플릿으로 담기 어려운 브랜드 경험은 프리미엄 맞춤 제작으로 완성합니다.',
    link: '/services/custom',
    poster: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    highlight: false,
    disabled: false
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
        <span className="mb-3 block text-sm font-bold text-zinc-500">
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
            메뉴판, 가격표, 안내 화면까지.<br className="md:hidden" /> 지금 바로 운영 가능한 핵심 서비스부터 시작해보세요.
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
