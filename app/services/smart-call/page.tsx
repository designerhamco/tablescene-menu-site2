import type { Metadata } from 'next';

import OriginalAppNoSsr from '../../OriginalAppNoSsr';

export const metadata: Metadata = {
  title: '스마트호출 | ArtiMenu',
  description: '아티메뉴 멀티페이지 다이닝에 포함되는 테이블 스마트호출 기능입니다.',
};

export default function SmartCallRoutePage() {
  return <OriginalAppNoSsr />;
}
