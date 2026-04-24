import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

const services = [
  {
    id: 'web-menu-pro-v1',
    title: 'PRO 1.0',
    description: '주문, 결제, 호출 등 매장 운영의 핵심 기능을 모두 담은 실속형 올인원 솔루션.',
    image: 'https://images.unsplash.com/photo-1659035260002-11d486d6e9f5?q=80&w=1080',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    link: '/services/pro-v1'
  },
  {
    id: 'web-menu-dining',
    title: 'DINING',
    description: '웹 메뉴판과 완벽히 어우러지는 QR 웰컴 카드. 매장의 품격을 완성하는 프리미엄 솔루션.',
    image: 'https://images.unsplash.com/photo-1728044849280-10a1a75cff83?q=80&w=1080',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    link: '/services/signature'
  },
  {
    id: 'web-menu-pro-ai',
    title: 'PRO AI',
    description: 'AI가 매출과 재고를 분석하고 마케팅까지. 매장 운영의 패러다임을 바꾸는 차세대 솔루션.',
    image: 'https://images.unsplash.com/photo-1561284081-ebf6c977bbde?q=80&w=1080',
    video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    link: '#',
    isAi: true,
    disabled: true
  }
];

const ServiceCard = ({ service }: { service: typeof services[0] }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force play on mobile when state changes
  useEffect(() => {
    if (isMobile && videoRef.current && !service.disabled) {
      videoRef.current.volume = 0;
      videoRef.current.muted = true; // Ensure muted again for safety
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Mobile autoplay prevented:", error);
        });
      }
    }
  }, [isMobile, service.disabled]);

  const handleMouseEnter = () => {
    if (!isMobile && videoRef.current && !service.disabled) {
      videoRef.current.volume = 0;
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.log("Play failed", e));
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && videoRef.current && !service.disabled) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="h-full">
      <a
        href={service.link}
        className={`group block relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 transition-all duration-500 h-full w-full ${
          service.disabled ? 'cursor-not-allowed opacity-90' : 'hover:shadow-2xl'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => service.disabled && e.preventDefault()}
      >
        <div className="absolute inset-0">
          {/* Base Image */}
          <img 
            src={service.image} 
            alt={service.title}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
              service.disabled ? 'grayscale' : 'group-hover:scale-105'
            }`}
          />
          
          {/* Video Layer */}
          {!service.disabled && (
            <video
              ref={videoRef}
              src={service.video}
              muted
              loop
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500
                ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />
          
          {/* Disabled Overlay */}
          {service.disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
               <span className="text-white/60 font-black tracking-widest text-3xl drop-shadow-lg uppercase">
                 Coming Soon
               </span>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8 pointer-events-none">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight flex items-center gap-3">
            {service.title}
            {service.isAi && (
              <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full leading-none shadow-lg border border-white/20">
                AI
              </span>
            )}
            {!service.disabled && (
              <div className="ml-auto bg-white/10 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                 <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
            )}
          </h3>
          <p className="text-sm md:text-base text-zinc-300 font-medium leading-relaxed opacity-90 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            {service.description}
          </p>
        </div>
      </a>
    </div>
  );
};

const ServiceOverview = () => {
  return (
    <section className="py-24 bg-[#fcfcfc] overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="relative mb-16">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
             <span className="text-primary text-xs font-bold tracking-widest uppercase mb-4 block">Our Solutions</span>
             <h2 className="text-4xl md:text-6xl font-bold text-zinc-900 mb-6 tracking-tight leading-tight">
               우리의 서비스
             </h2>
             <p className="text-lg md:text-xl text-zinc-500 font-medium">
               완벽하게 연결된 올인원 시스템으로 완성된<br className="hidden md:block"/>
               테이블씬의 혁신적인 서비스를 만나보세요.
             </p>
          </div>
        </div>

        {/* Services Grid - Perfectly centered 3 items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="w-full"
            >
              <ServiceCard service={service} />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ServiceOverview;
