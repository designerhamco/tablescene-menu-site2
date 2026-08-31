import type { Metadata } from 'next';

import OriginalAppNoSsr from '../../OriginalAppNoSsr';

export const metadata: Metadata = {
  title: 'QR오더(모바일) | ArtiMenu',
  description: '아티메뉴 모바일 QR오더 서비스를 준비하고 있습니다.',
};

export default function QrOrderRoutePage() {
  return <OriginalAppNoSsr />;
}
