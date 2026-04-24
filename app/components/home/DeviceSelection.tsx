import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronRight, Monitor, Smartphone, Tablet } from 'lucide-react';

const DeviceSelection = () => {
  return (
    <section className="py-24 bg-zinc-50 relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-6 tracking-tight leading-tight">
              설치 없는 웹 기반 서비스,<br className="hidden md:block" />
              모든 기기가 매장의 얼굴이 됩니다
            </h2>

            <p className="text-zinc-500 text-lg leading-relaxed word-keep-all">
              반응형 웹 기술로 PC, 태블릿, 모바일 어디서든 완벽하게 호환됩니다.<br className="hidden md:block" />
              복잡한 설치 없이, 매장 분위기에 어울리는 디바이스만 준비하세요.
            </p>
          </motion.div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          {/* Row 1 - Left: Tablet Stand */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="group relative aspect-[16/10] rounded-[2rem] overflow-hidden cursor-pointer bg-zinc-900"
          >
            <img 
              src="https://images.unsplash.com/photo-1489925461942-d8f490a04588?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB0YWJsZXQlMjBzdGFuZCUyMHJlc3RhdXJhbnQlMjB3b29kZW58ZW58MXx8fHwxNzY5MDUwNDIyfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Tablet Stand"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
            <div className="absolute top-8 left-8 right-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold tracking-wider text-xs md:text-sm uppercase">Smart Order</span>
                <Tablet className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-white mb-2">Tablet Stand</h3>
              <p className="text-white/70 font-medium text-sm md:text-base">카운터와 테이블, 어디든 자유롭게</p>
            </div>
          </motion.div>

          {/* Row 1 - Right: Wall Kiosk */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative aspect-[16/10] rounded-[2rem] overflow-hidden cursor-pointer bg-zinc-900"
          >
            <img 
              src="https://images.unsplash.com/photo-1692503466587-1a8d2a42a053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWxsJTIwbW91bnRlZCUyMGRpZ2l0YWwlMjBraW9zayUyMG9yZGVyaW5nfGVufDF8fHx8MTc2OTA1MDQyNnww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Wall Kiosk"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
            <div className="absolute top-8 left-8 right-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold tracking-wider text-xs md:text-sm uppercase">Kiosk Mode</span>
                <Monitor className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-white mb-2">Wall Kiosk</h3>
              <p className="text-white/70 font-medium text-sm md:text-base">벽면 공간을 활용한 효율적인 주문</p>
            </div>
          </motion.div>

          {/* Row 2 - Left: Mobile QR */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative aspect-[16/10] rounded-[2rem] overflow-hidden cursor-pointer bg-zinc-900"
          >
            <img 
              src="https://images.unsplash.com/photo-1761515397001-c8e82879c4c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FubmluZyUyMHFyJTIwY29kZSUyMG1lbnUlMjBzbWFydHBob25lJTIwcmVzdGF1cmFudHxlbnwxfHx8fDE3NjkwNTA0MzB8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Mobile QR"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
            <div className="absolute top-8 left-8 right-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold tracking-wider text-xs md:text-sm uppercase">Self Service</span>
                <Smartphone className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-white mb-2">Mobile QR</h3>
              <p className="text-white/70 font-medium text-sm md:text-base">고객의 스마트폰으로 즉시 주문</p>
            </div>
            {/* Badge */}
            <div className="absolute bottom-8 left-8 bg-white text-black px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-lg">
              QR 이미지 무료 제공
            </div>
          </motion.div>

          {/* Row 2 - Right: 4 Small Cards Grid */}
          <div className="aspect-[16/10] grid grid-cols-2 gap-4 md:gap-6">
            
            {/* Small 1: QR Stand */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white rounded-[1.5rem] p-4 md:p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-zinc-100 cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-zinc-900 leading-tight text-sm md:text-base">QR<br/>스탠드</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-300 group-hover:text-black transition-colors" />
              </div>
              <div className="flex-1 flex items-center justify-center py-2">
                 <img src="https://images.unsplash.com/photo-1707126186331-2d70ab33d3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200" className="w-full h-full object-contain rounded-lg" alt="QR Stand" />
              </div>
            </motion.div>

            {/* Small 2: Tablet Rental */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white rounded-[1.5rem] p-4 md:p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-zinc-100 cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-zinc-900 leading-tight text-sm md:text-base">태블릿<br/>기기 대여</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-300 group-hover:text-black transition-colors" />
              </div>
              <div className="flex-1 flex items-center justify-center py-2">
                 <img src="https://images.unsplash.com/photo-1638273266965-843b01e02a5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200" className="w-full h-full object-contain rounded-lg" alt="Rental" />
              </div>
            </motion.div>

            {/* Small 3: Accessories */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-white rounded-[1.5rem] p-4 md:p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-zinc-100 cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-zinc-900 leading-tight text-sm md:text-base">태블릿<br/>거치 악세서리</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-zinc-300 group-hover:text-black transition-colors" />
              </div>
              <div className="flex-1 flex items-center justify-center py-2">
                 <img src="https://images.unsplash.com/photo-1610664840481-10b7b43c9283?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200" className="w-full h-full object-contain rounded-lg" alt="Accessories" />
              </div>
            </motion.div>

            {/* Small 4: More */}
            <motion.a 
              href="/store"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="bg-zinc-50 rounded-[1.5rem] p-4 md:p-5 flex flex-col justify-center items-center hover:bg-black hover:text-white transition-all border border-zinc-100 cursor-pointer group gap-2 md:gap-3"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center text-zinc-400 group-hover:text-black">
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="font-bold text-zinc-900 group-hover:text-white text-sm md:text-base">관련제품 더보기</span>
            </motion.a>

          </div>

        </div>

      </div>
    </section>
  );
};

export default DeviceSelection;