import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

const solutions = [
  {
    id: 'menu',
    solution: "템플릿으로 빠르게 제작하고\n메뉴판 수정 비용을 아끼세요.",
    desc: "비싼 디자인 외주와 인쇄비는 이제 그만.\n요청 즉시 전문가가 빠르게 수정해 드립니다."
  },
  {
    id: 'mood',
    solution: "소음 없는 우아한 알림으로\n매장의 품격을 지켜드립니다.",
    desc: "매장 분위기를 해치는 투박한 기계는 잊으세요.\n세련된 디자인과 UI로 공간의 가치를 높입니다."
  },
  {
    id: 'operation',
    solution: "주문·조리·호출 통합 관리로\n복잡한 동선을 정리합니다.",
    desc: "모든 직원이 실시간으로 데이터를 공유합니다.\n완벽한 팀워크로 가장 효율적인 동선을 경험하세요."
  },
  {
    id: 'marketing',
    solution: "다채로운 이벤트와 혜택으로\n단골 손님을 만들어드립니다.",
    desc: "포인트, 타임세일, 그리고 이달의 메뉴와 SNS 이벤트 홍보.\n고객의 시선이 머무는 곳마다 확실한 혜택을 보여주세요."
  }
];

const Recommendation = () => {
  return (
    <section className="py-24 bg-white border-b border-zinc-100 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 text-center max-w-3xl mx-auto"
        >
          <span className="text-primary text-xs font-bold tracking-widest uppercase mb-4 block">Solution</span>
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-6 leading-tight tracking-tight">
            운영의 고민,<br />명쾌한 해답
          </h2>
          <p className="text-lg text-zinc-500 leading-relaxed font-medium">
            사장님이 겪는 반복적인 문제들,<br />
            저희가 가장 심플하고 완벽하게 해결해 드립니다.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-px bg-zinc-100 border-t border-b border-zinc-100">
          {solutions.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group flex flex-col items-center text-center p-10 lg:p-14 bg-white hover:bg-[#fcfcfc] transition-colors duration-500"
            >
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="mb-6 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-300">
                  <Check className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-6 whitespace-pre-line leading-snug tracking-tight group-hover:text-primary transition-colors duration-300">
                  {item.solution}
                </h3>
                <p className="text-zinc-500 font-medium leading-relaxed whitespace-pre-line text-sm md:text-base">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Recommendation;