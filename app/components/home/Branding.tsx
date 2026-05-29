import React from 'react';
import { motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';

const Branding = () => {
  return (
    <section className="py-24 md:py-32 bg-[#0a0a0a] text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 md:mb-32 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">비주얼 스튜디오</h2>
          <p className="text-lg text-zinc-400 leading-relaxed font-medium">
            메뉴는 단순한 리스트가 아닙니다. 브랜드의 첫인상입니다.<br className="hidden md:block" />
            비주얼 스튜디오는 당신의 요리를 식욕을 자극하는 장면으로 연출합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
             <h3 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-white/95">매혹적인<br/>비주얼 스토리텔링</h3>
             <ul className="space-y-6">
              {['식욕을 자극하는 컬러 그레이딩', '브랜드 무드에 맞는 스타일링', '하이엔드 리터칭', '다양한 마케팅 활용성'].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-zinc-300 text-lg font-medium">
                  <div className="w-6 h-6 rounded-full border border-primary/50 flex items-center justify-center text-primary shrink-0">
                    <Check size={12} strokeWidth={2} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-4 pt-12">
               <img src="https://images.unsplash.com/photo-1755811248279-1ab13b7d4384?q=80&w=600" alt="Plating" className="rounded-xl w-full aspect-[3/4] object-cover shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" />
            </div>
            <div className="space-y-4">
              <img src="https://images.unsplash.com/photo-1561284081-ebf6c977bbde?q=80&w=600" alt="Styling" className="rounded-xl w-full aspect-[3/4] object-cover shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" />
            </div>
          </motion.div>
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="aspect-square bg-zinc-900 rounded-xl overflow-hidden relative group cursor-pointer"
            >
              <img 
                src={`https://images.unsplash.com/photo-${i === 1 ? '1414235077428-338989a2e8c0' : i === 2 ? '1504674900247-0877df9cc836' : i === 3 ? '1540189549336-e6e99c3679fe' : '1565299624946-b28f40a0ae38'}?w=800&auto=format&fit=crop&q=80`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-70 group-hover:opacity-100"
                alt="Portfolio" 
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
              <div className="absolute inset-0 flex items-center justify-center opacity-100">
                <div className="w-12 h-12 rounded-full border border-white/30 bg-black/20 backdrop-blur-sm flex items-center justify-center text-white transition-transform duration-500 group-hover:scale-110 group-hover:border-primary group-hover:text-primary">
                   <Plus size={24} strokeWidth={1} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Branding;
