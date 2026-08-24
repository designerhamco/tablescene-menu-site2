import type { Metadata } from 'next';

import OriginalAppNoSsr from '../../OriginalAppNoSsr';

export const metadata: Metadata = {
  title: '스마트호출 | ArtiMenu',
  description: '아티메뉴 테이블 스마트호출 서비스를 준비하고 있습니다.',
};

export default function SmartCallRoutePage() {
  return <OriginalAppNoSsr />;
}
