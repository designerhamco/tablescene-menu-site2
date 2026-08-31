import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tablet, Smartphone } from 'lucide-react';
// import { SmartWaitingUI } from './preview-ui/SmartWaitingUI'; // Not used

const TABS = ['PRO', 'DINING'];

// Shared Image Pool
const IMAGES = {
  waiting: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  order: "https://images.unsplash.com/photo-1728044849280-10a1a75cff83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  points: "https://images.unsplash.com/photo-1764795849878-59b546cfe9c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  staff: "https://images.unsplash.com/photo-1748813792553-1999ee082427?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  menu: "https://images.unsplash.com/photo-1641630376356-fb9e646b0ea4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  kitchen: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  language: "https://images.unsplash.com/photo-1542382257-80dedb725088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
};

const CONTENT = {
  PRO: {
    features: [
      { id: 'p1', text: "스마트 웨이팅", image: IMAGES.waiting }, // Removed component
      { id: 'p2', text: "주문/결제/알림톡", image: IMAGES.order },
      { id: 'p3', text: "포인트 적립 시스템", image: IMAGES.points },
      { id: 'p4', text: "직원호출", image: IMAGES.staff },
      { id: 'p5', text: "언어변경", image: IMAGES.language },
      { id: 'p6', text: "주방대시보드 연동", image: IMAGES.kitchen },
      { id: 'p7', text: "메뉴페이지", image: IMAGES.menu }
    ]
  },
  DINING: {
    features: [
      { id: 's1', text: "메뉴페이지", image: IMAGES.menu },
      { id: 's2', text: "직원호출", image: IMAGES.staff },
      { id: 's3', text: "언어변경", image: IMAGES.language }
    ]
  },
  LITE: {
    features: [
      { id: 'l1', text: "메뉴페이지", image: IMAGES.menu }
    ]
  }
};

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('PRO');
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [deviceMode, setDeviceMode] = useState<'tablet' | 'mobile'>('tablet');
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobileScreen(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    setActiveFeatureIndex(0);
  }, [activeTab]);

  const currentFeatures = CONTENT[activeTab as keyof typeof CONTENT].features;
  const currentFeature = currentFeatures[activeFeatureIndex];
  
  const splitIndex = Math.ceil(currentFeatures.length / 2);
  const leftFeatures = currentFeatures.slice(0, splitIndex);
  const rightFeatures = currentFeatures.slice(splitIndex);

  return (
    <section className="relative py-12 md:py-16 bg-white text-zinc-900 overflow-hidden min-h-screen flex flex-col justify-center">
      <div className="max-w-7xl mx-auto px-6 w-full relative">
        
        {/* Header Section */}
        <div className="text-center mb-10 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight leading-tight text-black">
            아티메뉴 서비스 화면 미리보기
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full text-xs md:text-sm font-bold tracking-widest transition-all uppercase ${
                  activeTab === tab 
                    ? 'bg-black text-white scale-105 shadow-lg' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Device Toggle Controls */}
          <div className="flex justify-center items-center gap-4">
             <div className="bg-zinc-100 p-1 rounded-full border border-zinc-200 flex items-center">
                <button
                    onClick={() => setDeviceMode('tablet')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        deviceMode === 'tablet' 
                        ? 'bg-white text-black shadow-md' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                    <Tablet className="w-4 h-4" />
                    PC・Tablet
                </button>
                <button
                    onClick={() => setDeviceMode('mobile')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        deviceMode === 'mobile' 
                        ? 'bg-white text-black shadow-md' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                >
                    <Smartphone className="w-4 h-4" />
                    Mobile
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
                            <h3 className={`text-lg font-bold mb-1 ${activeFeatureIndex === idx ? 'text-black' : 'text-zinc-400'}`}>
                                {feature.text}
                            </h3>
                            {activeFeatureIndex === idx && (
                                <motion.div layoutId="activeLineLeft" className="w-full h-0.5 bg-black mt-1 origin-right" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Center Device Mockup */}
            <motion.div 
                layout
                initial={false}
                animate={{ 
                    width: isMobileScreen 
                        ? (deviceMode === 'tablet' ? '90vw' : '70vw') 
                        : (deviceMode === 'tablet' ? 700 : 340), // Increased sizes for PC view: 500->700, 260->340
                    
                    aspectRatio: deviceMode === 'tablet' ? '4/3' : '9/16',
                    borderRadius: deviceMode === 'tablet' ? '1.5rem' : '2.5rem',
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                className="relative z-10 bg-zinc-900 border-[8px] border-zinc-900 shadow-2xl overflow-hidden order-first md:order-none mb-6 md:mb-0 shrink-0"
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
                            // @ts-ignore
                            currentFeature.component ? (
                                // @ts-ignore
                                currentFeature.component
                            ) : (
                                <img 
                                    src={currentFeature.image} 
                                    alt={currentFeature.text} 
                                    className="w-full h-full object-cover"
                                />
                            )
                        )}
                        
                        {/* Shadow Gradient only for images or generally */}
                        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />
                        
                        {/* Label only if features exist */}
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

            {/* Desktop Right Features */}
            {currentFeatures.length > 0 && (
                <div className="hidden md:flex flex-col gap-4 w-1/4 text-left items-start justify-center min-h-[300px]">
                    {rightFeatures.map((feature, idx) => {
                        const realIdx = idx + splitIndex;
                        return (
                            <button
                                key={feature.id}
                                onClick={() => setActiveFeatureIndex(realIdx)}
                                className={`group transition-all duration-300 ${activeFeatureIndex === realIdx ? 'opacity-100 translate-x-0' : 'opacity-40 hover:opacity-70 hover:translate-x-2'}`}
                            >
                                <h3 className={`text-lg font-bold mb-1 ${activeFeatureIndex === realIdx ? 'text-black' : 'text-zinc-400'}`}>
                                    {feature.text}
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
                <div className="md:hidden w-full grid grid-cols-2 gap-3 mt-2 px-2">
                    {currentFeatures.map((feature, idx) => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveFeatureIndex(idx)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                                activeFeatureIndex === idx 
                                ? 'bg-white border-black text-black shadow-md' 
                                : 'bg-white border-zinc-200 text-zinc-400'
                            }`}
                        >
                            <h3 className={`text-xs font-bold ${activeFeatureIndex === idx ? 'text-black' : 'text-zinc-400'}`}>
                                {feature.text}
                            </h3>
                        </button>
                    ))}
                </div>
            )}

        </div>

      </div>
    </section>
  );
};

export default Portfolio;
