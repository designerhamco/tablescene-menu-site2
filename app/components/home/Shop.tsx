import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

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

const Shop = () => {
  return (
    <section id="shop" className="py-24 md:py-32 bg-white border-t border-zinc-100 relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Changed to Center Alignment for Consistency */}
        <div className="text-center mb-16 md:mb-20 max-w-3xl mx-auto">
          <span className="text-primary text-xs font-bold tracking-widest uppercase mb-4 block">Hardware Store</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900 tracking-tight">
            매장 효율을 극대화하는<br />
            전용 하드웨어
          </h2>
          <p className="text-lg text-zinc-500 leading-relaxed font-medium">
            소프트웨어와 완벽하게 호환되는 전용 장비로<br className="hidden md:block"/>
            더 빈틈없는 매장 운영 시스템을 구축하세요.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-16">
          {PRODUCTS.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer text-center md:text-left"
            >
              <div className="aspect-[4/3] bg-[#f9f9f9] rounded-xl mb-8 overflow-hidden relative border border-zinc-100">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply opacity-90 group-hover:opacity-100" 
                />
              </div>
              <div className="space-y-2 text-left px-2">
                <h3 className="font-bold text-xl text-zinc-900 tracking-tight group-hover:text-primary transition-colors">{product.name}</h3>
                <p className="text-sm text-zinc-500 line-clamp-1 font-medium">{product.desc}</p>
                <p className="text-lg font-bold text-zinc-900 pt-2">{product.price}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button Moved to Bottom Center */}
        <div className="flex justify-center">
           <Link to="/store" className="group flex items-center gap-3 px-8 py-3 rounded-full border border-zinc-200 text-zinc-900 text-sm font-bold tracking-widest uppercase hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-all duration-300">
            전체 상품 보기
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default Shop;