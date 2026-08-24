import { BellRing, Smartphone } from 'lucide-react';

import { MarketingSectionCopy } from '../../components/home/MarketingSectionCopy';

type ComingSoonServicePageProps = {
  kind: 'qr-order' | 'smart-call';
};

const serviceCopy = {
  'qr-order': {
    eyebrow: 'QR오더 · 모바일',
    title: <>메뉴 탐색부터 주문까지<br />하나의 모바일 화면</>,
    body: '메뉴 탐색과 장바구니, 주문을 자연스럽게 연결하는 서비스를 준비 중입니다.',
    icon: Smartphone,
  },
  'smart-call': {
    eyebrow: '스마트호출',
    title: <>테이블에서 연결되는<br />스마트 직원 호출</>,
    body: '물·앞접시·직원 호출 등 필요한 요청을 빠르게 전달하는 서비스를 준비 중입니다.',
    icon: BellRing,
  },
} as const;

export default function ComingSoonServicePage({ kind }: ComingSoonServicePageProps) {
  const copy = serviceCopy[kind];
  const Icon = copy.icon;

  return (
    <section className="min-h-[calc(100vh-18rem)] bg-zinc-50 px-6 pb-24 pt-36 md:px-10 md:pb-36 md:pt-44">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <MarketingSectionCopy eyebrow={copy.eyebrow} title={copy.title} body={copy.body} className="max-w-xl" />

        <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] bg-white p-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)] md:min-h-[480px] md:rounded-[2.5rem]">
          <div className="text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-zinc-950 text-white md:h-24 md:w-24">
              <Icon className="h-9 w-9 md:h-11 md:w-11" aria-hidden="true" />
            </span>
            <p className="mt-8 text-sm font-bold tracking-[0.16em] text-zinc-400">COMING SOON</p>
            <p className="mt-3 text-xl font-bold text-zinc-950 md:text-2xl">서비스 소개를 준비하고 있습니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
