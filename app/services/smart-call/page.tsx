import type { Metadata } from 'next';

import OriginalAppNoSsr from '../../OriginalAppNoSsr';

export const metadata: Metadata = {
  title: '스마트호출 | ArtiMenu',
  description: '아티메뉴 스마트호출 기능은 현재 제공하지 않습니다.',
};

export default function SmartCallRoutePage() {
  return <OriginalAppNoSsr />;
}
