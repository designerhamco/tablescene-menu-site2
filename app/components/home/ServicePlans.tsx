import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { CheckCircle2 } from 'lucide-react';

const services = [
  {
    title: '아티메뉴 다이닝',
    badge: '오픈할인',
    description: '직접 편집하는 기본 디지털 메뉴판',
    price: '단일 월 5,900원 · 멀티 월 9,900원',
    details: ['다양한 템플릿 제공', '실시간 메뉴 및 가격 수정', '모든 기기 호환 및 QR 지원'],
    cta: '구매하기',
    href: '/apply/basic',
    highlighted: true,
    available: true,
  },
  {
    title: '아티메뉴 디스플레이',
    badge: '준비 중',
    description: '매장 TV와 모니터에 띄우는 디스플레이 메뉴보드',
    price: '월 14,900원 · 연 160,900원',
    details: ['매장 화면용 메뉴 구성', '이벤트와 안내 화면 확장', '디스플레이 환경 상담'],
    cta: '준비 중',
    href: '/apply/display',
    highlighted: false,
    available: false,
  },
];

const ServicePlans = () => {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <h2 className="break-keep text-3xl font-bold tracking-tight text-zinc-950 md:text-5xl">
            매장에 맞게 선택하는 ArtiMenu 서비스
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service, index) => (
            <motion.article
              key={service.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex min-h-[360px] flex-col rounded-[1.5rem] border bg-white p-8 md:min-h-[380px] md:p-10 ${
                service.highlighted ? 'border-zinc-950' : 'border-zinc-200 bg-zinc-50/70'
              }`}
            >
              {service.badge ? (
                <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-[1.4rem] bg-[#F8E731] px-5 py-3 text-sm font-bold text-black">
                  {service.badge}
                </span>
              ) : null}

              <div className="pr-10">
                <h3 className="mb-5 text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
                  {service.title}
                </h3>
                <p className="break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
                  {service.description}
                </p>
                <p className="mt-5 text-lg font-black text-zinc-950">
                  {service.price}
                </p>
              </div>

              <ul className="mt-9 space-y-4">
                {service.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-3 text-sm font-medium text-zinc-700 md:text-base">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-950" strokeWidth={1.8} />
                    {detail}
                  </li>
                ))}
              </ul>

              {service.available ? (
                <Link
                  to={service.href}
                  className="mt-auto flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-colors hover:bg-zinc-800"
                >
                  {service.cta}
                </Link>
              ) : (
                <span className="mt-auto flex w-full items-center justify-center rounded-full bg-zinc-100 px-5 py-4 text-base font-bold text-zinc-400 ring-1 ring-zinc-200">
                  {service.cta}
                </span>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicePlans;
