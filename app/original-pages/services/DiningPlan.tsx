import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Languages, RefreshCcw, Check, ArrowRight, ArrowLeft, ChevronUp, ChevronDown, 
  Utensils, Wine, Coffee, Settings, FileText, Tablet, Info, Sparkles, Minus, Plus, QrCode
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Link } from 'react-router';
import FAQ from '@/app/components/common/FAQ';

// --- Feature Accordion Component (Dark Mode) ---
interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  image: string;
}

interface FeatureAccordionSectionProps {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  items: FeatureItem[];
  alignRight?: boolean;
  note?: React.ReactNode;
}

const FeatureAccordionSection = ({ id, title, subtitle, items, alignRight = false, note }: FeatureAccordionSectionProps) => {
  const [activeId, setActiveId] = React.useState(items[0].id);
  const activeItem = items.find(item => item.id === activeId) || items[0];

  return (
    <section id={id} className="py-16 md:py-32 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid md:grid-cols-2 gap-16 lg:gap-24 items-start`}>
          {/* Image Area */}
          <motion.div 
            className={`hidden md:block relative w-full aspect-square bg-black rounded-3xl overflow-hidden border border-zinc-800 ${alignRight ? 'md:order-2' : 'md:order-1'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={activeItem.image}
                src={activeItem.image}
                alt={activeItem.title}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </motion.div>

          {/* Content Area */}
          <motion.div 
            className={`flex flex-col justify-center h-full ${alignRight ? 'md:order-1' : 'md:order-2'}`}
            initial={{ opacity: 0, x: alignRight ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className={subtitle ? "mb-12" : "mb-10"}>
               <h2 className={`text-3xl md:text-5xl font-bold leading-tight text-white whitespace-pre-line ${subtitle ? 'mb-6' : 'mb-0'}`}>
                 {title}
               </h2>
               {subtitle && (
                 <p className="text-zinc-400 text-lg leading-relaxed whitespace-pre-line">
                   {subtitle}
                 </p>
               )}
            </div>

            <div className="flex flex-col">
              {items.map((item, idx) => (
                <div 
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className="group cursor-pointer relative"
                >
                  <div className={`flex items-start gap-4 md:gap-6 py-6 border-b transition-colors duration-300 ${activeId === item.id ? 'border-zinc-100' : 'border-zinc-800 group-hover:border-zinc-600'}`}>
                    <div className="flex-1">
                       <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${activeId === item.id ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                          {item.title}
                       </h3>
                
                      <motion.div
                        initial={false}
                        animate={{ 
                          height: activeId === item.id ? 'auto' : 0,
                          opacity: activeId === item.id ? 1 : 0,
                          marginTop: activeId === item.id ? 12 : 0
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        {/* Mobile-Only Inline Image */}
                        <div className="md:hidden w-full aspect-video rounded-xl overflow-hidden mb-4 bg-zinc-900 border border-zinc-800">
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-cover opacity-80" 
                          />
                        </div>

                        <p className="text-lg text-zinc-400 leading-relaxed whitespace-pre-line pb-4">
                          {item.desc}
                        </p>
                      </motion.div>
                    </div>

                    <div className="shrink-0 pt-1">
                      {activeId === item.id ? (
                        <Minus className="w-6 h-6 text-white" />
                      ) : (
                        <Plus className="w-6 h-6 text-zinc-600 group-hover:text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {note && (
                <div className="mt-8 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800 flex gap-4 text-base text-zinc-400 leading-relaxed">
                  <Info className="w-6 h-6 text-zinc-500 shrink-0 mt-0.5" />
                  <div>{note}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// --- Data Constants ---
const SECTION_1_ITEMS = [
  {
    id: 's1-1',
    title: '태블릿/QR 메뉴판 동시 지원',
    desc: '매장 환경에 따라 태블릿 메뉴판과 스마트폰 QR 메뉴판을 자유롭게 선택하세요. 다이닝의 무드에 맞춰 기기를 최소화하거나, 태블릿으로 화려한 비주얼을 강조할 수 있습니다.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 's1-4',
    title: '브랜드 가치를 높이는 웰컴 카드',
    desc: '단순한 QR 스티커가 아닙니다. 매장의 로고와 아이덴티티를 담은 프리미엄 웰컴 카드로 고객에게 특별한 첫인상을 선물합니다. 테이블의 품격을 한 단계 높여보세요.',
    image: 'https://images.unsplash.com/photo-1574016156263-7fef3854b4e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 's1-3',
    title: '스마트 직원 호출 시스템',
    desc: '"물 주세요", "티슈 주세요" 등 반복적인 요청을 터치 한 번으로. 직원에게는 정확한 내용이 알림으로 전달되어, 불필요한 동선을 줄이고 서비스의 질을 높입니다.',
    image: 'https://images.unsplash.com/photo-1755050411644-7f9f41c095e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  }
];

const SECTION_2_ITEMS = [
  {
    id: 's2-1',
    title: '직관적인 실시간 메뉴 편집',
    desc: '새로운 시즌 메뉴가 출시되었나요? 개발자에게 연락할 필요 없이 관리자 페이지에서 메뉴명, 가격, 사진, 원산지 정보까지 즉시 수정하고 반영할 수 있습니다.',
    image: 'https://images.unsplash.com/photo-1489925461942-d8f490a04588?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwdGFibGV0JTIwbWFuYWdlbWVudCUyMGRhcmt8ZW58MXx8fHwxNzcwMDA5NDY4fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 's2-2',
    title: '터치 한 번으로 품절 관리',
    desc: '갑작스러운 재료 소진에도 당황하지 마세요. 주방이나 홀 어디서든 스마트폰으로 즉시 품절 처리가 가능하여 고객의 주문 실수를 미연에 방지합니다.',
    image: 'https://images.unsplash.com/photo-1597667756343-810c1d7069be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVmJTIwdXNpbmclMjBpcGFkJTIwa2l0Y2hlbiUyMGRhcmt8ZW58MXx8fHwxNzcwMDA5NDcyfDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 's2-3',
    title: '데이터 기반 운영 인사이트',
    desc: '어떤 메뉴가 가장 많이 조회되었을까요? 단순한 감이 아닌, 축적된 데이터를 바탕으로 고객 선호도를 파악하고 다음 시즌 메뉴 구성을 최적화하세요.',
    image: 'https://images.unsplash.com/photo-1578070581071-d9b52bf80993?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwYW5hbHl0aWNzJTIwZGFzaGJvYXJkJTIwc2NyZWVuJTIwZGFya3xlbnwxfHx8fDE3NzAwMDk0NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
  }
];

const FLOW_GUEST_ITEMS = [
  { num: "01", title: "프리미엄 웰컴", desc: "테이블에 비치된 정갈한 QR 웰컴 카드가\n고객을 맞이하며 브랜드의 첫인상을 전합니다.", img: "https://images.unsplash.com/photo-1550966871-3ed3c6227685?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { num: "02", title: "메뉴 탐색", desc: "고객의 스마트폰으로 선명한 메뉴 사진과\n상세한 설명을 여유롭게 둘러봅니다.", img: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { num: "03", title: "다국어 지원", desc: "한국어, 영어, 중어, 일어 4개 국어 지원으로\n외국인 손님도 불편함 없이 메뉴를 확인합니다.", img: "https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { num: "04", title: "스마트 호출", desc: "필요한 것이 있다면 조용히 호출 버튼을.\n요청 사항이 정확히 전달되어 서비스가 매끄러워집니다.", img: "https://images.unsplash.com/photo-1748813792553-1999ee082427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" }
];

const FLOW_MANAGER_ITEMS = [
  { num: "01", title: "직원 알림 수신", desc: "주방/홀 대시보드 및 워치 등으로 알림을 수신하여\n즉각적으로 고객의 니즈에 대응합니다.", img: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { num: "02", title: "메뉴 품절 관리", desc: "재료 소진 시 대시보드에서 즉시 품절 처리하여\n고객의 주문 혼선을 사전에 방지합니다.", img: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { num: "03", title: "메뉴판 수정", desc: "시즌 메뉴, 가격 변동 등 수정 사항을\n언제 어디서나 관리자 페이지에서 즉시 반영하세요.", img: "https://images.unsplash.com/photo-1641630376356-fb9e646b0ea4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { num: "04", title: "운영 리포트", desc: "메뉴 조회수, 호출 빈도 등 데이터를 통해\n고객의 선호도를 파악하고 운영을 개선합니다.", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" }
];

const HERO_IMAGES = [
  { src: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-40 h-64 md:w-52 md:h-80" },
  { src: "https://images.unsplash.com/photo-1550966871-3ed3c6227685?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-64 h-40 md:w-80 md:h-52" },
  { src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-40 h-64 md:w-52 md:h-80" },
  { src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-64 h-40 md:w-80 md:h-52" },
];

const TEMPLATE_DESIGNS = [
  { id: 1, name: "Minimal Cafe", desc: "깔끔하고 모던한 카페 스타일", img: "https://images.unsplash.com/photo-1625173616412-7b403d49a41e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 2, name: "Premium Dark", desc: "고급스러운 다이닝 스타일", img: "https://images.unsplash.com/photo-1755938864715-f7bac3718dd7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 3, name: "Bright Brunch", desc: "밝고 화사한 브런치 스타일", img: "https://images.unsplash.com/photo-1603826567611-b2db0416d0d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 4, name: "Zen Japanese", desc: "정갈한 일식 스타일", img: "https://images.unsplash.com/photo-1630748662890-11623a758d6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 5, name: "Classic Italian", desc: "전통적인 양식 스타일", img: "https://images.unsplash.com/photo-1762631178750-c069ab20602c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 6, name: "Sweet Dessert", desc: "디저트가 돋보이는 스타일", img: "https://images.unsplash.com/photo-1662711976451-c703bac11506?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 7, name: "Moody Bar", desc: "분위기 있는 바 스타일", img: "https://images.unsplash.com/photo-1759358342214-c23ed81014bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" },
  { id: 8, name: "Vibrant Asian", desc: "생동감 넘치는 아시안 스타일", img: "https://images.unsplash.com/photo-1759299710388-690bf2305e59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080" }
];

const CUSTOM_DESIGNS = [
  { id: 101, name: "Brand Identity", desc: "브랜드 철학을 담은 UI/UX", img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1000&auto=format&fit=crop" },
  { id: 102, name: "Custom Illustrations", desc: "일러스트레이터 협업 아트워크", img: "https://images.unsplash.com/photo-1620646146036-7c9890833152?q=80&w=1000&auto=format&fit=crop" },
  { id: 103, name: "Interactive Motion", desc: "시선을 사로잡는 모션 그래픽", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop" },
  { id: 104, name: "Unique Layout", desc: "독창적인 메뉴 그리드 설계", img: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1000&auto=format&fit=crop" }
];

const DiningPlan = () => {
  const [isSetupDetailOpen, setIsSetupDetailOpen] = React.useState(false);
  const [designTab, setDesignTab] = React.useState<'template' | 'custom'>('template');
  
  const scrollRefFlow1 = React.useRef<HTMLDivElement>(null);
  const scrollRefFlow2 = React.useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const marqueeItems = [...HERO_IMAGES, ...HERO_IMAGES, ...HERO_IMAGES, ...HERO_IMAGES];

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-zinc-100 selection:text-black text-zinc-100">
      
      {/* Hero Section (Replaced with Marquee Style from Pro V1.0) */}
      <div className="pt-32 pb-20 overflow-hidden bg-black">
        <motion.div 
          className="flex items-start gap-8 md:gap-24 pl-4 md:pl-16"
          animate={{ x: "-50%" }}
          transition={{ 
            duration: 180, 
            ease: "linear", 
            repeat: Infinity 
          }}
          style={{ width: "fit-content" }}
        >
          {/* Double the list for seamless loop effect */}
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <div 
              key={idx} 
              className={`relative shrink-0 rounded-2xl overflow-hidden shadow-lg border border-zinc-800 hover:border-zinc-500 transition-colors ${item.sizeClass}`}
            >
              <img 
                src={item.src} 
                alt="Table Scene Moment" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 opacity-80 hover:opacity-100"
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* 1. Intro & Target (Dark) */}
      <section id="intro" className="pt-10 pb-12 md:pb-12 bg-black relative z-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-0 leading-tight whitespace-pre-line">
              웹 메뉴판과 프리미엄 QR 웰컴 카드,<br />
              <span className="text-zinc-500">매장의 품격을 완성하는</span> 완벽한 조화
            </h2>
          </motion.div>
        </div>

        {/* Target Audience Recommendation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 md:mt-16 max-w-6xl mx-auto px-6"
        >
          <div className="py-0 md:py-10 border-none md:border-y border-zinc-800">
            <div className="grid md:grid-cols-3 md:gap-12 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
              {[
                {
                  target: "Fine Dining",
                  desc: "분위기와 서비스 흐름이 중요한 공간"
                },
                {
                  target: "Wine Bar & Omakase",
                  desc: "어두운 조명과 정갈한 무드가 생명인 곳"
                },
                {
                  target: "Casual Dining",
                  desc: "감성적인 인테리어와 디테일이 핵심인 매장"
                }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center text-center px-4 py-5 md:py-0">
                  <h3 className="font-bold text-white text-lg md:text-xl mb-2 flex items-center gap-2">
                    {item.target}
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mb-1" />
                  </h3>
                  <p className="text-sm md:text-base text-zinc-400 word-keep break-keep leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 2. Phygital Experience (Dark Card Concept) */}
        <div className="relative max-w-6xl mx-auto mt-24 px-6 mb-24">
            <div className="bg-zinc-100 rounded-[2.5rem] p-8 md:p-16">
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
                    
                    <div className="w-full md:w-1/2">
                       <motion.div
                         initial={{ opacity: 0, scale: 0.95 }}
                         whileInView={{ opacity: 1, scale: 1 }}
                         viewport={{ once: true }}
                         className="relative aspect-[4/5] md:aspect-[3/4] bg-white rounded-sm shadow-2xl p-8 md:p-12 flex flex-col justify-between max-w-md mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-500 border border-zinc-200"
                       >
                         
                         <div className="relative z-10 text-center mt-8">
                            <div className="w-16 h-16 border border-zinc-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                               <span className="font-serif font-bold text-xl italic text-zinc-900">T</span>
                            </div>
                            <h3 className="font-serif text-3xl text-zinc-900 mb-2">Table Scene</h3>
                            <p className="text-zinc-500 font-serif italic text-sm tracking-widest uppercase">Premium Dining</p>
                         </div>

                         <div className="relative z-10 flex flex-col items-center mt-auto mb-8">
                            <div className="w-32 h-32 bg-white p-2 mb-6 shadow-sm border border-zinc-100">
                               <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Example" alt="QR Code" className="w-full h-full" />
                            </div>
                            <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-1">Scan for Menu</p>
                         </div>
                       </motion.div>
                    </div>

                    <div className="w-full md:w-1/2">
                       <motion.div
                         initial={{ opacity: 0, x: 20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         viewport={{ once: true }}
                       >
                         
                         <h2 className="text-3xl md:text-5xl font-bold text-black mb-6 leading-tight">
                           종이의 물성,<br/>디지털의 확장
                         </h2>
                         <p className="text-lg text-zinc-600 leading-relaxed mb-10">
                           단 한 장의 카드, 그 안에 담긴 깊이를 경험하세요.<br className="hidden md:block"/>
                           테이블씬 DINING은 웹 메뉴판과 완벽하게 조화를 이루는<br className="hidden md:block"/>
                           <span className="text-black font-bold underline decoration-zinc-400 decoration-2 underline-offset-4">프리미엄 QR 웰컴 카드</span>를 제작해 드립니다.
                         </p>

                         <div className="space-y-8">
                            <div className="flex gap-4">
                               <div className="shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-sm">
                                  <Check className="w-5 h-5" />
                               </div>
                               <div>
                                  <strong className="block text-black text-xl mb-2">고급스러운 첫인상</strong>
                                  <p className="text-zinc-600 text-lg leading-relaxed">복잡한 메뉴 리스트 대신, 정갈한 브랜드 정보와 QR 코드만 담아 매장의 분위기를 해치지 않고 고급스러움을 극대화했습니다.</p>
                               </div>
                            </div>
                            <div className="flex gap-4">
                               <div className="shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-sm">
                                  <RefreshCcw className="w-5 h-5" />
                               </div>
                               <div>
                                  <strong className="block text-black text-xl mb-2">유연한 디지털 연결</strong>
                                  <p className="text-zinc-600 text-lg leading-relaxed">종이는 변하지 않지만, QR 속 메뉴는 매일 새로워질 수 있습니다. 메뉴 수정 시 종이를 다시 인쇄할 필요가 없습니다.</p>
                               </div>
                            </div>
                         </div>
                       </motion.div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 2. Feature Details (Accordion) - Dark Mode */}
      <FeatureAccordionSection
        id="section-1"
        title={<>태블릿이 없어도,<br/>모든 것이 완벽하게.</>}
        subtitle="고가의 하드웨어 도입 없이도 스마트한 매장 운영이 가능합니다."
        items={SECTION_1_ITEMS}
      />

      <FeatureAccordionSection
        id="section-2"
        title={<>복잡한 코딩 없이,<br/>클릭만으로 자유롭게.</>}
        subtitle="외주 업체 연락 없이, 사장님 전용 대시보드에서 매장 정보를 직접 관리하세요."
        items={SECTION_2_ITEMS}
        alignRight={true}
      />

      {/* 4. Smart Operation Flow (Split into 2 Parts) - Dark Mode Restored */}
      <section className="py-16 md:py-32 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 space-y-32">
           
           {/* Part 1: Guest Experience */}
           <div className="relative">
               <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-800 font-bold rounded-full text-sm md:text-base shadow-sm">PART 1</div>
                        <h3 className="text-xl md:text-3xl font-bold text-white">고객의 경험 (Guest Experience)</h3>
                      </div>
                      <p className="text-zinc-500 font-medium pb-1">"입장부터 퇴장까지 끊김 없는 디지털 다이닝"</p>
                  </div>
                  <div className="hidden md:flex gap-2 shrink-0">
                     <button onClick={() => scroll(scrollRefFlow1, 'left')} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                     </button>
                     <button onClick={() => scroll(scrollRefFlow1, 'right')} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <ArrowRight className="w-6 h-6" />
                     </button>
                  </div>
               </div>

               <div ref={scrollRefFlow1} className="flex gap-6 md:gap-10 overflow-x-auto pb-8 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                   {FLOW_GUEST_ITEMS.map((item, idx) => (
                     <div key={idx} className="flex-none w-[320px] md:w-[400px] snap-center group">
                        <div className="flex items-center justify-center mb-6 relative h-6">
                            <div className="w-3 h-3 rounded-full bg-zinc-800 z-10 ring-4 ring-black relative group-hover:bg-white transition-colors"></div>
                            {idx < FLOW_GUEST_ITEMS.length - 1 && (
                              <div className="absolute left-1/2 top-[11px] h-px bg-zinc-900 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] z-0"></div>
                            )}
                        </div>

                        <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 flex flex-col pt-12 px-8 border border-zinc-800 group-hover:border-zinc-700 transition-colors shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black z-0" />
                            
                            <div className="relative z-10 flex flex-col h-full text-center">
                                <div className="mb-8">
                                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                                    {item.title}
                                  </h3>
                                  <p className="text-zinc-400 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                    {item.desc}
                                  </p>
                                </div>

                                <div className="mt-auto relative w-full h-[55%] rounded-t-2xl overflow-hidden border-t border-x border-zinc-800 group-hover:-translate-y-2 transition-transform duration-500 bg-black/40">
                                    <ImageWithFallback src={item.img} alt={item.title} className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                     </div>
                   ))}
               </div>
           </div>

           {/* Part 2: Manager Operation */}
           <div className="relative">
               <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-zinc-900 text-zinc-300 border border-zinc-800 font-bold rounded-full text-sm md:text-base shadow-sm">PART 2</div>
                        <h3 className="text-xl md:text-3xl font-bold text-white">매장의 운영 (Store Operation)</h3>
                      </div>
                      <p className="text-zinc-500 font-medium pb-1">"데이터 기반의 스마트하고 효율적인 관리"</p>
                  </div>
                  <div className="hidden md:flex gap-2 shrink-0">
                     <button onClick={() => scroll(scrollRefFlow2, 'left')} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                     </button>
                     <button onClick={() => scroll(scrollRefFlow2, 'right')} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <ArrowRight className="w-6 h-6" />
                     </button>
                  </div>
               </div>

               <div ref={scrollRefFlow2} className="flex gap-6 md:gap-10 overflow-x-auto pb-8 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                   {FLOW_MANAGER_ITEMS.map((item, idx) => (
                     <div key={idx} className="flex-none w-[320px] md:w-[400px] snap-center group">
                        <div className="flex items-center justify-center mb-6 relative h-6">
                            <div className="w-3 h-3 rounded-full bg-zinc-800 z-10 ring-4 ring-black relative group-hover:bg-white transition-colors"></div>
                            {idx < FLOW_MANAGER_ITEMS.length - 1 && (
                              <div className="absolute left-1/2 top-[11px] h-px bg-zinc-900 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] z-0"></div>
                            )}
                        </div>

                        <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 flex flex-col pt-12 px-8 border border-zinc-800 group-hover:border-zinc-700 transition-colors shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black z-0" />
                            
                            <div className="relative z-10 flex flex-col h-full text-center">
                                <div className="mb-8">
                                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                                    {item.title}
                                  </h3>
                                  <p className="text-zinc-400 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                    {item.desc}
                                  </p>
                                </div>

                                <div className="mt-auto relative w-full h-[55%] rounded-t-2xl overflow-hidden border-t border-x border-zinc-800 group-hover:-translate-y-2 transition-transform duration-500 bg-black/40">
                                    <ImageWithFallback src={item.img} alt={item.title} className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                     </div>
                   ))}
               </div>
           </div>

        </div>
      </section>

      {/* 5.5 Design Templates (Grid View - All Visible) */}
      <section className="py-24 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white leading-tight">
                 웹 메뉴판 디자인 미리보기
              </h2>
              <p className="text-lg text-zinc-400">
                 웹 메뉴판과 웰컴 카드가 하나의 언어로 완성됩니다.<br/>
                 매장의 톤앤매너에 맞는 디자인을 선택하세요.
              </p>
           </div>

           {/* Category Tabs */}
           <div className="flex justify-center gap-2 mb-12">
             <button 
               onClick={() => setDesignTab('template')}
               className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                 designTab === 'template' 
                   ? 'bg-white text-black' 
                   : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
               }`}
             >
               템플릿 8종
             </button>
             <button 
               onClick={() => setDesignTab('custom')}
               className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                 designTab === 'custom' 
                   ? 'bg-white text-black' 
                   : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
               }`}
             >
               디자인 커스터마이징
               <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                 designTab === 'custom'
                   ? 'bg-[#F8E731] text-black'
                   : 'bg-[#F8E731] text-black'
               }`}>
                 유료
               </span>
             </button>
           </div>

           {/* Templates Grid (2x4 or 4x2) */}
           <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {(designTab === 'template' ? TEMPLATE_DESIGNS : CUSTOM_DESIGNS).map((item, idx) => {
                 // Dynamic Styles for Mockups based on index/theme
                 // For Custom designs, we might want to vary the dark/light logic or keep it consistent
                 const isDark = designTab === 'template' ? [1, 6].includes(idx) : idx % 2 === 0; 
                 const cardBg = isDark ? "bg-[#1c1c1c]" : "bg-[#f8f8f8]";
                 const cardText = isDark ? "text-zinc-200" : "text-zinc-800";
                 const containerBg = idx % 2 === 0 ? "bg-zinc-800/50" : "bg-zinc-800/30";

                 return (
                    <div key={item.id} className="group w-full">
                       <div className={`relative aspect-[4/5] rounded-2xl ${containerBg} border border-zinc-700/50 overflow-hidden p-6 flex flex-col transition-all duration-500 group-hover:border-zinc-500 group-hover:-translate-y-2`}>
                          
                          {/* Header */}
                          <div className="relative z-10 mb-4 text-center">
                             <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-1 block">
                               {designTab === 'template' ? `Type 0${item.id}` : 'Custom Type'}
                             </span>
                             <h3 className="text-xl font-bold text-white leading-tight">{item.name}</h3>
                          </div>

                          {/* Mockup Composition */}
                          <div className="relative flex-1 w-full mt-2">
                             
                             {/* Physical Card Mockup (Back) */}
                             <div 
                                className={`absolute left-1/2 -translate-x-[60%] top-4 w-32 h-44 ${cardBg} rounded-lg shadow-xl rotate-[-6deg] group-hover:rotate-[-8deg] transition-transform duration-500 p-4 flex flex-col justify-between border border-white/5 z-0`}
                             >
                                <div className="text-center pt-2">
                                   <div className={`w-6 h-6 rounded-full border ${isDark ? 'border-zinc-600' : 'border-zinc-300'} mx-auto mb-2 flex items-center justify-center`}>
                                      <span className={`font-serif italic font-bold text-sm ${cardText}`}>T</span>
                                   </div>
                                </div>
                                <div className="w-full aspect-square bg-white p-1">
                                   <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Example" className="w-full h-full opacity-90" alt="QR"/>
                                </div>
                             </div>

                             {/* Digital Phone Mockup (Front) */}
                             <div 
                                className="absolute left-1/2 translate-x-[-10%] bottom-0 w-28 h-48 bg-black rounded-[1.5rem] border-[4px] border-zinc-800 shadow-2xl rotate-[3deg] group-hover:rotate-[0deg] group-hover:scale-105 transition-all duration-500 overflow-hidden z-10"
                             >
                                <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                             </div>
                          </div>
                       </div>
                    </div>
                 );
              })}
           </div>

           {/* Customizing CTA */}
           <div className="bg-zinc-800 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 border border-zinc-700 shadow-xl">
              <div className="flex-1 text-center md:text-left">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-white text-xs font-bold mb-3 uppercase tracking-wide">
                    <Sparkles size={14} className="text-white" /> Premium Customizing
                 </div>
                 <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    매장만의 <span className="text-zinc-400">특별한 아이덴티티</span>가 필요하신가요?
                 </h3>
                 <p className="text-zinc-300 leading-relaxed">
                    기본 템플릿 이상의 가치, 브랜드의 철학을 담은 <strong>맞춤형 디자인</strong>을 경험해보세요.
                 </p>
              </div>

              <div className="shrink-0">
                 <Link to="/services/design-customizing" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                    자세히 보기
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>
           </div>
        </div>
      </section>

      {/* 6. Package Details (Dark Mode) */}
      <section className="py-24 bg-black border-t border-zinc-900" id="package-details">
        <div className="max-w-7xl mx-auto px-6">
           <div className="mb-20 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white leading-tight">패키지 상세 구성 및 비용</h2>
              <p className="text-lg text-zinc-400">프리미엄 웹 메뉴판과 웰컴 카드로 <span className="text-white font-bold">매장의 품격</span>을 완성하세요.</p>
           </div>
           
           <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 mb-12">
                    {/* Pricing */}
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-8">요금 안내 (1년 약정)</h3>
                      <div className="space-y-6">
                        {/* 1. Monthly Fee */}
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-zinc-500 font-medium text-lg block mb-2">월 이용료</span>
                                <span className="bg-[#F8E731] text-black text-xs font-bold px-2 py-1 rounded-full">50% 할인</span>
                            </div>
                            <div className="text-right">
                                <span className="text-zinc-600 line-through text-base block mb-1">58,000원</span>
                                <span className="text-4xl font-bold text-white block">29,000원<span className="text-sm font-normal text-zinc-500 ml-1">(VAT 별도)</span></span>
                                <p className="text-[11px] text-zinc-500 mt-2">
                                  호스팅 비용 및 유지보수 포함
                                </p>
                            </div>
                        </div>

                        {/* Included Item: QR Welcome Card */}
                        <div className="flex items-start justify-between py-2">
                           <div className="flex items-start gap-3">
                              <QrCode size={20} className="text-[#F8E731] mt-1 shrink-0" />
                              <div>
                                <span className="block text-zinc-200 font-bold text-base mb-1">
                                  QR 웰컴 카드 100매
                                  <span className="text-[#F8E731] ml-2 text-sm font-normal">(첫 달 1회 무료)</span>
                                </span>
                                <span className="block text-zinc-500 text-sm">고급 수입지 인쇄 및 배송 포함 (최초 1회 한정)</span>
                              </div>
                           </div>
                           <span className="text-xs font-bold text-[#F8E731] mt-2">기본 제공</span>
                        </div>

                        <div className="w-full h-px bg-zinc-800" />

                        {/* 2. Installation Fee */}
                        <div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-zinc-500 font-medium text-lg block mb-2">초기 설치비</span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-[#F8E731] text-black text-xs font-bold px-2 py-1 rounded-full">50% 할인</span>
                                        <button 
                                          onClick={() => setIsSetupDetailOpen(!isSetupDetailOpen)}
                                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors underline decoration-zinc-600 underline-offset-2"
                                        >
                                          상세 내역 {isSetupDetailOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-zinc-600 line-through text-base block mb-1">278,000원</span>
                                    <span className="text-3xl font-bold text-white block">139,000원<span className="text-sm font-normal text-zinc-500 ml-1">(VAT 별도)</span></span>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isSetupDetailOpen && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="pt-6 mt-4 border-t border-dashed border-zinc-800 bg-zinc-900/30 -mx-2 px-4 pb-6 rounded-lg">
                                      <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <Settings size={16} className="text-zinc-400"/>
                                        초기 세팅 상세 항목
                                      </p>
                                      
                                      <ul className="space-y-3 pl-2">
                                          <li className="flex items-start gap-2 text-[13px] text-zinc-400">
                                              <Check size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                                              <span><strong className="text-zinc-300">클라우드 서버 구축:</strong> AWS 기반 고성능 호스팅 환경 세팅</span>
                                          </li>
                                          <li className="flex items-start gap-2 text-[13px] text-zinc-400">
                                              <Check size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                                              <span><strong className="text-zinc-300">보안 인증서 적용:</strong> SSL 암호화 통신 적용 (HTTPS)</span>
                                          </li>
                                          <li className="flex items-start gap-2 text-[13px] text-zinc-400">
                                              <Check size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                                              <span><strong className="text-zinc-300">메뉴 데이터 등록:</strong> 메뉴 사진, 가격, 옵션 등 초기 데이터 입력 대행</span>
                                          </li>
                                          <li className="flex items-start gap-2 text-[13px] text-zinc-400">
                                              <Check size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                                              <span><strong className="text-zinc-300">관리자 계정 생성:</strong> 사장님 전용 대시보드 권한 설정 및 발급</span>
                                          </li>
                                      </ul>
                                    </div>
                                  </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                      </div>
                      
                      <div className="mt-8 p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-sm text-zinc-500">
                          <p className="mb-1"><span className="font-bold text-zinc-300">중도 해지 시:</span> 위약금 없음</p>
                          <p>이용 기간 내 제공받은 할인 금액(월 이용료 및 설치비) 전액 반환</p>
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <div className="flex items-center justify-between mb-8">
                         <h3 className="text-2xl font-bold text-white">유료 부가 서비스</h3>
                         <span className="text-sm px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full font-medium">Optional</span>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-start justify-between gap-4">
                           <div>
                              <h4 className="font-bold text-zinc-200 text-lg mb-1">인트로 페이지 제작</h4>
                              <p className="text-sm text-zinc-500">브랜드 이미지를 강조하는 시작 화면</p>
                           </div>
                           <span className="font-bold text-white whitespace-nowrap">50,000원~</span>
                        </div>
                        <div className="w-full h-px bg-zinc-800" />
                        <div className="flex items-start justify-between gap-4">
                           <div>
                              <h4 className="font-bold text-zinc-200 text-lg mb-1">게시판 페이지 추가</h4>
                              <p className="text-sm text-zinc-500">공지사항, 이벤트 등 정보 전달</p>
                           </div>
                           <span className="font-bold text-white whitespace-nowrap">50,000원</span>
                        </div>
                        <div className="w-full h-px bg-zinc-800" />
                         <div className="flex items-start justify-between gap-4">
                           <div>
                              <h4 className="font-bold text-zinc-200 text-lg mb-1">디자인 커스터마이징</h4>
                              <p className="text-sm text-zinc-500">브랜드 맞춤형 UI 디자인</p>
                           </div>
                           <span className="font-bold text-white whitespace-nowrap">별도 문의</span>
                        </div>
                      </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link 
                        to="/apply/menu" 
                        className="inline-flex items-center justify-center gap-2 bg-[#F8E731] hover:bg-[#E5D520] text-black text-xl font-bold px-16 py-5 rounded-full transition-all hover:scale-105 shadow-lg shadow-yellow-400/20"
                    >
                        바로 도입하기 <ArrowRight size={24}/>
                    </Link>
                </div>

                {/* Feature Details Accordion - Dark Mode */}
                <div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="details" className="border-b-0">
                      <AccordionTrigger className="text-xl font-bold text-white hover:no-underline py-8 justify-center hover:text-zinc-300 transition-colors">
                        <span className="flex items-center gap-2">
                           상세 기능 및 페이지 구성 보기
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                         <div className="grid md:grid-cols-2 gap-12 pt-4 pb-12 bg-zinc-900 rounded-3xl p-8 md:p-12 border border-zinc-800">
                            {/* Basic Functions */}
                            <div>
                              <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-zinc-700 pb-4">
                                 <Settings className="w-5 h-5" /> 기본 포함 기능
                              </h4>
                              <ul className="space-y-6">
                                 <li className="flex items-start gap-4">
                                   <div className="shrink-0 mt-1">
                                      <Tablet className="w-5 h-5 text-zinc-500" />
                                   </div>
                                   <div>
                                      <span className="block font-bold text-zinc-200 text-lg mb-1">모바일/태블릿 메뉴판</span>
                                      <span className="text-zinc-500">고해상도 이미지와 직관적인 UI</span>
                                   </div>
                                 </li>
                                 <li className="flex items-start gap-4">
                                   <div className="shrink-0 mt-1">
                                      <Bell className="w-5 h-5 text-zinc-500" />
                                   </div>
                                   <div>
                                      <span className="block font-bold text-zinc-200 text-lg mb-1">스마트 직원 호출</span>
                                      <span className="text-zinc-500">호출 항목 커스터마이징 가능</span>
                                   </div>
                                 </li>
                                 <li className="flex items-start gap-4">
                                   <div className="shrink-0 mt-1">
                                      <Languages className="w-5 h-5 text-zinc-500" />
                                   </div>
                                   <div>
                                      <span className="block font-bold text-zinc-200 text-lg mb-1">다국어 지원</span>
                                      <span className="text-zinc-500">한국어, 영어, 중어, 일어 4개 국어</span>
                                   </div>
                                 </li>
                              </ul>
                            </div>

                            {/* Basic Pages */}
                            <div>
                              <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-zinc-700 pb-4">
                                 <FileText className="w-5 h-5" /> 페이지 구성
                              </h4>
                              <ul className="space-y-6">
                                 <li className="flex items-start gap-4">
                                   <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                                   <div>
                                      <span className="block font-bold text-zinc-200 text-lg mb-1">소개 페이지</span>
                                      <span className="text-zinc-500">매장 스토리, 오시는 길, 영업시간 등 안내</span>
                                   </div>
                                 </li>
                                 <li className="flex items-start gap-4">
                                   <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                                   <div>
                                      <span className="block font-bold text-zinc-200 text-lg mb-1">메뉴 페이지</span>
                                      <span className="text-zinc-500">카테고리별 메뉴 및 상세 정보</span>
                                   </div>
                                 </li>
                              </ul>
                            </div>
                         </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
           </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />
    </div>
  );
};

export default DiningPlan;
