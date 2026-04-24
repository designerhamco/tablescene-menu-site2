import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import CTA from '../../components/home/CTA';
import { motion } from 'motion/react';

const FoodVisualArt = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader 
        title="푸드비주얼 아트" 
        subtitle="Artistic Culinary Photography"
        bgImage="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop"
      />
      
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-zinc-900">시각으로 맛을 전하다</h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            단순한 메뉴 사진이 아닌, 브랜드의 철학과 맛의 깊이를 담아냅니다.<br />
            전문 푸드 스타일리스트와 포토그래퍼가 함께합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=1000&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=1000&auto=format&fit=crop"
          ].map((src, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer group"
            >
              <img 
                src={src} 
                alt={`Food Art ${index + 1}`} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </motion.div>
          ))}
        </div>
      </div>

      <CTA />
    </div>
  );
};

export default FoodVisualArt;
