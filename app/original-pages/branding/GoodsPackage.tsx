import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import CTA from '../../components/home/CTA';
import { motion } from 'motion/react';

const GoodsPackage = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader 
        title="굿즈 & 패키지" 
        subtitle="Brand Merchandise Design"
        bgImage="https://images.unsplash.com/photo-1606836591695-4d58a73eba1e?q=80&w=2071&auto=format&fit=crop"
      />
      
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-zinc-900">브랜드를 소장하고 싶게 만드는 힘</h2>
            <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
              고객이 매장을 떠난 후에도 브랜드를 기억할 수 있도록.<br />
              패키지 디자인부터 굿즈 제작까지, 브랜드의 가치를 상품에 담아냅니다.
            </p>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-3 text-zinc-900">Package Design</h3>
                <p className="text-zinc-600">테이크아웃 용기, 쇼핑백, 선물 포장 패키지 등</p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-zinc-900">Merchandise</h3>
                <p className="text-zinc-600">텀블러, 에코백, 의류, 문구류 등 브랜드 굿즈</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
             <div className="space-y-4">
               <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
                 <img src="https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Package" />
               </div>
               <div className="aspect-square rounded-xl overflow-hidden shadow-lg">
                 <img src="https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Box" />
               </div>
             </div>
             <div className="space-y-4 pt-8">
               <div className="aspect-square rounded-xl overflow-hidden shadow-lg">
                 <img src="https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Coffee Cup" />
               </div>
               <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
                 <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Tote Bag" />
               </div>
             </div>
          </motion.div>
        </div>
      </div>

      <CTA />
    </div>
  );
};

export default GoodsPackage;