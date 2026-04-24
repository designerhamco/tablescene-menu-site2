import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Languages, RefreshCcw, Headset, Clock, MonitorSmartphone, Check, X, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight,
  Utensils, Wine, Coffee, HelpCircle, Palette, Settings, Award, AlertCircle, CreditCard, FileCheck,
  LayoutTemplate, Sparkles, FileText, Layers, TrendingUp, Zap, Plus, Minus, Tablet, Smartphone,
  BarChart3, MessageSquare, Users, Globe, Info, Monitor, MessageCircle, Download
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

// --- Feature Accordion Component ---
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

  // Mobile scroll interaction: Automatically expand items as they reach the center of the screen
  React.useEffect(() => {
    const handleScroll = () => {
      // Only enable on mobile
      if (window.innerWidth >= 768) return;

      const viewportCenter = window.innerHeight / 2;
      let closestId = null;
      let minDistance = Infinity;

      items.forEach(item => {
        const element = document.getElementById(`accordion-item-${id}-${item.id}`);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Calculate distance from element center to viewport center
          const elementCenter = rect.top + rect.height / 2;
          const distance = Math.abs(viewportCenter - elementCenter);
          
          // Check if the element is roughly within view
          if (distance < minDistance) {
            minDistance = distance;
            closestId = item.id;
          }
        }
      });

      if (closestId) {
        setActiveId(prev => (prev !== closestId ? closestId : prev));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set initial state correctly
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [id, items]);

  return (
    <section id={id} className="py-16 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid md:grid-cols-2 gap-16 lg:gap-24 items-start`}>
          {/* Image Area - Desktop Only */}
          <motion.div 
            className={`hidden md:block relative w-full aspect-square bg-zinc-100 rounded-3xl overflow-hidden ${alignRight ? 'md:order-2' : 'md:order-1'}`}
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
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          </motion.div>

          {/* Content Area */}
          <motion.div 
            className={`flex flex-col justify-center h-full ${alignRight ? 'md:order-1' : 'md:order-2'}`}
            initial={{ opacity: 0, x: alignRight ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className={subtitle ? "mb-12" : "mb-10"}>
               <h2 className={`text-3xl md:text-5xl font-bold leading-tight text-zinc-900 whitespace-pre-line ${subtitle ? 'mb-6' : 'mb-0'}`}>
                 {title}
               </h2>
               {subtitle && (
                 <p className="text-zinc-500 text-lg leading-relaxed whitespace-pre-line">
                   {subtitle}
                 </p>
               )}
            </div>

            <div className="flex flex-col">
              {items.map((item, idx) => (
                <div 
                  key={item.id}
                  id={`accordion-item-${id}-${item.id}`}
                  onClick={() => setActiveId(item.id)}
                  className="group cursor-pointer relative"
                >
                  <div className={`flex items-start gap-4 md:gap-6 py-6 border-b transition-colors duration-300 ${activeId === item.id ? 'border-zinc-900' : 'border-zinc-100 group-hover:border-zinc-300'}`}>
                    {/* Number removed for cleaner layout */}
                    
                    <div className="flex-1">
                       <h3 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${activeId === item.id ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
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
                  <div className="md:hidden w-full aspect-video rounded-xl overflow-hidden mb-4 bg-zinc-100">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  <p className="text-lg text-zinc-600 leading-relaxed whitespace-pre-line pb-4">
                    {item.desc}
                  </p>
                </motion.div>
                    </div>

                    {/* Interaction Icon */}
                    <div className="shrink-0 pt-1">
                      {activeId === item.id ? (
                        <Minus className="w-6 h-6 text-zinc-900" />
                      ) : (
                        <Plus className="w-6 h-6 text-zinc-300 group-hover:text-zinc-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Optional Note Section */}
              {note && (
                <div className="mt-8 p-6 bg-zinc-50 rounded-xl border border-zinc-100 flex gap-4 text-base text-zinc-600 leading-relaxed">
                  <Info className="w-6 h-6 text-zinc-400 shrink-0 mt-0.5" />
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
    title: 'PC·모바일 통합 주문 관리',
    desc: '테이블에서 고객이 직접 주문하고 결제(PG)까지 한 번에 완료합니다. 웹 메뉴판은 물론, 주문을 관리하는 대시보드(POS)까지 PC, 태블릿, 모바일 모든 환경에서 자유롭게 이용하실 수 있습니다.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 's1-3',
    title: '유연한 결제 방식 (온라인/카운터)',
    desc: "'지금 결제(온라인)'와 '카운터 결제(후불)' 옵션을 모두 지원합니다. 후불 선택 시 식사 후 카운터에서 소지하신 카드 리더기로 결제하시면 됩니다. (대시보드에서 '결제 완료' 처리 필요)",
    image: 'https://images.unsplash.com/photo-1594025741613-c039c2c3bffa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXltZW50JTIwY291bnRlciUyMHJlc3RhdXJhbnQlMjBjcmVkaXQlMjBjYXJkJTIwcmVhZGVyfGVufDF8fHx8MTc2OTU3MjI5Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

const SECTION_WAITING_ITEMS = [
  {
    id: 'w-1',
    title: '전화번호 하나로 간편 대기 등록',
    desc: '복잡한 가입 없이 전화번호만 입력하면 대기 등록이 완료됩니다. 고객에게는 카카오톡으로 실시간 순서와 예상 대기 시간을 자동으로 안내해 드립니다.',
    image: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwd2FpdGluZyUyMGxpc3QlMjB0YWJsZXQlMjBjdXN0b21lcnxlbnwxfHx8fDE3Njk0OTkyMDF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'w-2',
    title: '기다림을 매출로 바꾸는 선주문',
    desc: '입장 순서가 다가오면 알림톡으로 미리 메뉴를 보고 주문할 수 있습니다. 자리에 앉자마자 음식이 나오는 경험은 고객 만족도를 높이고 테이블 회전율을 극대화합니다.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGN1c3RvbWVycyUyMHdhaXRpbmclMjBvcmRlciUyMGZvb2R8ZW58MXx8fHwxNzY5MDY1MjMzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

const SECTION_2_ITEMS = [
  {
    id: 's2-1',
    title: '실시간 AI 재고/로스 관리',
    desc: '"식자재가 15% 남았습니다!" AI가 판매 속도와 재고 현황을 실시간으로 분석해 부족 시 빨간색 경고등으로 알려줍니다. 품절로 인한 손실은 막고, 불필요한 재고 로스는 획기적으로 줄여줍니다.',
    image: 'https://images.unsplash.com/photo-1703140950404-68f06e84a2c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBpbnZlbnRvcnklMjBhbGVydCUyMHJlZCUyMHdhcm5pbmclMjBkaWdpdGFsJTIwc2NyZWVufGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 's2-2',
    title: 'AI 매출 부스팅 & 타임 세일',
    desc: '"수요일 오전 10시, 주문이 저조하네요. 10% 할인을 시작할까요?"\n판매량이 낮은 시간대를 AI가 스스로 감지하여 최적의 할인을 제안합니다. [승인] 버튼 하나만 누르면 메뉴판에 할인이 즉시 적용됩니다.',
    image: 'https://images.unsplash.com/photo-1759459981354-f04e725cbe69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxlcyUyMGdyb3d0aCUyMGFuYWx5c2lzJTIwY2hhcnQlMjB0YWJsZXQlMjBjb2ZmZWUlMjBzaG9wfGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 's2-3',
    title: '데이터 기반 스마트 메뉴 추천',
    desc: '"이 메뉴를 주문한 고객 95%가 선택한 음료"\n100만 건 이상의 주문 데이터를 학습한 AI가 고객 취향에 딱 맞는 메뉴를 추천하여 객단가 상승을 유도합니다.',
    image: 'https://images.unsplash.com/photo-1609951734391-b79a50460c6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwcmVjb21tZW5kZWQlMjBtZW51JTIwZm9vZCUyMG9yZGVyaW5nJTIwdGFibGV0fGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

const SECTION_3_ITEMS = [
  {
    id: 's3-1',
    title: '천편일률적인 UI는 이제 그만',
    desc: '단순한 주문용 기계처럼 보이는 타사 디자인과 비교를 거부합니다. 브랜드의 격을 높여주는 세련된 레이아웃과 감성적인 비주얼로, 고객에게 "이 가게는 다르다"는 인상을 심어줍니다.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 's3-2',
    title: '종이 메뉴판의 감성을 디지털로',
    desc: '넘겨보는 재미가 있는 UX, 식욕을 자극하는 시원한 이미지 배치. 디지털 기기의 차가움 대신 아날로그 메뉴판이 주는 따뜻함과 미학을 기술로 구현했습니다.',
    image: 'https://images.unsplash.com/photo-1755938864715-f7bac3718dd7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  },
  {
    id: 's3-3',
    title: '유지보수도 직접, 간편하게',
    desc: '이 예쁜 메뉴판을 매번 외주 맡길 필요 없습니다. 관리자 대시보드에서 메뉴명, 가격, 사진은 물론 BEST 뱃지와 원산지 정보까지 클릭 몇 번으로 직접 수정할 수 있습니다.',
    image: 'https://images.unsplash.com/photo-1556740758-90de2742eefc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
  }
];

const FLOW_ITEMS = [
  { num: "01", title: "테이블 간편 주문", desc: "QR이나 태블릿으로 여유롭게 고르고 주문하세요.\n데이터는 즉시 대시보드(POS)로 전송됩니다.", img: "https://images.unsplash.com/photo-1763867641258-c8ea40860f7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwdGFibGUlMjBvcmRlciUyMHRhYmxldCUyMHFyJTIwY29kZXxlbnwxfHx8fDE3Njg3NDYyNjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", type: "digital" },
  { num: "02", title: "AI 메뉴 추천", desc: "고객 취향을 분석해 딱 맞는 메뉴를 제안합니다.\n고민 없는 선택으로 주문 회전율이 빨라집니다.", img: "https://images.unsplash.com/photo-1759459981354-f04e725cbe69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxlcyUyMGdyb3d0aCUyMGFuYWx5c2lzJTIwY2hhcnQlMjB0YWJsZXQlMjBjb2ZmZWUlMjBzaG9wfGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", type: "digital" },
  { num: "03", title: "상세 메뉴 정보", desc: "맛, 맵기, 알레르기 정보부터 인기 메뉴 추천까지.\n상세한 정보 제공으로 선택이 쉬워집니다.", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop", type: "digital" },
  { num: "04", title: "4개 국어 번역", desc: "한국어, 영어, 중어, 일어 4개 국어를 지원하여\n외국인 손님도 장벽 없이 편리하게 주문합니다.", img: "https://images.unsplash.com/photo-1625225977832-7de9c77a6048?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwbWVudSUyMG11bHRpJTIwbGFuZ3VhZ2UlMjB0cmFuc2xhdGlvbiUyMHRhYmxldHxlbnwxfHx8fDE3Njk0ODM3Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", type: "digital" },
  { num: "05", title: "스마트 직원 호출", desc: "필요한 항목을 터치 한 번으로 전달합니다.\n물, 티슈 등 요청 옵션을 자유롭게 설정하세요.", img: "https://images.unsplash.com/photo-1755050411644-7f9f41c095e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", type: "digital" },
  { num: "06", title: "웹 POS 통합 관리", desc: "주문 접수부터 주방 출력까지 한 번에 처리하고,\n조리 완료 시 고객에게 알림톡을 발송합니다.", note: "서빙 방식에 따라 알림톡 설정 가능", img: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", type: "operation" },
  { num: "07", title: "실시간 재고 관리", desc: "판매 속도와 재고 현황을 실시간 분석합니다.\n부족 시 알림을 보내 로스를 획기적으로 줄입니다.", img: "https://images.unsplash.com/photo-1703140950404-68f06e84a2c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBpbnZlbnRvcnklMjBhbGVydCUyMHJlZCUyMHdhcm5pbmclMjBkaWdpdGFsJTIwc2NyZWVufGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", type: "operation" },
  { num: "08", title: "타임 세일 제안", desc: "한가한 시간대를 감지해 할인을 제안합니다.\n승인 버튼만 누르면 타임 세일이 적용됩니다.", img: "https://images.unsplash.com/photo-1759459981354-f04e725cbe69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxlcyUyMGdyb3d0aCUyMGFuYWx5c2lzJTIwY2hhcnQlMjB0YWJsZXQlMjBjb2ZmZWUlMjBzaG9wfGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", type: "operation" },
  { num: "09", title: "단골 관리 CRM", desc: "휴대폰 번호로 간편하게 포인트를 적립합니다.\n재방문 고객은 포인트를 현금처럼 씁니다.", img: "https://images.unsplash.com/photo-1764795849878-59b546cfe9c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", type: "operation" },
  { num: "10", title: "매출 분석 리포트", desc: "일별 매출, 인기 메뉴, 시간대별 주문 현황을\n그래프로 한눈에 보고 인사이트를 얻습니다.", img: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", type: "operation" }
];

const HERO_IMAGES = [
  { src: "https://images.unsplash.com/photo-1737573744382-73c017a9ab25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-40 h-64 md:w-52 md:h-80" }, // Portrait
  { src: "https://images.unsplash.com/photo-1547587091-f883cf8f0c12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-64 h-40 md:w-80 md:h-52" }, // Landscape
  { src: "https://images.unsplash.com/photo-1730635250911-b787fbc7e90f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-40 h-64 md:w-52 md:h-80" }, // Portrait
  { src: "https://images.unsplash.com/photo-1755053757912-a63da9d6e0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600", sizeClass: "w-64 h-40 md:w-80 md:h-52" }, // Landscape
];

const PRODUCTS = [
  { 
    id: 1, 
    name: 'QR 스탠드', 
    desc: '테이블 공간 활용을 극대화하는 심플한 디자인',
    price: '18,000원', 
    image: 'https://images.unsplash.com/photo-1574016156263-7fef3854b4e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080' 
  },
  { 
    id: 2, 
    name: '태블릿 기기 대여', 
    desc: '초기 비용 부담 없이 최신형 기기를 렌탈하세요',
    price: '월 25,000원~', 
    image: 'https://images.unsplash.com/photo-1614801502766-e2562eb626d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080' 
  },
  { 
    id: 3, 
    name: '태블릿 거치 악세서리', 
    desc: '어떤 인테리어에도 어울리는 고급 메탈 소재',
    price: '45,000원', 
    image: 'https://images.unsplash.com/photo-1691973171948-6dc9a857c7ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080' 
  },
];

// Design Templates Data
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

const PORTFOLIO_TABS = ['PRO', 'DINING'];

// Shared Image Pool
const IMAGES = {
  waiting: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  order: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  points: "https://images.unsplash.com/photo-1764795849878-59b546cfe9c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  staff: "https://images.unsplash.com/photo-1748813792553-1999ee082427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  menu: "https://images.unsplash.com/photo-1641630376356-fb9e646b0ea4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  kitchen: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  language: "https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  board: "https://images.unsplash.com/photo-1520410973988-f551cf36c60d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  intro: "https://images.unsplash.com/photo-1570894808314-677b57f25e45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  pickup: "https://images.unsplash.com/photo-1651871034133-8b0597aa5088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  about: "https://images.unsplash.com/photo-1624695065686-8ec2a55d82fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  // Dashboard specific images
  dashboard_sales: "https://images.unsplash.com/photo-1575388902449-6bca946ad549?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXNoYm9hcmQlMjBhbmFseXRpY3MlMjBjaGFydHMlMjB0YWJsZXQlMjBkYXJrJTIwbW9kZXxlbnwxfHx8fDE3Njk1MDg0NjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
  dashboard_order: "https://images.unsplash.com/photo-1693138172109-5ccffa2845fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwcG9zJTIwb3JkZXIlMjBtYW5hZ2VtZW50JTIwc3lzdGVtJTIwdWl8ZW58MXx8fHwxNzY5NTA4NDY0fDA&ixlib=rb-4.1.0&q=80&w=1080",
  dashboard_menu: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwbWVudSUyMGVkaXRvciUyMGludGVyZmFjZSUyMHRhYmxldHxlbnwxfHx8fDE3Njk1MDg0NjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
  dashboard_ai: "https://images.unsplash.com/photo-1759459981354-f04e725cbe69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxlcyUyMGdyb3d0aCUyMGFuYWx5c2lzJTIwY2hhcnQlMjB0YWJsZXQlMjBjb2ZmZWUlMjBzaG9wfGVufDF8fHx8MTc2OTQ5OTMyMXww&ixlib=rb-4.1.0&q=80&w=1080"
};

const DASHBOARD_FEATURES = [
  { id: 'd1', text: "실시간 매출 현황", image: IMAGES.dashboard_sales, type: 'left' },
  { id: 'd2', text: "실시간 주문 접수", image: IMAGES.dashboard_order, type: 'left' },
  { id: 'd3', text: "테이블/웨이팅 관리", image: IMAGES.kitchen, type: 'left' },
  { id: 'd4', text: "메뉴/품절 관리", image: IMAGES.dashboard_menu, type: 'right' },
  { id: 'd5', text: "회원/포인트 관리", image: IMAGES.points, type: 'right' },
  { id: 'd6', text: "AI 마케팅 설정", image: IMAGES.dashboard_ai, type: 'right' }
];

const CONTENT = {
  PRO: {
    features: [
      { id: 'p_waiting', text: "스마트 웨이팅", image: IMAGES.waiting, type: 'function' },
      { id: 'p2', text: "주문/결제/알림톡", image: IMAGES.order, type: 'function' },
      { id: 'p_points', text: "멤버십/포인트", image: IMAGES.points, type: 'function' },
      { id: 'p4', text: "직원호출", image: IMAGES.staff, type: 'function' },
      { id: 'p5', text: "언어변경", image: IMAGES.language, type: 'function' },
      { id: 'p9', text: "인트로 페이지", image: IMAGES.intro, type: 'page', isPaid: true },
      { id: 'p7', text: "메뉴페이지", image: IMAGES.menu, type: 'page' },
      { id: 'p11', text: "소개 페이지", image: IMAGES.about, type: 'page' },
      { id: 'p8', text: "게시판 페이지", image: IMAGES.board, type: 'page', isPaid: true }
    ]
  },
  DINING: {
    features: [
      { id: 's2', text: "커스터마이징 직원호출", image: IMAGES.staff, type: 'function' },
      { id: 's3', text: "언어변경", image: IMAGES.language, type: 'function' },
      { id: 's1', text: "메뉴페이지", image: IMAGES.menu, type: 'page' },
      { id: 's6', text: "소개 페이지", image: IMAGES.about, type: 'page' },
      { id: 's5', text: "인트로 페이지", image: IMAGES.intro, type: 'page', isPaid: true },
      { id: 's4', text: "게시판 페이지", image: IMAGES.board, type: 'page', isPaid: true }
    ]
  },
  LITE: {
    features: [
      { id: 'l1', text: "메뉴페이지", image: IMAGES.menu, type: 'page' },
      { id: 'l3', text: "인트로 페이지", image: IMAGES.intro, type: 'page', isPaid: true },
      { id: 'l2', text: "게시판 페이지", image: IMAGES.board, type: 'page', isPaid: true }
    ]
  }
};

const ProAiPlan = () => {
  const [activeFeatureIndex, setActiveFeatureIndex] = React.useState(0);
  const [deviceMode, setDeviceMode] = React.useState<'tablet' | 'mobile'>('tablet');
  const [isMobileScreen, setIsMobileScreen] = React.useState(false);
  const [viewTab, setViewTab] = React.useState<'service' | 'dashboard'>('service');
  const [designTab, setDesignTab] = React.useState<'template' | 'custom'>('template');
  
  // Slider states
  const [activeSlide1, setActiveSlide1] = React.useState(0);
  const [activeSlide2, setActiveSlide2] = React.useState(0);

  const scrollRef1 = React.useRef<HTMLDivElement>(null);
  const scrollRef2 = React.useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, setIndex: (i: number) => void) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const itemWidth = window.innerWidth < 768 ? 324 : 420; // Approximate item width + gap
    const index = Math.round(scrollLeft / itemWidth);
    setIndex(index);
  };

  React.useEffect(() => {
    const checkScreen = () => setIsMobileScreen(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  React.useEffect(() => {
    setActiveFeatureIndex(0);
  }, [viewTab]);

  const serviceFeatures = CONTENT['PRO'].features;
  const currentFeatures = viewTab === 'service' ? serviceFeatures : DASHBOARD_FEATURES;
  const currentFeature = currentFeatures[activeFeatureIndex];
  
  const handlePrev = () => {
    setActiveFeatureIndex((prev) => (prev > 0 ? prev - 1 : currentFeatures.length - 1));
  };

  const handleNext = () => {
    setActiveFeatureIndex((prev) => (prev < currentFeatures.length - 1 ? prev + 1 : 0));
  };

  const onDragEnd = (event: any, info: any) => {
    // Only allow swipe on mobile
    if (!isMobileScreen) return;
    
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -50 || velocity < -500) {
      handleNext();
    } else if (offset > 50 || velocity > 500) {
      handlePrev();
    }
  };
  
  const leftFeatures = viewTab === 'service' 
    ? serviceFeatures.filter(f => f.type === 'function')
    : DASHBOARD_FEATURES.filter(f => f.type === 'left');

  const rightFeatures = viewTab === 'service'
    ? serviceFeatures.filter(f => f.type === 'page')
    : DASHBOARD_FEATURES.filter(f => f.type === 'right');

  // Create a seamless loop with enough items
  const marqueeItems = [...HERO_IMAGES, ...HERO_IMAGES, ...HERO_IMAGES, ...HERO_IMAGES];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-zinc-900 selection:text-white">
      
      {/* Top Marquee Section */}
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
              className={`relative shrink-0 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow ${item.sizeClass}`}
            >
              <img 
                src={item.src} 
                alt="Table Scene Moment" 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* 1. Intro & Target */}
      <section id="intro" className="pt-10 pb-12 md:pb-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-0 leading-tight whitespace-pre-line">
              테이블오더와 마케팅을 하나로,<br />
              매출까지 잡는 <span className="text-zinc-500">올인원 메뉴판</span>
            </h2>
          </motion.div>
        </div>

        {/* Diagram Container from AllInOneFlow */}
        <div className="relative max-w-6xl mx-auto mt-16 px-6">
          
          {/* Top Row: Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
            {[
              {
                id: 1,
                icon: <Users className="w-6 h-6" />,
                title: "스마트 웨이팅",
                desc: "대기 등록 및 입장 안내,\n미리 주문하는 선주문"
              },
              {
                id: 2,
                icon: <Tablet className="w-6 h-6" />,
                title: "주문 & 결제",
                desc: "웹 메뉴판 결제(PG),\n웹 POS 실시간 연동"
              },
              {
                id: 3,
                icon: <Bell className="w-6 h-6" />,
                title: "스마트 직원 호출",
                desc: "진동벨 없는 호출,\n요청 항목 자유 설정"
              },
              {
                id: 4,
                icon: <MessageCircle className="w-6 h-6" />,
                title: "CRM & 멤버십",
                desc: "결제 시 포인트 적립,\n현금처럼 즉시 사용"
              }
            ].map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl px-3 py-6 md:px-6 md:py-8 border border-zinc-100 transition-shadow relative group text-center flex flex-col items-center h-full z-10"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-zinc-900 mb-2 md:mb-3">
                  {card.title}
                </h3>
                <p className="text-base md:text-lg text-zinc-500 leading-relaxed whitespace-pre-line">
                  {card.desc}
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
                   <div className="text-zinc-400 text-sm font-bold tracking-wider uppercase mb-2">테이블씬 웹메뉴판</div>
                   <div className="text-xl lg:text-2xl font-bold tracking-tight mb-4">올인원 PRO</div>
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
              <div className="block relative group w-full lg:w-auto">
                 <div className="bg-white text-zinc-900 px-10 py-6 lg:py-8 rounded-[2rem] shadow-xl border border-zinc-200 flex flex-col items-center md:items-start text-center md:text-left min-w-[280px] h-full justify-between">
                   <div className="text-zinc-400 text-sm font-bold tracking-wider uppercase mb-2">AI Service</div>
                   <div className="text-xl lg:text-2xl font-bold tracking-tight mb-2">AI 마케팅 자동화</div>
                   <span className="bg-[#F8E731] text-black text-sm font-bold px-1.5 py-0.5 rounded leading-none inline-block">NEW</span>
                 </div>
              </div>

            </div>
          </motion.div>

          {/* Feature Flexibility Notice */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-20 flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center gap-2 text-zinc-400 mb-4">
               <div className="h-px w-12 bg-zinc-200"></div>
               <span className="text-xs font-bold tracking-widest uppercase">CUSTOMIZABLE SETTINGS</span>
               <div className="h-px w-12 bg-zinc-200"></div>
            </div>
            
            <h3 className="text-xl md:text-2xl font-bold text-zinc-900 mb-3">
              필요한 기능만 <span className="text-blue-600">ON</span>, 불필요한 기능은 <span className="text-zinc-400">OFF</span>
            </h3>
            
            <p className="text-zinc-500 max-w-2xl mx-auto leading-relaxed">
              위의 4가지 핵심 기능(웨이팅, 주문/결제, 호출, 멤버십)을 포함해 모든 기능은<br className="hidden md:block"/>
              매장 상황에 맞춰 <span className="text-zinc-900 font-medium border-b border-zinc-300 pb-0.5">관리자 페이지에서 자유롭게 켜고 끌 수 있습니다.</span>
            </p>
          </motion.div>

        </div>
      </section>

      {/* 2. Brand & Design Group */}
      <div className="bg-white text-zinc-900">
        
        {/* 2-1. All-in-One Platform */}
        <FeatureAccordionSection
          id="custom-design"
          title={<>PC, 태블릿, 모바일 무엇이든<br /><span className="text-zinc-500">웹 POS로 활용하세요</span></>}
          items={SECTION_1_ITEMS}
          alignRight={false}
        />

        {/* Removed Smart Waiting Section */}

        {/* 2-2. AI Marketing Hub */}
        <FeatureAccordionSection
          id="marketing-hub"
          title={<>마케팅부터 재고 관리까지,<br/><span className="text-zinc-500">AI 점장에게 맡기세요</span></>}
          items={SECTION_2_ITEMS}
          alignRight={true}
        />

        {/* 2-3. Menu Management */}
        <FeatureAccordionSection
          id="menu-management"
          title={<>단순한 주문 기기가 아닙니다.<br /><span className="text-zinc-500">브랜드의 품격이 담긴 메뉴판</span>입니다.</>}
          items={SECTION_3_ITEMS}
          alignRight={false}
        />


      </div>

      {/* Service Screen Preview (Moved) */}
      <section className="relative py-24 pb-24 md:pb-48 bg-white text-zinc-900 overflow-hidden border-t border-zinc-100">
          <div className="max-w-7xl mx-auto px-2 md:px-6 w-full relative">
            
            {/* Header Section */}
            <div className="text-center mb-10 relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight leading-tight text-black">
                {viewTab === 'service' ? "서비스 화면 미리보기" : "대시보드 화면 미리보기"}
              </h2>
              
              {/* Tab & Device Controls */}
              <div className="flex flex-col items-center gap-6">
                 {/* View Tab */}
                 <div className="bg-zinc-100 p-1.5 rounded-full border border-zinc-200 flex items-center shadow-inner">
                    <button
                        onClick={() => setViewTab('service')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-base font-bold transition-all ${
                            viewTab === 'service' 
                            ? 'bg-white text-black shadow-md ring-1 ring-black/5' 
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                        서비스 화면
                    </button>
                    <button
                        onClick={() => setViewTab('dashboard')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-base font-bold transition-all ${
                            viewTab === 'dashboard' 
                            ? 'bg-white text-black shadow-md ring-1 ring-black/5' 
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                        대시보드 화면
                    </button>
                 </div>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 w-full">
                
                {/* Desktop Left Features */}
                {currentFeatures.length > 0 && (
                    <div className="hidden md:flex flex-col gap-4 w-1/4 text-right items-end justify-center min-h-[300px]">
                        {leftFeatures.map((feature, idx) => (
                            <button
                                key={feature.id}
                                onClick={() => setActiveFeatureIndex(idx)}
                                className={`group transition-all duration-300 ${activeFeatureIndex === idx ? 'opacity-100 translate-x-0' : 'opacity-40 hover:opacity-70 hover:-translate-x-2'}`}
                            >
                                <h3 className={`text-lg font-bold mb-1 flex items-center justify-end gap-2 ${activeFeatureIndex === idx ? 'text-black' : 'text-zinc-400'}`}>
                                    {feature.text}
                                    {feature.isPaid && (
                                        <span className="text-[10px] bg-[#F8E731] text-black px-1.5 py-0.5 rounded-full leading-none font-bold">유료</span>
                                    )}
                                </h3>
                                {activeFeatureIndex === idx && (
                                    <motion.div layoutId="activeLineLeft" className="w-full h-0.5 bg-black mt-1 origin-right" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Center Device Mockup Wrapper */}
                <div className="order-first md:order-none mb-2 md:mb-0 shrink-0 flex items-center justify-center gap-1 sm:gap-2 relative w-full md:w-auto">
                    {/* Mobile Left Arrow */}
                    <button 
                        onClick={handlePrev}
                        className="md:hidden p-1 text-zinc-300 hover:text-black transition-colors z-20 -mr-2"
                        aria-label="Previous Feature"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    {/* Device Mockup */}
                    <motion.div 
                        layout
                        drag={isMobileScreen ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={onDragEnd}
                        initial={false}
                        animate={{ 
                            width: isMobileScreen 
                                ? (deviceMode === 'tablet' ? '85vw' : '70vw') 
                                : (deviceMode === 'tablet' ? 700 : 340),
                            
                            aspectRatio: deviceMode === 'tablet' ? '4/3' : '9/16',
                            borderRadius: deviceMode === 'tablet' ? '1.5rem' : '2.5rem',
                        }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        className="relative z-10 bg-zinc-900 border-[8px] border-zinc-900 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentFeature ? currentFeature.id : 'empty'}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="w-full h-full relative bg-zinc-800"
                            >
                                {currentFeature && (
                                    <img 
                                        src={currentFeature.image} 
                                        alt={currentFeature.text} 
                                        className="w-full h-full object-cover pointer-events-none"
                                    />
                                )}
                                
                                <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />
                                
                                {currentFeatures.length > 0 && (
                                    <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none z-20">
                                        <span className="inline-block px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase text-white/90 border border-white/10">
                                            {currentFeature?.text}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Mobile Right Arrow */}
                    <button 
                        onClick={handleNext}
                        className="md:hidden p-1 text-zinc-300 hover:text-black transition-colors z-20 -ml-2"
                        aria-label="Next Feature"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Device Toggle (Subtle - Below Mockup) */}
                <div className="md:hidden flex justify-center gap-4 mt-2 w-full order-2">
                    <button
                        onClick={() => setDeviceMode('tablet')}
                        className={`p-2 rounded-full transition-colors ${
                            deviceMode === 'tablet' ? 'bg-zinc-100 text-black' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                        aria-label="Tablet View"
                    >
                        <Tablet className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setDeviceMode('mobile')}
                        className={`p-2 rounded-full transition-colors ${
                            deviceMode === 'mobile' ? 'bg-zinc-100 text-black' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                         aria-label="Mobile View"
                    >
                        <Smartphone className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Desktop Device Toggle (Absolute - Minimal) */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-12 hidden md:flex items-center gap-2 z-20">
                    <button
                        onClick={() => setDeviceMode('tablet')}
                        className={`p-3 rounded-full transition-all duration-300 group hover:bg-zinc-100 ${
                            deviceMode === 'tablet' ? 'text-zinc-900 bg-zinc-50 ring-1 ring-zinc-200' : 'text-zinc-300'
                        }`}
                        title="PC/Tablet View"
                    >
                         <Tablet className={`w-5 h-5 transition-transform duration-300 ${deviceMode === 'tablet' ? 'scale-110' : 'scale-100'}`} />
                    </button>
                    
                    <div className="w-1 h-1 rounded-full bg-zinc-200" />
                    
                    <button
                        onClick={() => setDeviceMode('mobile')}
                        className={`p-3 rounded-full transition-all duration-300 group hover:bg-zinc-100 ${
                            deviceMode === 'mobile' ? 'text-zinc-900 bg-zinc-50 ring-1 ring-zinc-200' : 'text-zinc-300'
                        }`}
                        title="Mobile View"
                    >
                         <Smartphone className={`w-5 h-5 transition-transform duration-300 ${deviceMode === 'mobile' ? 'scale-110' : 'scale-100'}`} />
                    </button>
                </div>

                {/* Desktop Right Features */}
                {currentFeatures.length > 0 && (
                    <div className="hidden md:flex flex-col gap-4 w-1/4 text-left items-start justify-center min-h-[300px]">
                        {rightFeatures.map((feature, idx) => {
                            const realIdx = idx + leftFeatures.length;
                            return (
                                <button
                                    key={feature.id}
                                    onClick={() => setActiveFeatureIndex(realIdx)}
                                    className={`group transition-all duration-300 ${activeFeatureIndex === realIdx ? 'opacity-100 translate-x-0' : 'opacity-40 hover:opacity-70 hover:translate-x-2'}`}
                                >
                                    <h3 className={`text-lg font-bold mb-1 flex items-center gap-2 ${activeFeatureIndex === realIdx ? 'text-black' : 'text-zinc-400'}`}>
                                        {feature.text}
                                        {feature.isPaid && (
                                            <span className="text-[10px] bg-[#F8E731] text-black px-1.5 py-0.5 rounded-full leading-none font-bold">유료</span>
                                        )}
                                    </h3>
                                    {activeFeatureIndex === realIdx && (
                                        <motion.div layoutId="activeLineRight" className="w-full h-0.5 bg-black mt-1 origin-left" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Mobile Features List (Bottom) */}
                {currentFeatures.length > 0 && (
                    <div className="md:hidden w-full mt-2 px-2">
                        {/* Functions Section */}
                        {leftFeatures.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-zinc-500 mb-3 px-1 uppercase tracking-wider">
                                    {viewTab === 'service' ? "주요 기능" : "운영 관리"}
                                </h4>
                                <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
                                    {leftFeatures.map((feature, idx) => (
                                        <button
                                            key={feature.id}
                                            onClick={() => setActiveFeatureIndex(idx)}
                                            className={`flex-shrink-0 w-32 p-3 rounded-xl border text-center transition-all ${
                                                activeFeatureIndex === idx 
                                                ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' 
                                                : 'bg-white border-zinc-200 text-zinc-600'
                                            }`}
                                        >
                                            <h3 className="text-base font-bold truncate flex items-center justify-center gap-1">
                                                {feature.text}
                                                {feature.isPaid && (
                                                    <span className="text-[9px] bg-[#F8E731] text-black px-1 py-0.5 rounded-full leading-none">유료</span>
                                                )}
                                            </h3>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pages Section */}
                        {rightFeatures.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-zinc-500 mb-3 px-1 uppercase tracking-wider">
                                    {viewTab === 'service' ? "화면 구성" : "설정 및 관리"}
                                </h4>
                                <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
                                    {rightFeatures.map((feature, idx) => {
                                        const realIdx = idx + leftFeatures.length;
                                        return (
                                            <button
                                                key={feature.id}
                                                onClick={() => setActiveFeatureIndex(realIdx)}
                                                className={`flex-shrink-0 w-32 p-3 rounded-xl border text-center transition-all ${
                                                    activeFeatureIndex === realIdx 
                                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' 
                                                    : 'bg-white border-zinc-200 text-zinc-600'
                                                }`}
                                            >
                                                <h3 className="text-base font-bold truncate flex items-center justify-center gap-1">
                                                    {feature.text}
                                                    {feature.isPaid && (
                                                        <span className="text-[9px] bg-[#F8E731] text-black px-1 py-0.5 rounded-full leading-none">유료</span>
                                                    )}
                                                </h3>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>

        </div>
    </section>

    {/* 3. Service Flow (PART 1 & 2 Combined) - Restored with Korean Titles */}
    <section id="seamless-flow" className="py-24 bg-zinc-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
           <span className="text-zinc-500 font-bold tracking-widest uppercase text-sm mb-4 block">SEAMLESS FLOW</span>
           <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900 leading-tight">
              고객 경험과 운영의 완벽한 조화
           </h2>
           <p className="text-lg text-zinc-600 leading-relaxed">
              매출을 높이는 <strong>디지털 경험</strong>과 감동을 주는 <strong>사람의 서비스</strong>가 하나로 연결됩니다.
           </p>
        </div>

        <div className="space-y-24">
           {/* Part 1: Digital Experience */}
           <div className="relative">
               <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="px-3 py-1 bg-zinc-900 text-white font-bold rounded-full text-sm md:text-base shadow-md">PART 1</div>
                     <h3 className="text-xl md:text-3xl font-bold text-zinc-900">압도적인 디지털 고객 경험</h3>
                  </div>
                  <div className="hidden md:flex gap-2">
                     <button onClick={() => scroll(scrollRef1, 'left')} className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                     </button>
                     <button onClick={() => scroll(scrollRef1, 'right')} className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors">
                        <ArrowRight className="w-6 h-6" />
                     </button>
                  </div>
               </div>

               {/* Horizontal Scroll Container */}
               <div ref={scrollRef1} onScroll={(e) => handleScroll(e, setActiveSlide1)} className="flex gap-6 md:gap-10 overflow-x-auto pb-8 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                   {FLOW_ITEMS.slice(0, 5).map((item, idx) => (
                     <div key={idx} className="flex-none w-[320px] md:w-[400px] snap-center group">
                        {/* Timeline Step */}
                        <div className="flex items-center justify-center mb-6 relative h-6">
                            <div className="w-3 h-3 rounded-full bg-zinc-300 z-10 ring-4 ring-zinc-50 relative"></div>
                            {idx < 4 && (
                              <div className="absolute left-1/2 top-[11px] h-px bg-zinc-200 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] z-0"></div>
                            )}
                        </div>

                        <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 flex flex-col pt-12 px-8 border border-zinc-800">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/50 to-zinc-900 z-0" />
                            
                            <div className="relative z-10 flex flex-col h-full text-center">
                                <div className="mb-8">
                                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                                    {item.title}
                                  </h3>
                                  <p className="text-zinc-400 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                    {item.desc}
                                  </p>
                                  {(item as any).note && (
                                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-sm">
                                      <Info className="w-3.5 h-3.5" />
                                      {(item as any).note}
                                    </div>
                                  )}
                                </div>

                                <div className="mt-auto relative w-full h-[55%] rounded-t-2xl overflow-hidden border-t border-x border-white/10 group-hover:-translate-y-2 transition-transform duration-500 bg-zinc-800">
                                    <ImageWithFallback src={item.img} alt={item.title} className="w-full h-full object-cover object-top" />
                                </div>
                            </div>
                        </div>
                     </div>
                   ))}
               </div>
           </div>

           {/* Part 2: Smart Operation */}
           <div className="relative">
               <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-zinc-900 text-white font-bold rounded-full text-sm md:text-base shadow-md">PART 2</div>
                        <h3 className="text-xl md:text-3xl font-bold text-zinc-900">데이터 기반의 스마트 매장 운영</h3>
                      </div>
                      <p className="text-zinc-500 font-medium pb-1">"웹 POS(대시보드)로 주문 접수부터 결제까지 매장 운영이 완벽해집니다."</p>
                  </div>
                  <div className="hidden md:flex gap-2 shrink-0">
                     <button onClick={() => scroll(scrollRef2, 'left')} className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                     </button>
                     <button onClick={() => scroll(scrollRef2, 'right')} className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors">
                        <ArrowRight className="w-6 h-6" />
                     </button>
                  </div>
               </div>

               {/* Horizontal Scroll Container */}
               <div ref={scrollRef2} onScroll={(e) => handleScroll(e, setActiveSlide2)} className="flex gap-6 md:gap-10 overflow-x-auto pb-8 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                   {FLOW_ITEMS.slice(5).map((item, idx) => (
                     <div key={idx} className="flex-none w-[320px] md:w-[400px] snap-center group">
                        {/* Timeline Step */}
                        <div className="flex items-center justify-center mb-6 relative h-6">
                            <div className="w-3 h-3 rounded-full bg-zinc-300 z-10 ring-4 ring-zinc-50 relative"></div>
                            {idx < FLOW_ITEMS.slice(5).length - 1 && (
                              <div className="absolute left-1/2 top-[11px] h-px bg-zinc-200 w-[calc(100%+1.5rem)] md:w-[calc(100%+2.5rem)] z-0"></div>
                            )}
                        </div>

                        <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 flex flex-col pt-12 px-8 border border-zinc-800">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/50 to-zinc-900 z-0" />
                            
                            <div className="relative z-10 flex flex-col h-full text-center">
                                <div className="mb-8">
                                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                                    {item.title}
                                  </h3>
                                  <p className="text-zinc-400 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                    {item.desc}
                                  </p>
                                  {(item as any).note && (
                                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-sm">
                                      <Info className="w-3.5 h-3.5" />
                                      {(item as any).note}
                                    </div>
                                  )}
                                </div>

                                <div className="mt-auto relative w-full h-[55%] rounded-t-2xl overflow-hidden border-t border-x border-white/10 group-hover:-translate-y-2 transition-transform duration-500 bg-zinc-800">
                                    <ImageWithFallback src={item.img} alt={item.title} className="w-full h-full object-cover object-top" />
                                </div>
                            </div>
                        </div>
                     </div>
                   ))}
               </div>
           </div>
        </div>
      </div>
    </section>

    {/* 5.5 Design Templates (New) */}
    <section className="py-24 bg-white border-t border-zinc-100">
      <div className="max-w-7xl mx-auto px-6">
         <div className="text-center mb-16">
            <span className="text-zinc-500 font-bold tracking-widest text-sm mb-4 block">DESIGN TEMPLATES</span>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-zinc-900 leading-tight">웹 메뉴판 디자인 미리보기</h2>

            {/* Design Tab Switcher - Updated Style */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
               <button
                   onClick={() => setDesignTab('template')}
                   className={`px-6 py-3 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${
                       designTab === 'template' 
                       ? 'bg-zinc-900 text-white shadow-lg scale-105' 
                       : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                   }`}
               >
                   템플릿 8종
               </button>
               <button
                   onClick={() => setDesignTab('custom')}
                   className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm md:text-base font-bold transition-all duration-300 ${
                       designTab === 'custom' 
                       ? 'bg-zinc-900 text-white shadow-lg scale-105' 
                       : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                   }`}
               >
                   디자인 커스터마이징
                   <span className={`text-[10px] px-1.5 py-0.5 rounded leading-none ${
                      designTab === 'custom'
                      ? 'bg-[#F8E731] text-zinc-900'
                      : 'bg-zinc-900 text-[#F8E731]'
                   }`}>유료</span>
               </button>
            </div>

            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              {designTab === 'template' ? (
                <>
                  테이블씬 PRO 플랜 (AI)에서는 매장 분위기에 맞는<br/>
                  <span className="text-zinc-900 font-semibold">8가지 프리미엄 디자인 템플릿</span> 중 하나를 선택하실 수 있습니다.
                </>
              ) : (
                <>
                  브랜드의 고유한 철학을 담고 싶으신가요?<br/>
                  <span className="text-zinc-900 font-semibold">전문 디자이너와의 1:1 맞춤 커스터마이징</span>을 지원합니다.
                </>
              )}
            </p>
         </div>

         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16">
           {(designTab === 'template' ? TEMPLATE_DESIGNS : CUSTOM_DESIGNS).map((item) => (
             <motion.div
               key={item.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.05 }}
               className="group cursor-pointer"
             >
               <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg mb-4 relative bg-white border border-zinc-100">
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors z-10" />
                 <img 
                   src={item.img}
                   alt={item.name}
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                 />
                 <div className="absolute bottom-4 left-4 z-20">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold text-zinc-900 shadow-sm">
                       {designTab === 'template' ? `Type 0${item.id}` : 'Custom'}
                    </span>
                 </div>
               </div>
               <h3 className="text-lg font-bold text-zinc-900 group-hover:text-black transition-colors">{item.name}</h3>
               <p className="text-base text-zinc-500">{item.desc}</p>
             </motion.div>
           ))}
         </div>

         {/* Custom Design Banner - Integrated */}
         <div className="mt-8 md:mt-12 bg-zinc-50 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex-1 text-center md:text-left">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-zinc-900 text-xs font-bold mb-3 uppercase tracking-wide">
               <Sparkles size={14} className="text-zinc-900" /> Premium Customizing
             </div>
             <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">
               매장만의 <span className="text-zinc-500">특별한 아이덴티티</span>가 필요하신가요?
             </h3>
             <p className="text-zinc-500 leading-relaxed">
               기본 템플릿 이상의 가치, 브랜드의 철학을 담은 <strong>맞춤형 디자인</strong>을 경험해보세요.
             </p>
           </div>

           <div className="shrink-0">
              <Link to="/services/design-customizing" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                자세히 보기
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>
         </div>
      </div>
    </section>

    {/* 6. Package Details (Restored) */}
    <section className="py-24 bg-white border-t border-zinc-100" id="package-details">
      <div className="max-w-7xl mx-auto px-6">
         <div className="mb-20 text-center">
            <span className="text-zinc-500 font-bold tracking-widest text-sm mb-4 block">DETAILED SPECS</span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900 leading-tight">패키지 상세 구성 및 비용</h2>
            <p className="text-lg text-zinc-600">스탠다드 패키지의 탄탄한 기본기에 <span className="text-zinc-900 font-bold">AI 프리미엄 기능</span>을 더했습니다.</p>
         </div>
         
         <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start mb-24">
             {/* Standard Package - Clean List */}
             <div className="w-full">
               <div className="flex items-center gap-3 mb-6 md:mb-8">
                 <div className="h-8 w-1 lg:h-10 lg:w-1.5 bg-zinc-900"></div>
                 <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-zinc-900">All-in-One <span className="text-sm lg:text-lg font-normal text-zinc-500 ml-2">통합 매장 관리</span></h3>
               </div>
               
               <div className="space-y-12">
                  {/* Basic Functions */}
                  <div>
                    <h4 className="flex items-center gap-2 text-lg font-bold text-zinc-900 mb-6 border-b border-zinc-100 pb-4">
                       <Settings className="w-5 h-5" /> 기본 포함 기능
                    </h4>
                    <ul className="space-y-6">
                       <li className="flex items-start gap-4">
                         <div className="shrink-0 mt-1">
                            <CreditCard className="w-5 h-5 text-zinc-400" />
                         </div>
                         <div>
                            <span className="block font-bold text-zinc-900 text-lg mb-1">온라인 주문 & 결제</span>
                            <span className="text-zinc-500">테이블오더, 선/후불 결제 완벽 지원 (PG사 연동)</span>
                         </div>
                       </li>
                       <li className="flex items-start gap-4">
                         <div className="shrink-0 mt-1">
                            <MessageCircle className="w-5 h-5 text-zinc-400" />
                         </div>
                         <div>
                            <span className="block font-bold text-zinc-900 text-lg mb-1">조리 완료 알림톡</span>
                            <span className="text-zinc-500">조리 완료 시 고객에게 픽업 알림 발송</span>
                         </div>
                       </li>
                       <li className="flex items-start gap-4">
                         <div className="shrink-0 mt-1">
                            <Bell className="w-5 h-5 text-zinc-400" />
                         </div>
                         <div>
                            <span className="block font-bold text-zinc-900 text-lg mb-1">스마트 직원 호출</span>
                            <span className="text-zinc-500">호출 항목 자유로운 커스터마이징 및 알림 전송</span>
                         </div>
                       </li>
                       <li className="flex items-start gap-4">
                         <div className="shrink-0 mt-1">
                            <Users className="w-5 h-5 text-zinc-400" />
                         </div>
                         <div>
                            <span className="block font-bold text-zinc-900 text-lg mb-1">멤버십 & 포인트</span>
                            <span className="text-zinc-500">전화번호 기반 간편 적립 및 고객 DB 확보</span>
                         </div>
                       </li>
                    </ul>
                  </div>

                  {/* Basic Pages */}
                  <div>
                    <h4 className="flex items-center gap-2 text-lg font-bold text-zinc-900 mb-6 border-b border-zinc-100 pb-4">
                       <FileText className="w-5 h-5" /> 페이지 구성
                    </h4>
                    <ul className="space-y-6">
                       <li className="flex items-start gap-4">
                         <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                         <div>
                            <span className="block font-bold text-zinc-900 text-lg mb-1">소개 페이지</span>
                            <span className="text-zinc-500">매장 위치, 주차, 예약 안내, SNS 링크 연동</span>
                         </div>
                       </li>
                       <li className="flex items-start gap-4">
                         <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                         <div>
                            <span className="block font-bold text-zinc-900 text-lg mb-1">메뉴 커버 & 메뉴판 (무제한)</span>
                            <span className="text-zinc-500">카테고리 분류 및 메뉴 상세 정보 제공</span>
                         </div>
                       </li>
                    </ul>
                  </div>
               </div>
             </div>

             {/* PRO Exclusive */}
             <div className="w-full">
               <div className="flex items-center gap-3 mb-6 md:mb-8">
                 <div className="h-8 w-1 lg:h-10 lg:w-1.5 bg-[#F8E731]"></div>
                 <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-zinc-900">AI Special <span className="text-sm lg:text-lg font-normal text-zinc-500 ml-2">AI 프리미엄 기능</span></h3>
               </div>

               <div className="bg-zinc-900 rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl">
                  <h4 className="flex items-center gap-2 text-lg font-bold text-[#F8E731] uppercase tracking-wider mb-8">
                     <Sparkles className="w-5 h-5" /> AI & Data Solutions
                  </h4>
                  <ul className="space-y-6 relative z-10">
                     <li className="flex gap-5">
                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#F8E731] border border-white/5">
                           <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                           <span className="block font-bold text-white text-lg mb-2">AI 매출/재고 분석</span>
                           <span className="text-zinc-400 leading-relaxed">판매 데이터 기반 재고 소진 예측 및 발주 알림으로 로스를 최소화합니다.</span>
                        </div>
                     </li>
                     <li className="flex gap-5">
                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#F8E731] border border-white/5">
                           <Zap className="w-6 h-6" />
                        </div>
                        <div>
                           <span className="block font-bold text-white text-lg mb-2">AI 매출 부스팅 & 타임 세일</span>
                           <span className="text-zinc-400 leading-relaxed">주문이 저조한 시간대를 AI가 감지하여 할인을 제안하고, 즉시 적용합니다.</span>
                        </div>
                     </li>
                     <li className="flex gap-5">
                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#F8E731] border border-white/5">
                           <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                           <span className="block font-bold text-white text-lg mb-2">실시간 재고/로스 관리</span>
                           <span className="text-zinc-400 leading-relaxed">식자재 판매 속도와 재고 현황을 실시간으로 분석해 부족 시 경고등으로 알려줍니다.</span>
                        </div>
                     </li>
                  </ul>
                  

               </div>
             </div>
           </div>

           {/* Pricing & Options - Minimal Design */}
           <div className="bg-zinc-50 rounded-[2rem] p-8 md:p-12 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 border-b border-zinc-200 pb-12 mb-12">
                  {/* Pricing */}
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900 mb-8">요금 안내 (1년 약정)</h3>
                    <div className="space-y-6">
                      <div className="flex items-end justify-between">
                          <div>
                              <span className="text-zinc-500 font-medium text-lg block mb-2">월 이용료</span>
                              <span className="bg-[#F8E731] text-black text-xs font-bold px-2 py-1 rounded-full">50% 할인</span>
                          </div>
                          <div className="text-right">
                              <span className="text-zinc-400 line-through text-base block mb-1">198,000원</span>
                              <span className="text-4xl font-bold text-zinc-900">99,000원</span>
                          </div>
                      </div>
                      <div className="w-full h-px bg-zinc-200" />
                      <div className="flex items-end justify-between">
                          <div>
                              <span className="text-zinc-500 font-medium text-lg block mb-2">초기 세팅비</span>
                              <span className="bg-[#F8E731] text-black text-xs font-bold px-2 py-1 rounded-full">50% 할인</span>
                          </div>
                           <div className="text-right">
                              <span className="text-zinc-400 line-through text-base block mb-1">300,000원</span>
                              <span className="text-3xl font-bold text-zinc-900">150,000원</span>
                          </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 p-4 bg-white rounded-xl border border-zinc-200 text-sm text-zinc-500">
                        <p className="mb-1"><span className="font-bold text-zinc-900">중도 해지 시:</span> 잔여 계약 금액의 20% 위약금 발생</p>
                        <p>이용 기간 내 제공받은 할인 금액(월 이용료 및 설치비) 전액 반환</p>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-2xl font-bold text-zinc-900">유료 부가 서비스</h3>
                       <span className="text-sm px-3 py-1 bg-white border border-zinc-200 text-zinc-500 rounded-full font-medium">Optional</span>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                         <div>
                            <h4 className="font-bold text-zinc-900 text-lg mb-1">인트로 페이지 제작</h4>
                            <p className="text-sm text-zinc-500">브랜드 이미지를 강조하는 시작 화면</p>
                         </div>
                         <span className="font-bold text-zinc-900 whitespace-nowrap">50,000원~</span>
                      </div>
                      <div className="w-full h-px bg-zinc-200" />
                      <div className="flex items-start justify-between gap-4">
                         <div>
                            <h4 className="font-bold text-zinc-900 text-lg mb-1">게시판 페이지 추가</h4>
                            <p className="text-sm text-zinc-500">공지사항, 이벤트 등 정보 전달</p>
                         </div>
                         <span className="font-bold text-zinc-900 whitespace-nowrap">50,000원</span>
                      </div>
                      <div className="w-full h-px bg-zinc-200" />
                       <div className="flex items-start justify-between gap-4">
                         <div>
                            <h4 className="font-bold text-zinc-900 text-lg mb-1">디자인 커스터마이징</h4>
                            <p className="text-sm text-zinc-500">브랜드 맞춤형 UI 디자인</p>
                         </div>
                         <span className="font-bold text-zinc-900 whitespace-nowrap">페이지당 50,000원~</span>
                      </div>
                    </div>
                  </div>
              </div>

              {/* Notice */}
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 text-sm text-zinc-500">
                 <div className="flex-1">
                    <span className="font-bold text-zinc-900 block mb-2 flex items-center gap-2"><CreditCard size={14}/> 결제 방식 안내</span>
                    <p className="leading-relaxed">본 서비스는 웹 메뉴판을 통한 <span className="text-zinc-900 font-semibold">온라인 결제</span>를 기본 지원합니다. 실물 카드 결제는 리더기 별도 구비 후 대시보드에서 수동 관리 가능합니다.</p>
                 </div>
                 <div className="flex-1">
                    <span className="font-bold text-zinc-900 block mb-2 flex items-center gap-2"><Monitor size={14}/> 영수증 프린터 호환성</span>
                    <p className="leading-relaxed"><span className="text-zinc-900 font-semibold">네트워크(LAN/Wi-Fi)</span> 및 <span className="text-zinc-900 font-semibold">ESC/POS 프로토콜</span> 지원 프린터만 호환됩니다.</p>
                 </div>
              </div>
           </div>
      </div>
    </section>

    {/* 7. ROI / Cost Effectiveness (Restored) */}
    <section id="roi" className="pt-24 pb-12 bg-zinc-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
      
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-white font-bold tracking-widest text-sm mb-4 block">COST EFFECTIVENESS</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">1년 뒤, 매장의 미래가 달라집니다</h2>
          <p className="text-zinc-400">단순한 메뉴판 교체가 아닌, 매장 운영 시스템의 혁신입니다.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-24 md:gap-24 items-center mb-8 pb-8">
           {/* Traditional */}
           <div className="text-center md:text-right opacity-60 hover:opacity-100 transition-opacity duration-300">
             <h3 className="text-xl font-bold text-zinc-400 mb-8">타사 서비스 개별 이용 시 (예상 비용)</h3>
             <div className="space-y-6 font-medium text-lg">
               <div className="flex justify-between md:justify-end gap-8">
                 <span className="text-zinc-500">테이블오더 솔루션 이용료 (20대 기준)</span>
                 <span>월 200,000원~</span>
               </div>
               <div className="flex justify-between md:justify-end gap-8">
                 <span className="text-zinc-500">기기 렌탈/할부비 (20대 기준)</span>
                 <span>월 200,000원~</span>
               </div>
               <div className="flex justify-between md:justify-end gap-8">
                 <span className="text-zinc-500">웨이팅 서비스</span>
                 <span>월 45,000원</span>
               </div>
               <div className="flex justify-between md:justify-end gap-8">
                 <span className="text-zinc-500">포인트 적립 서비스</span>
                 <span>월 35,000원</span>
               </div>
               <div className="flex justify-between md:justify-end gap-8">
                 <span className="text-zinc-500">재고관리 / 마케팅 툴</span>
                 <span>월 100,000원~</span>
               </div>
               <div className="pt-6 mt-2 border-t border-zinc-700 flex justify-between md:justify-end gap-8">
                 <span className="text-zinc-400">월 예상 운영 비용</span>
                 <span className="text-2xl line-through decoration-zinc-500">월 580,000원 + α</span>
               </div>
             </div>
           </div>

           {/* PRO Plan */}
           <div className="text-center md:text-left relative">
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bg-[#F8E731] text-black text-xs font-bold px-3 py-1 rounded-full animate-bounce z-10 whitespace-nowrap shadow-lg">
                압도적인 비용 절감 효과
             </div>
             <h3 className="text-2xl font-bold text-white mb-8 mt-2 md:mt-0">테이블씬 PRO (All-in-One)</h3>
             <div className="space-y-4 font-medium text-lg">
               <div className="flex justify-between md:justify-start gap-8">
                 <span className="text-zinc-300">스마트 직원 호출</span>
                 <span className="text-white font-bold">포함 (무제한)</span>
               </div>
               <div className="flex justify-between md:justify-start gap-8">
                 <span className="text-zinc-300">테이블오더 / 기기 렌탈</span>
                 <span className="text-white font-bold">포함 (기기 제약 없음)</span>
               </div>
               <div className="flex justify-between md:justify-start gap-8">
                 <span className="text-zinc-300">웨이팅 / 포인트 적립</span>
                 <span className="text-white font-bold">포함</span>
               </div>
               <div className="flex justify-between md:justify-start gap-8">
                  <span className="text-zinc-300">AI 재고 / 마케팅 솔루션</span>
                  <span className="text-white font-bold">포함</span>
               </div>
               <div className="flex justify-between md:justify-start gap-8">
                  <span className="text-zinc-300">초기 세팅비</span>
                  <span className="text-white font-bold text-right md:text-left">150,000원 <span className="text-sm font-medium text-white/80 block md:inline">(1회 납부)</span></span>
               </div>

               <div className="pt-8 mt-6 border-t border-white/20">
                   <div className="flex flex-col gap-6">
                      <div className="flex justify-between md:justify-start gap-8 items-center">
                           <div className="flex flex-col gap-1">
                              <span className="text-zinc-300 font-bold text-lg">월 확정 운영 비용</span>
                              <span className="text-xs text-zinc-500">(모든 기능 포함, 추가 비용 0원)</span>
                           </div>
                           <div className="text-right md:text-left">
                              <div className="flex flex-col md:flex-row md:items-baseline md:gap-3 justify-end md:justify-start">
                                  <span className="text-3xl md:text-4xl font-bold text-[#F8E731]">월 99,000원</span>
                                  <span className="text-sm font-medium text-zinc-400">VAT 포함</span>
                              </div>
                              <span className="text-xs text-zinc-500 block mt-1 md:mt-0">타사 대비 매월 약 48만원 절감</span>
                           </div>
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>

        <div className="mt-16 text-center">
            <Link 
                to="/apply" 
                className="inline-flex items-center justify-center gap-2 bg-[#F8E731] hover:bg-[#E5D520] text-black text-xl font-bold px-16 py-5 rounded-full transition-all hover:scale-105 shadow-lg shadow-yellow-400/20"
            >
                바로 도입하기 <ArrowRight size={24}/>
            </Link>
        </div>
      </div>
    </section>

    {/* 8. FAQ */}
    <FAQ />
  </div>
);
};

export default ProAiPlan;