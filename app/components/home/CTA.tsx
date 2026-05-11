import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

type CTAProps = {
  applyHref?: string;
};

const CTA = ({ applyHref = "/apply/menu" }: CTAProps) => {
  return (
    <section id="cta" className="py-20 md:py-24 bg-zinc-50 text-zinc-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-zinc-50" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
        >
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-3xl md:text-5xl font-bold tracking-tight mb-8 leading-[1.1] text-zinc-900"
        >
          모든 디바이스를 하나로 잇는,<br />
          <span className="font-bold text-zinc-900">완벽한 웹 올인원</span> 솔루션.
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-base md:text-lg text-zinc-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium"
        >
          웨이팅, 주문, 결제부터 포인트 적립까지. 따로 관리하던 모든 서비스를<br className="hidden md:block" />
          단 하나의 웹 화면으로 통합하여, 별도의 기기 없이 운영 효율을 극대화하세요.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col md:flex-row gap-4 justify-center items-center"
        >
          <Link 
            to={applyHref}
            className="w-full md:w-auto px-10 py-4 bg-black text-white text-base md:text-lg font-bold rounded-full hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 group tracking-widest uppercase shadow-lg shadow-zinc-200"
          >
            지금 도입하기
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a 
            href="mailto:admin@dndcommerce.co.kr"
            className="w-full md:w-auto px-10 py-4 border border-zinc-200 text-zinc-600 text-base md:text-lg font-bold rounded-full hover:bg-zinc-100 hover:text-zinc-900 transition-colors flex items-center justify-center tracking-widest uppercase bg-white"
          >
            도입 상담 문의
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
