import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Check, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight,
  Minus, Plus, Info, PenTool, Palette, Layers, Star, ArrowUpRight, ArrowDown
} from 'lucide-react';
import { Link } from 'react-router';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import CTA from '../../components/home/CTA';

// --- Agency Style Detail Section (Rounded & Trendy) ---
interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  image: string;
}

interface AgencyDetailSectionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  items: FeatureItem[];
}

const AgencyDetailSection = ({ title, subtitle, items }: AgencyDetailSectionProps) => {
  return (
    <section className="py-12 md:py-40 bg-white">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row gap-12 md:gap-32">
          
          {/* Left: Sticky Title */}
          <div className="lg:w-[35%] lg:shrink-0">
            <div className="sticky top-40">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-[48px] font-bold leading-[1.1] text-zinc-900 mb-6 md:mb-8 tracking-tight"
              >
                {title}
              </motion.h2>
              
              {subtitle && (
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-sm"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </div>

          {/* Right: Vertical Stack with Rounded Cards */}
          <div className="lg:w-[65%]">
             <div className="flex flex-col gap-10">
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="group relative bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                  >
                     {/* Text Content Area */}
                     <div className="p-8 md:p-12 pb-0 md:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                        <div className="md:w-1/2">
                           {/* Simple Number */}
                           <span className="block text-zinc-400 font-bold text-lg mb-2">0{idx + 1}</span>
                           <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tight">{item.title}</h3>
                        </div>
                        <p className="md:w-1/2 text-base md:text-lg text-zinc-500 leading-relaxed pt-2">
                           {item.desc}
                        </p>
                     </div>

                     {/* Image Container - Full Bleed at Bottom */}
                     <div className="w-full h-[200px] md:h-[400px] mt-8 md:mt-12 relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent z-10 pointer-events-none" />
                        <ImageWithFallback 
                           src={item.image} 
                           alt={item.title} 
                           className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[0.16,1,0.3,1] group-hover:scale-105" 
                        />
                     </div>
                  </motion.div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// --- Data Constants ---
const SECTION_1_ITEMS = [
  {
    id: 's1-1',
    title: '브랜드 아이덴티티',
    desc: '매장의 철학과 분위기(Vibe)를 디자인으로 온전히 표현합니다. 천편일률적인 타사 디자인과 달리, 브랜드 무드를 분석하여 고유한 가치를 담아냅니다.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 's1-2',
    title: '브랜드 컬러 시스템',
    desc: '브랜드 키 컬러(Key Color)와 타이포그래피를 조화롭게 적용합니다. 인터페이스 전반에 브랜드의 가치를 높여주는 감각적인 디자인을 완성합니다.',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 's1-3',
    title: '프로페셔널 레이아웃',
    desc: 'UI/UX 전문가가 설계한 가독성 높은 레이아웃을 제공합니다. 매장의 철학을 해치지 않으면서 메뉴 집중도를 높이는 차별화된 디자인입니다.',
    image: 'https://images.unsplash.com/photo-1620646146036-7c9890833152?q=80&w=1000&auto=format&fit=crop'
  }
];

const PROCESS_ITEMS = [
  { num: "01", title: "플랜 구독 및 신청", desc: "PRO 1.0 또는 DINING 플랜 구독 후\n디자인 커스터마이징 신청" },
  { num: "02", title: "아이덴티티 분석 및 설계", desc: "매장과 요리사의 철학을 분석하여\n아이덴티티 확립 및 화면 설계" },
  { num: "03", title: "비주얼 디자인", desc: "레스토랑 분위기에 최적화된 UI 적용 및\n실제 기기 환경 테스트" },
  { num: "04", title: "최종 점검 및 전달", desc: "디테일한 사용성 최종 점검 후\n완성된 디자인 매장 적용" }
];

const PORTFOLIO_ITEMS = [
  { title: "Modern Minimal", desc: "여백의 미를 살려 메뉴에 집중도를 높인 디자인", img: "https://images.unsplash.com/photo-1684595011788-d7ac732cd6e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { title: "Classic Serifs", desc: "우아한 세리프 폰트로 품격을 더한 스타일", img: "https://images.unsplash.com/photo-1764127033257-bbb5cdf663fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { title: "Vivid Pop", desc: "강렬한 컬러 대비로 시선을 사로잡는 UI", img: "https://images.unsplash.com/photo-1552566827-ce4baebb0d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { title: "Dark Luxury", desc: "어두운 배경과 골드 포인트의 고급스러운 조화", img: "https://images.unsplash.com/photo-1703087425189-2bfe0679d175?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { title: "Typography", desc: "텍스트 중심의 감각적인 레이아웃", img: "https://images.unsplash.com/photo-1767050190883-29d644fa5b99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { title: "Grid System", desc: "많은 메뉴도 한눈에 들어오는 정돈된 구조", img: "https://images.unsplash.com/photo-1625173616412-7b403d49a41e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" }
];

const DesignCustomizing = () => {
  const scrollRefFlow1 = useRef<HTMLDivElement>(null);
  const scrollRefFlow2 = useRef<HTMLDivElement>(null);
  
  // Carousel State
  const [activeIndex, setActiveIndex] = useState(0);

  // Swipe detection
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    
    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const nextSlide = () => setActiveIndex((prev) => (prev + 1) % PORTFOLIO_ITEMS.length);
  const prevSlide = () => setActiveIndex((prev) => (prev - 1 + PORTFOLIO_ITEMS.length) % PORTFOLIO_ITEMS.length);

  // Helper to determine item position relative to active index
  const getItemProps = (index: number) => {
    const length = PORTFOLIO_ITEMS.length;
    let dist = index - activeIndex;
    
    // Handle wrap-around distance for shortest path
    if (dist > length / 2) dist -= length;
    if (dist < -length / 2) dist += length;
    
    const absDist = Math.abs(dist);
    const sign = Math.sign(dist); // -1, 0, or 1
    
    // Hide items that are too far (behind)
    if (absDist > 2) return null;

    let x = "0%";
    let scale = 1;
    let zIndex = 0;
    let opacity = 0;
    let blur = "0px";
    let rotateY = 0;

    if (dist === 0) {
      // CENTER
      x = "-50%";
      scale = 1.1; // Larger impact
      zIndex = 50;
      opacity = 1;
      blur = "0px";
      rotateY = 0;
    } else {
      // SIDES
      // Use CSS variables for responsive positioning to avoid hydration mismatch
      // Desktop: base 340px, step 220px
      // Mobile: base 160px, step 40px (tighter)
      
      const extraSteps = Math.max(0, absDist - 1);
      
      // We construct a calc string that uses CSS variables defined in the parent
      x = `calc(-50% + (${sign} * (var(--carousel-spacing) + ${extraSteps} * var(--carousel-step))))`;
      
      scale = absDist === 1 ? 0.65 : 0.45; // Drastic size difference
      zIndex = 50 - absDist * 10;
      opacity = absDist === 1 ? 0.8 : 0.4; // Fade out further items
      blur = `${absDist * 2}px`;
      rotateY = sign * -15 * absDist; // Slight rotation for 3D feel
    }

    return { x, scale, zIndex, opacity, blur, rotateY, isCenter: dist === 0 };
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-zinc-900 selection:text-white text-zinc-900">
      
      {/* 1. Intro Section with Title & Carousel */}
      <section className="pt-32 pb-6 md:pb-12 bg-white overflow-hidden">
        {/* Title Area */}
        <div className="max-w-4xl mx-auto px-6 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-6 leading-tight whitespace-pre-line">
              TableScene 메뉴판의 완성,<br/>
              <span className="text-zinc-500">프리미엄 디자인 커스터마이징</span>
            </h2>
            <p className="text-zinc-500 text-lg md:text-xl leading-relaxed whitespace-pre-line">
              기본 템플릿의 한계를 넘어, 우리 매장만의 브랜드 철학을 담은<br className="hidden md:block"/>
              독창적인 메뉴판을 제작해드립니다.
            </p>
          </motion.div>
        </div>

        {/* 3D Carousel Section */}
        <div 
          className="relative w-full h-[500px] flex justify-center items-center overflow-visible"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            // @ts-ignore
            '--carousel-spacing': '340px',
            '--carousel-step': '220px',
          }}
        >
          {/* Responsive CSS Overrides for Mobile */}
          <style>{`
            @media (max-width: 768px) {
              div[style*="--carousel-spacing"] {
                --carousel-spacing: 150px !important;
                --carousel-step: 50px !important;
              }
            }
          `}</style>

          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50 pointer-events-none z-0" />
          
          {/* Carousel Items */}
          <div className="relative w-full max-w-[1200px] h-full mx-auto perspective-[2000px]">
             <AnimatePresence initial={false}>
               {PORTFOLIO_ITEMS.map((item, idx) => {
                 const props = getItemProps(idx);
                 if (!props) return null; // Don't render hidden items

                 return (
                   <motion.div
                     key={idx}
                     className={`absolute top-[10%] left-1/2 w-[280px] md:w-[340px] aspect-[3/4] rounded-3xl overflow-hidden bg-white border border-zinc-100 cursor-pointer origin-center touch-pan-y ${props.isCenter ? 'shadow-none ring-1 ring-zinc-200' : 'shadow-2xl'}`}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ 
                       x: props.x, 
                       scale: props.scale, 
                       zIndex: props.zIndex, 
                       opacity: props.opacity,
                       filter: `blur(${props.blur})`,
                       rotateY: props.rotateY
                     }}
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     onClick={() => {
                       // Click to navigate
                       let dist = idx - activeIndex;
                       if (dist > PORTFOLIO_ITEMS.length / 2) dist -= PORTFOLIO_ITEMS.length;
                       if (dist < -PORTFOLIO_ITEMS.length / 2) dist += PORTFOLIO_ITEMS.length;
                       
                       // Allow clicking far items to jump
                       if (dist !== 0) setActiveIndex(idx);
                     }}
                   >
                     <img src={item.img} alt={item.title} className="w-full h-full object-cover pointer-events-none" />
                     
                     {/* Text Overlay (Only for Center) */}
                     <motion.div 
                        className="absolute bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center"
                        animate={{ opacity: props.isCenter ? 1 : 0 }}
                     >
                       <h3 className="text-white text-2xl font-bold mb-1">{item.title}</h3>
                       <p className="text-zinc-300 text-sm">{item.desc}</p>
                     </motion.div>
                   </motion.div>
                 );
               })}
             </AnimatePresence>
          </div>

          {/* Navigation Buttons - Hidden on Mobile */}
          <button 
            onClick={prevSlide}
            className="hidden md:flex absolute left-4 md:left-24 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur border border-zinc-200 shadow-lg items-center justify-center text-zinc-900 hover:scale-110 transition-all z-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="hidden md:flex absolute right-4 md:right-24 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur border border-zinc-200 shadow-lg items-center justify-center text-zinc-900 hover:scale-110 transition-all z-30"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Feature Details (Agency Style with Rounded Cards) */}
      <AgencyDetailSection
        title={`전문 디자이너의 손길로\n완성되는 디테일`}
        subtitle="작은 차이가 명품을 만듭니다. 고객이 머무는 시선 하나하나까지 섬세하게 설계합니다."
        items={SECTION_1_ITEMS}
      />

      {/* 5. Process Flow (Simple Arrow Design with 2-Col Mobile Grid) */}
      <section className="pt-16 pb-32 md:pt-24 md:pb-40 bg-zinc-50 border-t border-zinc-100 overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
            <div className="mb-12 md:mb-24 text-center">
                <h3 className="text-3xl md:text-[48px] font-bold text-zinc-900 mb-4 md:mb-8 tracking-tight">커스터마이징 프로세스</h3>
                <p className="text-zinc-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                  복잡한 과정 없이, 전문가와 함께하는 체계적인 4단계 프로세스로<br className="hidden md:block"/> 
                  완벽한 메뉴판을 제작해 드립니다.
                </p>
            </div>

            {/* Container: 2 Columns on Mobile / 4 Columns on Desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12 md:gap-8 relative">
                {PROCESS_ITEMS.map((item, idx) => {
                  // Mobile Arrow Logic: Show Right Arrow for 1st (0) and 3rd (2) item
                  const showMobileArrow = idx % 2 === 0;
                  
                  // Desktop Arrow Logic: Show Right Arrow for all except last
                  const showDesktopArrow = idx < PROCESS_ITEMS.length - 1;

                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1, duration: 0.6 }}
                      className="flex flex-col items-center text-center relative z-10"
                    >
                          {/* Number - Simple Trendy Chip Style */}
                          <div className="inline-flex items-center justify-center bg-zinc-200/50 text-zinc-600 rounded-full px-4 py-1 text-xs md:text-sm font-bold mb-5 tracking-wide">
                            {item.num}
                          </div>
                          
                          <h4 className="text-lg md:text-2xl font-bold text-zinc-900 mb-3 tracking-tight">{item.title}</h4>
                          <p className="text-zinc-500 text-sm md:text-lg leading-relaxed whitespace-pre-line">
                            {item.desc}
                          </p>

                          {/* Arrows */}
                          
                          {/* Mobile Arrow: Right Arrow for odd items in grid */}
                          {showMobileArrow && (
                            <div className="md:hidden absolute -right-6 top-1/2 -translate-y-1/2 text-zinc-300 z-0">
                               <ArrowRight className="w-5 h-5" />
                            </div>
                          )}
                          
                          {/* Desktop Arrow: Right Arrow for flow */}
                          {showDesktopArrow && (
                            <div className="hidden md:block absolute -right-4 top-[1rem] -translate-y-1/2 text-zinc-300 translate-x-1/2 z-0"> 
                               <ArrowRight className="w-8 h-8" />
                            </div>
                          )}
                    </motion.div>
                  );
                })}
            </div>
        </div>
      </section>

      {/* 6. Pricing CTA (Preserved) */}
      <section className="py-24 bg-zinc-900 text-white rounded-t-[3rem] -mt-12 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
           <div className="mb-12">
             <PenTool className="w-16 h-16 text-[#F4E54C] mx-auto mb-6" />
             <h2 className="text-3xl md:text-5xl font-bold mb-6">Standard Custom</h2>
             <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
               합리적인 비용으로 우리 가게만의 아이덴티티를 담아보세요.<br/>
               기본 템플릿 기반 수정부터 전체 커스터마이징까지 가능합니다.
             </p>
           </div>
           
           <div className="flex flex-col items-center gap-8">
             <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-6xl font-bold">99,000</span>
                <span className="text-xl md:text-2xl text-zinc-500">원 ~</span>
             </div>
             
             <ul className="flex flex-wrap justify-center gap-4 md:gap-8 text-zinc-300 text-sm md:text-base mb-8">
                <li className="flex items-center gap-2">
                   <Check className="w-5 h-5 text-[#F4E54C]" />
                   <span>메인 컬러 & 폰트</span>
                </li>
                <li className="flex items-center gap-2">
                   <Check className="w-5 h-5 text-[#F4E54C]" />
                   <span>로고 & 이미지 교체</span>
                </li>
                <li className="flex items-center gap-2">
                   <Check className="w-5 h-5 text-[#F4E54C]" />
                   <span>레이아웃 조정</span>
                </li>
             </ul>

             <Link to="/apply/custom" className="inline-flex px-10 py-4 bg-white text-zinc-900 font-bold rounded-full hover:bg-zinc-200 transition-colors text-lg">
                상담 신청하기
             </Link>
           </div>
        </div>
      </section>

      <CTA applyHref="/apply/custom" />
      
    </div>
  );
};

export default DesignCustomizing;
