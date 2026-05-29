import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Smartphone, ChefHat, Bell, Utensils, User, Store, MessageSquare, BadgePercent } from 'lucide-react';

const FLOW_STEPS = [
  {
    id: 'order',
    actor: 'Customer',
    icon: Smartphone,
    roleIcon: User,
    roleLabel: '고객',
    title: '테이블에서 주문 & 결제',
    description: '매장에 들어와 자리에 앉습니다. QR 코드를 찍거나 테이블 태블릿으로 메뉴를 천천히 고르고, 기다림 없이 바로 결제합니다.',
    image: 'https://images.unsplash.com/photo-1726056652582-7c9d202d4018?auto=format&fit=crop&q=80&w=1080'
  },
  {
    id: 'promotion',
    actor: 'Customer',
    icon: BadgePercent,
    roleIcon: User,
    roleLabel: '고객',
    title: '할인 혜택 & 간편 멤버십',
    description: '이달의 할인 메뉴나 타임 세일(예: 오후 3~5시) 정보를 확인해 합리적으로 주문합니다. 전화번호만 입력하면 포인트가 즉시 적립되며, 쌓인 포인트는 결제 시 현금처럼 사용할 수 있습니다.',
    image: 'https://images.unsplash.com/photo-1761515397001-c8e82879c4c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwdGFibGUlMjBvcmRlciUyMHRhYmxldCUyMHFyJTIwY29kZXxlbnwxfHx8fDE3Njg3MjUxODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'cooking',
    actor: 'Owner',
    icon: ChefHat,
    roleIcon: Store,
    roleLabel: '사장님',
    title: '주방 주문 확인 및 조리',
    description: '주문 내역이 주방 대시보드에 실시간으로 접수됩니다. 홀 서빙이나 주문 접수에 신경 쓸 필요 없이, 오직 요리에만 집중하세요.',
    image: 'https://images.unsplash.com/photo-1743623987484-d18bb133a6e3?auto=format&fit=crop&q=80&w=1080'
  },
  {
    id: 'notify',
    actor: 'Owner',
    icon: Bell,
    roleIcon: Store,
    roleLabel: '사장님',
    title: '조리 완료 & 알림 발송',
    description: '음식이 준비되면 대시보드 터치 한 번으로 고객에게 알림톡을 보냅니다. 무거운 진동벨을 관리하거나 육성으로 번호를 부를 필요가 없습니다.',
    image: 'https://images.unsplash.com/photo-1756576357697-13dfc5fff61c?auto=format&fit=crop&q=80&w=1080'
  },
  {
    id: 'pickup',
    actor: 'Customer',
    icon: Utensils,
    roleIcon: User,
    roleLabel: '고객',
    title: '픽업 또는 테이블 서빙',
    description: '휴대폰으로 알림을 받고 픽업대에서 음식을 받아옵니다. 알림톡 기능을 사용하지 않아도 됩니다. 이 경우에는 직원이 직접 테이블로 서빙할 수도 있어 유연합니다.',
    image: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=1080'
  },
  {
    id: 'call',
    actor: 'Customer',
    icon: MessageSquare,
    roleIcon: User,
    roleLabel: '고객',
    title: '조용한 스마트 직원 호출',
    description: "'물 주세요', '앞치마 주세요' 등 필요한 요청을 메뉴판에서 선택합니다. 진동벨 없이도 간편하게 호출이 가능해 '딩동' 소음 없는 쾌적한 환경을 유지하며, 호출 버튼 항목은 매장에 맞게 자유롭게 커스터마이징할 수 있습니다.",
    image: 'https://images.unsplash.com/photo-1677825949359-aaff52b4c79c?auto=format&fit=crop&q=80&w=1080'
  }
];

const ManagementWorkflow = () => {
  return (
    <section 
      className="w-full bg-[#fcfcfc] py-24 lg:py-32 relative"
    >
      <div 
        className="max-w-7xl mx-auto px-6 relative"
      >
        
        {/* Header */}
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-zinc-900 tracking-tight leading-tight"
          >
            고객도, 사장님도<br />
            가장 편안한 흐름
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-500 leading-relaxed font-medium"
          >
            고객은 자리에서 주문하고 알림만 기다리면 되고,<br className="hidden md:block"/>
            사장님은 주방에서 요리에만 집중할 수 있는 완벽한 시스템입니다.
          </motion.p>
        </div>

        {/* Vertical Timeline Line (Desktop Only) */}
        {/* Background Gray Line */}
        <div className="absolute left-[50%] top-[300px] bottom-40 w-[1px] bg-zinc-200 hidden md:block" />
        {/* Progress Line (Static for now to fix useScroll error) */}
        <motion.div 
           initial={{ height: 0 }}
           whileInView={{ height: '100%' }}
           viewport={{ once: true }}
           transition={{ duration: 1.5, ease: "easeInOut" }}
           className="absolute left-[50%] top-[300px] bottom-40 w-[1px] bg-zinc-900 hidden md:block z-10 origin-top" 
        />

        <div className="space-y-20 relative">
          {/* Mobile Continuous Line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 md:hidden" />
          <motion.div 
             initial={{ height: 0 }}
             whileInView={{ height: '100%' }}
             viewport={{ once: true }}
             transition={{ duration: 1.5, ease: "easeInOut" }}
             className="absolute left-5 top-0 bottom-0 w-px bg-zinc-900 md:hidden z-10 origin-top" 
          />

          {FLOW_STEPS.map((step, index) => {
            const isEven = index % 2 === 0;
            return (
              <div key={step.id} className="relative">
                <TimelineItem step={step} index={index} isEven={isEven} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const TimelineItem = ({ step, index, isEven }: { step: any, index: number, isEven: boolean }) => {
  const stepNumber = index + 1;
  const formattedStep = stepNumber < 10 ? `0${stepNumber}` : stepNumber;
  
  return (
    <div className={`flex flex-col md:flex-row items-start md:items-center gap-10 md:gap-0 pl-12 md:pl-0 relative ${isEven ? '' : 'md:flex-row-reverse'}`}>
      
      {/* Mobile Dot Node */}
      <motion.div 
        initial={{ backgroundColor: "#d4d4d8", scale: 1 }}
        whileInView={{ backgroundColor: "#18181b", scale: 1.2 }}
        viewport={{ margin: "-50% 0px -50% 0px" }}
        transition={{ duration: 0.3 }}
        className="absolute left-[15.5px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-[#fcfcfc] md:hidden z-20" 
      />
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`flex-1 w-full md:w-1/2 ${isEven ? 'md:pr-24 text-left md:text-right' : 'md:pl-24 text-left'}`}
      >
        {/* Step Number & Chip Container */}
        <div className={`relative mb-4 flex items-center gap-3 ${isEven ? 'md:justify-end' : 'md:justify-start'}`}>
           <span className="text-lg font-bold text-zinc-300 tracking-widest font-mono">
             {formattedStep}
           </span>
           <div className="w-1 h-1 rounded-full bg-zinc-200" />
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-100 text-zinc-500 text-xs font-bold uppercase tracking-wider shadow-sm">
             <step.roleIcon size={12} />
             {step.roleLabel}
           </div>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 tracking-tight leading-tight">{step.title}</h3>
        <p className="text-base md:text-lg text-zinc-500 leading-relaxed font-medium">
          {step.description}
        </p>
      </motion.div>

      {/* Center Node (Desktop Only) */}
      <motion.div 
        initial={{ backgroundColor: "#d4d4d8", scale: 1 }} // zinc-300
        whileInView={{ backgroundColor: "#18181b", scale: 1.2 }} // black
        viewport={{ margin: "-50% 0px -50% 0px" }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center w-3 h-3 rounded-full ring-4 ring-white z-20 shadow-sm" 
      />

      {/* Image/Video Side */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className={`flex-1 w-full md:w-1/2 ${isEven ? 'md:pl-24' : 'md:pr-24'}`}
      >
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-xl bg-zinc-100 border border-white">
          <motion.img 
            src={step.image} 
            alt={step.title} 
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 1 }}
          />
          <div className="absolute inset-0 bg-black/5 mix-blend-multiply" />
        </div>
      </motion.div>

    </div>
  );
};

export default ManagementWorkflow;
